"""Loop di lavoro dell'orchestratore autonomo — esecuzione PARALLELA a ondate.

Ad ogni ondata: prende TUTTI i task 'todo' con le dipendenze soddisfatte e li esegue in
parallelo (fino a max_parallel worker). Finita l'ondata, i task completati sbloccano i loro
dipendenti (handoff), che partono nell'ondata successiva. Si ferma quando non ci sono più task
eleggibili o si raggiunge max_iterations (tetto di task totali).
"""
from __future__ import annotations

import dataclasses
import datetime as _dt
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from board import counts, deps_satisfied, load_board, save_board, set_status
from config import ROOT, Config
from guardrails import PROPOSALS_DIR, RUNS_DIR, ensure_dirs
from model_stats import record
from providers import complete_with_chain
from roles import load_persona

# Il rulebook va iniettato INTERO: a 1800 caratteri il taglio cadeva dentro la sezione 3,
# quindi gli agenti non vedevano ne' la Definition of Done ne' le convenzioni sulla UI.
# Il 2026-07-28 un agente ha scritto un componente in Tailwind (che qui non esiste) proprio
# perche' la regola che lo vieta stava oltre il taglio.
RULEBOOK_CHARS = 8000


ACTIVITY_LOG = Path(__file__).resolve().parent / "ACTIVITY.md"

# Quanto diff passare a chi deve revisionarlo. Deve essere GENEROSO: un revisore che vede
# metà file non dice "non so", deduce — e deduce male. Con un diff troncato a 7k caratteri
# ha segnalato come "bloccanti" un rng mai usato (era usato 20 righe più sotto) e una guardia
# mancante (c'era, in optional chaining). I modelli in uso hanno finestre da 262k token:
# risparmiare caratteri qui non fa guadagnare nulla e costa conclusioni sbagliate.
DIFF_LIMIT = 60_000

# Budget di output per i task di PROSA (design, review). Il default di 4.000 token era pensato
# per proposte brevi: su un documento di design complesso i modelli 'reasoning' lo esauriscono
# ragionando e la consegna esce TRONCATA a metà frase — è successo con tutti e sei i design
# dello Sprint 9, che si sono fermati nel mezzo dei calcoli. Alzarlo non costa nulla sui free.
PROSE_MAX_TOKENS = 16_000


def _now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _read_trunc(path: Path, limit: int) -> str:
    if not path.exists():
        return ""
    text = path.read_text(encoding="utf-8")
    return text if len(text) <= limit else text[:limit] + "\n…(troncato)"


def read_blackboard() -> str:
    """Contesto condiviso dato agli agenti: stato, regole di gioco e codice reale del motore.

    Fondamentale: senza il GDD e il codice del game-engine gli agenti ragionano al buio e
    inventano campi/formule inesistenti. Qui diamo loro il progetto *vero*.
    """
    sources = [
        ("STATUS del progetto", ROOT / "project-management" / "STATUS.md", 1200),
        ("Game Design (regole e formula v0.1)", ROOT / "docs" / "01-game-design.md", 3500),
        ("Codice reale del motore (game-engine)",
         ROOT / "apps" / "web" / "src" / "lib" / "game-engine" / "index.ts", 4000),
    ]
    parts: list[str] = []
    for title, path, limit in sources:
        content = _read_trunc(path, limit)
        if content:
            parts.append(f"### {title} — `{path.relative_to(ROOT)}`\n{content}")
    return "\n\n".join(parts) if parts else "(nessun contesto disponibile)"


def _read_dep_diff(dep_id: str, limit: int) -> str:
    """Diff reale prodotto da un task di codice sul suo branch `agent/<id>`.

    È il "consegnato" di quel task: senza, chi lo deve revisionare non ha nulla su cui
    lavorare. Si mostra solo il diff sotto `apps/` — le modifiche all'orchestratore non
    riguardano il lavoro dell'agente.
    """
    import subprocess

    branch = f"agent/{dep_id}"
    try:
        exists = subprocess.run(
            ["git", "rev-parse", "--verify", "--quiet", branch],
            cwd=ROOT, capture_output=True, text=True, check=False,
        )
        if exists.returncode != 0:
            return ""
        def _diff(rev_range: str) -> str:
            return subprocess.run(
                ["git", "diff", rev_range, "--", "apps/"],
                cwd=ROOT, capture_output=True, text=True, timeout=30, check=False,
            ).stdout

        out = _diff(f"main...{branch}")
        if not out.strip():
            # Il branch è già stato unito a main: rispetto a main non differisce più, ma il
            # lavoro esiste eccome. Si ripiega sul commit che il branch ha aggiunto.
            out = _diff(f"{branch}~1..{branch}")
    except (OSError, subprocess.SubprocessError):
        return ""
    if not out.strip():
        return ""
    if len(out) > limit:
        out = out[:limit] + "\n…(diff troncato)"
    return (
        f"#### Da `{dep_id}` — CODICE REALE consegnato sul branch `{branch}`\n"
        f"```diff\n{out}\n```"
    )


def read_dep_artifacts(task: dict[str, Any], per_dep_limit: int = 3500) -> str:
    """Output dei task da cui questo dipende — il vero 'passaggio di testimone' fra agenti.

    Senza questo, `deps` ordina solo l'esecuzione: il dipendente non vede mai il lavoro del
    predecessore (es. il frontend non leggeva i wireframe dell'UX) e i ruoli finiscono per
    reinventare decisioni già prese. Qui glielo mettiamo in mano.
    """
    deps = task.get("deps", [])
    if not deps:
        return ""
    parts: list[str] = []
    for dep_id in deps:
        found_for_dep = False
        for path in sorted(PROPOSALS_DIR.glob(f"{dep_id}-*.md")):
            content = _read_trunc(path, per_dep_limit)
            if content:
                parts.append(
                    f"#### Da `{dep_id}` — file `{path.relative_to(ROOT)}`\n{content}"
                )
                found_for_dep = True
        if not found_for_dep:
            # Un task di CODICE non produce una proposta .md: il suo output è un branch git.
            # Senza questo, chi dipende da un task di codice (tipicamente il code-reviewer)
            # riceve il vuoto — e un modello a cui manca il materiale se lo inventa.
            diff = _read_dep_diff(dep_id, DIFF_LIMIT)
            if diff:
                parts.append(diff)
    if not parts:
        return ""
    return (
        "\n\n## Lavoro degli agenti da cui dipendi (leggilo e RISPETTALO)\n"
        "Queste sono decisioni già prese a monte da altri ruoli del team. Costruisci sopra il "
        "loro lavoro: non ridefinire ciò che hanno già stabilito e segnala esplicitamente se "
        "trovi un'incoerenza invece di ignorarla.\n\n" + "\n\n".join(parts)
    )


def build_messages(task: dict[str, Any]) -> tuple[str, str]:
    persona = load_persona(task["role"])
    system = (
        persona
        + "\n\n---\n### Regole condivise del team (docs/12)\n"
        + _read_trunc(ROOT / "docs" / "12-regole-agenti.md", RULEBOOK_CHARS)
        + "\n\n---\nLavori dentro un orchestratore autonomo di un team di sviluppo. "
        "Produci UN output conciso, concreto e azionabile, in italiano. "
        "\n\n**Consegna il DOCUMENTO FINALE, non il ragionamento.** Ragiona quanto vuoi, ma "
        "scrivi solo il risultato: niente 'let me think', niente calcoli scartati, niente "
        "autocorrezioni a metà testo ('Mistake: …'). Chi legge vuole la decisione presa, non il "
        "percorso per arrivarci. **Scrivi in ITALIANO**, inclusi titoli e tabelle: i nomi dei "
        "campi di codice restano in inglese. Se stai per superare lo spazio disponibile, taglia "
        "le spiegazioni e tieni i NUMERI e le formule: sono la parte che serve davvero. "
        "Il tuo output è una PROPOSTA che verrà revisionata: non eseguire azioni, non "
        "assumere di poter modificare il codice direttamente."
        "\n\n**REGOLA ASSOLUTA — mai inventare.** Lavora SOLO su ciò che ti è stato dato in "
        "questo prompt. Non dedurre l'esistenza di file, funzioni o campi che non vedi, e non "
        "basarti su 'errori tipici' o su come di solito è fatto un progetto simile. Se ti manca "
        "il materiale per svolgere il compito (per esempio devi revisionare del codice ma non "
        "hai ricevuto nessun diff), la risposta CORRETTA è dichiararlo in una riga e fermarti: "
        "«Non posso svolgere questo task: mi manca X». Un'analisi inventata è molto peggio di "
        "un'analisi mancante, perché chi la legge la prende per vera."
    )
    acceptance = "\n".join(f"- {c}" for c in task.get("acceptance", [])) or "- (non specificati)"
    user = f"""# Task {task['id']}: {task['title']}
Ruolo: {task['role']}
Tipo: {task.get('kind', 'generico')}

## Descrizione
{task['description']}

## Criteri di accettazione
{acceptance}

## Contesto (blackboard condivisa)
{read_blackboard()}
{read_dep_artifacts(task)}

Fornisci la tua proposta completa e strutturata.
"""
    return system, user


def _proposal_header(task: dict[str, Any], label: str) -> str:
    return (
        f"# Proposta — {task['id']}: {task['title']}\n\n"
        f"- Ruolo: **{task['role']}**\n"
        f"- Provider/modello: `{label}`\n"
        f"- Generata: {_now()}\n\n---\n\n"
    )


def run_task(cfg: Config, task: dict[str, Any]) -> tuple[Path, str, bool]:
    """Esegue un task. Ritorna (file prodotto, etichetta modello, gate superato).

    Due strade a seconda di `kind`:
      - `code` → l'agente scrive codice vero su un branch isolato, verificato da test+build;
      - tutto il resto → proposta testuale da revisionare (comportamento storico).
    Per le proposte testuali `ok` è sempre True: non esiste un gate oggettivo sulla prosa.
    """
    if task.get("kind") == "code":
        from coder import run_code_task, write_report  # import locale: evita cicli e costi inutili

        result = run_code_task(cfg, task)
        return write_report(result, task), result.label, result.ok

    kind = task.get("kind", "generico")
    system, user = build_messages(task)
    chain = cfg.resolve_chain(task["role"], kind=kind)
    prose_cfg = dataclasses.replace(cfg, max_tokens=max(cfg.max_tokens, PROSE_MAX_TOKENS))
    output, label, skipped = complete_with_chain(prose_cfg, chain, system, user)
    for failure in skipped:
        # I modelli scartati vanno a referto: è così che la pagella impara chi è inaffidabile.
        record(failure.split(":")[0].strip(), kind, False, "non-ha-risposto")
    record(label, kind, True)
    path = PROPOSALS_DIR / f"{task['id']}-{task['role']}.md"
    path.write_text(_proposal_header(task, label) + output.strip() + "\n", encoding="utf-8")
    return path, label, True


def _append_activity(lines: list[str]) -> None:
    header = f"\n## Run {_now()}\n"
    body = "\n".join(lines) + "\n"
    with ACTIVITY_LOG.open("a", encoding="utf-8") as f:
        f.write(header + body)


def _write_run_report(cfg: Config, log: list[str], produced: int, board: dict[str, Any]) -> Path:
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = RUNS_DIR / f"run-{ts}.md"
    c = counts(board)
    path.write_text(
        f"# Run orchestratore — {_now()}\n\n"
        f"- Modalità: {cfg.describe()}\n"
        f"- Proposte generate: **{produced}**\n"
        f"- Stato board: {c}\n\n## Log\n" + "\n".join(log) + "\n",
        encoding="utf-8",
    )
    return path


def _eligible(board: dict[str, Any]) -> list[dict[str, Any]]:
    """Task 'todo' con tutte le dipendenze soddisfatte (pronti a partire, in parallelo)."""
    return [t for t in board["tasks"] if t["status"] == "todo" and deps_satisfied(t, board)]


def run(cfg: Config) -> int:
    ensure_dirs()
    board = load_board()
    log: list[str] = []
    produced = 0
    handled = 0
    wave = 0

    while handled < cfg.max_iterations:
        eligible = _eligible(board)
        if not eligible:
            msg = "Nessun task 'todo' eleggibile → checkpoint umano."
            print(f"⏸  {msg}")
            log.append(f"- {msg}")
            break

        batch = eligible[: cfg.max_iterations - handled]  # rispetta il budget residuo
        workers = min(cfg.max_parallel, len(batch))
        wave += 1
        print(f"\n🌊 Ondata {wave}: {len(batch)} task in PARALLELO (worker={workers})", flush=True)
        for t in batch:
            print(f"   • {t['role']} → {t['id']}: {t['title']}", flush=True)
            set_status(board, t["id"], "in-progress")
        save_board(board)

        # Esecuzione concorrente: run_task è I/O-bound (chiamate HTTP) → i thread vanno bene.
        # Le mutazioni della board avvengono SOLO qui nel thread principale, man mano che i
        # future completano: nessuna corsa critica (ogni task scrive un file di proposta distinto).
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {ex.submit(run_task, cfg, t): t for t in batch}
            for fut in as_completed(futures):
                t = futures[fut]
                handled += 1
                try:
                    path, label, ok = fut.result()
                    rel = path.relative_to(ROOT)
                    if ok:
                        # 'review' e non 'done': anche col gate verde, il merge lo decide un umano.
                        set_status(board, t["id"], "review")
                        print(f"   ✅ {t['id']} [{label}] → {rel}", flush=True)
                        log.append(f"- ✅ {t['id']} ({t['role']}, `{label}`) → `{rel}`")
                        produced += 1
                    else:
                        set_status(board, t["id"], "blocked")
                        print(f"   ⛔ {t['id']} [{label}] gate non superato → {rel}", flush=True)
                        log.append(f"- ⛔ {t['id']} ({t['role']}, `{label}`) gate non superato → `{rel}`")
                except Exception as e:  # noqa: BLE001 — un fallimento non deve fermare gli altri
                    set_status(board, t["id"], "blocked")
                    print(f"   ❌ {t['id']} errore → blocked: {e}", flush=True)
                    log.append(f"- ❌ {t['id']} ({t['role']}) errore → blocked: {e}")
                save_board(board)

    if wave == 0:
        # Niente da fare (nessun task eleggibile): non sporchiamo i log — utile per il daemon.
        return 0

    report = _write_run_report(cfg, log, produced, board)
    _append_activity(log)
    print(f"\n📄 Report: {report.relative_to(ROOT)}")
    return produced

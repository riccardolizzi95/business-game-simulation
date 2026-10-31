"""Agenti che scrivono CODICE, non prosa — su branch isolato e con gate di verifica.

Ciclo per un task di tipo `code`:

    worktree git isolato (branch agent/<task>)
      └─► il modello free produce blocchi FILE/EDIT
          └─► applicazione con guardrail sui percorsi
              └─► gate: npm test + typecheck + npm run build   (~25s, deterministico, gratis)
                  ├─ verde  → commit sul branch, pronto per la revisione umana
                  └─ rosso  → l'errore torna al modello e si riprova (fino a max tentativi)

Il punto chiave: **il retry costa zero** perché il modello è gratuito e il gate è locale. Un
modello debole con 4 tentativi verificati batte un modello forte senza verifica — e non tocca
mai `main`: il merge resta una decisione umana.
"""
from __future__ import annotations

import dataclasses
import datetime as _dt
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from config import ROOT, Config
from model_stats import record
from patcher import apply_all, parse_edits, touched_paths
from providers import complete_with_chain
from roles import load_persona
from verify import GateResult, run_gate

# Il rulebook va iniettato INTERO: a 1800 caratteri il taglio cadeva dentro la sezione 3,
# quindi gli agenti non vedevano ne' la Definition of Done ne' le convenzioni sulla UI.
# Il 2026-07-28 un agente ha scritto un componente in Tailwind (che qui non esiste) proprio
# perche' la regola che lo vieta stava oltre il taglio.
RULEBOOK_CHARS = 8000


WORK_DIR = ROOT / ".orchestrator-work"
REPORTS_DIR = ROOT / "orchestrator" / "runs"

DEFAULT_MAX_ATTEMPTS = 4
# Budget di output generoso: i modelli 'reasoning' consumano migliaia di token pensando PRIMA
# di scrivere. Con 8000 uno di loro ha bruciato 8326 token di ragionamento e prodotto zero
# caratteri (finish_reason=length). Sui free tier alzare questo tetto non costa nulla.
CODE_MAX_TOKENS = 24000
FILE_CONTEXT_LIMIT = 14000      # caratteri per file mostrati al modello

OUTPUT_CONTRACT = """
## Formato dell'output (OBBLIGATORIO)

Rispondi SOLO con blocchi di modifica nei due formati qui sotto. Niente diff unificati, niente
numeri di riga, nessun testo fuori dai blocchi se non una breve spiegazione iniziale.

Per riscrivere o creare un file (usalo per file piccoli o nuovi):

### FILE: apps/web/src/percorso/file.ts
```ts
<contenuto COMPLETO del file, dalla prima all'ultima riga>
```

Per una modifica mirata dentro un file grande (preferiscilo quando cambi poche righe):

### EDIT: apps/web/src/percorso/file.ts
<<<<<<< SEARCH
<testo esistente copiato ESATTAMENTE dal file, spazi e indentazione inclusi>
=======
<testo nuovo>
>>>>>>> REPLACE

Regole ferree:
- **I test nuovi vanno in un FILE NUOVO**, mai aggiunti in coda a un file di test già grande.
  Vitest raccoglie qualsiasi `*.test.ts`, quindi crea per esempio
  `apps/web/src/lib/game-engine/<argomento>.test.ts` con `### FILE:` e scrivilo per intero.
  Modificare un file di test da 1.400 righe con blocchi SEARCH/REPLACE lo ha corrotto tre volte
  di fila (graffe sbilanciate, frammenti di codice orfani, una lineetta al posto di un numero):
  il lavoro sul motore era buono e si è perso solo per questo.
- Il blocco SEARCH deve comparire **una sola volta** nel file: se è ambiguo, allargalo.
- Puoi produrre più blocchi, anche su file diversi.
- Puoi scrivere SOLO dentro `apps/web/src/`, `apps/web/public/`, `docs/`, `project-management/`.
- **Non disattivare, non cancellare e non indebolire i test esistenti** per far passare il gate.
- Il codice deve compilare con TypeScript e passare i test esistenti.

## Trappola nota: la virgola mobile

Se un test fallisce con un messaggio che sembra assurdo, del tipo
«expected 55.00000000000001 to be 55», NON è un errore di logica: è
l'aritmetica IEEE 754. In JavaScript `100 * 0.55` vale `55.00000000000001` e
`55 * 0.4` vale `22.000000000000004`. Riscrivere il file non serve a niente —
un implementatore si è arenato per quattro tentativi proprio così.

Le due soluzioni, da usare secondo il caso:
- se il valore è un IMPORTO IN EURO, arrotondalo ai centesimi nel codice di
  produzione (`Math.round(x * 100) / 100`): è anche corretto nel dominio;
- se è un rapporto o una percentuale, nel test usa `toBeCloseTo(atteso, 10)`
  invece di `toBe(atteso)`.

Quando due quote devono sommare a un totale esatto, calcola la seconda per
DIFFERENZA dal totale invece di moltiplicare due volte: così la somma torna
sempre, senza scarti di arrotondamento.
"""


@dataclass
class Attempt:
    n: int
    edits: int = 0
    applied: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    gate: str = ""


@dataclass
class CodeResult:
    task_id: str
    ok: bool
    branch: str
    base: str = "main"           # da dove è ripartito il worktree (può essere il branch stesso)
    compare_base: str = "main"   # rispetto a cosa si giudica il lavoro prodotto
    attempts: list[Attempt] = field(default_factory=list)
    files: list[str] = field(default_factory=list)
    commit: str = ""
    reason: str = ""
    label: str = ""

    @property
    def n_attempts(self) -> int:
        return len(self.attempts)


# --------------------------------------------------------------------------- worktree

def _git(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=False)


def setup_worktree(task_id: str, base: str = "HEAD") -> tuple[Path, str]:
    """Crea (o ricrea) un worktree isolato sul branch `agent/<task_id>`.

    I `node_modules` sono un symlink a quelli del repo principale: 272 MB che non ha senso
    reinstallare ad ogni task, e vitest/next li leggono senza problemi.
    """
    WORK_DIR.mkdir(exist_ok=True)
    path = WORK_DIR / task_id
    branch = f"agent/{task_id}"
    if path.exists():
        _git(["worktree", "remove", "--force", str(path)], ROOT)
    res = _git(["worktree", "add", "-f", str(path), "-B", branch, base], ROOT)
    if res.returncode != 0:
        raise RuntimeError(f"git worktree fallito: {res.stderr.strip()}")

    src = ROOT / "apps" / "web" / "node_modules"
    dst = path / "apps" / "web" / "node_modules"
    if src.exists() and not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        os.symlink(src, dst)
        # Il .gitignore del progetto esclude `node_modules/` — la barra finale però NON copre
        # un symlink, che per git è un file. Senza questa esclusione `git add -A` se lo porta
        # dentro al commit dell'agente.
        exclude = _git(["rev-parse", "--git-path", "info/exclude"], path).stdout.strip()
        if exclude:
            exclude_path = path / exclude if not Path(exclude).is_absolute() else Path(exclude)
            exclude_path.parent.mkdir(parents=True, exist_ok=True)
            with exclude_path.open("a", encoding="utf-8") as f:
                f.write("\napps/web/node_modules\n")
    return path, branch


def _branch_exists(branch: str) -> bool:
    return _git(["rev-parse", "--verify", "--quiet", branch], ROOT).returncode == 0


def _has_commits_ahead(branch: str, base: str = "main") -> bool:
    out = _git(["rev-list", "--count", f"{base}..{branch}"], ROOT).stdout.strip()
    return out.isdigit() and int(out) > 0


def resolve_chain_base(task: dict[str, Any]) -> str:
    """Punto di partenza della catena, ignorando il branch del task stesso.

    È il riferimento corretto per giudicare se il task ha prodotto il lavoro richiesto:
    tutto ciò che il branch aggiunge rispetto a questo punto è opera di questo task.
    """
    for dep_id in reversed(task.get("deps", [])):
        candidate = f"agent/{dep_id}"
        if _branch_exists(candidate):
            return candidate
    return "main"


def resolve_base(task: dict[str, Any]) -> str:
    """Branch di partenza per il worktree del task.

    In ordine:
      1. il branch DEL TASK STESSO, se ha già commit — un task ripreso dopo un fallimento
         riparte dal lavoro buono già fatto invece di ricominciare da zero;
      2. l'ultimo branch prodotto dalle sue dipendenze — così i task di uno sprint si
         impilano invece di divergere, e al merge c'è UNA catena da revisionare;
      3. `main`.
    """
    own = f"agent/{task['id']}"
    if _branch_exists(own) and _has_commits_ahead(own):
        return own
    return resolve_chain_base(task)


def remove_worktree(task_id: str) -> None:
    path = WORK_DIR / task_id
    if path.exists():
        _git(["worktree", "remove", "--force", str(path)], ROOT)


def _has_changes(worktree: Path) -> bool:
    return bool(_git(["status", "--porcelain"], worktree).stdout.strip())


def _changed_files(worktree: Path, compare_base: str) -> set[str]:
    """File in cui il worktree differisce da `compare_base`: commit già fatti + modifiche in corso.

    Il confronto va fatto col punto di partenza della CATENA, non con lo stato dell'ultimo
    tentativo: un task ripreso ha già del lavoro committato sul proprio branch, e quel lavoro
    conta come fatto.
    """
    changed = {
        line[3:].strip().strip('"')
        for line in _git(["status", "--porcelain"], worktree).stdout.splitlines()
        if line.strip()
    }
    committed = _git(["diff", "--name-only", f"{compare_base}...HEAD"], worktree).stdout
    changed |= {line.strip() for line in committed.splitlines() if line.strip()}
    return changed


def _apply_note(errors: list[str]) -> str:
    """Nota sulle modifiche non applicate, da anteporre al feedback quando il gate boccia.

    Se il gate passa questi errori NON vengono mostrati: un blocco SEARCH andato a vuoto su un
    albero che compila e supera i test è irrilevante, e segnalarlo manderebbe l'agente a
    "correggere" codice che funziona.
    """
    if not errors:
        return ""
    return (
        "Alcuni blocchi non erano applicabili (ancoraggio SEARCH non trovato):\n"
        + "\n".join(f"- {e}" for e in errors)
        + "\n\nIl contenuto dei file qui sopra è già aggiornato: copia gli ancoraggi da lì.\n\n"
    )


def _missing_required(worktree: Path, task: dict[str, Any], compare_base: str) -> list[str]:
    """File che il task dichiara obbligatori ma in cui il branch non differisce dalla base.

    Serve perché il gate è cieco all'intento: `npm test` passa benissimo anche se l'agente
    ha aggiunto la funzione e si è 'dimenticato' i test richiesti. Il controllo è deterministico
    e gratuito, quindi lo facciamo prima di dichiarare vittoria.

    ATTENZIONE al confronto: misurare "cosa ha toccato QUESTO tentativo" è sbagliato. Un task
    ripreso dopo un fallimento trova parte del lavoro già committato sul proprio branch, non ha
    più nulla da cambiare in quei file, e verrebbe bocciato per sempre chiedendogli l'impossibile.
    """
    required = task.get("must_touch") or []
    if not required:
        return []
    changed = _changed_files(worktree, compare_base)
    return [f for f in required if f not in changed]


def _commit(worktree: Path, task: dict[str, Any], label: str, attempts: int) -> str:
    _git(["add", "-A"], worktree)
    message = (
        f"{task['id']}: {task['title']}\n\n"
        f"Generato dall'agente '{task['role']}' via orchestratore ({label}).\n"
        f"Gate di verifica superato (npm test + typecheck + npm run build) al tentativo {attempts}.\n"
        f"Da revisionare prima del merge: nessun push automatico."
    )
    author = f"agent-{task['role']} <orchestrator@business-game.local>"
    res = _git(["commit", "-m", message, "--author", author], worktree)
    if res.returncode != 0:
        return ""
    return _git(["rev-parse", "--short", "HEAD"], worktree).stdout.strip()


# --------------------------------------------------------------------------- prompt

def _read_file_context(worktree: Path, rel_paths: list[str]) -> str:
    """Contenuto ATTUALE dei file rilevanti, riletto dal worktree ad ogni tentativo.

    Rileggere (invece di ricordare) è ciò che permette al modello di iterare davvero: al secondo
    giro vede il codice che ha appena scritto, non quello di partenza.
    """
    parts: list[str] = []
    for rel in rel_paths:
        path = worktree / rel
        if not path.exists():
            parts.append(f"#### `{rel}` — (non esiste ancora, va creato)")
            continue
        text = path.read_text(encoding="utf-8")
        if len(text) > FILE_CONTEXT_LIMIT:
            text = text[:FILE_CONTEXT_LIMIT] + "\n…(troncato: usa blocchi EDIT su questo file)"
        ext = path.suffix.lstrip(".") or "text"
        parts.append(f"#### `{rel}`\n```{ext}\n{text}\n```")
    return "\n\n".join(parts)


def _tree(worktree: Path, rel_root: str = "apps/web/src", limit: int = 60) -> str:
    base = worktree / rel_root
    if not base.exists():
        return ""
    files = sorted(
        str(p.relative_to(worktree)) for p in base.rglob("*")
        if p.is_file() and "node_modules" not in p.parts
    )
    shown = files[:limit]
    extra = f"\n…(+{len(files) - limit} altri)" if len(files) > limit else ""
    return "\n".join(f"- {f}" for f in shown) + extra


def build_code_messages(
    task: dict[str, Any],
    worktree: Path,
    feedback: str,
    attempt: int,
    max_attempts: int,
) -> tuple[str, str]:
    from orchestrator import _read_trunc, read_blackboard, read_dep_artifacts  # evita import circolare

    system = (
        load_persona(task["role"])
        + "\n\n---\n### Regole condivise del team (docs/12)\n"
        + _read_trunc(ROOT / "docs" / "12-regole-agenti.md", RULEBOOK_CHARS)
        + "\n\n---\nStai lavorando come sviluppatore dentro un orchestratore autonomo. "
        "Scrivi CODICE REALE che verrà applicato a un branch git isolato e verificato "
        "automaticamente con `npm test`, `npm run typecheck` e `npm run build`. Se il gate fallisce ricevi l'errore "
        "e riprovi. Sii chirurgico: modifica il minimo necessario per soddisfare i criteri di "
        "accettazione, rispettando lo stile del codice esistente."
        + OUTPUT_CONTRACT
    )

    files = task.get("files", [])
    acceptance = "\n".join(f"- {c}" for c in task.get("acceptance", [])) or "- (non specificati)"

    sections = [
        f"# Task {task['id']}: {task['title']}",
        f"Ruolo: {task['role']} · Tentativo {attempt} di {max_attempts}",
        f"\n## Descrizione\n{task['description']}",
        f"\n## Criteri di accettazione\n{acceptance}",
    ]

    # Al primo giro serve tutto il contesto. Nei retry no: blackboard e artefatti delle
    # dipendenze sono già stati letti e valgono ~7k token che tolgono spazio all'output. I
    # modelli free hanno un budget di output stretto — e quelli 'reasoning' lo bruciano
    # pensando: se il prompt è gonfio, la risposta esce troncata o vuota.
    is_retry = bool(feedback)
    if not is_retry:
        sections.append(f"\n## Contesto del progetto\n{read_blackboard()}")
        deps = read_dep_artifacts(task)
        if deps:
            # I numeri decisi dagli esperti di dominio vengono ignorati con regolarità: è successo
            # col costo di giacenza (2,50 deciso → 2,00 nel motore → 1,10 nella UI) e col prezzo
            # del kit (25,00 deciso → 50 implementato). Il documento c'era in entrambi i casi:
            # non basta fornirlo, va detto che quei valori sono vincolanti.
            sections.append(
                "\n## ⚠️ I NUMERI QUI SOTTO SONO DECISIONI, NON SUGGERIMENTI\n"
                "Ogni valore numerico deciso dagli esperti di dominio (prezzi, costi, soglie, tempi) "
                "va copiato ESATTAMENTE nel codice. Non arrotondarlo, non sostituirlo con un valore "
                "che ti sembra più sensato, non inventarne uno se non lo trovi: se un numero che ti "
                "serve non c'è, dichiaralo invece di sceglierlo tu. Definisci ogni valore come "
                "costante esportata in UN SOLO punto, così chi lo usa lo importa invece di riscriverlo."
            )
            sections.append(deps)
        tree = _tree(worktree)
        if tree:
            sections.append(f"\n## Struttura di `apps/web/src`\n{tree}")

    if files:
        sections.append(f"\n## File su cui lavorare (contenuto attuale)\n{_read_file_context(worktree, files)}")

    if feedback:
        sections.append(
            f"\n## ⚠️ Esito del tentativo precedente — CORREGGI QUESTO\n{feedback}\n\n"
            "Rispondi SUBITO con i blocchi di modifica, senza ragionamenti preliminari lunghi: "
            "il budget di output è limitato e serve tutto al codice. Usa blocchi `### EDIT:` "
            "mirati, NON riscrivere interi file."
        )

    sections.append("\nProduci ora i blocchi di modifica.")
    return system, "\n".join(sections)


# --------------------------------------------------------------------------- loop

def run_code_task(cfg: Config, task: dict[str, Any], max_attempts: int = DEFAULT_MAX_ATTEMPTS) -> CodeResult:
    """Esegue un task di codice fino a gate verde o esaurimento dei tentativi."""
    base = resolve_base(task)
    compare_base = resolve_chain_base(task)   # riferimento per giudicare il lavoro prodotto
    worktree, branch = setup_worktree(task["id"], base=base)
    code_cfg = dataclasses.replace(cfg, max_tokens=max(cfg.max_tokens, CODE_MAX_TOKENS))
    chain = code_cfg.resolve_chain(task["role"], kind="code")

    result = CodeResult(
        task_id=task["id"], ok=False, branch=branch, label=chain[0],
        base=base, compare_base=compare_base,
    )
    feedback = ""

    for n in range(1, max_attempts + 1):
        attempt = Attempt(n=n)
        result.attempts.append(attempt)

        # ESCALATION. I primi tentativi vanno al modello più economico della catena; se continua a
        # fallire si sale a quello più forte (e più caro) invece di ripetere lo stesso errore.
        # È il modo giusto di spendere: non di più su ogni task, ma di più SOLO dove il modello
        # economico ha già dimostrato di non farcela. Un gradino ogni due tentativi falliti.
        salto = min((n - 1) // 2, max(0, len(chain) - 1))
        catena_tentativo = chain[salto:] or chain

        system, user = build_code_messages(task, worktree, feedback, n, max_attempts)
        try:
            output, label, skipped = complete_with_chain(code_cfg, catena_tentativo, system, user)
            result.label = label
            attempt.errors += [f"modello saltato — {s}" for s in skipped]
        except Exception as e:  # noqa: BLE001 — l'intera catena è giù: diagnosi chiara e stop
            result.reason = f"nessun modello disponibile: {e}"
            return result

        edits = parse_edits(output)
        attempt.edits = len(edits)
        if not edits:
            # L'output grezzo va salvato: senza, un fallimento di formato è indistinguibile da
            # una risposta vuota, e si perde l'unica prova di cosa sia andato storto.
            raw_path = REPORTS_DIR / f"raw-{task['id']}-tentativo{n}.txt"
            raw_path.parent.mkdir(parents=True, exist_ok=True)
            raw_path.write_text(output or "(risposta vuota)", encoding="utf-8")

            if not output.strip():
                diagnosis = (
                    "La tua risposta è arrivata VUOTA: probabilmente hai esaurito il budget di "
                    "output ragionando prima di scrivere. Vai dritto ai blocchi di modifica."
                )
            else:
                snippet = output.strip()[:400]
                diagnosis = (
                    "La tua risposta non conteneva blocchi riconoscibili. Iniziava così:\n"
                    f"```\n{snippet}\n```"
                )
            feedback = (
                f"{diagnosis}\n\nDevi rispondere con blocchi `### FILE: <percorso>` (seguiti da un "
                "blocco di codice recintato con ```) oppure `### EDIT: <percorso>` con "
                "SEARCH/REPLACE. Nient'altro conta come modifica."
            )
            attempt.errors = [f"nessun blocco riconosciuto (output grezzo in {raw_path.name})"]
            record(result.label, "code", False, "output-vuoto" if not output.strip() else "nessun-blocco")
            continue

        applied, errors = apply_all(worktree, edits)
        attempt.applied, attempt.errors = applied, errors
        for path in touched_paths(edits):
            if path not in result.files:
                result.files.append(path)

        # Se NESSUNA modifica è passata non c'è nulla da verificare: si rimanda subito indietro.
        # Se invece qualcuna è passata si va avanti fino al gate, anche in presenza di errori:
        # un blocco SEARCH che non trova l'ancoraggio non significa che lo stato sia rotto. Con
        # la vecchia logica un solo SEARCH fallito su dieci buttava via un albero in cui i test
        # passavano tutti, e il tentativo successivo ripartiva da un file già mezzo modificato,
        # spostando ancora gli ancoraggi. È così che si perdevano task già di fatto completi.
        if errors and not applied:
            feedback = (
                "Nessuna delle tue modifiche è stata applicata:\n"
                + "\n".join(f"- {e}" for e in errors)
                + "\n\nIl contenuto dei file qui sopra è quello reale: copia i blocchi SEARCH da lì."
            )
            continue
        apply_errors = errors

        if not _has_changes(worktree):
            feedback = "Le tue modifiche non hanno cambiato nulla nel repository. Serve una modifica reale."
            attempt.errors = ["nessuna modifica effettiva"]
            continue

        missing = _missing_required(worktree, task, compare_base)
        if missing:
            attempt.gate = "requisiti di copertura non soddisfatti"
            attempt.errors.append(f"file obbligatori non toccati: {', '.join(missing)}")
            record(result.label, "code", False, "lavoro-incompleto")
            feedback = (
                _apply_note(apply_errors)
                + "Il task richiede esplicitamente di modificare anche questi file, che invece "
                "hai lasciato intatti:\n"
                + "\n".join(f"- `{f}`" for f in missing)
                + "\n\nCompleta il lavoro su quei file. Se sono file di test, i nuovi test devono "
                "verificare davvero il comportamento richiesto dai criteri di accettazione."
            )
            continue

        gate: GateResult = run_gate(worktree)
        attempt.gate = gate.summary()
        record(result.label, "code", gate.ok, "" if gate.ok else f"gate-{gate.failed_step}")
        if gate.ok:
            result.ok = True
            result.commit = _commit(worktree, task, result.label, n)
            return result
        feedback = _apply_note(apply_errors) + gate.feedback()

    result.reason = f"gate mai superato in {max_attempts} tentativi"
    # Il lavoro fallito va CONSERVATO. Senza commit il worktree viene distrutto al giro dopo e
    # con esso l'unica prova di cosa l'agente stesse sbagliando: ogni diagnosi ripartiva da zero.
    # Il commit è marcato come non superato, così non si confonde con una consegna valida.
    if _has_changes(worktree):
        _git(["add", "-A"], worktree)
        _git([
            "commit", "-m",
            f"[NON SUPERATO] {task['id']}: {task['title']}\n\n"
            f"Tentativi: {result.n_attempts}. {result.reason}.\n"
            f"Conservato per diagnosi: NON unire a main così com'è.",
            "--author", f"agent-{task['role']} <orchestrator@business-game.local>",
        ], worktree)
        result.commit = _git(["rev-parse", "--short", "HEAD"], worktree).stdout.strip()
    return result


# --------------------------------------------------------------------------- report

def write_report(result: CodeResult, task: dict[str, Any]) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    ts = _dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    path = REPORTS_DIR / f"code-{result.task_id}-{ts}.md"
    lines = [
        f"# Task di codice — {result.task_id}: {task['title']}",
        "",
        f"- Ruolo: **{task['role']}** · modello: `{result.label}`",
        f"- Branch: `{result.branch}` (da `{result.base}`)"
        + (f" · commit `{result.commit}`" if result.commit else ""),
        f"- Esito: {'✅ GATE VERDE' if result.ok else '❌ non superato'}"
        + (f" — {result.reason}" if result.reason else ""),
        f"- Tentativi: {result.n_attempts}",
        f"- File toccati: {', '.join(result.files) or 'nessuno'}",
        "",
        "## Cronologia dei tentativi",
    ]
    for a in result.attempts:
        lines.append(f"\n**Tentativo {a.n}** — {a.edits} blocchi · {a.gate or 'gate non raggiunto'}")
        lines += [f"  - ✅ {x}" for x in a.applied]
        lines += [f"  - ❌ {x}" for x in a.errors]
    lines += [
        "",
        "## Revisione umana",
        f"```bash\ngit diff {result.compare_base}..{result.branch}\n```",
        "",
        "Il branch **non** è stato pushato né unito a `main`: il merge resta una decisione umana.",
        "",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path

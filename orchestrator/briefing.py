#!/usr/bin/env python3
"""Briefing di inizio giornata — digest DETERMINISTICO dello stato del progetto.

Motivazione (risparmio token): la routine "leggi il progetto" era fatta caricando ~800 righe
di markdown grezzo nel contesto di Claude. Ma raccogliere lo stato e confrontarlo con la
realtà **non richiede un LLM**: è I/O + diff. Questo modulo produce un digest di poche decine
di righe; solo il riassunto narrativo (facoltativo, `--narrate`) usa un modello free.

Uso:
    python3 orchestrator/briefing.py              # digest a schermo + BRIEFING.md
    python3 orchestrator/briefing.py --json       # output machine-readable
    python3 orchestrator/briefing.py --narrate     # + riassunto in italiano da modello free

Sola lettura: non modifica nulla tranne `orchestrator/BRIEFING.md`.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import re
import subprocess
from pathlib import Path
from typing import Any

from board import counts, load_board
from config import ORCH_DIR, ROOT

BRIEFING_PATH = ORCH_DIR / "BRIEFING.md"

STATUS_MD = ROOT / "project-management" / "STATUS.md"
CHANGELOG_MD = ROOT / "project-management" / "CHANGELOG.md"
SPRINT_BOARD_MD = ROOT / "project-management" / "SPRINT-BOARD.md"
NOTIFICATIONS_MD = ROOT / "NOTIFICATIONS.md"

# Righe "- **Etichetta:** valore" che vogliamo estrarre da STATUS.md.
_STATUS_FIELDS = ("Fase attuale", "Ultimo aggiornamento", "Prossimo passo")

_UNREAD_NOTIFICATION = re.compile(r"^##\s*\[\s\]\s*(.+)$", re.M)
_SPRINT_HEADING = re.compile(r"^##\s+Sprint\s+(\d+)\b(.*)$", re.M)
_TASK_ID = re.compile(r"\b(ST\d+-\d+)\b")
_SPRINT_DONE_CLAIM = re.compile(r"Sprint\s+(\d+)[^.\n]{0,40}?(COMPLETAT|completat|chiuso|CHIUSO)", re.I)


# --------------------------------------------------------------------------- utilità

def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def _git(*args: str) -> str:
    """Comando git di sola lettura. Ritorna '' se git non è disponibile o fallisce."""
    try:
        out = subprocess.run(
            ["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=15, check=False
        )
        return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def _field(text: str, label: str) -> str:
    """Estrae il valore di una riga '- **Label:** valore' (anche su più righe di continuazione)."""
    pattern = re.compile(rf"^-\s+\*\*{re.escape(label)}:\*\*\s*(.+?)(?=^-\s+\*\*|\n##|\Z)", re.M | re.S)
    m = pattern.search(text)
    if not m:
        return ""
    # Ricompatta le continuazioni indentate in una riga sola.
    return " ".join(part.strip() for part in m.group(1).strip().splitlines())


# --------------------------------------------------------------------------- raccolta

def collect_git() -> dict[str, Any]:
    branch = _git("rev-parse", "--abbrev-ref", "HEAD")
    dirty = [ln for ln in _git("status", "--porcelain").splitlines() if ln.strip()]
    last = _git("log", "-1", "--pretty=%h %s")
    # Commit locali non ancora su origin (vuoto anche se non esiste un upstream).
    unpushed = [ln for ln in _git("log", "@{u}..HEAD", "--oneline").splitlines() if ln.strip()]
    return {
        "branch": branch,
        "last_commit": last,
        "dirty_files": len(dirty),
        "dirty_sample": dirty[:5],
        "unpushed": len(unpushed),
        "unpushed_sample": unpushed[:5],
    }


def collect_notifications() -> list[str]:
    return [t.strip() for t in _UNREAD_NOTIFICATION.findall(_read(NOTIFICATIONS_MD))]


def collect_status() -> dict[str, str]:
    text = _read(STATUS_MD)
    return {label: _field(text, label) for label in _STATUS_FIELDS}


def collect_changelog() -> dict[str, str]:
    """Ultima voce del CHANGELOG (titolo della prima sezione '## ')."""
    for line in _read(CHANGELOG_MD).splitlines():
        if line.startswith("## "):
            return {"latest": line[3:].strip()}
    return {"latest": ""}


def collect_sprints() -> dict[str, dict[str, int]]:
    """Per ogni sezione '## Sprint N' conta i marcatori di stato nelle tabelle."""
    text = _read(SPRINT_BOARD_MD)
    headings = list(_SPRINT_HEADING.finditer(text))
    sprints: dict[str, dict[str, int]] = {}
    for i, m in enumerate(headings):
        end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
        body = text[m.start():end]
        sprints[m.group(1)] = {
            "todo": body.count("⏳"),
            "done": body.count("✅"),
            "tasks": len(set(_TASK_ID.findall(body))),
        }
    return sprints


def collect_board() -> dict[str, Any]:
    board = load_board()
    open_tasks = [
        {"id": t["id"], "status": t["status"], "role": t.get("role", ""), "title": t.get("title", "")}
        for t in board["tasks"]
        if t["status"] != "done"
    ]
    return {"counts": counts(board), "open": open_tasks}


# --------------------------------------------------------------------------- drift

def detect_drift(data: dict[str, Any]) -> list[str]:
    """Incoerenze fra ciò che la documentazione dichiara e ciò che le board registrano.

    Sono EURISTICHE, non verità assolute: servono a farsi le domande giuste in fretta.
    """
    drift: list[str] = []
    status_text = _read(STATUS_MD)
    changelog_text = _read(CHANGELOG_MD)

    # Sprint dichiarati completati (in STATUS o CHANGELOG) ma con task ancora ⏳ nella board.
    # Due livelli, per non generare rumore:
    #  - CERTO: lo sprint ha 0 ✅ e N ⏳ → la tabella non è mai stata aggiornata dopo la consegna.
    #  - DA VERIFICARE: ha ⏳ residui ma anche ✅ → può avere item legittimamente rimandati a backlog.
    claimed_done = {m.group(1) for m in _SPRINT_DONE_CLAIM.finditer(status_text + changelog_text)}
    latest_claimed = max((int(n) for n in claimed_done), default=0)
    for sprint_no, stats in sorted(data["sprints"].items(), key=lambda kv: int(kv[0])):
        if stats["todo"] == 0:
            continue
        superseded = int(sprint_no) < latest_claimed
        if (sprint_no in claimed_done or superseded) and stats["done"] == 0:
            drift.append(
                f"Sprint {sprint_no}: consegnato secondo la documentazione, ma in SPRINT-BOARD.md "
                f"tutti i {stats['todo']} task sono ancora ⏳ Todo (0 ✅). Tabella mai aggiornata."
            )
        elif superseded:
            drift.append(
                f"Sprint {sprint_no}: ha {stats['todo']} task ⏳ residui mentre lo Sprint "
                f"{latest_claimed} è già chiuso — verificare se sono rimandati di proposito o dimenticati."
            )

    # La sezione "In corso" di STATUS cita uno sprint che STATUS stesso dichiara completato.
    in_corso = re.search(r"^##\s+In corso\s*$(.*?)(?=^##\s|\Z)", status_text, re.M | re.S)
    if in_corso:
        for sprint_no in re.findall(r"Sprint\s+(\d+)", in_corso.group(1)):
            if sprint_no in claimed_done:
                drift.append(
                    f"STATUS.md: la sezione 'In corso' cita ancora lo Sprint {sprint_no}, "
                    f"che lo stesso file dichiara completato."
                )

    # Task della board in 'todo' ma con una proposta già generata (lavoro fatto, stato non aggiornato).
    proposals_dir = ORCH_DIR / "proposals"
    if proposals_dir.exists():
        generated = {p.name.split("-")[0] + "-" + p.name.split("-")[1] for p in proposals_dir.glob("T-*.md")}
        for t in data["board"]["open"]:
            if t["status"] == "todo" and t["id"] in generated:
                drift.append(f"Task {t['id']} è 'todo' ma esiste già una proposta in proposals/.")

    # Board con task aperti mentre l'ultimo CHANGELOG dichiara uno sprint chiuso.
    if claimed_done and data["board"]["counts"].get("todo", 0) > 0:
        todo_n = data["board"]["counts"]["todo"]
        drift.append(
            f"board.json ha {todo_n} task 'todo' mentre la documentazione dichiara chiuso lo "
            f"Sprint {sorted(claimed_done)[-1]}: verificare se sono task già consegnati e mai chiusi."
        )

    # Stato git.
    g = data["git"]
    if g["dirty_files"]:
        drift.append(f"Working tree sporco: {g['dirty_files']} file non committati.")
    if g["unpushed"]:
        drift.append(
            f"{g['unpushed']} commit locali non pushati (l'auto-deploy Vercel non li ha ancora)."
        )
    return drift


# --------------------------------------------------------------------------- assemblaggio

def collect() -> dict[str, Any]:
    data: dict[str, Any] = {
        "generated": _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "git": collect_git(),
        "notifications_unread": collect_notifications(),
        "status": collect_status(),
        "changelog": collect_changelog(),
        "sprints": collect_sprints(),
        "board": collect_board(),
    }
    data["drift"] = detect_drift(data)
    return data


def render(data: dict[str, Any]) -> str:
    g = data["git"]
    out: list[str] = [
        f"# BRIEFING — {data['generated']}",
        "",
        "> Generato da `orchestrator/briefing.py` (deterministico, nessuna chiamata a LLM).",
        "",
        "## Git",
        f"- Branch `{g['branch']}` · ultimo commit: `{g['last_commit']}`",
        f"- Working tree: {'pulito' if not g['dirty_files'] else str(g['dirty_files']) + ' file modificati'}"
        f" · commit non pushati: {g['unpushed']}",
        "",
        "## Stato dichiarato (STATUS.md)",
    ]
    for label, value in data["status"].items():
        out.append(f"- **{label}:** {value or '(non trovato)'}")
    out += ["", f"- **Ultima voce CHANGELOG:** {data['changelog']['latest'] or '(nessuna)'}", ""]

    notifs = data["notifications_unread"]
    out.append("## Notifiche non lette")
    out += [f"- 🔔 {n}" for n in notifs] if notifs else ["- Nessuna."]
    out.append("")

    out.append("## Sprint (SPRINT-BOARD.md)")
    if data["sprints"]:
        for sprint_no, s in sorted(data["sprints"].items(), key=lambda kv: int(kv[0])):
            out.append(f"- Sprint {sprint_no}: {s['done']} ✅ · {s['todo']} ⏳ · {s['tasks']} task identificati")
    else:
        out.append("- (nessuna sezione sprint riconosciuta)")
    out.append("")

    out.append(f"## Board operativa ({data['board']['counts']})")
    if data["board"]["open"]:
        for t in data["board"]["open"]:
            out.append(f"- `{t['id']}` [{t['status']}] {t['role']} — {t['title'][:70]}")
    else:
        out.append("- Nessun task aperto.")
    out.append("")

    out.append("## ⚠️ Incoerenze rilevate")
    out += [f"- {d}" for d in data["drift"]] if data["drift"] else ["- Nessuna. Documentazione e board allineate."]
    out.append("")
    return "\n".join(out)


NARRATE_SYSTEM = (
    "Sei il coordinatore di un team di sviluppo. Ricevi un briefing strutturato sullo stato di un "
    "progetto software. Scrivi in ITALIANO un riassunto di massimo 12 righe per l'utente: dove siamo, "
    "cosa è in sospeso, quali incoerenze vanno sistemate e i 3 prossimi passi consigliati in ordine di "
    "priorità. Sii concreto e asciutto, niente preamboli, niente elenchi di ovvietà."
)


def narrate(digest: str) -> str:
    """Riassunto narrativo con un modello free (import locali: il digest funziona anche senza rete)."""
    from config import Config
    from providers import build_provider

    cfg = Config.from_env()
    spec = cfg.resolve_spec("project-manager")
    provider, model_id, label = build_provider(cfg, spec)
    text = provider.complete(NARRATE_SYSTEM, digest, model_id)
    return f"\n## Riassunto del coordinatore (`{label}`)\n\n{text.strip()}\n"


def main() -> None:
    ap = argparse.ArgumentParser(description="Briefing deterministico di inizio giornata")
    ap.add_argument("--json", action="store_true", help="Output machine-readable")
    ap.add_argument("--narrate", action="store_true", help="Aggiunge un riassunto da modello free")
    ap.add_argument("--quiet", action="store_true", help="Scrive solo il file, non stampa")
    args = ap.parse_args()

    data = collect()
    if args.json:
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return

    text = render(data)
    if args.narrate:
        try:
            text += narrate(text)
        except Exception as e:  # noqa: BLE001 — il digest resta valido anche se l'LLM fallisce
            text += f"\n## Riassunto del coordinatore\n\n_(non disponibile: {e})_\n"

    BRIEFING_PATH.write_text(text, encoding="utf-8")
    if not args.quiet:
        print(text)
        print(f"📄 Scritto in {BRIEFING_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

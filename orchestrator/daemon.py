#!/usr/bin/env python3
"""Daemon locale — tiene il team di agenti attivo sul tuo PC mentre sviluppi.

A intervalli regolari:
  1. una volta al giorno esegue il Model Curator (mantiene i modelli aggiornati);
  2. processa in PARALLELO gli eventuali task 'todo' della board (genera proposte).

È pensato per girare in un terminale mentre lavori: `python3 orchestrator/daemon.py`.
Ctrl-C per fermarlo. Non fa nulla di distruttivo: genera proposte (da revisionare) e
aggiorna i modelli tracciando tutto.

Config (variabili d'ambiente):
  ORCH_MODE=live + OPENROUTER_API_KEY  → usa i modelli reali (altrimenti mock/dry-run)
  ORCH_DAEMON_POLL   secondi tra un ciclo e l'altro (default 300 = 5 min)
  ORCH_MAX_PARALLEL  task in parallelo per ondata (default 3)
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from board import counts, load_board
from config import Config
from orchestrator import run

ORCH_DIR = Path(__file__).resolve().parent
STATE_FILE = ORCH_DIR / ".daemon_state.json"
CURATOR = ORCH_DIR / "curator.py"


def _now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def _run_curator_if_due(state: dict) -> None:
    """Esegue il curator al massimo una volta al giorno."""
    today = _dt.date.today().isoformat()
    if state.get("last_curator_date") == today:
        return
    print(f"[{_now()}] 🧬 Model Curator (giornaliero)…")
    try:
        subprocess.run([sys.executable, str(CURATOR)], check=False, timeout=180)
        state["last_curator_date"] = today
        _save_state(state)
    except Exception as e:  # noqa: BLE001 — non deve fermare il daemon
        print(f"[{_now()}] ⚠ Curator non riuscito: {e}")


def main() -> int:
    poll = int(os.environ.get("ORCH_DAEMON_POLL", "300"))
    cfg = Config.from_env()
    print("=" * 60)
    print(" DAEMON LOCALE — Team di agenti (Business Game)")
    print(f" Modalità: {cfg.describe()}")
    print(f" Ciclo ogni {poll}s · parallelismo {cfg.max_parallel} · Ctrl-C per fermare")
    print("=" * 60)

    state = _load_state()
    try:
        while True:
            try:
                _run_curator_if_due(state)
                board = load_board()
                todo = counts(board).get("todo", 0)
                if todo:
                    print(f"[{_now()}] ▶ {todo} task 'todo' → eseguo un giro parallelo…")
                    run(cfg)
                else:
                    print(f"[{_now()}] 💤 nessun task 'todo' · board={counts(board)}")
            except Exception as e:  # noqa: BLE001 — il daemon deve sopravvivere agli errori
                print(f"[{_now()}] ⚠ errore nel ciclo (continuo): {e}")
            time.sleep(poll)
    except KeyboardInterrupt:
        print(f"\n[{_now()}] 🛑 Daemon fermato. A presto.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

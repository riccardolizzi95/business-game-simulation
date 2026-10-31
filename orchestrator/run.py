#!/usr/bin/env python3
"""Entrypoint dell'orchestratore autonomo del team di agenti.

Esempi:
    python3 orchestrator/run.py                 # dry-run (mock, gratis)
    ORCH_MODE=live NVIDIA_API_KEY=xxx python3 orchestrator/run.py   # con NVIDIA
    python3 orchestrator/run.py --max-iters 2   # limita i task per run
"""
from __future__ import annotations

import argparse

from board import counts, load_board
from config import Config
from orchestrator import run


def _run_single_code_task(cfg, board, task_id: str, attempts: int) -> None:
    """Esegue un solo task di codice, utile per provare un ruolo senza far girare tutta la board."""
    from board import save_board, set_status
    from coder import run_code_task, write_report

    task = next((t for t in board["tasks"] if t["id"] == task_id), None)
    if task is None:
        print(f"❌ Task inesistente: {task_id}")
        return
    if task.get("kind") != "code":
        print(f"⚠️  {task_id} non è di tipo 'code' (kind={task.get('kind')!r}): lo eseguo comunque.")

    print(f"\n🔧 {task_id} — {task['title']}\n   ruolo: {task['role']} · tentativi max: {attempts}\n")
    result = run_code_task(cfg, task, max_attempts=attempts)
    report = write_report(result, task)

    for a in result.attempts:
        print(f"   tentativo {a.n}: {a.edits} blocchi · {a.gate or 'gate non raggiunto'}")
        for err in a.errors:
            print(f"      ❌ {err}")
    if result.ok:
        print(f"\n✅ GATE VERDE al tentativo {result.n_attempts} · branch `{result.branch}` commit `{result.commit}`")
        print(f"   File: {', '.join(result.files)}")
        print(f"   Revisiona con:  git diff main..{result.branch}")
        set_status(board, task_id, "review")
    else:
        print(f"\n❌ Non superato: {result.reason}")
        print(f"   Il branch `{result.branch}` resta disponibile per capire cosa ha provato.")
        set_status(board, task_id, "blocked")
    save_board(board)
    print(f"📄 Report: {report.name}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Orchestratore autonomo del team di agenti")
    ap.add_argument("--max-iters", type=int, default=None, help="Task massimi per questo run")
    ap.add_argument("--status", action="store_true", help="Mostra solo lo stato della board")
    ap.add_argument("--code", metavar="TASK_ID", help="Esegue UN task di codice (branch + gate)")
    ap.add_argument("--attempts", type=int, default=4, help="Tentativi max per un task di codice")
    args = ap.parse_args()

    cfg = Config.from_env()
    if args.max_iters is not None:
        cfg.max_iterations = args.max_iters

    board = load_board()
    print("=" * 60)
    print(" ORCHESTRATORE — Team di agenti (Business Game)")
    print(f" Modalità: {cfg.describe()}")
    print(f" Board:    {counts(board)}")
    print("=" * 60)

    if args.status:
        return

    if args.code:
        _run_single_code_task(cfg, board, args.code, args.attempts)
        return

    produced = run(cfg)
    print(f"\n✔ Fatto: {produced} proposta/e generata/e in orchestrator/proposals/")
    print("  Le proposte sono in stato 'review': vanno approvate prima di applicarle.")


if __name__ == "__main__":
    main()

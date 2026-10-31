#!/usr/bin/env python3
"""Sessione di lavoro a tempo: fa avanzare la board per una durata data, senza sorveglianza.

Differenza da `run.py`: quello fa un giro e si ferma al primo checkpoint. Questo insiste per
un'ora — e soprattutto **non si arrende al primo task bloccato**. I modelli gratuiti falliscono
per motivi transitori (rate limit, risposta vuota, formato sbagliato): se un task si blocca e
resta bloccato, tutta la catena a valle non parte più e l'ora è sprecata. Qui un task bloccato
torna in coda un numero limitato di volte.

    python3 orchestrator/session.py --minutes 60

Non fa git push e non tocca `main`: il lavoro resta sui branch `agent/*`.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import time

from board import counts, deps_satisfied, load_board, save_board
from config import Config
from orchestrator import run


def _eligible(board: dict) -> list:
    """Task pronti a partire davvero: 'todo' E con le dipendenze soddisfatte."""
    return [t for t in board["tasks"] if t["status"] == "todo" and deps_satisfied(t, board)]

MAX_RETRIES_PER_TASK = 4   # quante volte un task bloccato torna in coda
PAUSE_BETWEEN_ROUNDS_S = 20


MAX_SPEND_USD = 2.00   # tetto per singola sessione non sorvegliata


def _now() -> str:
    return _dt.datetime.now().strftime("%H:%M:%S")


def credit_usage() -> float | None:
    """Spesa cumulata sul credito OpenRouter, o None se non leggibile.

    Con modelli a pagamento in catena una sessione non sorvegliata muove soldi veri: senza un
    tetto, un ciclo di retry impazzito potrebbe consumare il credito mentre nessuno guarda.
    """
    import json as _json
    import os
    import urllib.request

    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        return None
    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/credits", headers={"Authorization": f"Bearer {key}"}
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            return float(_json.load(resp)["data"].get("total_usage") or 0.0)
    except Exception:  # noqa: BLE001 — il controllo di spesa non deve fermare il lavoro
        return None


def _revive_blocked(retries: dict[str, int]) -> list[str]:
    """Rimette in 'todo' i task bloccati che hanno ancora tentativi disponibili."""
    board = load_board()
    revived: list[str] = []
    for t in board["tasks"]:
        if t["status"] != "blocked":
            continue
        used = retries.get(t["id"], 0)
        if used < MAX_RETRIES_PER_TASK:
            retries[t["id"]] = used + 1
            t["status"] = "todo"
            revived.append(f"{t['id']} (tentativo {used + 2})")
    if revived:
        save_board(board)
    return revived


def main() -> None:
    ap = argparse.ArgumentParser(description="Sessione di lavoro autonoma a tempo")
    ap.add_argument("--minutes", type=float, default=60.0, help="Durata massima in minuti")
    ap.add_argument("--max-iters", type=int, default=6, help="Task per giro")
    args = ap.parse_args()

    cfg = Config.from_env()
    cfg.max_iterations = args.max_iters
    deadline = time.time() + args.minutes * 60
    retries: dict[str, int] = {}
    round_n = 0
    total = 0

    start_usage = credit_usage()
    print(f"[{_now()}] Sessione avviata · durata max {args.minutes:.0f} min · {cfg.describe()}")
    if start_usage is not None:
        print(f"[{_now()}] Credito già speso: ${start_usage:.4f} · tetto per questa sessione: ${MAX_SPEND_USD:.2f}")
    print(f"[{_now()}] Board iniziale: {counts(load_board())}", flush=True)

    while time.time() < deadline:
        round_n += 1
        print(f"\n[{_now()}] ══ Giro {round_n} ══", flush=True)
        try:
            produced = run(cfg)
        except Exception as e:  # noqa: BLE001 — una sessione non sorvegliata non deve morire
            print(f"[{_now()}] ⚠️  Giro fallito: {e}", flush=True)
            produced = 0
        total += produced

        board = load_board()
        state = counts(board)
        spent = credit_usage()
        speso = f" · speso ${spent - start_usage:.4f}" if spent is not None and start_usage is not None else ""
        print(f"[{_now()}] Board: {state} · prodotti finora: {total}{speso}", flush=True)

        if spent is not None and start_usage is not None and (spent - start_usage) >= MAX_SPEND_USD:
            print(
                f"[{_now()}] 🛑 Tetto di spesa raggiunto (${MAX_SPEND_USD:.2f}): mi fermo.",
                flush=True,
            )
            break

        # Condizione giusta: non "non ci sono task todo" ma "non ce n'è nessuno ESEGUIBILE".
        # Con la vecchia condizione un task bloccato con dei dipendenti a valle lasciava 4 task
        # 'todo' non eleggibili: la sessione non riviveva nulla e girava a vuoto fino allo scadere.
        if not _eligible(board):
            revived = _revive_blocked(retries)
            if revived:
                print(f"[{_now()}] ↻ Rimessi in coda: {', '.join(revived)}", flush=True)
            else:
                print(f"[{_now()}] ✔ Niente di eseguibile e nessun retry disponibile: mi fermo.", flush=True)
                break

        if time.time() < deadline:
            time.sleep(PAUSE_BETWEEN_ROUNDS_S)

    print(f"\n[{_now()}] Sessione conclusa · {round_n} giri · {total} output prodotti")
    print(f"[{_now()}] Board finale: {counts(load_board())}", flush=True)


if __name__ == "__main__":
    main()

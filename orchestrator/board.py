"""Board operativa dei task: fonte di verità dell'orchestratore.

Formato JSON (machine-readable). Stati: todo → in-progress → review → done.
Le proposte generate finiscono in review (mai 'done' automatico: serve la revisione).
"""
from __future__ import annotations

import json
from typing import Any, Optional

from config import ORCH_DIR

BOARD_PATH = ORCH_DIR / "board.json"
# `blocked` = fallito per un intoppo, si può riprovare.
# `abandoned` = accantonato di proposito (superato da un altro task, scope cambiato): NON si
# riprova mai. Senza questa distinzione la sessione autonoma resuscita lavoro già scartato —
# è successo davvero: tre task messi da parte sono stati rifatti da capo sprecando un giro.
VALID_STATUS = {"todo", "in-progress", "review", "done", "blocked", "abandoned"}


def load_board() -> dict[str, Any]:
    return json.loads(BOARD_PATH.read_text(encoding="utf-8"))


def save_board(board: dict[str, Any]) -> None:
    BOARD_PATH.write_text(json.dumps(board, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _by_id(board: dict[str, Any], task_id: str) -> Optional[dict[str, Any]]:
    for t in board["tasks"]:
        if t["id"] == task_id:
            return t
    return None


def deps_satisfied(task: dict[str, Any], board: dict[str, Any]) -> bool:
    completed = {t["id"] for t in board["tasks"] if t["status"] in ("review", "done")}
    return all(dep in completed for dep in task.get("deps", []))


def next_todo(board: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Prossimo task 'todo' con le dipendenze soddisfatte (ordine di board = priorità)."""
    for t in board["tasks"]:
        if t["status"] == "todo" and deps_satisfied(t, board):
            return t
    return None


def set_status(board: dict[str, Any], task_id: str, status: str) -> None:
    if status not in VALID_STATUS:
        raise ValueError(f"Stato non valido: {status}")
    task = _by_id(board, task_id)
    if task is None:
        raise KeyError(f"Task inesistente: {task_id}")
    task["status"] = status


def counts(board: dict[str, Any]) -> dict[str, int]:
    out: dict[str, int] = {}
    for t in board["tasks"]:
        out[t["status"]] = out.get(t["status"], 0) + 1
    return out

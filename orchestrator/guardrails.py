"""Guardrail dell'orchestratore.

Principio: l'autonomia deve essere SICURA. L'orchestratore non compie azioni irreversibili
o esterne. Le sue uniche scritture consentite sono le cartelle qui sotto e la board.
Le proposte non vengono MAI applicate automaticamente al codice: servono revisione + approvazione.
"""
from __future__ import annotations

from config import ORCH_DIR

# Aree scrivibili dall'orchestratore (tutto il resto è di sola lettura).
PROPOSALS_DIR = ORCH_DIR / "proposals"
RUNS_DIR = ORCH_DIR / "runs"

# Azioni che l'orchestratore NON esegue mai (documentate; richiedono un umano).
FORBIDDEN_ACTIONS = [
    "modificare direttamente il codice di produzione",
    "git push / deploy",
    "installare dipendenze o eseguire comandi di sistema arbitrari",
    "qualsiasi spesa o azione su servizi esterni",
    "cancellare file",
]


def ensure_dirs() -> None:
    PROPOSALS_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)

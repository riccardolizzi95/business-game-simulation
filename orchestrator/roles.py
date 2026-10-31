"""Caricamento delle persona dei ruoli.

Unica fonte di verità: i file `.claude/agents/*.md`. Così l'orchestratore autonomo e i
subagent di Claude Code condividono ESATTAMENTE le stesse definizioni di ruolo.
"""
from __future__ import annotations

import re

from config import ROOT

AGENTS_DIR = ROOT / ".claude" / "agents"

_FRONTMATTER = re.compile(r"^---\s*\n.*?\n---\s*\n(.*)$", re.S)


def load_persona(role_slug: str) -> str:
    """Ritorna il system prompt del ruolo (corpo del file, senza frontmatter YAML)."""
    path = AGENTS_DIR / f"{role_slug}.md"
    if not path.exists():
        return f"Sei un membro del team di sviluppo con ruolo '{role_slug}'."
    text = path.read_text(encoding="utf-8")
    m = _FRONTMATTER.match(text)
    return (m.group(1) if m else text).strip()

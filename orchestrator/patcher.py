"""Parsing e applicazione delle modifiche al codice prodotte dagli agenti.

Perché non usiamo i diff unificati: i modelli gratuiti sbagliano quasi sempre numeri di riga e
righe di contesto, e un diff che non applica è un giro sprecato. Qui usiamo due formati robusti
e verificabili:

    ### FILE: percorso/relativo.ts        → riscrittura completa (file piccoli o nuovi)
    ```ts
    <contenuto completo>
    ```

    ### EDIT: percorso/relativo.ts        → sostituzione mirata (file grandi)
    <<<<<<< SEARCH
    <testo esistente, esatto>
    =======
    <testo nuovo>
    >>>>>>> REPLACE

Ogni SEARCH deve comparire ESATTAMENTE una volta nel file: zero occorrenze o più di una sono
errori espliciti, rimandati al modello nel giro successivo invece di essere indovinati.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

# Percorsi che gli agenti possono modificare (relativi alla radice del repo).
WRITABLE_PREFIXES = (
    "apps/web/src/",
    "apps/web/public/",
    "docs/",
    "project-management/",
)

# Percorsi vietati anche se dentro un'area scrivibile: mai segreti, mai il sistema stesso.
FORBIDDEN_PATTERNS = (
    ".env",
    "orchestrator/",
    ".github/",
    ".claude/",
    "node_modules/",
)

_FILE_BLOCK = re.compile(
    r"^###\s*FILE:\s*(?P<path>[^\s`]+)\s*\n+```[a-zA-Z0-9+-]*\n(?P<body>.*?)\n?```",
    re.M | re.S,
)

_EDIT_BLOCK = re.compile(
    r"^###\s*EDIT:\s*(?P<path>[^\s`]+)\s*\n+"
    r"(?:```[a-zA-Z0-9+-]*\n)?"
    r"<{5,9}\s*SEARCH\s*\n(?P<search>.*?)\n={5,9}\s*\n(?P<replace>.*?)\n>{5,9}\s*REPLACE",
    re.M | re.S,
)


@dataclass
class Edit:
    path: str
    kind: str          # "file" (riscrittura) | "edit" (search/replace)
    body: str = ""     # contenuto completo, per kind="file"
    search: str = ""
    replace: str = ""


class PatchError(Exception):
    """Errore applicativo con messaggio pensato per essere rimandato al modello."""


def is_writable(rel_path: str) -> tuple[bool, str]:
    """Il percorso è dentro le aree consentite e fuori da quelle vietate?"""
    p = rel_path.strip().lstrip("./")
    if p.startswith("/") or ".." in Path(p).parts:
        return False, f"percorso non relativo o con '..': {rel_path}"
    for bad in FORBIDDEN_PATTERNS:
        if bad in p:
            return False, f"percorso vietato ('{bad}'): {rel_path}"
    if not any(p.startswith(prefix) for prefix in WRITABLE_PREFIXES):
        return False, (
            f"percorso fuori dalle aree scrivibili {WRITABLE_PREFIXES}: {rel_path}"
        )
    return True, ""


def parse_edits(text: str) -> list[Edit]:
    """Estrae tutti i blocchi di modifica dall'output del modello (ordine di apparizione)."""
    found: list[tuple[int, Edit]] = []
    for m in _FILE_BLOCK.finditer(text):
        found.append((m.start(), Edit(path=m.group("path"), kind="file", body=m.group("body"))))
    for m in _EDIT_BLOCK.finditer(text):
        found.append((
            m.start(),
            Edit(
                path=m.group("path"),
                kind="edit",
                search=m.group("search"),
                replace=m.group("replace"),
            ),
        ))
    found.sort(key=lambda pair: pair[0])
    return [edit for _, edit in found]


def apply_edit(root: Path, edit: Edit) -> str:
    """Applica una singola modifica sotto `root`. Ritorna una riga di log, o alza PatchError."""
    ok, reason = is_writable(edit.path)
    if not ok:
        raise PatchError(f"RIFIUTATO {edit.path}: {reason}")

    target = root / edit.path
    if edit.kind == "file":
        target.parent.mkdir(parents=True, exist_ok=True)
        existed = target.exists()
        target.write_text(edit.body.rstrip("\n") + "\n", encoding="utf-8")
        return f"{'riscritto' if existed else 'creato'} {edit.path} ({len(edit.body.splitlines())} righe)"

    if not target.exists():
        raise PatchError(f"EDIT su file inesistente: {edit.path}. Usa '### FILE:' per crearlo.")
    original = target.read_text(encoding="utf-8")
    occurrences = original.count(edit.search)
    if occurrences == 0:
        head = edit.search.strip().splitlines()[0][:80] if edit.search.strip() else "(vuoto)"
        raise PatchError(
            f"SEARCH non trovato in {edit.path}. Il blocco cercato inizia con: «{head}». "
            f"Il testo va copiato ESATTAMENTE dal file, spazi inclusi."
        )
    if occurrences > 1:
        raise PatchError(
            f"SEARCH ambiguo in {edit.path}: {occurrences} occorrenze. "
            f"Allarga il blocco SEARCH finché non è unico."
        )
    target.write_text(original.replace(edit.search, edit.replace, 1), encoding="utf-8")
    return f"modificato {edit.path} (1 sostituzione)"


def apply_all(root: Path, edits: list[Edit]) -> tuple[list[str], list[str]]:
    """Applica tutte le modifiche. Ritorna (log dei successi, errori da rimandare al modello)."""
    applied: list[str] = []
    errors: list[str] = []
    for edit in edits:
        try:
            applied.append(apply_edit(root, edit))
        except PatchError as e:
            errors.append(str(e))
    return applied, errors


def touched_paths(edits: list[Edit]) -> list[str]:
    seen: list[str] = []
    for e in edits:
        if e.path not in seen:
            seen.append(e.path)
    return seen

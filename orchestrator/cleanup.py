#!/usr/bin/env python3
"""Pulizia SICURA dei branch e dei worktree degli agenti.

Nasce da un errore concreto: per ripulire prima di una sessione ho lanciato
`git branch --list 'agent/*' | xargs -n1 git branch -D`, che ha cancellato anche i branch di
task riusciti ma non ancora uniti a `main`. Il lavoro di due agenti è stato distrutto e
recuperato solo perché i commit erano ancora nel reflog come dangling.

Regola: si cancella solo ciò che è già in `main`. Tutto il resto va elencato, non eliminato.

    python3 orchestrator/cleanup.py           # mostra cosa farebbe
    python3 orchestrator/cleanup.py --apply   # cancella i branch già uniti
"""
from __future__ import annotations

import argparse
import subprocess

from config import ROOT


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout.strip()


def agent_branches() -> list[str]:
    out = _git("for-each-ref", "--format=%(refname:short)", "refs/heads/agent")
    return [b for b in out.splitlines() if b.strip()]


def is_merged(branch: str) -> bool:
    """Il branch è già interamente contenuto in main?"""
    return _git("rev-list", "--count", f"main..{branch}") == "0"


def main() -> None:
    ap = argparse.ArgumentParser(description="Pulizia sicura dei branch degli agenti")
    ap.add_argument("--apply", action="store_true", help="Cancella davvero (senza: solo anteprima)")
    args = ap.parse_args()

    subprocess.run(["git", "worktree", "prune"], cwd=ROOT, check=False)
    merged, unmerged = [], []
    for b in agent_branches():
        (merged if is_merged(b) else unmerged).append(b)

    print(f"Branch degli agenti: {len(merged) + len(unmerged)}\n")
    if merged:
        print("Già uniti a main — si possono cancellare:")
        for b in merged:
            print(f"  ✓ {b}")
    if unmerged:
        print("\n⚠️  NON uniti a main — contengono lavoro che andrebbe perso:")
        for b in unmerged:
            n = _git("rev-list", "--count", f"main..{b}")
            print(f"  ! {b}  ({n} commit non in main) → git diff main..{b}")

    if not args.apply:
        print("\n(anteprima: rilancia con --apply per cancellare quelli già uniti)")
        return

    for b in merged:
        subprocess.run(["git", "branch", "-D", b], cwd=ROOT, capture_output=True, check=False)
    print(f"\n✔ Cancellati {len(merged)} branch già uniti. Gli altri {len(unmerged)} restano.")


if __name__ == "__main__":
    main()

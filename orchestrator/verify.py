"""Gate di verifica: il giudice oggettivo del lavoro degli agenti.

È il pezzo che rende sicura l'autonomia. Un modello gratuito da solo non è affidabile sul
codice; un modello gratuito **più** un gate deterministico che dice sì/no in 8 secondi lo è
abbastanza, perché l'errore torna indietro e il modello riprova a costo zero.

Il gate non usa LLM: sono i test e il compilatore del progetto.
"""
from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

# Next/vitest colorano l'output: le sequenze ANSI sono illeggibili per il modello e sprecano
# token preziosi nel prompt di retry.
_ANSI = re.compile(r"\x1b\[[0-9;]*[a-zA-Z]")


def strip_ansi(text: str) -> str:
    return _ANSI.sub("", text)

# Passi del gate, in ordine: il primo che fallisce interrompe (fail fast).
# `{web}` viene sostituito col percorso di apps/web dentro il worktree.
# `typecheck` c'è perché `next build` NON controlla i tipi dei file di test: senza questo passo
# gli errori di tipo nei test si accumulano invisibili (ne erano rimasti 8 fino al 2026-07-28).
# Ordine per costo crescente, così il fallimento più probabile costa meno: ~0,6s / ~4s / ~20s.
GATE_STEPS: list[tuple[str, list[str]]] = [
    ("test", ["npm", "--prefix", "{web}", "test"]),
    ("typecheck", ["npm", "--prefix", "{web}", "run", "typecheck"]),
    ("build", ["npm", "--prefix", "{web}", "run", "build"]),
]

# La build del gate scrive in una cartella SUA: `next build` e `next dev` condividono `.next`, e
# una build lanciata a dev server acceso gli cancella i chunk sotto i piedi (404 su main-app.js,
# pagina senza JavaScript). Vedi `distDir` in apps/web/next.config.mjs.
GATE_ENV = {"NEXT_DIST_DIR": ".next-gate"}

STEP_TIMEOUT_S = 420
FEEDBACK_TAIL_CHARS = 2500  # quanto output di errore rimandiamo al modello


@dataclass
class GateResult:
    ok: bool
    failed_step: str = ""
    output: str = ""                       # output completo del passo fallito
    passed: list[str] = field(default_factory=list)

    def feedback(self) -> str:
        """Messaggio da rimandare al modello per il tentativo successivo."""
        if self.ok:
            return ""
        tail = strip_ansi(self.output)[-FEEDBACK_TAIL_CHARS:]
        return (
            f"Il gate di verifica è FALLITO al passo `{self.failed_step}`.\n"
            f"Passi superati prima del fallimento: {', '.join(self.passed) or 'nessuno'}.\n\n"
            f"Output dell'errore (coda):\n```\n{tail}\n```\n"
            f"Correggi la causa reale dell'errore. Non disattivare né riscrivere i test per farli "
            f"passare: se credi che il test sia sbagliato, spiegalo invece di modificarlo."
        )

    def summary(self) -> str:
        if self.ok:
            return f"gate OK ({', '.join(self.passed)})"
        return f"gate FALLITO al passo '{self.failed_step}'"


def run_gate(worktree: Path) -> GateResult:
    """Esegue test e build dentro il worktree. Nessuna scrittura fuori da lì."""
    web = str(worktree / "apps" / "web")
    passed: list[str] = []
    for name, template in GATE_STEPS:
        cmd = [part.replace("{web}", web) for part in template]
        try:
            proc = subprocess.run(
                cmd, cwd=worktree, capture_output=True, text=True,
                timeout=STEP_TIMEOUT_S, check=False,
                env={**os.environ, **GATE_ENV},
            )
        except subprocess.TimeoutExpired:
            return GateResult(
                ok=False, failed_step=name, passed=passed,
                output=f"Timeout: il passo '{name}' ha superato {STEP_TIMEOUT_S}s.",
            )
        except OSError as e:
            return GateResult(
                ok=False, failed_step=name, passed=passed,
                output=f"Impossibile eseguire {' '.join(cmd)}: {e}",
            )
        if proc.returncode != 0:
            return GateResult(
                ok=False, failed_step=name, passed=passed,
                output=(proc.stdout or "") + "\n" + (proc.stderr or ""),
            )
        passed.append(name)
    return GateResult(ok=True, passed=passed)

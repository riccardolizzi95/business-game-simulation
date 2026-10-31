#!/usr/bin/env python3
"""Motore di RACCOLTA REQUISITI iterativa (modelli gratuiti, autonomo e PRUDENTE).

Ogni iterazione:
  1. FASE BUSINESS: i 10 agenti di dominio scrivono/aggiornano i requisiti del loro settore.
  2. CONSOLIDAMENTO: assembla i domini per intero + una sintesi trasversale breve del PM.
  3. FASE IT: Architect + Game Designer valutano fattibilità/game design.
  4. GATE DI CONVERGENZA: il team IT decide se serve un ALTRO giro col Business (CONTINUE)
     oppure se i requisiti bastano per iniziare lo sprint (CONVERGED).

SICUREZZE (dalla retrospettiva):
  - **Throttling**: poche chiamate in parallelo + pausa → non satura il rate limit.
  - **Stop ai rate limit / errori di massa**: se troppi domini falliscono, NON consolida e si
    ferma, PRESERVANDO il documento buono (niente più sovrascritture con errori).
  - **Cap per-run**: al massimo N iterazioni per esecuzione (ripartibile su più giorni).

Uso:
  python3 orchestrator/requirements.py --iterations 20   # target totale (finisce quando IT dice CONVERGED o si raggiunge il target)
  python3 orchestrator/requirements.py --one             # una sola iterazione
  python3 orchestrator/requirements.py --reconsolidate   # rifà solo il consolidato dell'ultimo giro
  python3 orchestrator/requirements.py --status
Variabili: ORCH_REQ_PARALLEL (default 2), ORCH_REQ_THROTTLE sec (default 2.0), ORCH_REQ_MAX_PER_RUN (default 3)
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from config import ROOT, Config
from providers import build_provider
from roles import load_persona

REQ_DIR = Path(__file__).resolve().parent / "requirements"
ITER_DIR = REQ_DIR / "iterations"
STATE = REQ_DIR / "state.json"
REQUIREMENTS_MD = REQ_DIR / "REQUIREMENTS.md"
REQUIREMENTS_BAK = REQ_DIR / "REQUIREMENTS.bak.md"
IT_FEEDBACK_MD = REQ_DIR / "it-feedback.md"

BUSINESS_ROLES = [
    "business-operations", "business-commerciale", "business-marketing", "business-hr",
    "business-controlling", "business-amministrativo", "business-supply-chain",
    "business-finance", "business-rd-prodotto", "business-strategy",
]
DOMAIN_TITLES = {
    "business-operations": "Operations / Produzione", "business-commerciale": "Commerciale / Vendite",
    "business-marketing": "Marketing", "business-hr": "HR / Risorse Umane",
    "business-controlling": "Controlling", "business-amministrativo": "Amministrazione / Contabilità",
    "business-supply-chain": "Supply Chain", "business-finance": "Finance / Tesoreria",
    "business-rd-prodotto": "R&D / Prodotto", "business-strategy": "Strategia / Direzione",
}
IT_REVIEWERS = ["software-architect", "game-designer"]

REQ_PARALLEL = int(os.environ.get("ORCH_REQ_PARALLEL", "2"))
THROTTLE_S = float(os.environ.get("ORCH_REQ_THROTTLE", "2.0"))
MAX_PER_RUN = int(os.environ.get("ORCH_REQ_MAX_PER_RUN", "3"))
MIN_DOMAINS_OK = 6  # sotto questa soglia di domini "reali", il giro è considerato fallito
DEFAULT_TARGET = 20


def _now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _read(path: Path, limit: int = 6000) -> str:
    if not path.exists():
        return ""
    t = path.read_text(encoding="utf-8")
    return t if len(t) <= limit else t[:limit] + "\n…(troncato)"


def _domain_body(path: Path) -> str:
    lines = path.read_text(encoding="utf-8").splitlines()
    if lines and lines[0].startswith("# "):
        lines = lines[1:]
    return "\n".join(lines).strip()


def _is_real(path: Path) -> bool:
    """True se il file contiene contenuto reale (non una nota d'errore né troppo corto)."""
    if not path.exists():
        return False
    text = path.read_text(encoding="utf-8")
    first = text.splitlines()[0] if text.splitlines() else ""
    if "ERRORE" in first or "mock" in first.lower():
        return False  # errore o fallback mock (es. chiave provider mancante) → non è contenuto reale
    return len(_domain_body(path)) >= 200


def _project_context() -> str:
    parts = []
    for name, limit in [("00-visione.md", 1800), ("06-visione-motore-adattivo.md", 1800),
                        ("01-game-design.md", 1800), ("11-requisiti-utente.md", 2600)]:
        p = ROOT / "docs" / name
        if p.exists():
            parts.append(f"### {name}\n{_read(p, limit)}")
    return "\n\n".join(parts)


def _load_state() -> dict:
    if STATE.exists():
        try:
            return json.loads(STATE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"iteration": 0, "target": DEFAULT_TARGET, "done": False, "converged": False}


def _save_state(s: dict) -> None:
    REQ_DIR.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(s, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _latest_iter_dir() -> Path | None:
    if not ITER_DIR.exists():
        return None
    dirs = sorted(ITER_DIR.glob("iter-*"))
    return dirs[-1] if dirs else None


def _shared_rules() -> str:
    """Regole trasversali condivise (docs/12), iniettate nel prompt di ogni agente."""
    p = ROOT / "docs" / "12-regole-agenti.md"
    return _read(p, 1800) if p.exists() else ""


def _agent(cfg: Config, role: str, instruction: str, context: str) -> tuple[str, str]:
    provider, model_id, label = build_provider(cfg, cfg.resolve_spec(role))
    persona = load_persona(role)
    system = (
        persona
        + "\n\n---\n### Regole condivise del team (docs/12)\n" + _shared_rules()
        + "\n\n---\nPartecipi a una RACCOLTA REQUISITI iterativa per il Business Game. "
        "Scrivi in italiano, strutturato e conciso. Output = REQUISITI di gioco (leve, EFFETTO "
        "SINGOLO di ogni leva per l'icona, KPI, interazioni, imprevisti), NON codice."
    )
    result = provider.complete(system, user := f"{instruction}\n\n## Contesto del progetto\n{context}", model_id)
    if not label.startswith("mock"):
        time.sleep(THROTTLE_S)  # throttling: non saturare il rate limit
    return result, label


def _run_parallel(cfg: Config, roles: list[str], instruction: str, context: str,
                  out_dir: Path, prefix: str) -> tuple[int, int, bool]:
    """Ritorna (n_ok, n_fail, rate_limited)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    n_ok = n_fail = 0
    rate_limited = False
    workers = min(REQ_PARALLEL, len(roles))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(_agent, cfg, r, instruction, context): r for r in roles}
        for fut in as_completed(futures):
            role = futures[fut]
            path = out_dir / f"{prefix}{role}.md"
            try:
                text, label = fut.result()
                path.write_text(f"# {role} — {_now()} [{label}]\n\n{text.strip()}\n", encoding="utf-8")
                print(f"   ✅ {role} [{label}]")
                n_ok += 1
            except Exception as e:  # noqa: BLE001
                msg = str(e)
                if "429" in msg or "Rate limit" in msg:
                    rate_limited = True
                path.write_text(f"# {role} — ERRORE {_now()}\n\n{msg}\n", encoding="utf-8")
                print(f"   ❌ {role}: {msg}")
                n_fail += 1
    return n_ok, n_fail, rate_limited


def consolidate(cfg: Config, it_dir: Path, iteration: int) -> bool:
    """Assembla i domini reali + sintesi PM. Ritorna False (e NON tocca il doc) se il giro è debole."""
    real = [r for r in BUSINESS_ROLES if _is_real(it_dir / f"dom-{r}.md")]
    if len(real) < MIN_DOMAINS_OK:
        print(f"   ⚠ Solo {len(real)}/{len(BUSINESS_ROLES)} domini reali: consolidamento SALTATO, documento buono preservato.")
        return False

    ctx = _project_context()
    sections, domain_inputs = [], []
    for role in real:
        p = it_dir / f"dom-{role}.md"
        title = DOMAIN_TITLES.get(role, role)
        sections.append(f"### {title}\n\n{_domain_body(p)}")
        domain_inputs.append(f"## {title}\n{_read(p, 1800)}")
    domain_block = "\n\n---\n\n".join(sections)

    print("🔗 Consolidamento: sintesi trasversale (Project Manager)…")
    try:
        synthesis, _ = _agent(cfg, "project-manager",
            "Scrivi SOLO la SINTESI TRASVERSALE (NON ripetere i dettagli dei domini): (1) duplicati "
            "da unificare; (2) conflitti tra domini; (3) priorità MoSCoW delle leve principali; (4) "
            "elenco leve totali con icona/effetto singolo; (5) KPI del cruscotto; (6) eventi/imprevisti; "
            "(7) condizione di vittoria e orizzonte; (8) tensioni strategiche. Conciso e strutturato.",
            f"{ctx}\n\n### Requisiti dei domini (sintetici)\n" + "\n\n".join(domain_inputs))
        synthesis = synthesis.strip()
    except Exception as e:  # noqa: BLE001
        synthesis = f"_(sintesi trasversale non generata: {e})_"

    if REQUIREMENTS_MD.exists():  # backup del buono prima di sovrascrivere
        REQUIREMENTS_BAK.write_text(REQUIREMENTS_MD.read_text(encoding="utf-8"), encoding="utf-8")
    REQUIREMENTS_MD.write_text(
        f"# Requisiti del Business Game — consolidato (iterazione {iteration})\n\n"
        f"> Aggiornato dal team il {_now()}. Documento vivo. Domini inclusi: {len(real)}/{len(BUSINESS_ROLES)}.\n\n"
        "## Sintesi trasversale (PM)\n\n" + synthesis + "\n\n"
        "## Requisiti per dominio\n\n" + domain_block + "\n", encoding="utf-8")
    print(f"   ✅ consolidato ({len(real)} domini) → requirements/REQUIREMENTS.md")
    return True


def convergence_gate(cfg: Config, it_dir: Path) -> str:
    """Il team IT decide: CONVERGED (basta) o CONTINUE (serve un altro giro col Business)."""
    ctx = f"{_project_context()}\n\n### Requisiti consolidati\n{_read(REQUIREMENTS_MD, 4000)}\n\n### Feedback IT\n{_read(IT_FEEDBACK_MD, 3000)}"
    try:
        text, _ = _agent(cfg, "software-architect",
            "Sei il LEAD del team IT. In base ai requisiti consolidati e al feedback IT, decidi se "
            "serve un ALTRO giro di raccolta con il Business. Rispondi sulla PRIMA riga ESATTAMENTE "
            "con una parola: CONVERGED (requisiti sufficienti e coerenti per iniziare lo sprint) "
            "oppure CONTINUE (servono chiarimenti/miglioramenti). Poi una riga di motivazione.", ctx)
        (it_dir / "DECISION.md").write_text(f"# Decisione IT — {_now()}\n\n{text.strip()}\n", encoding="utf-8")
        first = (text.strip().splitlines() or [""])[0].upper()
        return "CONVERGED" if "CONVERGED" in first else "CONTINUE"
    except Exception as e:  # noqa: BLE001
        print(f"   ⚠ gate di convergenza non valutato ({e}) → CONTINUE")
        return "CONTINUE"


def one_iteration(cfg: Config, state: dict) -> str:
    """Ritorna 'ok' | 'converged' | 'failed'."""
    it = state["iteration"] + 1
    it_dir = ITER_DIR / f"iter-{it:02d}"
    ctx = _project_context()
    feedback_ctx = (f"{ctx}\n\n### Requisiti consolidati finora\n{_read(REQUIREMENTS_MD)}\n\n"
                    f"### Feedback IT dal giro precedente\n{_read(IT_FEEDBACK_MD) or '(nessuno)'}")

    print(f"\n🔁 Iterazione {it}/{state['target']} — FASE BUSINESS ({len(BUSINESS_ROLES)} domini, parallelismo {REQ_PARALLEL})")
    n_ok, n_fail, rl = _run_parallel(cfg, BUSINESS_ROLES,
        "Definisci o MIGLIORA i requisiti del tuo dominio: leve, effetto singolo (per l'icona), "
        "KPI, interazioni con gli altri reparti, imprevisti tipici.", feedback_ctx, it_dir, "dom-")
    if rl or n_ok < MIN_DOMAINS_OK:
        print(f"   ⛔ Giro debole (ok={n_ok}, fail={n_fail}, rate_limit={rl}). NON consolido, preservo il documento buono.")
        return "failed"

    if not consolidate(cfg, it_dir, it):
        return "failed"

    print(f"🛠  Iterazione {it} — FASE IT ({', '.join(IT_REVIEWERS)})")
    _run_parallel(cfg, IT_REVIEWERS,
        "Valuta i requisiti consolidati: fattibilità nel motore, cosa semplificare, rischi, e quali "
        "domande porre ai domini nel prossimo giro.",
        f"{ctx}\n\n### Requisiti consolidati\n{_read(REQUIREMENTS_MD)}", it_dir, "it-")
    it_texts = "\n\n".join(_read(p, 2500) for p in sorted(it_dir.glob("it-*.md")))
    IT_FEEDBACK_MD.write_text(f"# Feedback IT — iterazione {it} ({_now()})\n\n{it_texts}\n", encoding="utf-8")

    print("🧭 Gate di convergenza (il team IT decide se continuare)…")
    decision = convergence_gate(cfg, it_dir)
    print(f"   → decisione IT: {decision}")

    state["iteration"] = it
    if decision == "CONVERGED" or it >= state["target"]:
        state["done"] = True
        state["converged"] = decision == "CONVERGED"
    _save_state(state)
    return "converged" if decision == "CONVERGED" else "ok"


def run(cfg: Config, target: int | None, one: bool) -> None:
    REQ_DIR.mkdir(parents=True, exist_ok=True)
    state = _load_state()
    if target is not None:
        state["target"] = target
        state["done"] = state["iteration"] >= state["target"]
    _save_state(state)
    cap = 1 if one else MAX_PER_RUN
    print("=" * 60)
    print(" RACCOLTA REQUISITI — Business Game")
    print(f" Modalità: {cfg.describe()}")
    print(f" Iterazione {state['iteration']} / target {state['target']} · cap per-run {cap} · parallelismo {REQ_PARALLEL}")
    print("=" * 60)

    done_this_run = 0
    while not state.get("done") and done_this_run < cap:
        result = one_iteration(cfg, state)
        done_this_run += 1
        if result == "failed":
            print("\n⛔ Interrotto (rate limit / errori). Il documento buono è preservato. "
                  "Riprova più tardi con lo stesso comando: riparte da qui.")
            return
        if result == "converged":
            print("\n✅ Il team IT ha dichiarato i requisiti CONVERGENTI → pronti per lo SPRINT.")
            return
    if state.get("done"):
        print(f"\n🏁 Target raggiunto ({state['iteration']} iterazioni). Requisiti pronti per lo sprint.")
    else:
        print(f"\n⏸ Fatte {done_this_run} iterazioni (cap per-run). Rilancia per continuare (riparte da qui).")


def main() -> int:
    ap = argparse.ArgumentParser(description="Motore di raccolta requisiti iterativa")
    ap.add_argument("--iterations", type=int, default=None, help="Target totale di iterazioni")
    ap.add_argument("--one", action="store_true", help="Una sola iterazione")
    ap.add_argument("--reconsolidate", action="store_true", help="Rifà solo il consolidato dell'ultimo giro")
    ap.add_argument("--status", action="store_true", help="Mostra lo stato")
    args = ap.parse_args()
    cfg = Config.from_env()

    if args.status:
        s = _load_state()
        print(f"Iterazione {s['iteration']} / target {s['target']} · done={s.get('done')} · converged={s.get('converged')}")
        return 0
    if args.reconsolidate:
        it_dir = _latest_iter_dir()
        if it_dir is None:
            print("Nessuna iterazione da consolidare.")
            return 0
        print(f"Riconsolido {it_dir.name} · {cfg.describe()}")
        consolidate(cfg, it_dir, _load_state().get("iteration", 1))
        return 0

    run(cfg, args.iterations, args.one)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Model Curator AUTONOMO — controlla i modelli e mantiene models.json aggiornato.

Cosa fa (deterministico, senza LLM, adatto a girare schedulato):
  1. Scarica l'elenco dei modelli gratuiti da OpenRouter (o da un file locale per test).
  2. Per ogni modello OpenRouter usato in models.json, verifica se è ANCORA gratuito.
  3. Se un modello non è più gratuito, lo sostituisce con il miglior candidato libero della
     sua fascia (curator_policy.json).
  4. Traccia tutto in MODEL-WATCH.md e scrive notifiche in NOTIFICATIONS.md (che Claude
     leggerà alla prossima sessione).

Uso:
  python3 orchestrator/curator.py            # controlla e APPLICA le sostituzioni
  python3 orchestrator/curator.py --check    # solo report, nessuna modifica
  python3 orchestrator/curator.py --source <url|file>   # sorgente alternativa (test)

Sicurezza: modifica SOLO models.json, MODEL-WATCH.md, NOTIFICATIONS.md. Non tocca segreti.
Esce sempre con 0 anche se la rete non è disponibile (per non rompere lo scheduler).
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import urllib.request
from pathlib import Path

ORCH = Path(__file__).resolve().parent
ROOT = ORCH.parent
MODELS = ORCH / "models.json"
POLICY = ORCH / "curator_policy.json"
WATCH = ORCH / "MODEL-WATCH.md"
NOTIF = ROOT / "NOTIFICATIONS.md"
OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"


def _now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _is_zero(x) -> bool:
    try:
        return float(x) == 0.0
    except (TypeError, ValueError):
        return False


def fetch_free_ids(source: str) -> set[str]:
    """Ritorna gli id dei modelli con prompt=0 e completion=0. source = URL o file locale."""
    p = Path(source)
    if p.exists():
        data = json.loads(p.read_text(encoding="utf-8"))
    else:
        req = urllib.request.Request(source, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    free = set()
    for m in data.get("data", []):
        pricing = m.get("pricing", {})
        if _is_zero(pricing.get("prompt", "1")) and _is_zero(pricing.get("completion", "1")):
            free.add(m["id"])
    return free


def _openrouter_id(spec: str) -> str | None:
    """'openrouter:vendor/model:free' → 'vendor/model:free'. Altri provider → None (skip)."""
    if not spec.startswith("openrouter:"):
        return None
    return spec.split(":", 1)[1]


def _pick_replacement(tier: str, policy: dict, free: set[str]) -> str | None:
    for cand in policy["tier_candidates_openrouter"].get(tier, []):
        if f"{cand}:free" in free:
            return f"openrouter:{cand}:free"
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description="Model Curator autonomo")
    ap.add_argument("--check", action="store_true", help="solo report, non modifica i file")
    ap.add_argument("--daily", action="store_true", help="Esegue AL MASSIMO una volta al giorno (marker); safe da chiamare sempre")
    ap.add_argument("--source", default=OPENROUTER_MODELS_URL, help="URL o file JSON dei modelli")
    args = ap.parse_args()

    if args.daily:
        marker = ORCH / ".curator_last_run"
        today = _dt.date.today().isoformat()
        if marker.exists() and marker.read_text(encoding="utf-8").strip() == today:
            print(f"[curator] già eseguito oggi ({today}) — nessuna azione.")
            return 0
        marker.write_text(today + "\n", encoding="utf-8")

    try:
        free = fetch_free_ids(args.source)
    except Exception as e:  # noqa: BLE001 — non deve mai rompere lo scheduler
        print(f"[curator] Impossibile ottenere l'elenco dei modelli free: {e}. Nessuna modifica.")
        return 0
    if not free:
        print("[curator] Elenco free vuoto o inatteso. Nessuna modifica (prudenza).")
        return 0

    models = json.loads(MODELS.read_text(encoding="utf-8"))
    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    role_tiers = policy["role_tiers"]
    default_tier = policy.get("default_tier", "reasoning")

    changes: list[tuple[str, str, str, str]] = []  # (ruolo, vecchio, nuovo, motivo)
    alerts: list[str] = []                          # problemi senza soluzione automatica

    def evaluate_one(role: str, spec: str, tier: str, chain: list[str]) -> str:
        oid = _openrouter_id(spec)
        if oid is None:
            return spec  # provider non-openrouter: non verificabile qui, si lascia
        if not oid.endswith(":free"):
            return spec  # modello a pagamento SCELTO apposta (policy codice): non si tocca
        if oid in free:
            return spec  # ancora gratuito
        repl = _pick_replacement(tier, policy, free)
        if repl and repl != spec and repl not in chain:
            changes.append((role, spec, repl, f"'{oid}' non più gratuito → miglior free tier '{tier}'"))
            return repl
        alerts.append(f"'{oid}' (ruolo {role}) non più gratuito e NESSUNA alternativa free per la fascia '{tier}'")
        return spec

    def evaluate(role: str, spec, tier: str):
        """Uno spec può essere una stringa o una CATENA di escalation (lista di stringhe)."""
        if isinstance(spec, list):
            out = list(spec)
            for i, s in enumerate(spec):
                out[i] = evaluate_one(role, s, tier, out)
            return out
        return evaluate_one(role, spec, tier, [spec])

    models["default"] = evaluate("_default_", models["default"], default_tier)
    for role, spec in list(models.get("by_role", {}).items()):
        if spec:  # stringa non vuota o lista non vuota
            models["by_role"][role] = evaluate(role, spec, role_tiers.get(role, default_tier))

    applied = [c for c in changes if c[1] != c[2]]

    # Report a console
    print(f"[curator] {_now()} — free set: {len(free)} modelli · sostituzioni: {len(applied)} · alert: {len(alerts)}")
    for role, old, new, why in applied:
        print(f"  ↳ {role}: {old} → {new}  ({why})")
    for a in alerts:
        print(f"  ⚠ {a}")

    if args.check or (not applied and not alerts):
        if args.check:
            print("[curator] modalità --check: nessun file modificato.")
        return 0

    # Applica: scrivi models.json aggiornato
    if applied:
        MODELS.write_text(json.dumps(models, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Log su MODEL-WATCH.md
    with WATCH.open("a", encoding="utf-8") as f:
        f.write(f"\n### Run curator {_now()}\n")
        if applied:
            for role, old, new, why in applied:
                f.write(f"- **{role}**: `{old}` → `{new}` — {why}\n")
        if alerts:
            for a in alerts:
                f.write(f"- ⚠ {a}\n")

    # Notifiche per l'utente (le leggerà Claude alla prossima sessione)
    with NOTIF.open("a", encoding="utf-8") as f:
        f.write(f"\n## [ ] {_now()} — Model Curator\n")
        if applied:
            f.write(f"Sostituiti automaticamente {len(applied)} modello/i non più gratuito/i:\n")
            for role, old, new, why in applied:
                f.write(f"- {role}: `{old}` → `{new}`\n")
        if alerts:
            f.write("**Attenzione (azione manuale consigliata):**\n")
            for a in alerts:
                f.write(f"- {a}\n")

    print("[curator] Aggiornati models.json, MODEL-WATCH.md e NOTIFICATIONS.md.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

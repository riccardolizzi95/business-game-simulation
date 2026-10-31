"""Pagella dei modelli: quale modello riesce davvero, su quale tipo di lavoro.

Questa è la forma di auto-ottimizzazione che conta. La lista dei modelli in `models.json` è
un'ipotesi scritta a mano; qui teniamo il consuntivo di ciò che è successo davvero — chi ha
superato il gate, chi ha prodotto output non parsabile, chi è andato in rate limit — e
riordiniamo la catena di conseguenza.

Il segnale è OGGETTIVO (gate verde/rosso, blocchi riconosciuti sì/no), non un'autovalutazione
del modello su sé stesso.

Regola prudenziale: sotto `MIN_SAMPLES` osservazioni l'ordine configurato a mano non si tocca.
Con pochi dati il tasso di successo è rumore, e riordinare sul rumore peggiora le cose.
"""
from __future__ import annotations

import datetime as _dt
import json
from pathlib import Path
from typing import Any

from config import ORCH_DIR

STATS_PATH = ORCH_DIR / "model-stats.json"
MIN_SAMPLES = 4          # sotto questa soglia non riordiniamo nulla
RECENT_KEEP = 200        # quante osservazioni recenti conservare
QUARANTINE_RATE = 0.34   # sotto questo tasso di FALLIMENTI SQUALIFICANTI il modello si esclude
QUARANTINE_SAMPLES = 6   # ...ma solo con abbastanza osservazioni da essere sicuri
MIN_CHAIN = 3            # la catena non scende mai sotto questo numero di modelli

# Non tutti i fallimenti dicono la stessa cosa, e confonderli è costato caro.
#
# Un `gate-test` significa che il modello ha prodotto codice valido e applicabile che non ha
# passato i test: è ESATTAMENTE ciò che il ciclo di retry si aspetta al primo giro, ed è lavoro
# produttivo — l'errore torna indietro e il modello corregge. Contarlo come demerito squalifica i
# modelli che funzionano: con 4 tentativi, riuscire all'ultimo dà un tasso del 25%.
# (È successo davvero: la quarantena aveva escluso 6 modelli su 7 e la catena si era ridotta a
# uno solo, che a sua volta falliva. Sistema fermo per un difetto della metrica, non dei modelli.)
#
# Squalificante è invece non saper nemmeno giocare: risposte vuote, output non parsabile,
# nessuna risposta. Lì il modello non è lento a convergere, è inadatto al compito.
DISQUALIFYING = {"output-vuoto", "nessun-blocco", "non-ha-risposto"}


def _load() -> dict[str, Any]:
    if not STATS_PATH.exists():
        return {"version": 1, "records": {}, "recent": []}
    try:
        return json.loads(STATS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "records": {}, "recent": []}


def _save(data: dict[str, Any]) -> None:
    STATS_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _key(model: str, kind: str) -> str:
    return f"{kind}::{model}"


def record(model: str, kind: str, ok: bool, note: str = "") -> None:
    """Registra l'esito di un tentativo di un modello su un tipo di task."""
    data = _load()
    entry = data["records"].setdefault(_key(model, kind), {"ok": 0, "ko": 0, "notes": {}})
    entry["ok" if ok else "ko"] += 1
    if note and not ok:
        # Contiamo i MOTIVI di fallimento: distinguere "rate limit" da "output non parsabile"
        # è ciò che permette di capire se un modello è inadatto o solo sfortunato.
        entry["notes"][note] = entry["notes"].get(note, 0) + 1
    data["recent"].append({
        "when": _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model": model, "kind": kind, "ok": ok, "note": note,
    })
    data["recent"] = data["recent"][-RECENT_KEEP:]
    _save(data)


def success_rate(model: str, kind: str) -> tuple[float | None, int]:
    """(tasso di successo, osservazioni). Tasso None se i dati non bastano."""
    entry = _load()["records"].get(_key(model, kind))
    if not entry:
        return None, 0
    total = entry["ok"] + entry["ko"]
    if total < MIN_SAMPLES:
        return None, total
    return entry["ok"] / total, total


def is_quarantined(model: str, kind: str) -> bool:
    """Modello da NON provare più su questo tipo di lavoro perché non sa produrre output usabile.

    Si guardano SOLO i fallimenti squalificanti (vedi `DISQUALIFYING`): non passare il gate al
    primo colpo è normale e previsto, non saper produrre un blocco di modifica valido no.
    La quarantena è per (modello, tipo): pessimo sul codice può restare ottimo sul design.
    """
    entry = _load()["records"].get(_key(model, kind))
    if not entry:
        return False
    total = entry["ok"] + entry["ko"]
    if total < QUARANTINE_SAMPLES:
        return False
    disqualifying = sum(n for note, n in entry.get("notes", {}).items() if note in DISQUALIFYING)
    return (disqualifying / total) > (1 - QUARANTINE_RATE)


def rank_chain(chain: list[str], kind: str) -> list[str]:
    """Riordina la catena mettendo davanti i modelli che su QUESTO tipo di task riescono di più.

    I modelli senza dati sufficienti mantengono la posizione relativa configurata a mano e
    vengono provati dopo quelli con buon consuntivo, ma prima di quelli con consuntivo scarso.
    Quelli in quarantena vengono esclusi del tutto — a meno che escluderli non svuoti la catena,
    nel qual caso è meglio un modello scadente che nessun modello.
    """
    # Rete di sicurezza: la catena non si svuota mai, e non scende sotto MIN_CHAIN modelli.
    # Una catena corta trasforma un rate limit temporaneo in un task perso, e se il consuntivo
    # è distorto rischia di lasciare in piedi proprio il modello peggiore.
    usable = [spec for spec in chain if not is_quarantined(spec, kind)]
    if len(usable) < MIN_CHAIN:
        for spec in chain:
            if spec not in usable:
                usable.append(spec)
            if len(usable) >= MIN_CHAIN:
                break

    # L'ordine configurato a mano è il default e va rispettato: è una decisione informata
    # (quale modello è più adatto, quale è a pagamento e perché). Il consuntivo serve solo a
    # RETROCEDERE chi produce output inutilizzabile, mai a promuovere sul rumore.
    #
    # Ordinare per "tentativi che hanno passato il gate" è sbagliato per la stessa ragione per
    # cui lo era la quarantena: con 4 tentativi per task, riuscire all'ultimo dà un tasso basso
    # anche a un modello ottimo. Applicandolo avevo retrocesso al quarto posto il modello A
    # PAGAMENTO, l'unico che aveva sbloccato il task più difficile, in favore di gratuiti con
    # uno scarto di rumore (0,09 contro 0,10).
    def demerit(spec: str) -> int:
        entry = _load()["records"].get(_key(spec, kind))
        if not entry:
            return 0
        total = entry["ok"] + entry["ko"]
        if total < MIN_SAMPLES:
            return 0
        bad = sum(n for note, n in entry.get("notes", {}).items() if note in DISQUALIFYING)
        return 1 if bad / total > 0.5 else 0

    ordered = sorted(enumerate(usable), key=lambda pair: (demerit(pair[1]), pair[0]))
    return [spec for _, spec in ordered]


def summary() -> str:
    """Riassunto leggibile della pagella, per il briefing e per la revisione umana."""
    data = _load()
    if not data["records"]:
        return "(nessun dato: gli agenti non hanno ancora girato abbastanza)"
    lines: list[str] = []
    for key, entry in sorted(data["records"].items()):
        kind, _, model = key.partition("::")
        total = entry["ok"] + entry["ko"]
        rate = entry["ok"] / total if total else 0
        reasons = ", ".join(f"{k}×{v}" for k, v in sorted(entry["notes"].items(), key=lambda kv: -kv[1])[:2])
        lines.append(
            f"- `{model}` su **{kind}**: {entry['ok']}/{total} riusciti ({rate:.0%})"
            + (f" · fallimenti: {reasons}" if reasons else "")
        )
    return "\n".join(lines)

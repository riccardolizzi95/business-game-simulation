"""Configurazione dell'orchestratore autonomo (multi-provider).

Tutto pilotabile da variabili d'ambiente, `providers.json` e `models.json`, così nessun
segreto finisce nel codice e ogni ruolo può usare provider/modelli diversi.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

ORCH_DIR = Path(__file__).resolve().parent
ROOT = ORCH_DIR.parent  # radice del progetto
MODELS_PATH = ORCH_DIR / "models.json"
PROVIDERS_PATH = ORCH_DIR / "providers.json"

# Spec di default: "provider:modello". Usato se models.json manca o non specifica un ruolo.
DEFAULT_SPEC = "nvidia:meta/llama-3.3-70b-instruct"

# Registro minimo di fallback se providers.json è assente.
_FALLBACK_PROVIDERS = {
    "nvidia": {"base_url": "https://integrate.api.nvidia.com/v1", "api_key_env": "NVIDIA_API_KEY"},
}


def _load_dotenv() -> None:
    """Carica un file `.env` dalla radice del progetto nelle variabili d'ambiente.

    Così la chiave si mette UNA volta in `.env` (ignorato da git) e non va ridigitata ogni
    volta. Le variabili già impostate nell'ambiente reale hanno la precedenza (non le sovrascrive).
    """
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:  # l'ambiente reale vince
            os.environ[key] = val


def _load_providers() -> dict[str, dict]:
    if not PROVIDERS_PATH.exists():
        return dict(_FALLBACK_PROVIDERS)
    try:
        data = json.loads(PROVIDERS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return dict(_FALLBACK_PROVIDERS)
    return data.get("providers") or dict(_FALLBACK_PROVIDERS)


def _as_specs(value: object) -> list[str]:
    """Un valore di models.json può essere una spec singola o una lista di spec (fallback)."""
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, list):
        return [v.strip() for v in value if isinstance(v, str) and v.strip()]
    return []


def _load_models() -> tuple[str, dict[str, list[str]], dict[str, list[str]], list[str]]:
    """models.json → (default, mappa ruolo→spec, mappa tipo-task→spec, catena di fallback)."""
    if not MODELS_PATH.exists():
        return DEFAULT_SPEC, {}, {}, []
    try:
        data = json.loads(MODELS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return DEFAULT_SPEC, {}, {}, []
    default = (data.get("default") or DEFAULT_SPEC)
    default = default.strip() if isinstance(default, str) else DEFAULT_SPEC
    by_role = {
        role: specs
        for role, value in (data.get("by_role") or {}).items()
        if (specs := _as_specs(value))
    }
    by_kind = {
        kind: specs
        for kind, value in (data.get("by_kind") or {}).items()
        if (specs := _as_specs(value))
    }
    return default, by_role, by_kind, _as_specs(data.get("fallback_chain"))


@dataclass
class Config:
    mode: str = "dry-run"              # "dry-run" (mock, gratis) | "live" (provider reali)
    providers: dict = field(default_factory=dict)   # da providers.json
    default_spec: str = DEFAULT_SPEC
    role_specs: dict = field(default_factory=dict)  # ruolo → ["provider:modello", …]
    kind_specs: dict = field(default_factory=dict)  # tipo di task → ["provider:modello", …]
    fallback_chain: list = field(default_factory=list)  # modelli di riserva comuni a tutti i ruoli
    spec_override: str = ""            # ORCH_MODEL: forza UNA spec per tutti i ruoli
    max_iterations: int = 10           # tetto di task totali per run (bilancio costi)
    max_parallel: int = 3              # quanti task in parallelo per ondata (rate limit)
    request_delay_s: float = 2.0       # pausa tra chiamate reali (rate limiting)
    temperature: float = 0.3
    max_tokens: int = 4000             # abbastanza da non troncare le proposte

    @classmethod
    def from_env(cls) -> "Config":
        _load_dotenv()  # carica .env se presente, poi legge l'ambiente
        mode = os.environ.get("ORCH_MODE", "dry-run").strip().lower()
        default_spec, role_specs, kind_specs, fallback_chain = _load_models()
        return cls(
            mode=mode,
            providers=_load_providers(),
            default_spec=default_spec,
            role_specs=role_specs,
            kind_specs=kind_specs,
            fallback_chain=fallback_chain,
            spec_override=os.environ.get("ORCH_MODEL", "").strip(),
            max_iterations=int(os.environ.get("ORCH_MAX_ITERS", "10")),
            max_parallel=int(os.environ.get("ORCH_MAX_PARALLEL", "3")),
            max_tokens=int(os.environ.get("ORCH_MAX_TOKENS", "4000")),
        )

    def resolve_spec(self, role: str) -> str:
        """Spec principale del ruolo: override globale > mappa per-ruolo > default."""
        return self.resolve_chain(role)[0]

    def resolve_chain(self, role: str, kind: str = "", use_stats: bool = True) -> list[str]:
        """Modelli da provare in ordine, per ruolo e tipo di lavoro.

        Precedenza: override globale > spec del ruolo > spec del TIPO di task > default >
        catena di fallback. Il tipo conta: un `tester-qa` che scrive codice va servito da un
        modello di codice, non dal modello generalista del suo ruolo.

        I free tier vanno regolarmente in 429, quindi la catena non si esaurisce mai troppo
        presto. Se `use_stats`, l'ordine viene poi corretto dal consuntivo reale dei successi.
        """
        if self.spec_override:
            return [self.spec_override]
        candidates = [
            *self.role_specs.get(role, []),
            *self.kind_specs.get(kind, []),
            self.default_spec,
            *self.fallback_chain,
        ]
        seen: list[str] = []
        for spec in candidates:
            if spec and spec not in seen:
                seen.append(spec)
        chain = seen or [DEFAULT_SPEC]

        if use_stats and kind:
            # Import locale: model_stats importa config, e a livello di modulo sarebbe un ciclo.
            try:
                from model_stats import rank_chain

                chain = rank_chain(chain, kind)
            except Exception:  # noqa: BLE001 — la pagella è un'ottimizzazione, non un requisito
                pass
        return chain

    def describe(self) -> str:
        if self.mode == "live":
            base = f"live · default={self.default_spec}"
            if self.spec_override:
                base += f" · override globale={self.spec_override}"
            elif self.role_specs:
                base += f" · {len(self.role_specs)} spec per-ruolo"
            return base + f" · provider disponibili: {', '.join(sorted(self.providers))}"
        return "dry-run · mock (nessuna chiamata reale)"

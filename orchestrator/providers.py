"""Provider LLM multi-provider (OpenAI-compatible).

Quasi tutti i provider moderni (NVIDIA NIM, DeepSeek, OpenRouter, Together, Groq, Moonshot
Kimi, Zhipu GLM, Ollama locale…) espongono lo stesso endpoint `/chat/completions` in stile
OpenAI. Quindi basta UN client generico parametrizzato per base_url + api_key.

- MockProvider: dry-run (zero costi, nessuna rete).
- OpenAICompatibleProvider: qualunque provider del registro (`providers.json`).

Il modello si esprime come spec `provider:modello`, es. `nvidia:meta/llama-3.3-70b-instruct`,
`deepseek:deepseek-reasoner`, `openrouter:qwen/qwen-2.5-coder-32b-instruct`, `ollama:qwen2.5-coder`.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from config import Config

DEFAULT_PROVIDER = "nvidia"


class MockProvider:
    name = "mock"

    def complete(self, system: str, user: str, model: str = "mock") -> str:
        title = ""
        kind = "generico"
        for line in user.splitlines():
            if line.startswith("# Task"):
                title = line[2:].strip()
            elif line.lower().startswith("tipo:"):
                kind = line.split(":", 1)[1].strip()
        return f"""_(Output simulato — modalità dry-run. In live userebbe: `{model}`.)_

## Comprensione del task
Task: **{title or 'n/d'}** · tipo: {kind}. Letti descrizione, criteri di accettazione e il
contesto dalla blackboard (STATUS.md).

## Proposta (bozza)
1. Primo passo coerente col ruolo e con i criteri di accettazione.
2. Dettagli tecnici / di design da definire nella versione live.
3. Rischi, dipendenze e impatti evidenziati per la revisione.

## Prossime azioni consigliate
- Revisione da parte dell'agente senior o dell'utente prima di applicare.
- Se approvato, aprire i task implementativi collegati.

> Per proposte reali: `ORCH_MODE=live` + la API key del provider scelto, poi rilancia.
"""


def _extract_content(body: dict) -> str:
    """Testo della risposta, tollerante alle varianti dei provider.

    Alcuni modelli (soprattutto quelli 'reasoning') rispondono con `content: null` e mettono
    tutto in `reasoning`. Senza questo controllo il None arriva fino al parser e fa esplodere
    il task invece di far scattare il modello di riserva.
    """
    choices = body.get("choices") or []
    if not choices:
        raise RuntimeError(f"risposta senza 'choices': {str(body)[:200]}")
    message = choices[0].get("message") or {}
    for key in ("content", "reasoning_content", "reasoning"):
        value = message.get(key)
        if isinstance(value, str) and value.strip():
            return value
    finish = choices[0].get("finish_reason", "?")
    raise RuntimeError(f"risposta vuota (finish_reason={finish})")


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str, cfg: Config):
        self.base_url = base_url
        self.api_key = api_key
        self.cfg = cfg

    def complete(self, system: str, user: str, model: str) -> str:
        url = self.base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": self.cfg.temperature,
            "max_tokens": self.cfg.max_tokens,
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            # Alcuni provider (es. Groq dietro Cloudflare) bloccano lo User-Agent di default di
            # urllib (Error 1010). Un UA esplicito evita il 403.
            "User-Agent": "business-game-orchestrator/1.0",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST"
        )
        last_err: Exception | None = None
        # Pochi tentativi con backoff breve: se il modello è in rate limit conviene passare
        # in fretta a quello di riserva (vedi complete_with_chain) invece di aspettare un minuto.
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    body = json.loads(resp.read().decode("utf-8"))
                    return _extract_content(body)
            except urllib.error.HTTPError as e:
                if e.code == 429:  # rate limit: backoff e riprova
                    time.sleep(2 ** attempt * 2)
                    last_err = e
                    continue
                detail = e.read().decode("utf-8", "ignore")[:300]
                raise RuntimeError(f"HTTP {e.code}: {detail}") from e
            except urllib.error.URLError as e:
                raise RuntimeError(f"Errore di rete: {e.reason}") from e
        raise RuntimeError(f"Rate limit: troppi tentativi ({last_err})")


def parse_spec(spec: str) -> tuple[str, str]:
    """'provider:modello' → (provider, modello). Senza ':' assume il provider di default."""
    spec = spec.strip()
    if ":" in spec:
        provider, model = spec.split(":", 1)
        return provider.strip(), model.strip()
    return DEFAULT_PROVIDER, spec


def is_paid_spec(spec: str) -> bool:
    """Su OpenRouter un modello è gratuito solo se l'id finisce con `:free`.

    Il Model Curator aggiorna `models.json` in autonomia: senza questo controllo un suo
    aggiornamento potrebbe far consumare il credito dell'utente senza che nessuno se ne
    accorga, magari durante una sessione notturna non sorvegliata.
    """
    provider_name, model_id = parse_spec(spec)
    return provider_name == "openrouter" and not model_id.endswith(":free")


def build_provider(cfg: Config, spec: str) -> tuple[object, str, str]:
    """Ritorna (provider, model_id, etichetta). Degrada a mock in modo sicuro e trasparente."""
    provider_name, model_id = parse_spec(spec)

    # Politica dell'utente (2026-07-26): si gira SOLO su modelli gratuiti. Il credito a
    # pagamento resta intatto salvo autorizzazione esplicita via ORCH_ALLOW_PAID=1.
    # Si alza un errore invece di degradare a mock: così `complete_with_chain` passa al
    # modello gratuito successivo, mentre un mock produrrebbe testo finto spacciato per lavoro.
    if is_paid_spec(spec) and os.environ.get("ORCH_ALLOW_PAID", "").strip() != "1":
        raise RuntimeError(
            f"modello a pagamento bloccato dalla policy: '{spec}'. "
            f"Per autorizzarlo esplicitamente: ORCH_ALLOW_PAID=1"
        )

    # Dry-run o provider mock esplicito → sempre simulato.
    if cfg.mode != "live" or provider_name == "mock":
        return MockProvider(), f"{provider_name}:{model_id}", f"mock (previsto: {provider_name}:{model_id})"

    pcfg = cfg.providers.get(provider_name)
    if not pcfg:
        return MockProvider(), model_id, f"mock (provider sconosciuto: '{provider_name}')"

    api_key_env = pcfg.get("api_key_env", "")
    api_key = os.environ.get(api_key_env, "").strip() if api_key_env else ""
    if api_key_env and not api_key:
        return MockProvider(), model_id, f"mock (manca {api_key_env} per '{provider_name}')"

    return OpenAICompatibleProvider(pcfg["base_url"], api_key, cfg), model_id, f"{provider_name}:{model_id}"


def complete_with_chain(
    cfg: Config, chain: list[str], system: str, user: str
) -> tuple[str, str, list[str]]:
    """Prova i modelli in ordine finché uno risponde. Ritorna (testo, etichetta, tentativi falliti).

    I modelli gratuiti vanno in 429 spesso e senza preavviso: con una catena di riserva un rate
    limit diventa un intoppo da qualche secondo invece che un task perso.
    """
    failures: list[str] = []
    for spec in chain:
        # build_provider dentro il try: può rifiutare la spec (es. modello a pagamento
        # bloccato dalla policy), e anche quel rifiuto deve far passare al modello successivo.
        try:
            provider, model_id, label = build_provider(cfg, spec)
            return provider.complete(system, user, model_id), label, failures
        except Exception as e:  # noqa: BLE001 — proviamo il prossimo modello della catena
            failures.append(f"{spec}: {e}")
    raise RuntimeError(
        "Nessun modello della catena ha risposto:\n" + "\n".join(f"  - {f}" for f in failures)
    )

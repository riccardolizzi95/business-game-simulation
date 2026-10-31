# ADR-0003 — Architettura multi-provider per gli LLM

- **Stato:** Accettata
- **Data:** 2026-07-25

## Contesto
L'orchestratore inizialmente parlava solo con NVIDIA NIM. Ma molti modelli forti e
convenienti (spesso open source, inclusi diversi cinesi: DeepSeek, Qwen, GLM/Zhipu, Kimi/
Moonshot, MiniMax) sono disponibili su altri provider o aggregatori. Vogliamo poter scegliere
**il modello migliore per ogni ruolo/compito**, senza vincolarci a un fornitore.

## Decisione
Astrarre i provider dietro un'interfaccia **OpenAI-compatible** (endpoint `/chat/completions`):
- Un unico `OpenAICompatibleProvider` parametrizzato per `base_url` + `api_key`.
- Un **registro** dei provider in `orchestrator/providers.json` (nvidia, deepseek, openrouter,
  together, groq, moonshot, zhipu, ollama…). La API key **non** sta nel file: si legge dalla
  variabile d'ambiente indicata da `api_key_env`.
- I modelli si esprimono come spec **`provider:modello`** (es. `deepseek:deepseek-reasoner`).
  Configurabili per ruolo in `orchestrator/models.json` (`default` + `by_role`), con override
  globale via `ORCH_MODEL`.
- **Degradazione sicura**: in `live`, se manca la chiave di un provider (o è sconosciuto), quel
  task ricade sul `mock` con avviso esplicito, senza bloccare il run.
- `ollama` come provider **locale/offline** (nessuna chiave) per girare senza costi né rete.

## Alternative considerate
- **Solo NVIDIA**: semplice ma limitante; niente scelta del modello migliore per compito.
- **SDK specifici per provider**: più dipendenze e codice; l'interfaccia OpenAI-compatible
  copre quasi tutti con un solo client stdlib.
- **Solo aggregatore (OpenRouter)**: comodo (una chiave, molti modelli) ma unico punto di
  dipendenza/costo; lo includiamo come uno dei provider, non come unico.

## Conseguenze
**Pro:** libertà di scegliere modello/provider per ruolo; resilienza (fallback); costi
ottimizzabili (free tier di più provider, o locale con Ollama); zero dipendenze aggiuntive.
**Contro/rischi:** endpoint/nomi modello variano nel tempo e per area (vanno verificati sul
sito del provider); gestire più chiavi; qualità/limiti diversi tra provider.

## Note
Allineato con la visione del team riutilizzabile (`docs/08`) e con il modello ibrido
(`docs/03`). Gli id esatti dei modelli si copiano dai cataloghi dei provider.

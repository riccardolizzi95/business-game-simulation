# MODEL-WATCH — Registro del Model Curator

Sorveglianza dei modelli usati dagli agenti: cosa usiamo, perché, e i rischi da monitorare.
Mantenuto dal ruolo **model-curator** (`.claude/agents/model-curator.md`), che gira come
subagent Claude (ha accesso al web + editing). Vedi assegnazioni in `models.json`.

## Assegnazione corrente (aggiornata 2026-07-25)

| Ruolo/i | Modello (spec) | Perché |
|---|---|---|
| architect, game-designer, tester-qa, code-reviewer, security-engineer | `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free` (default) | Ragionamento forte; **validato** nel primo run live (qualità alta). |
| project-manager, designer-ux, technical-writer, devops-platform | `openrouter:inclusionai/ling-3.0-flash:free` | Compiti "leggeri"/veloci; risparmia sul rate limit. |
| backend-developer | `openrouter:poolside/laguna-s-2.1:free` | Modello di **codice**. ⚠️ da validare. |
| frontend-developer | `openrouter:cohere/north-mini-code:free` | Modello di **codice**. ⚠️ da validare. |
| model-curator | — (subagent Claude) | Manutenzione: serve web + editing, non gira via orchestratore. |

## Modelli gratuiti noti su OpenRouter (verificati 2026-07-25)
Fonte: `https://openrouter.ai/api/v1/models` (prompt=0 e completion=0).
- `nvidia/nemotron-3-ultra-550b-a55b:free` — generale/ragionamento (grosso, un po' lento).
- `poolside/laguna-s-2.1:free`, `poolside/laguna-xs-2.1:free` — codice.
- `cohere/north-mini-code:free` — codice.
- `inclusionai/ling-3.0-flash:free` — generale/veloce.

> La disponibilità "free" **cambia spesso**: verificare prima di ogni ciclo di manutenzione.

## Watch-list dei rischi (da monitorare)
- ⚠️ **Un `:free` può passare a pagamento senza preavviso lungo** (è già successo con
  `meta-llama/llama-3.3-70b-instruct:free` il 2026-07-25). Azione: tenere pronte 1-2 alternative
  per fascia (ragionamento / codice / veloce) e switchare **prima** del disservizio.
- ⚠️ I coder assegnati (laguna-s, north-mini-code) **non sono ancora validati** su un task reale.
  Se falliscono, il loop li marca `blocked` e prosegue; ripiego: `default` (nemotron) o Groq.
- ⚠️ Rate limit del tier free OpenRouter (giornaliero): se saturo, distribuire su più provider
  (deepseek, groq) o Ollama locale.

## Procedura di manutenzione (per il curator)
1. Interroga `https://openrouter.ai/api/v1/models` e i cataloghi provider: quali `:free` ci sono ora?
2. Confronta con `models.json`: qualche modello usato è sparito / diventato a pagamento / peggiore?
3. Per ogni fascia (ragionamento / codice / veloce) scegli il miglior `:free` attuale.
4. Smoke test (`--max-iters 1`) del candidato prima di adottarlo per un ruolo.
5. Aggiorna `models.json`, annota qui data/cosa/perché, aggiorna il CHANGELOG.

## Automazione (curator autonomo)
Lo script deterministico [`curator.py`](curator.py) implementa la manutenzione automatica:
scarica l'elenco free di OpenRouter, sostituisce i modelli usati che non sono più gratuiti con
il miglior candidato della loro fascia (`curator_policy.json`), aggiorna `models.json`, scrive
qui e in `NOTIFICATIONS.md`. Gira schedulato via GitHub Actions
(`.github/workflows/model-curator.yml`, giornaliero) — vedi ADR-0005.
```bash
python3 orchestrator/curator.py --check   # report, nessuna modifica
python3 orchestrator/curator.py           # applica le sostituzioni
```

## Storico decisioni
- **2026-07-25** — Impostata prima assegnazione per-ruolo (vedi tabella). Ritirato
  `meta-llama/llama-3.3-70b-instruct:free` (diventato a pagamento) → `nemotron-3-ultra-550b:free`.

### Run curator 2026-08-07 06:58:42
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-08 06:32:50
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-09 06:36:44
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-10 07:08:07
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-11 06:45:17
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-12 07:06:15
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-13 07:10:36
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-14 07:06:54
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-15 06:18:59
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-16 06:20:58
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-17 06:32:00
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-18 06:23:40
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-19 06:24:37
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-20 06:25:49
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-21 06:26:06
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-22 06:20:11
- **backend-developer**: `openrouter:openai/gpt-oss-20b:free` → `openrouter:poolside/laguna-s-2.1:free` — 'openai/gpt-oss-20b:free' non più gratuito → miglior free tier 'coding'
- **frontend-developer**: `openrouter:openai/gpt-oss-20b:free` → `openrouter:poolside/laguna-s-2.1:free` — 'openai/gpt-oss-20b:free' non più gratuito → miglior free tier 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-23 06:21:55
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-24 06:34:39
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-25 06:26:27
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-26 06:28:02
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-27 17:02:11
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-28 17:50:54
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-29 11:55:48
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-30 10:52:23
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-08-31 12:04:40
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-01 10:43:02
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-02 10:08:14
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-03 10:19:33
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-04 10:07:14
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-05 09:36:51
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-06 09:51:53
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-07 10:58:22
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-08 10:14:38
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-09 10:19:35
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-10 10:12:48
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-11 10:09:50
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-12 09:44:12
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-13 10:45:43
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-14 11:10:43
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-15 10:38:47
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-16 10:26:57
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-17 10:36:38
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-18 10:12:35
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-19 09:53:57
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-20 10:15:21
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-21 11:21:32
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-22 10:31:19
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-23 10:25:45
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-24 10:42:26
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-25 10:45:47
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-26 10:28:14
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-27 10:59:22
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-28 12:17:01
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-29 11:45:27
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-09-30 11:32:03
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-01 12:00:10
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-02 11:31:57
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-03 10:47:15
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-04 11:28:39
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-05 12:56:57
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-06 12:22:45
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-07 12:15:43
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-08 12:25:15
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-09 12:14:36
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-10 11:32:13
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-11 11:45:51
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-12 13:48:55
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-13 13:07:18
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-14 10:48:38
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-15 10:31:13
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-16 10:18:15
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-17 09:51:46
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-18 10:03:38
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-19 11:29:31
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-20 10:35:21
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-21 10:47:18
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-22 10:48:09
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-23 10:40:25
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-24 09:57:25
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-25 10:20:33
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-26 11:48:32
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-27 11:13:35
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo backend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo frontend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-28 11:47:44
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo backend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo frontend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-29 11:55:37
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo backend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo frontend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-30 11:49:20
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo backend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo frontend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

### Run curator 2026-10-31 11:23:15
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo project-manager) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo backend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'nvidia/nemotron-3-super-120b-a12b:free' (ruolo frontend-developer) non più gratuito e NESSUNA alternativa free per la fascia 'coding'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo devops-platform) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo designer-ux) non più gratuito e NESSUNA alternativa free per la fascia 'light'
- ⚠ 'inclusionai/ling-3.0-flash:free' (ruolo technical-writer) non più gratuito e NESSUNA alternativa free per la fascia 'light'

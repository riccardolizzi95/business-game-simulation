# 13 — Modelli per agente (scheda di riferimento)

> Mappa completa di **chi usa quale modello**. Ci sono **due liste distinte** perché ci sono due
> meccanismi di esecuzione (design ibrido). Documento di sola lettura, per verifica.

## 🧭 Policy (decisione utente, 2026-07-26)
**Tutto il team gira su OpenRouter (gratis). NON si spawnano subagent Claude per i ruoli del
team.** Su **Claude** resta **solo il coordinamento generale** (la sessione principale con cui
parla l'utente), che **finalizza e verifica il codice** che viene spedito su Vercel.
- Orchestratore free (OpenRouter) → requisiti, analisi, **bozze**.
- Coordinamento (Claude, sessione principale) → integra le bozze, scrive/verifica il codice finale.
- I modelli gratuiti producono bozze di qualità variabile: il codice che spedisce lo garantisce il coordinamento.

## Lista 1 — Subagent Claude (`.claude/agents/*.md` → `model:`)
> ⚠️ **Dormiente per policy:** questi valori valgono SOLO se si spawna un subagent Claude, cosa
> che d'ora in poi **evitiamo**. Il `model:` qui può essere solo Claude (`opus`/`sonnet`/`haiku`/
> `fable`) — **non** è instradabile su OpenRouter. Tenuti come riferimento storico.

| Agente | model: |
|---|---|
| software-architect | **opus** |
| tutti gli altri 22 (PM, backend, frontend, tester, code-reviewer, designer-ux, game-designer, security, devops, technical-writer, model-curator, agent-coach, e i 10 business-*) | sonnet |

## Lista 2 — Orchestratore (`orchestrator/models.json` → OpenRouter) — **ATTIVA**
> È questa che conta: governa il loop Python che usa OpenRouter free. Vuoto = usa `default`.

| Ruolo | Modello OpenRouter (`:free`) |
|---|---|
| **default** (tutti i vuoti: architect, game-designer, tester, code-reviewer, security, model-curator, agent-coach, **tutti i 10 business**) | `nvidia/nemotron-3-ultra-550b-a55b` |
| backend-developer · frontend-developer | `poolside/laguna-m.1` |
| project-manager · designer-ux · devops-platform · technical-writer | `inclusionai/ling-3.0-flash` |

## Modelli gratuiti disponibili su OpenRouter (18, al 2026-07-26)
Utili se il curator o tu volete cambiare assegnazioni:
- **Ragionamento/generali:** `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `nvidia/nemotron-3-nano-30b-a3b:free`, `nvidia/nemotron-nano-9b-v2:free`, `openai/gpt-oss-20b:free`, `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free`, `inclusionai/ling-3.0-flash:free`
- **Codice:** `poolside/laguna-m.1:free`, `poolside/laguna-s-2.1:free`, `poolside/laguna-xs-2.1:free`, `cohere/north-mini-code:free`
- (altri: reasoning-nano, content-safety, vl multimodali, lyria audio…)

## Come cambiare
- **Modelli dell'orchestratore (quelli che contano):** modifica `orchestrator/models.json`
  (spec `provider:modello`, vuoto = default). Il Model Curator li mantiene aggiornati.
- **Provider disponibili:** `orchestrator/providers.json` (Groq rimosso per la VPN dell'utente).
- **Regole trasversali degli agenti:** `docs/12-regole-agenti.md`.

# ADR — Architecture Decision Records

Registro delle decisioni architetturali significative. Ogni decisione "pesante" (difficile
da invertire, con impatto su tutto il progetto) va scritta qui come file `ADR-XXXX-titolo.md`.

## Formato
Ogni ADR contiene: **Contesto** (perché si decide), **Decisione** (cosa si è scelto),
**Alternative considerate**, **Conseguenze** (pro/contro), **Stato** (proposta/accettata/superata).

## Indice
| ID | Titolo | Stato |
|---|---|---|
| [ADR-0001](ADR-0001-stack-tecnologico.md) | Stack tecnologico (Next.js + Supabase + Vercel) | Accettata |
| [ADR-0002](ADR-0002-orchestratore-autonomo.md) | Orchestratore autonomo del team di agenti | Accettata |
| [ADR-0003](ADR-0003-multi-provider-llm.md) | Architettura multi-provider per gli LLM | Accettata |
| [ADR-0004](ADR-0004-model-curation.md) | Manutenzione dei modelli (Model Curation / LLMOps) | Accettata |
| [ADR-0005](ADR-0005-autonomia-schedulata.md) | Autonomia schedulata (GitHub Actions, non Vercel) | Accettata |

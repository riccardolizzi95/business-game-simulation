# ADR-0004 — Manutenzione dei modelli (Model Curation / LLMOps)

- **Stato:** Accettata
- **Data:** 2026-07-25

## Contesto
I modelli gratuiti cambiano in continuazione: un `:free` può diventare a pagamento o essere
deprecato (già capitato con `meta-llama/llama-3.3-70b-instruct:free`), e ne escono di nuovi e
più performanti. Senza manutenzione, l'orchestratore rischia disservizi o modelli subottimali.

## Decisione
Introdurre il ruolo **model-curator (LLMOps)** responsabile della manutenzione dei modelli:
- Monitora disponibilità/prezzi/performance dei modelli (fonti: `openrouter.ai/api/v1/models`,
  cataloghi provider).
- **Anticipa** i passaggi a pagamento/deprecazioni preparando alternative gratuite *prima* del disservizio.
- Adotta modelli gratuiti migliori quando escono.
- Mantiene `orchestrator/models.json`, `providers.json` e il registro `orchestrator/MODEL-WATCH.md`.
- **Gira come subagent di Claude Code** (serve accesso al web + editing dei file): fa parte del
  "team senior" del modello ibrido, non dell'orchestratore a modelli gratuiti (che non naviga).

## Alternative considerate
- **Nessuna manutenzione**: fragile; disservizi al primo cambio (già visto).
- **Curator come ruolo dell'orchestratore gratuito**: non può navigare né conoscere prezzi
  aggiornati → inadatto. Meglio come subagent Claude.
- **Hardcodare i modelli**: rigido; nega il vantaggio multi-provider.

## Conseguenze
**Pro:** continuità di servizio, costi a zero mantenuti, uso sempre del miglior modello free per
ruolo, tutto tracciato e reversibile (git).
**Contro/rischi:** richiede esecuzioni periodiche (idealmente schedulate); i cataloghi vanno
verificati perché cambiano; i nuovi modelli vanno validati (smoke test) prima dell'adozione.

## Note
Collegato ad ADR-0003 (multi-provider) e alla visione del team riutilizzabile (`docs/08`):
la logica del curator è competenza condivisa tra progetti.

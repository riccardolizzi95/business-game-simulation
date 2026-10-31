# ADR-0005 — Autonomia schedulata degli agenti (GitHub Actions, non Vercel)

- **Stato:** Accettata
- **Data:** 2026-07-25

## Contesto
Vogliamo che il team di agenti "si lanci da solo": l'orchestratore e il Model Curator devono
girare in autonomia, in cloud, su base schedulata, e **committare** i loro risultati (proposte,
aggiornamenti ai modelli, notifiche). L'utente pensava a Vercel.

## Decisione
- **Vercel = hosting del GIOCO** (la PWA), non del team di agenti. È serverless: filesystem
  effimero/di sola lettura, timeout brevi, non può committare nel repo → inadatta a un loop di
  agenti che genera e versiona artefatti.
- **Autonomia degli agenti = GitHub Actions** (cron): ha filesystem, può **committare e fare
  push**, gestisce i **segreti** (API key come repo secret), è gratis nei limiti. Due workflow:
  - `.github/workflows/model-curator.yml` — giornaliero, esegue `orchestrator/curator.py`,
    committa cambi di modello + notifiche. **Nessuna chiave** (catalogo modelli pubblico).
  - `.github/workflows/agents-run.yml` — manuale + settimanale, esegue l'orchestratore in
    `live`, committa le proposte. Richiede il secret `OPENROUTER_API_KEY`.
- **Model Curator autonomo** = script **deterministico** (`curator.py`), non un LLM: più
  affidabile e sicuro per girare da solo (confronta l'elenco free, sostituisce per fascia).

## Alternative considerate
- **Vercel Cron + serverless**: no filesystem persistente, no commit → non adatto.
- **Server/worker sempre attivo**: più potente ma richiede infra e costi; sovradimensionato ora.
- **Curator come LLM**: utile per giudizi sfumati, ma per l'autonomia schedulata uno script
  deterministico è preferibile (niente allucinazioni, niente costi, esiti riproducibili).

## Conseguenze
**Pro:** agenti che si auto-eseguono e versionano i risultati; costi ~zero; segreti gestiti bene;
tutto tracciato in git. **Contro/rischi:** serve il repo su GitHub + il secret impostato
dall'utente; i run schedulati vanno tenuti conservativi per non generare rumore; le proposte
restano da revisionare (guardrail invariato).

## Setup necessario (lo fa l'utente)
1. Creare un repo GitHub e fare `git push`.
2. Settings → Secrets and variables → Actions → aggiungere `OPENROUTER_API_KEY`.
3. (Opzionale) regolare i cron nei due workflow.

## Note
Il canale notifiche è per ora `NOTIFICATIONS.md` (file nel repo): Claude lo legge a inizio
sessione / "leggi il progetto" e avvisa l'utente. Canali esterni (email, Telegram…) in futuro.
Collegato ad ADR-0002/0003/0004.

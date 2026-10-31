# 99 — Swarm NVIDIA (design futuro, NON in fase 0)

Progetto dell'orchestratore multi-agente esterno basato su modelli **NVIDIA NIM gratuiti**,
da usare come "manovalanza" supervisionata accanto al team senior (Claude Code).

## Realtà sui limiti (importante)
- I modelli su `build.nvidia.com` (NIM) sono gratuiti ma con **rate limit** e tetto richieste:
  **non** "illimitati 24h non-stop". Vanno gestiti a cicli con backoff.
- Qualità di coding autonomo **inferiore** ai modelli top → adatti a task a basso rischio,
  con validazione automatica (test/linter) e review del team senior.

## Casi d'uso adatti allo swarm
- Generazione di **dati di test** e scenari di playtest per bilanciare il motore.
- Bozze di documentazione / changelog da rifinire.
- Esplorazioni parallele di alternative (poi validate dall'architetto).
- Task ripetitivi e ben specificati con criteri di accettazione verificabili da macchina.

## Architettura proposta (bozza)
```
orchestrator/            # Python
  roles/                 # prompt-ruolo (pm, dev, tester...) allineati a .claude/agents
  task_queue.md          # board condivisa in markdown (fonte di verità)
  nim_client.py          # client OpenAI-compatible verso NVIDIA NIM + rate limiting/backoff
  loop.py                # ciclo: leggi task → esegui → valida (test) → logga → checkpoint
  guardrails.py          # limiti: no deploy, no spese, no scrittura fuori da aree consentite
```
- **API NVIDIA:** endpoint OpenAI-compatible (`https://integrate.api.nvidia.com/v1`),
  autenticazione con API key **solo lato server**, mai nel repo/nel client.
- **Sicurezza segreti:** API key in variabile d'ambiente / file non versionato (`.env` in `.gitignore`).
- **Checkpoint:** lo swarm apre proposte (branch/patch + nota) che il team senior o l'utente approva.

## Quando lo costruiamo
Dopo che esistono: il `game-engine` con test, e criteri di accettazione automatici.
Senza validazione automatica, lo swarm produce più lavoro di revisione di quanto ne risparmi.

## Da decidere
- [ ] Quali modelli NIM usare per quale ruolo.
- [ ] Strategia di rate limiting / quante iterazioni per ciclo.
- [ ] Formato standard delle "proposte" dello swarm.

# ADR-0002 — Orchestratore autonomo del team di agenti

- **Stato:** Accettata
- **Data:** 2026-07-25

## Contesto
Vogliamo passare dal "team di agenti come impalcatura" (definizioni di ruolo mai invocate,
lavoro svolto dall'orchestratore principale) a un **orchestratore autonomo** che faccia
lavorare i ruoli in un loop, avvicinandosi all'idea di un team che lavora da solo, usando
possibilmente le API NVIDIA gratuite.

## Decisione
Costruire un orchestratore esterno in **Python (solo stdlib)** in `orchestrator/`:
- **Board operativa** (`board.json`) come fonte di verità dei task, con stati e dipendenze.
- **Ruoli** = persona caricate dai file `.claude/agents/*.md` (riuso, unica fonte).
- **Provider LLM intercambiabile**: `mock` (dry-run, deterministico, zero costi) e `nvidia`
  (endpoint OpenAI-compatible `https://integrate.api.nvidia.com/v1`).
- **Loop di lavoro**: pesca il prossimo task eleggibile → costruisce il prompt (persona +
  task + contesto dalla blackboard) → chiama il modello → salva una **proposta** in
  `proposals/` → aggiorna la board → logga → passa al successivo, con rate limiting.
- **Guardrail**: le proposte NON vengono applicate automaticamente; l'orchestratore scrive
  solo in `orchestrator/proposals/`, `orchestrator/runs/` e `board.json`. Nessun deploy,
  nessuna spesa, nessuna modifica al codice senza revisione. Checkpoint umano quando la board
  non ha più task eleggibili.

## Alternative considerate
- **Subagent di Claude Code in loop**: qualità più alta ma consuma budget Claude e non è il
  "24h gratis" desiderato; resta disponibile come "team senior" per il lavoro critico (ibrido).
- **Framework esterni (LangGraph, CrewAI, AutoGen)**: potenti ma aggiungono dipendenze e
  complessità; per l'MVP preferiamo stdlib e pieno controllo. Rivalutabili più avanti.

## Conseguenze
**Pro:** autonomia reale ma sicura (proposte + revisione), costo ~zero in dry-run e con NVIDIA,
zero dipendenze, tracciamento completo in markdown.
**Contro/rischi:** qualità di coding dei modelli gratuiti inferiore → adatto a design/analisi/
bozze più che a codice di produzione non supervisionato; serve la API key NVIDIA per il live;
la board strutturata è separata dai `.md` umani (relazione documentata, non auto-sincronizzata).

## Note
Modello ibrido confermato: orchestratore NVIDIA come "manovalanza" supervisionata; agente
principale / subagent Claude come team senior per il lavoro critico. Vedi `docs/03-team-agenti.md`
e `docs/99-nvidia-swarm.md`.

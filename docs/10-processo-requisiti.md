# 10 — Processo di raccolta requisiti (predittivo → agile)

Come definiamo i requisiti del gioco con gli **agenti di Business** e il **team IT**.

## Approccio
- **Prima volta = predittivo (waterfall):** cicli di raccolta requisiti finché il team IT li
  ritiene sufficienti (convergenza), per fissare una buona base di partenza.
- **Poi = agile:** dalla baseline si procede iterativi-incrementali con gli sprint.

## Il ciclo di raccolta (motore: `orchestrator/requirements.py`)
Ogni **iterazione**:
1. **Fase Business** — i 10 agenti di dominio scrivono/migliorano i requisiti (leve, effetto
   singolo per l'icona, KPI, interazioni, imprevisti).
2. **Consolidamento** — il documento unico ASSEMBLA i domini per intero + una **sintesi
   trasversale** breve del PM (dedup, conflitti, MoSCoW, leve totali, KPI cruscotto, eventi,
   condizione di vittoria).
3. **Fase IT** — Architect + Game Designer valutano fattibilità e game design.
4. **Gate di convergenza** — il **team IT decide**: `CONTINUE` (serve un altro giro col Business)
   oppure `CONVERGED` (requisiti sufficienti → si passa allo sprint).

## Sicurezze (dalla retrospettiva del 2026-07-25)
Il primo run a tappeto aveva saturato il rate limit e un giro fallito aveva **sovrascritto** il
buon documento. Ora il motore è prudente:
- **Throttling:** poche chiamate in parallelo (`ORCH_REQ_PARALLEL`, default 2) + pausa tra le
  chiamate (`ORCH_REQ_THROTTLE`, default 2s) → non satura il rate limit.
- **Stop ai rate limit / errori di massa:** se troppi domini falliscono (soglia < 6/10), il giro
  è "debole": **NON** consolida e si ferma, **preservando il documento buono** (+ backup `.bak`).
- **Cap per-run:** al massimo `ORCH_REQ_MAX_PER_RUN` iterazioni per esecuzione (default 3),
  **ripartibile**: si rilancia lo stesso comando e riprende da dove era.

## Macro-loop: requisiti → sprint → ripeti
```
[Raccolta requisiti]  business ↔ IT  → gate IT: CONTINUE? → altro giro
                                              → CONVERGED? ↓
[Sprint]  il team di sviluppo implementa (con checkpoint umano/senior)
   ↓
[Nuovo ciclo requisiti] rifinisce/estende → sprint → …  (agile)
```
La convergenza (`CONVERGED`) è il segnale "pronti per lo sprint". Lo sprint resta il punto in cui
la **revisione umana/senior** conta di più (i modelli gratuiti vanno supervisionati sul codice).

## Come si lancia
```bash
# la chiave OpenRouter è nel .env (vedi orchestrator/AUTONOMY.md)
python3 orchestrator/requirements.py --iterations 20   # target; finisce a CONVERGED o al target
python3 orchestrator/requirements.py --one             # un solo giro
python3 orchestrator/requirements.py --status
```
Gira a piccoli blocchi (cap per-run) e si **rilancia più volte** (anche su più giorni) senza perdere nulla.

## Più provider (opzionale, per più autonomia)
Con un solo provider gratuito si esauriscono presto i limiti giornalieri. Si può **distribuire il
carico** su più provider gratuiti assegnando modelli diversi ai ruoli in `orchestrator/models.json`
(es. alcuni domini su `groq:…`, altri su `deepseek:…`, altri su `openrouter:…`). Richiede una API
key per ciascun provider usato (variabili in `providers.json`). Rischi gestibili: id modello ed
endpoint variano nel tempo (vanno verificati) e la qualità differisce tra provider. Se un provider
va giù o manca la chiave, quel ruolo **ricade su mock con avviso** senza bloccare il resto.

## Output
- `orchestrator/requirements/REQUIREMENTS.md` — documento consolidato **vivo**.
- `orchestrator/requirements/iterations/iter-NN/` — tracce di ogni giro (domini, feedback IT, decisione).
- **Word:** `pandoc orchestrator/requirements/REQUIREMENTS.md -o Requisiti-Business-Game.docx --toc`
  (pandoc installato). Lo rigeneriamo ad ogni milestone.

## Checkpoint umani
A convergenza (o a un checkpoint), l'utente + il team IT **revisionano** il consolidato prima di
considerarlo la baseline da cui parte lo sprint.

# 04 — Metodo di lavoro (Agile iterativo-incrementale)

## Scelta
Lavoriamo **iterativo + incrementale insieme**: sprint corti che consegnano **vertical
slice** (fette sottili ma end-to-end, dal DB allo schermo). Ogni sprint **aggiunge**
funzionalità (incrementale) e **raffina** l'esistente in base al playtest (iterativo).

Motivo: in un gioco, bilanciamento e divertimento sono incogniti → serve imparare presto
provando, non costruire a lungo al buio.

## Cadenza
- **Sprint** = un'unità di lavoro coerente (non legata a settimane di calendario, dato che
  il "team" sono agenti). Ogni sprint ha un obiettivo unico e dimostrabile.
- Ad ogni fine sprint: **demo + playtest**, poi **checkpoint con l'utente** per le priorità.

## Rituali (adattati agli agenti)
| Rituale | Quando | Output |
|---|---|---|
| Planning | Inizio sprint | Obiettivo + task selezionati dal backlog nello SPRINT-BOARD. |
| Daily (log) | Ad ogni intervento | Aggiornamento board + CHANGELOG. |
| Review/Demo | Fine sprint | Cosa è dimostrabile + playtest. |
| Retrospective | Fine sprint | Note "cosa migliorare" in fondo allo STATUS. |

## Vertical slice — cosa significa qui
Esempio di slice (NON è ancora il piano, solo l'idea):
> "Un giocatore fa login con Google, crea una partita, un secondo giocatore entra, la
> partita parte, entrambi impostano UNA decisione (es. prezzo), il tick calcola le vendite
> e mostra la classifica." — sottile ma tocca auth, DB, realtime, motore, UI.

Si parte da uno *scheletro camminante* (walking skeleton) e lo si ingrassa ad ogni giro.

## Backlog e stime
- Il backlog vive in [`BACKLOG.md`](../project-management/BACKLOG.md), ordinato per priorità.
- Stima leggera a "taglie" (S / M / L), non ore.
- Ogni item ha: descrizione, valore, criteri di accettazione.

## Definition of Ready (per prendere un task)
- Obiettivo chiaro, criteri di accettazione scritti, dipendenze note.

## Definition of Done
- Funziona end-to-end nella slice · test dove ha senso · doc e board aggiornate ·
  nessun segreto nel client · (se tecnico rilevante) ADR scritto.
```

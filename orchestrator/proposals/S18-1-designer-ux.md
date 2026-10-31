# Proposta — S18-1: Ridisegno del flusso di gioco: da 10 destinazioni a un turno che si capisce

- Ruolo: **designer-ux**
- Provider/modello: `openrouter:inclusionai/ling-3.0-flash:free`
- Generata: 2026-07-29 21:10:15

---

# S18-1 — Ridisegno del flusso di gioco: proposta UX

---

## 1. Principi di redesign

| Principio | Regola |
|---|---|
| **Un turno = una schermata** | Tutte le decisioni del trimestre sono visibili e raggiungibili senza cambiare tab. |
| **Cruscotto con direzione** | La prima schermata dice *cosa fare*, non solo *cosa è successo*. |
| **Numeri precisi su telefono** | Slider + campo numerico editabile + preset rapidi. Mai solo slider. |
| **Nessun trimestre vuoto** | Il motore non chiude un turno senza decisioni; avviso preventivo, non retroattivo. |
| **Risultato che racconta** | Prima il racconto, poi la tabella. Il giocatore deve capire *perché* ha ottenuto quel numero. |
| **Configurazione invisibile** | I parametri tecnici esistono ma sono nascosti dietro "Avanzate". Il primo impatto è semplice. |

---

## 2. Nuova struttura di navigazione

**4 tab** (da 6+4 sottosezioni → 4 destinazioni piatte).

| # | Tab | Cosa contiene | Motivazione |
|---|---|---|---|
| 1 | **Cruscotto** | Stato attuale, alert urgenti, CTA principale ("Imposta decisioni"), prossimo trimestre | Sostituisce il cruscotto attuale di numeri fermi: ora dice *cosa fare*. Unifica "Mercato" (contesto) e "Conti" (saldo liquidità). |
| 2 | **Decisioni** | Tutte le leve del trimestre in una pagina scrollabile, sezioni collapsible | Elimina le 4 sottosezioni. Il turno si compone qui, senza cambiare schermata. |
| 3 | **Risultati** | Racconto dell'esito + metriche chiave + tabella dettagliata (espandibile) | Sostituisce la tabella a 4 colonne attuale. Il racconto risponde a "perché ho ottenuto questo risultato". |
| 4 | **Classifica** | Posizione, profitto cumulato, KPI per azienda | Invariata nella funzione, ridisegnata nella compattezza. |

**Eliminati:**
- **Simula** → le decisioni *sono* la simulazione; il tick del motore è automatico dopo l'invio.
- **Conti** → integrato in Risultati (ricavi, costi, profitto sono parte del racconto del trimestre).
- **Mercato** → integrato in Cruscotto (condizioni di mercato sono contesto, non una destinazione decisionale).
- **4 sottosezioni dentro Decisioni** → sostituite da sezioni collapsible nella stessa pagina.

---

## 3. Flusso end-to-end: dal primo avvio alla chiusura del primo trimestre

### 3.1 Primo avvio (chi apre il gioco per la prima volta)

```
SCHERMATA 1 — Benvenuto
┌──────────────────────────┐
│                          │
│     🎮 Business Game     │
│                          │
│  8 trimestri.            │
│  Vendi il più che puoi.  │
│                          │
│  [ Inizia la partita ]   │
│                          │
│  (configurazione         │
│   predefinita)           │
└──────────────────────────┘
```

- Nessuna "Configurazione partita" con cursori economici.
- Nessun numero mostrato prima di aver giocato.
- Si parte con `DEFAULT_CONFIG` del motore (prezzo €100, domanda 10.000, ecc.).
- "Inizia la partita" porta direttamente al Cruscotto del trimestre 1.

**Configurazione partita** → accessibile solo da "Nuova partita" nella lobby, con:
- 3 campi semplici: numero giocatori, numero di trimestri, nome giocatore.
- Sezione espandibile "Impostazioni avanzate" → lì dentro i parametri economici (costo unitario, domanda, elasticità, ecc.).

### 3.2 Turno tipo (Q1 → Q2 → …)

```
CRUSCOTTO (Q1)
  │
  ├── Vede: liquidità, capacità, domanda vs capacità,
  │       alert ("Non hai ordinato materie prime"),
  │       CTA primaria "Imposta le tue decisioni"
  │
  ▼
DECISIONI (scorrere, non cambiare tab)
  │
  ├── Prezzo
  ├── Produzione (stabilimenti + straordinari)
  ├── Approvvigionamento (se attivo nel motore)
  ├── Marketing (se attivo nel motore)
  │
  ├── [ Riepilogo decisioni ]  ← espandibile/collassabile
  │
  └── [ Invia e chiudi il trimestre ]
        │
        ▼
  Se decisioni incomplete → blocco con avviso specifico
  Se decisioni complete  → tick del motore → RISULTATI
        │
        ▼
RISULTATI (Q1)
  │
  ├── Racconto: "Hai venduto 3.200 unità su 5.000 domandate.
  │   Hai perso 1.800 vendite perché la capacità (3.000)
  │   era inferiore alla domanda. Profitto: €..."
  ├── Stati chiave (stat-grid)
  ├── Tabella dettagliata (espandibile)
  └── [ Vai al prossimo trimestre ] → CRUSCOTTO Q2
```

---

## 4. Wireframe testuali (375px, mobile-first)

### 4.1 Cruscotto — trimestre 1 (primo avvio)

```
┌──────────────────────────────────┐
│  ◀ Q1 2026        🏆 Classifica │  ← tab bar (4 tab)
├──────────────────────────────────┤
│                                  │
│  💰 Liquidità: €1.000.000       │  ← card (classe "card")
│  🏭 Capacità: 3.000 / 5.000 u   │     (con h2 come titolo)
│  📦 Domanda: 5.000 u             │
│                                  │
│  ⚠️ Non hai ancora ordinato     │  ← hint warn
│     materie prime per Q1         │
│                                  │
│  ⚠️ Non hai impostato il prezzo │
│                                  │
│  ─────────────────────────────── │
│                                  │
│  ┌────────────────────────────┐  │
│  │  📋 Imposta le tue         │  │  ← btn primario (classe "btn")
│  │     decisioni per Q1       │  │
│  └────────────────────────────┘  │
│                                  │
│  ─────────────────────────────── │
│                                  │
│  📊 Come funziona:              │  ← collapsibile, non
│  1. Fissa il prezzo              │     un muro di testo
│  2. Decidi produzione            │
│  3. Invia → vedi i risultati    │
│                                  │
├──────────────────────────────────┤
│  🏠 Cruscotto  📋 Decisioni  📊 Risultati  🏆 Classifica │  ← tab bar
└──────────────────────────────────┘
```

**Gerarchia:** alert urgenti in alto → CTA primaria → guida compatta.
Il giocatore vede *immediately* cosa non ha fatto e cosa fare dopo.

### 4.2 Decisioni — una schermata, tutto il turno

```
┌──────────────────────────────────┐
│  ◀ Decisioni Q1     🏠 Cruscotto│  ← tab bar
├──────────────────────────────────┤
│                                  │
│  ── PREZZO ───────────────────── │  ← sezione, sempre visibile
│                                  │
│  Prezzo di vendita:              │
│  ┌─────────────────────────────┐ │
│  │  € 120                     │ │  ← campo numerico editabile
│  └─────────────────────────────┘ │     (classe "price-value")
│                                  │
│  ──●──────────────────────────○─ │  ← slider (range-labels)
│  €80                          €200│
│                                  │
│  Preset rapidi:                  │
│  [ €100 (rif.) ] [ Come Q0 ]    │  ← chip (classe "chip")
│  [ Domanda stimata ]            │
│                                  │
│  ── PRODUZIONE ───────────────── │  ← sezione collapsible
│                                  │
│  Stabilimenti:  1  [-] [+]       │  ← stepper (+/- buttons)
│  Costo: €250.000 ciascuno       │  ← prod-row + prod-label + prod-value
│                                  │
│  Straordinari:  [ OFF ] [ ON ]  │  ← toggle
│  Se ON: capacità +40%, costo +40%│     (hint sotto)
│                                  │
│  ── APPROVVIGIONAMENTO ───────── │  ← sezione collapsible
│                                  │     (target futuro se modulo
│  Ordina materie prime:          │      supply non attivo in v0.1)
│  [ Quantità: 5.000 ]            │
│  [ Budget: € ___ ]              │
│                                  │
│  ── MARKETING ────────────────── │  ← sezione collapsible
│                                  │     (target futuro se modulo
│  Budget marketing: € ___        │      marketing non attivo in v0.1)
│                                  │
│  ── RIEPILOGO ────────────────── │  ← espandibile, collassabile
│                                  │
│  Prezzo: €120 | Stabilimenti: 1 │
│  Straordinari: OFF               │
│  ─────────────────────────────── │
│  Costi stimati: €30.000 fisso   │
│  + €250.000 acquisto stabilimento│
│  ─────────────────────────────── │
│                                  │
│  ┌─────────────────────────────┐ │
│  │  ✅ Invia e chiudi trimestre │ │  ← btn primario, sticky bottom
│  └─────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│  🏠 Cruscotto  📋 Decisioni  📊 Risultati  🏆 Classifica │
└──────────────────────────────────┘
```

**Meccanismo di inserimento numerico (dettaglio):**

| Tipo di valore | Controllo | Preset |
|---|---|---|
| Prezzo | Campo numerico editabile + slider sincronizzato | "Come Q0", "Prezzo di riferimento (€100)", "Domanda stimata" |
| Stabilimenti | Stepper (+/− buttons) con campo numerico | "Nessuno nuovo", "Come Q0" |
| Straordinari | Toggle ON/OFF | — |
| Materie prime | Campo numerico + slider | "Come Q0", "Domanda stimata" |
| Marketing | Campo numerico + slider | "Nessuno", "Come Q0" |

- Slider e campo numerico sono **bidirezionalmente collegati**: cambi uno, l'altro si aggiorna.
- I preset sono **chip cliccabili** (classe `chip`) sotto il controllo, non una schermata a parte.
- Il campo numerico accetta digitazione diretta su telefono (tastiera numerica con `input type="number"`).

### 4.3 Risultati — Q1

```
┌──────────────────────────────────┐
│  ◀ Risultati Q1   🏠 Cruscotto  │  ← tab bar
├──────────────────────────────────┤
│                                  │
│  📖 Cosa è successo             │  ← racconto, non tabella
│                                  │
│  Hai venduto 3.200 unità a       │
│  €120 ciascuna. La domanda era  │
│  di 5.000 unità, ma la tua      │
│  capacità (3.000) non bastava.   │
│  Hai perso 1.800 vendite.        │
│                                  │
│  💰 Profitto: €86.400           │  ← stat-v (grande, evidenziato)
│  📊 Margine: 43%                 │
│  📦 Vendite perse: 1.800 u       │
│                                  │
│  ─────────────────────────────── │
│                                  │
│  📊 Dettaglio per azienda        │  ← collapsibile
│  ┌────────┬──────┬────────┬──────┐│
│  │Azienda │Prezzo│Qualità │Vendite││
│  │La tua  │ €120 │  —     │ 3.200 ││
│  │Rivale  │ €95  │  —     │ 4.100 ││
│  └────────┴──────┴────────┴──────┘│
│                                  │
│  💡 Prossimo trimestre:          │  ← hint contestuale
│  La domanda è 5.000 u. Hai      │
│  capacità per 3.000. Considera   │
│  di aumentare la produzione o    │
│  il prezzo per ridurre la domanda│
│  insoddisfatta.                  │
│                                  │
│  ┌─────────────────────────────┐ │
│  │  ➜ Vai al Q2               │ │
│  └─────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│  🏠 Cruscotto  📋 Decisioni  📊 Risultati  🏆 Classifica │
└──────────────────────────────────┘
```

### 4.4 Guardrail: trimeste chiuso senza decisioni

Se il giocatore prova a chiudere il trimestre senza aver impostato il prezzo:

```
┌──────────────────────────────────┐
│  ⚠️ Non puoi chiudere il        │
│     trimestre così               │
│                                  │
│  Il prezzo di vendita è          │
│  obbligatorio.                   │
│                                  │
│  [ Vai a Impostare il Prezzo ]   │  ← CTA specifica
│  [ Usa il prezzo di riferimento │     (non un generico "OK")
│    €100 e chiudi ]               │
└──────────────────────────────────┘
```

Se mancano solo decisioni secondarie (es. marketing non impostato), si applicano default (budget €0) con un **yellow hint** (classe `hint warn`): "Marketing: budget €0 (default). Modifica nelle Decisioni."

---

## 5. Meccanismo di inserimento numerico su telefono — dettaglio

**Regola:** ogni valore numerico ha **tre modi** di essere impostato, non solo il slider:

1. **Slider** — per esplorazione rapida e visuale. Range con label min/max.
2. **Campo numerico editabile** — per precisione. Su telefono appare la tastiera numerica (`input type="number"` con `step`, `min`, `max` dal motore).
3. **Preset rapidi (chip)** — per decisioni istantanee. Esempi:
   - "Come il trimestre scorso" → riporta il valore di Q(n-1)
   - "Prezzo di riferimento" → il `refPrice` dalla configurazione
   - "Domanda stimata" → un valore calcolato dal contesto
   - "Zero" / "Default" → reset al valore di default del motore

**Slider e campo numerico sono sincronizzati in tempo reale.** Il giocatore può trascinare il slider per trovare un range, poi digitare il numero esatto nel campo.

**Per valori interi discreti** (stabilimenti, quantità ordinate): usare uno **stepper** con bottoni +/− e campo numerico, non un slider continuo.

---

## 6. Cosa vede chi apre il gioco la prima volta — sintesi

1. **Schermata di benvenuto** (1 schermata): nome del gioco, obiettivo in una frase, bottone "Inizia".
2. **Cruscotto Q1**: stato dell'azienda con alert su cosa manca, CTA "Imposta le tue decisioni", guida compatta in 3 righe.
3. **Decisioni**: tutte le leve del trimestre su una pagina scrollabile, con slider + campo numerico + preset per ogni valore.
4. **Risultati**: racconto dell'esito prima della tabella, con hint per il prossimo trimestre.
5. **Classifica**: posizione e KPI delle aziende.

**Niente** schermata di configurazione economica al primo avvio. I parametri tecnici sono nel motore (`DEFAULT_CONFIG`) e accessibili solo in "Impostazioni avanzate" dentro "Nuova partita".

---

## 7. Target futuro (leve nel motore ma non attive in v0.1)

Queste esistono nell'engine (`supply.ts`, `marketing.ts`, `workforce.ts`, `quality.ts`, `rivals.ts`, `cash.ts`) ma sono **spente di default**. Il flusso di Decisioni è progettato per accoglierle quando verranno attivate:

| Modulo | Stato | Come appare in Decisioni |
|---|---|---|
| `supply` (ordini materie prime) | Inattivo in v0.1 | Sezione collapsible, grigio "Disponibile in versione futura" |
| `marketing` (budget marketing) | Inattivo in v0.1 | Sezione collapsible, grigio "Disponibile in versione futura" |
| `workforce` (forza lavoro) | Inattivo in v0.1 | Sezione collapsible, grigio |
| `quality` (qualità percepita) | Inattivo in v0.1 | Sezione collapsible, grigio |
| `rivals` (rivali reattivi) | Inattivo in v0.1 | Non è una decisione del giocatore; appare in Cruscotto/Risultati |
| `cash` (gestione cassa/fido) | Inattivo in v0.1 | Integrato nel Cruscotto |

Quando un modulo viene attivato, la sezione corrispondente in Decisioni diventa attiva automaticamente — il layout a sezioni collapsible lo supporta senza modifiche strutturali.

---

## 8. Cosa cambia rispetto all'attuale — tabella riassuntiva

| Aspetto | Prima (attuale) | Dopo (proposto) |
|---|---|---|
| Tab di navigazione | 6 tab + 4 sottosezioni | **4 tab, nessuna sottosezione** |
| Decisioni per turno | 4 sottosezioni da aprire | **1 schermata, sezioni collapsible** |
| Prima schermata | Configurazione partita con cursori economici | **Benvenuto semplice + Cruscotto con CTA** |
| Inserimento numeri | Solo slider | **Slider + campo editabile + preset (chip)** |
| Trimestre senza decisioni | Chiuso silenziosamente, avviso dopo | **Blocco preventivo con CTA specifica** |
| Esito trimestre | Tabella a 4 colonne + avviso testuale | **Racconto → metriche → tabella espandibile** |
| Configurazione partita | Visibile a tutti, 2 schermate di cursori | **Nascosta in "Avanzate", 3 campi semplici** |
| Guida | Assente | **3 righe nel Cruscotto + hint contestuali** |

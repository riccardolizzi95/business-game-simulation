# Proposta — S18-2: Cosa deve guidare il giocatore: urgenze, consigli e racconto dell'esito

- Ruolo: **game-designer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 21:10:21

---

# Proposta: Guida al Giocatore (S18-2)

---

## 1. Segnalazioni pre-chiusura trimestre

| Controllo | Quando scatta (soglia esatta) | Livello | Testo (esempio) |
|---|---|---|---|
| **Produzione < Domanda stimata** | `capacityTotal < estimatedDemand × 0.95` | ⚠️ Avviso | «Produci **{capacityTotal}** unità, ma la domanda stimata è **{estimatedDemand}**. Perderai ~{lost} vendite se non alzi capacità o prezzo.» |
| **Materie prime insufficienti** | `materialOnHand < plannedProduction × materialPerUnit` | ⚠️ Avviso | «Hai **{materialOnHand}** kg in magazzino, ne servono **{needed}** per la produzione pianificata. Ordina ora o riduci il target.» |
| **Cassa prevista < 0** | `cash + projectedCashFlow < 0` | 🔴 Blocco morbido (conferma extra) | «Chiudendo ora la cassa andrà a **{projectedCash:,.0f} €** (scoperto). Vuoi procedere o rivedere prezzo/produzione/ordini?» |
| **Cassa prevista < 10% overhead** | `cash + projectedCashFlow < overheadPerQuarter × 0.1` | 🟡 Nota | «Margine di cassa sottile: **{projectedCash:,.0f} €** dopo i costi fissi. Un imprevisto ti metterebbe in difficoltà.» |
| **Prezzo > refPrice × 1.3 senza qualità** | `price > refPrice × 1.3 && perceivedQuality < marketAvgQuality` | 🟡 Nota | «Prezzo **{price} €** (>{refPrice×1.3:.0f} €) ma qualità **{perceivedQuality}** < media mercato **{marketAvgQuality}**. Rischi quota < 10%.» |
| **Prezzo < unitCost × 1.1** | `price < unitCost × 1.1` | 🟡 Nota | «Prezzo **{price} €** copre a malapena il costo variabile (**{unitCost} €**). Margine unitario ~{(price-unitCost):.0f} €.» |
| **Marketing = 0 e quota < 20%** | `marketingSpend == 0 && marketShare < 0.2` | 💡 Suggerimento | «Nessun marketing e quota **{marketShare×100:.0f}%**. Un investimento modesto (5-10k) alzerebbe la visibilità.» |
| **Stabilimenti = 0** | `plants == 0` | 🔴 Blocco morbido | «Nessuno stabilimento: **produzione = 0**. Acquistane almeno uno o il trimestre sarà a zero vendite.» |

**Regole di insistenza**
- **Nota** (`hint`): banner giallo, non blocca, si chiude con ✕.
- **Avviso** (`hint warn`): banner arancione, non blocca, persiste finché la condizione non cambia.
- **Blocco morbido**: modal di conferma «Procedi comunque?» con due bottoni (Annulla / Conferma). Mai impedire davvero la chiusura.

**Dati motore usati** (già esposti da `simulateQuarter` / `PlayerDecision` / `EngineConfig`):
- `capacityTotal = plants × plantCapacity × (overtime ? 1.4 : 1)`
- `estimatedDemand = marketShare × totalDemand` (stima lato client con prezzo corrente)
- `materialOnHand`, `plannedProduction`, `materialPerUnit` (da `MaterialOrderOptions` / `supply`)
- `cash`, `projectedCashFlow = revenue - varCost - fixedCost - capex - materialOrders - marketing - workforceCost`
- `perceivedQuality`, `marketAvgQuality` (da `quality` / `rivals`)
- `marketShare` (ultimo `PlayerResult`)

---

## 2. Racconto dell'esito (post-chiusura)

Generato **dopo** `simulateQuarter`, usando `PlayerResult` + `LostSalesCause` + `MarketConditions` + rivali.

### Struttura: 3-4 frasi, ordinate per importanza

| Frase | Condizione di attivazione | Template |
|---|---|---|
| **1. Risultato vendite** | Sempre | «Hai venduto **{sales}** unità ({share×100:.1f}% quota) a **{price} €** → ricavi **{revenue:,.0f} €**.» |
| **2. Vendite perse + causa** | `lostSales > 0` | «Hai perso **{lostSales}** vendite: **{causeLabel}** ({lostPct×100:.0f}% della domanda).» |
| **3. Profitto e cassa** | Sempre | «Profitto trimestre: **{profit:+,.0f} €**; cassa **{cash:+,.0f} €** ({cashDelta:+,.0f} € vs trimestre scorso).» |
| **4. Posizione competitiva** | `rivals.length > 0` | «Qualità percepita **{perceivedQuality}** vs media rivali **{avgRivalQuality}** ({qualityGap:+.1f}). Prezzo **{priceGap:+.0f} €** vs media **{avgRivalPrice} €**.» |
| **5. Evento di mercato** | `marketEvent != null` | «Evento: **{eventName}** → {eventEffectDesc}.» |

### Mappe `LostSalesCause` → `causeLabel` / `lostPct`

| Enum value | causeLabel | lostPct calcolo |
|---|---|---|
| `CAPACITY` | «capacità insufficiente» | `lostSales / (sales + lostSales)` |
| `PRICE` | «prezzo non competitivo» | idem |
| `QUALITY` | «qualità percepita bassa» | idem |
| `STOCKOUT` | «rottura di stock materie prime» | idem |
| `MARKETING` | «visibilità insufficiente» | idem |
| `WORKFORCE` | «organico insufficiente» | idem |

**Regola di selezione**: si mostrano **massimo 4 frasi**. Priorità: 1 → 2 (se lost>0) → 3 → 4 (se rivali) → 5 (se evento). Se lostSales=0, si salta la 2.

**Dati motore usati**: `PlayerResult.{sales, lostSales, lostSalesCause, revenue, profit, cash, cashDelta, perceivedQuality, marketShare}`, `MarketConditions.{event, totalDemand}`, array `rivals` con `price`, `quality`.

---

## 3. Suggerimento del trimestre («Cosa guardare adesso»)

Un **singolo suggerimento** in evidenza nel Cruscotto, sotto forma:  
`💡 **{titolo}** — {descrizione breve} → [Vai a {sezione}]`

### Regola di scelta (priorità decrescente)

| Priorità | Condizione | Titolo | Sezione target |
|---|---|---|---|
| 1 | `cash < overheadPerQuarter × 2` | «Cassa critica» | Conti → Finanziamento |
| 2 | `lostSalesCause == CAPACITY && lostSales > sales × 0.15` | «Capacità saturata» | Decisioni → Operations |
| 3 | `lostSalesCause == PRICE && marketShare < 0.15` | «Prezzo fuori mercato» | Decisioni → Commerciale |
| 4 | `lostSalesCause == QUALITY && perceivedQuality < avgRivalQuality - 0.5` | «Qualità da recuperare» | Decisioni → Marketing / Operations |
| 5 | `lostSalesCause == STOCKOUT` | «Approvvigionamento» | Decisioni → Acquisti |
| 6 | `marketingSpend == 0 && marketShare < 0.2` | «Visibilità zero» | Decisioni → Marketing |
| 7 | `quarter <= 2 && plants == 1` | «Primo stabilimento» | Decisioni → Operations |
| 8 | `quarter <= 3 && workforceCount < estimatedDemand / productivityPerWorker` | «Organico sottodimensionato» | Decisioni → HR |
| 9 | (default) | «Rivedi prezzo e produzione» | Decisioni → Commerciale |

**Solo la prima riga vera vince**. Il suggerimento sparisce quando la condizione non è più vera.

**Dati motore usati**: `PlayerResult`, `EngineConfig`, `quarter` (da stato partita), `rivals` per medie.

---

## 4. Primo trimestre — Percorso guidato (60 secondi)

Obiettivo: far fare **3 azioni minime** prima del primo «Chiudi trimestre».

### Flusso (modal a step, non invasiva, chiudibile)

| Step | Azione guidata | Controllo da toccare | Valore suggerito (default) | Perché |
|---|---|---|---|---|
| 1 | **Imposta prezzo** | Slider Prezzo (Commerciale) | `refPrice = 100 €` | Prezzo di riferimento = benchmark mercato. |
| 2 | **Attiva produzione** | Toggle «Straordinari» (Operations) | **SPENTO** | Evita costo +40% al primo turno; capacità base 3.000 u. basta per testare. |
| 3 | **Ordina materie prime** | Input «Quantità ordine» (Acquisti) | `3.000 × materialPerUnit` (es. 3.000 kg) | Copre la produzione standard di 1 stabilimento. |
| — | **Chiudi trimestre** | Bottone «Chiudi trimestre» (Cruscotto) | — | Il gioco simula e mostra il primo racconto. |

**Regole UX**
- La guida appare **solo al Q1** e **solo se `quarter == 1 && decisionsEmpty`**.
- Ogni step ha un pulsante «Fatto» che avanza al successivo; «Salta guida» chiude tutto.
- I valori suggeriti sono **pre-riempiti** nei controlli (non hardcoded: letti da `DEFAULT_CONFIG`).
- Nessun blocco: il giocatore può ignorare e chiudere subito (vedrà le vendite perse nel racconto).

**Dati motore usati**: `DEFAULT_CONFIG.{refPrice, plantCapacity, materialPerUnit}`, `quarter`, `PlayerDecision` vuoto.

---

## 5. Riepilogo dati motore necessari (già disponibili)

| Dato | Fonte |
|---|---|
| `PlayerResult.{sales, lostSales, lostSalesCause, revenue, profit, cash, cashDelta, perceivedQuality, marketShare}` | `simulateQuarter` return |
| `MarketConditions.{totalDemand, event, eventEffectDesc}` | `resolveMarketConditions` |
| `rivals[]` con `price`, `quality` | `rivals` module |
| `EngineConfig` (refPrice, plantCapacity, unitCost, overheadPerQuarter, materialPerUnit, priceElasticity, …) | `DEFAULT_CONFIG` / `setup` |
| `PlayerDecision.{price, overtime, materialOrderQty, marketingSpend, workforceCount, plants}` | Stato UI → motore |
| `cash` (stato partita) | `cash` module / stato persistito |

Nessun nuovo campo, nessuna modifica al motore. Tutto **già esposto**.

---

## 6. Criteri di accettazione (checklist)

- [ ] 8 controlli pre-chiusura con soglie numeriche esatte e 3 livelli di insistenza
- [ ] 5 modelli di frase per il racconto, con mappa `LostSalesCause` → label + %perso
- [ ] Regola di priorità univoca per il suggerimento trimestrale (9 righe, prima vera vince)
- [ ] Percorso Q1 a 3 step + chiusura, valori presi da `DEFAULT_CONFIG`
- [ ] Tutto generabile dai dati elencati in §5 — **zero cambiamenti al motore**

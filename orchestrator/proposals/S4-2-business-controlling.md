# Proposta — S4-2: Set di KPI di controllo di gestione da esporre al giocatore

- Ruolo: **business-controlling**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 10:22:03

---

# Proposta: Set di 6 KPI di Controlling per il Cruscotto Giocatore

Basandomi sui campi calcolati da `simulateQuarter` (ricavabili dal motore: `attractedDemand`, `sales`, `lostSales`, `marketShare`, `standardCapacity`, `totalCapacity`, `standardUnits`, `overtimeUnits`, `revenue`, `productionCost`, `fixedCost`, `capex`, `profit`), ecco i 6 KPI essenziali.

---

## 1. EBITDA Margin
**Formula:** `(revenue - productionCost - fixedCost) / revenue`  
**Unità:** % (es. 0.18 → 18%)  
**Caso degenere (revenue = 0):** `null` (non calcolabile — nessun ricavo, margine privo di senso)  
**Soglia:** **Buono ≥ 15%** | **Preoccupante < 5%**  
*Perché:* Misura la redditività operativa prima di capex. Sotto il 5% l'azienda non genera cassa sufficiente a coprire investimenti e rischio.

---

## 2. Contribution Margin per Unit (Margine di contribuzione unitario)
**Formula:** `(revenue - productionCost) / sales`  
**Unità:** €/unità  
**Caso degenere (sales = 0):** `null`  
**Soglia:** **Buono ≥ €30** | **Preoccupante < €15**  
*Perché:* Quanto ogni unità venduta copre i costi fissi. Con `unitCost=55` e `refPrice=100`, il teorico max è ~€45 (senza straordinari). Sotto €15 i fissi (€20k+30k/plant) non vengono coperti a volumi normali.

---

## 3. Capacity Utilization (Saturazione impianti)
**Formula:** `sales / totalCapacity`  
**Unità:** %  
**Caso degenere (totalCapacity = 0):** `null` (nessun stabilimento → nessun vincolo capacitivo)  
**Soglia:** **Buono 85–95%** | **Preoccupante < 60% o > 98%**  
*Perché:* <60% = costi fissi sprecati; >98% = rischio stock-out e perdita quote (lost sales). Target realistico: 85–95% con buffer per domanda stocastica.

---

## 4. Lost Sales Ratio (Tasso di vendite perse)
**Formula:** `lostSales / attractedDemand`  
**Unità:** %  
**Caso degenere (attractedDemand = 0):** `0%` (nessuna domanda attratta → nulla da perdere)  
**Soglia:** **Buono ≤ 5%** | **Preoccupante > 15%**  
*Perché:* Misura il costo opportunità di capacità insufficiente. Ogni % perso è quota di mercato regalata ai concorrenti (che nel modello v0.1 la assorbono).

---

## 5. Average Unit Cost (Costo unitario medio ponderato)
**Formula:** `productionCost / sales`  
**Unità:** €/unità  
**Caso degenere (sales = 0):** `null`  
**Soglia:** **Buono ≤ €58** | **Preoccupante > €65**  
*Perché:* Benchmark: `unitCost=55` (standard), `55×1.4=77` (straordinario). Media ≤58 = straordinari usati con parsimonia; >65 = eccessivo ricorso a straordinari o mix sfavorevole.

---

## 6. Market Share (Quota di mercato)
**Formula:** `marketShare` (già calcolata dal motore come `attractiveness_i / Σ attractiveness`)  
**Unità:** %  
**Caso degenere:** Mai degenere (somma attrattività > 0 se almeno un player ha prezzo > 0)  
**Soglia (4 giocatori):** **Buono ≥ 28%** | **Preoccupante < 20%**  
*Perché:* Quota "equa" = 25%. Sopra 28% = leadership di costo/prezzo; sotto 20% = spirale discendente (meno volumi → costi fissi/unitari più alti → meno competitivo).

---

## Tabella di sintesi per implementazione UI

| KPI | Chiave (camelCase) | Formula (pseudocodice) | Unità | Degenere | Verde | Rosso |
|-----|-------------------|------------------------|-------|----------|-------|-------|
| EBITDA Margin | `ebitdaMargin` | `(rev - prodCost - fixedCost) / rev` | % | `rev===0 → null` | ≥15% | <5% |
| Contribution Margin/Unit | `contributionMarginPerUnit` | `(rev - prodCost) / sales` | € | `sales===0 → null` | ≥30 | <15 |
| Capacity Utilization | `capacityUtilization` | `sales / totalCapacity` | % | `totalCap===0 → null` | 85–95% | <60% \| >98% |
| Lost Sales Ratio | `lostSalesRatio` | `lostSales / attractedDemand` | % | `attrDemand===0 → 0` | ≤5% | >15% |
| Average Unit Cost | `avgUnitCost` | `prodCost / sales` | € | `sales===0 → null` | ≤58 | >65 |
| Market Share | `marketShare` | `marketShare` (già presente) | % | — | ≥28% | <20% |

---

## Note per il Game Designer / UI
- **Ordine consigliato nel cruscotto:** 1) EBITDA Margin (salute), 2) Market Share (posizione), 3) Capacity Utilization (decisione produzione), 4) Lost Sales Ratio (urgenza capacità), 5) Contribution Margin/Unit (decisione prezzo), 6) Avg Unit Cost (controllo costi).
- **Color coding:** Verde/Giallo/Rosso per le soglie sopra; `null` → grigio con tooltip "N/D (nessuna vendita)".
- **Tooltip obbligatorio** su ogni KPI: formula in linguaggio naturale + perché importa.
- **Nessun KPI richiede storico** (sono tutti *point-in-time* trimestrali). Lo storico lo gestisce la classifica cumulata (profitto cumulato = vittoria).

---

## Validazione incrociata con PlayerResult
Tutti i campi usati (`revenue`, `productionCost`, `fixedCost`, `sales`, `totalCapacity`, `lostSales`, `attractedDemand`, `marketShare`) sono **output diretti** di `simulateQuarter` per ogni player. Nessun dato esterno, nessuna aggregazione temporale, nessuna stima.

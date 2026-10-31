# Proposta — S5-3: Impatto contabile del magazzino: valorizzazione scorte e KPI

- Ruolo: **business-amministrativo**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 13:56:05

---

# Proposta — S5-3: Impatto contabile del magazzino: valorizzazione scorte e KPI

---

## 1. Regola di valorizzazione delle scorte (Inventory Valuation)

### 1.1 Metodo: Costo Medio Ponderato (Weighted Average Cost — WAC)
Poiché il costo unitario varia tra produzione standard (€55) e straordinario (€55 × 1.4 = €77), **il magazzino si valorizza al costo medio ponderato mobile** aggiornato a ogni trimestre.

```typescript
// Nuovo campo in PlayerResult per tracciare il costo unitario medio di magazzino
interface PlayerResult {
  // ... esistenti ...
  /** Costo medio ponderato per unità in magazzino a fine trimestre (€) */
  weightedAvgInventoryCost: number;
  /** Valore totale scorte di magazzino (chiusura) = closingInventory × weightedAvgInventoryCost */
  inventoryValue: number;
  /** COGS = unità vendute × weightedAvgInventoryCost_iniziale */
  cogs: number;
}
```

### 1.2 Formula di aggiornamento WAC (deterministica, a fine trimestre)

```
Sia:
  BI_qty   = openingInventory                    (quantità apertura)
  BI_val   = openingInventoryValue               (valore apertura = BI_qty × WAC_precedente)
  PROD_qty = productionQty
  PROD_val = productionCost                      (già calcolato in simulate: uStd×55 + uOt×77)
  SOLD_qty = unitsSold
  OBS_qty  = obsolescenceLoss                    (unità perse, escono a WAC_iniziale)

WAC_iniziale = (BI_qty > 0) ? BI_val / BI_qty : 0

// Valore disponibile per la vendita (prima obsolescenza)
AV_val = BI_val + PROD_val
AV_qty = BI_qty + PROD_qty

// COGS: le unità vendute escono al WAC_iniziale
COGS = SOLD_qty × WAC_iniziale

// Obsolescenza: unità perse escono al WAC_iniziale
obsolescenceCost = OBS_qty × WAC_iniziale

// Valore scorte finali (chiusura)
closingInventoryValue = AV_val - COGS - obsolescenceCost

// WAC di chiusura (per il trimestre successivo)
WAC_chiusura = (closingInventory > 0) ? closingInventoryValue / closingInventory : 0
```

> **Nota:** L'obsolescenza è un **costo del periodo** (conto economico), non riduce il COGS. Esce a WAC_iniziale.

---

## 2. Impatto sul Conto Economico (P&L) — Dove finisce ogni voce

| Voce | Conto Economico | Note |
|------|-----------------|------|
| **Ricavi** | `unitsSold × price` | Invariato |
| **COGS (Costo del Venduto)** | `unitsSold × WAC_iniziale` | **NON** = costo produzione del trimestre. Solo costo delle unità *effettivamente vendute*. |
| **Costo di giacenza (Holding Cost)** | **Costo operativo del periodo** (es. "Costi per servizi / oneri diversi") | `holdingCost = scorteMedie × holdingCostPerUnitPerQuarter` |
| **Costo obsolescenza** | **Costo operativo del periodo** (svalutazione scorte) | `obsolescenceLoss × WAC_iniziale` |
| **Costo estensioni magazzino** | **Costo operativo del periodo** (affitto/gestione) | `warehouseExpansionsOwned × warehouseExpansionFixedCostPerQuarter` |
| **Penalità sforamento** | **Costo operativo del periodo** | `overflowPenalty` |
| **Costi fissi stabilimenti + overhead** | Invariati | Già presenti |
| **Capex nuovi stabilimenti** | **Non in P&L** (va in Stato Patrimoniale → Ammortamento futuro) | Già presente, confermato |

### 2.1 Formula profitto trimestrale aggiornata

```
profitto_q = 
    (unitsSold × price)                           // Ricavi
  - COGS                                          // Costo del venduto (WAC)
  - holdingCost                                   // Giacenza
  - obsolescenceCost                              // Svalutazione obsolescenza
  - warehouseExpansionCost                        // Estensioni magazzino
  - overflowPenalty                               // Penalità capacità
  - (plants × plantFixedCostPerQuarter)           // Fissi stabilimenti
  - overheadPerQuarter                            // Overhead
  - capexNuoviStabilimenti                        // Capex (cash out, non costo)
```

> **Quadratura deterministica (identità contabile):**
> ```
> Valore scorte chiusura = Valore scorte apertura + Costo produzione - COGS - Costo obsolescenza
> Patrimonio Netto varia di: Profitto - Capex (cash basis)  [o - Ammortamenti se accrual]
> Cassa varia di: Incassi - Pagamenti (fornitori, dipendenti, capex, finanziamenti)
> ```

---

## 3. KPI Controlling esistenti — Quali ricalcolare e come

Assumo i 6 KPI attuali in `kpis.ts` (da verificare nel codice reale). Quelli **sicuramente impattati** dalla separazione produzione ≠ vendite:

| KPI | Formula ATTUALE (v0.1, divide per unità vendute) | Formula CORRETTA (con magazzino) | Note |
|-----|--------------------------------------------------|----------------------------------|------|
| **1. Costo medio unitario** | `productionCost / unitsSold` | **Due versioni:**<br>• `COGS / unitsSold` = costo medio *venduto* (per marginalità)<br>• `weightedAvgInventoryCost` = costo medio *in magazzino* (per valorizzazione) | Oggi confonde produzione e vendita. Va splitato. |
| **2. Margine di contribuzione unitario** | `(revenue - productionCost) / unitsSold` | `(revenue - COGS - holdingCost - obsolescenceCost) / unitsSold` | I costi variabili di periodo (giacenza, obsolescenza) vanno nel margine. Il costo produzione invenduto **no**. |
| **3. Margine di contribuzione %** | `margineUnitario / price` | Stesso numeratore corretto / `price` | |
| **4. ROS (Return on Sales)** | `profit / revenue` | `profitto_q / revenue` | Profitto usa formula §2.1. Già corretto se profitto è giusto. |
| **5. ROE / ROA** | `profit / equity` / `profit / assets` | **Assets includono ora `inventoryValue`** | Lo stato patrimoniale deve esporre le scorte. |
| **6. Cash Conversion Cycle / DSO-DPO** | (da verificare) | **Aggiungere DIO (Days Inventory Outstanding)** | Vedi §4. |

> **Azione richiesta:** In `kpis.ts`, `calculateControllingKPI` deve ricevere i nuovi campi `PlayerResult` (COGS, holdingCost, obsolescenceCost, inventoryValue, weightedAvgInventoryCost) e calcolare le formule corrette.

---

## 4. Nuovo KPI proposto: Rotazione di Magazzino (Inventory Turnover)

| KPI | Formula | Interpretazione |
|-----|---------|-----------------|
| **Inventory Turnover** | `COGS / ((openingInventoryValue + closingInventoryValue) / 2)` | Quante volte il magazzino "gira" all'anno (×4 per annualizzare). |
| **DIO (Days Inventory Outstanding)** | `365 / Inventory Turnover` (o `90 / turnover_trimestrale`) | Giorni medi di permanenza in magazzino. Target: < 45-60 gg. |
| **Stockout Rate** | `lostSales / demand` | % domanda persa per mancanza scorte. |

> **Raccomandazione:** Aggiungere `inventoryTurnover` e `DIO` come KPI 7 e 8 in `ControllingKPI`. Sono essenziali per valutare l'efficienza della leva Distribuzione/Magazzino.

---

## 5. Esempio numerico completo — 2 Trimestri (Quadratura dimostrata)

### Parametri (da GDD + S5-2)
| Parametro | Valore |
|-----------|--------|
| unitCost (std) | €55 |
| overtimeMultiplier | 1.4 → €77/u |
| holdingCostPerUnitPerQuarter | €2.50 |
| obsolescenceRate | 2% |
| plantCapacity | 3.000 |
| overtimeCapacityMultiplier | 1.4 |
| plantFixedCostPerQuarter | €30.000 |
| overheadPerQuarter | €20.000 |
| refPrice | €100 |
| priceElasticity | 1.8 |
| totalDemand | 10.000 |
| Prezzo giocatore | €100 (neutro) → quota = 1/3 → domanda = 3.333 u |

### Q1: Produzione > Vendite (costruisco scorte)
- Stabilimenti: 1, **No straordinari** → capacità = 3.000 u
- **Decisione:** `productionQty = 3.000` (massimo standard)
- Domanda = 3.333 u → `unitsSold = min(3.333, 0+3.000) = 3.000`
- `lostSales = 333`
- `openingInventory = 0`
- `rawClosing = 3.000 - 3.000 = 0` → `obsolescenceLoss = 0`, `closingInventory = 0`
- **Produzione cost:** 3.000 × €55 = **€165.000**
- **WAC_iniziale = 0** (nessuna scorta apertura)
- **COGS = 3.000 × 0 = €0** ⚠️ *Problema: WAC 0 al primo trimestre!*

> **Fix per Q1 (primo trimestre, magazzino vuoto):**  
> Quando `openingInventory = 0`, il WAC_iniziale **non è definito**. Regola pratica: **le unità prodotte e vendute nello stesso trimestre escono al costo di produzione corrente** (non a WAC).  
> → `COGS_Q1 = unitsSold × unitCost_effettivo = 3.000 × €55 = €165.000`  
> `closingInventoryValue = 0`  
> `WAC_chiusura = 0`

**Conto Economico Q1:**
| Voce | Importo |
|------|---------|
| Ricavi (3.000 × €100) | €300.000 |
| COGS | -€165.000 |
| Holding cost (scorte medie = 0) | €0 |
| Obsolescenza | €0 |
| Fissi stabilimento | -€30.000 |
| Overhead | -€20.000 |
| **Profitto Q1** | **€85.000** |

**Stato Patrimoniale Q1 (sintesi):**
| Voce | Importo |
|------|---------|
| Cassa (iniziale €1M + profitto - capex) | €1.085.000 |
| Scorte (valore) | €0 |
| Patrimonio Netto | €1.085.000 |
| **Quadratura: Attivo = Passivo** | ✅ |

---

### Q2: Vendite > Produzione (consumo scorte… ma scorte=0, quindi produco meno)
Cambio scenario per mostrare magazzino: **Q1 produce 4.000 u (con straordinari), vende 3.000 u → scorte 1.000 u**

#### Q1 Rivisto (con straordinari per creare scorte)
- Stabilimenti: 1, **Sì straordinari** → capacità = 3.000 × 1.4 = **4.200 u**
- `productionQty = 4.000` (3.000 std + 1.000 ot)
- Domanda = 3.333 → `unitsSold = 3.333` (arrotondo 3.333 per formula, ma unità intere → 3.333)
- `openingInventory = 0`
- `rawClosing = 4.000 - 3.333 = 667`
- `obsolescenceLoss = floor(667 × 0.02) = 13`
- `closingInventory = 654`

**Costo produzione Q1:**
- 3.000 std × €55 = €165.000
- 1.000 ot × €77 = €77.000
- **Totale = €242.000**

**WAC_iniziale = 0** (primo trimestre) → **COGS = 3.333 × costo medio produzione?**
> Regola Q1: senza scorte apertura, COGS = costo produzione delle unità vendute **in ordine FIFO logico** (prima std, poi ot).  
> Vendute 3.333: 3.000 std + 333 ot  
> `COGS_Q1 = 3.000×55 + 333×77 = €165.000 + €25.641 = €190.641`

**Valore scorte chiusura Q1:**
- Rimanenti: 0 std + 667 ot → ma obsolescenza 13 su 667 (proporzionale? S5-2 dice "su scorte finali", assumo pro-rata)
- `obsolescenceCost = 13 × €77 = €1.001` (escono a costo ot)
- `closingInventoryValue = €242.000 - €190.641 - €1.001 = €50.358`
- `closingInventory = 654 u` → `WAC_chiusura = €50.358 / 654 = €77.00` (solo unità ot rimaste)

**Holding cost Q1:** scorte medie

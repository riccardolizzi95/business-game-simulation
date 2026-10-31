# Proposta — S5-2: Regole del MAGAZZINO: scorte, costo di giacenza, produzione ≠ vendite

- Ruolo: **business-supply-chain**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 13:51:27

---

# Proposta: Regole del MAGAZZINO (Inventory Rules)

## 1. Nuovi campi in `EngineConfig` (tipi TypeScript)

```typescript
// Aggiungere in types.ts
interface EngineConfig {
  // ... campi esistenti ...
  
  // === MAGAZZINO ===
  /** Costo di giacenza per unità per trimestre (€) */
  holdingCostPerUnitPerQuarter: number;        // → 2.50
  /** Capacità base di magazzino (unità) */
  baseWarehouseCapacity: number;                // → 5000
  /** Capacità aggiuntiva per estensione magazzino (unità) */
  warehouseExpansionCapacity: number;           // → 2000
  /** Costo fisso per estensione magazzino per trimestre (€) */
  warehouseExpansionFixedCostPerQuarter: number; // → 5000
  /** Tasso di obsolescenza/deperimento per trimestre (frazione 0-1) */
  obsolescenceRatePerQuarter: number;           // → 0.02 (2%)
  /** Massimo numero di estensioni magazzino acquistabili */
  maxWarehouseExpansions: number;               // → 3
}
```

## 2. Nuovi campi in `PlayerDecision` (scelte del giocatore)

```typescript
interface PlayerDecision {
  // ... campi esistenti ...
  
  /** Unità da PRODURRE questo trimestre (decisione separata dalla vendita) */
  productionQty: number;          // 0 ≤ productionQty ≤ capacità disponibile
  /** Estensioni magazzino da acquistare questo trimestre (0-3) */
  warehouseExpansions: number;    // intero, cumulativo
}
```

## 3. Nuovi campi in `PlayerResult` (output simulazione)

```typescript
interface PlayerResult {
  // ... campi esistenti ...
  
  /** Scorte iniziali trimestre */
  openingInventory: number;
  /** Unità prodotte */
  productionQty: number;
  /** Unità vendute (min(domanda, scorteIniziali + produzione)) */
  unitsSold: number;
  /** Scorte finali = apertura + produzione - vendite - obsolescenza */
  closingInventory: number;
  /** Unità perse per obsolescenza */
  obsolescenceLoss: number;
  /** Costo giacenza = scorteMedie × holdingCostPerUnitPerQuarter */
  holdingCost: number;
  /** Costo estensioni magazzino */
  warehouseExpansionCost: number;
  /** Capacità magazzino effettiva questo trimestre */
  warehouseCapacity: number;
  /** Penalità sforamento (se closingInventory > capacità) */
  overflowPenalty: number;
  /** Vendite perse per mancanza scorte (stockout) */
  lostSales: number;
}
```

---

## 4. Regole di simulazione (algoritmo)

### 4.1 Capacità produttiva (invariata)
```
capStandard   = plants × plantCapacity
capacity      = overtime ? capStandard × 1.4 : capStandard
```
**Vincolo:** `productionQty ≤ capacity` (validato lato client/server; se supera → clamp a capacity).

### 4.2 Capacità magazzino
```
warehouseCapacity = baseWarehouseCapacity + warehouseExpansionsOwned × warehouseExpansionCapacity
```
`warehouseExpansionsOwned` è cumulativo (persiste tra trimestri).

### 4.3 Flusso scorte (core)
```
openingInventory   = closingInventory_precedente  (Q1: 0)
availableToSell    = openingInventory + productionQty
unitsSold          = min(demand, availableToSell)
lostSales          = demand - unitsSold

// Obsolescenza applicata sulle scorte FINALI (dopo vendite)
rawClosing         = availableToSell - unitsSold
obsolescenceLoss   = floor(rawClosing × obsolescenceRatePerQuarter)
closingInventory   = rawClosing - obsolescenceLoss
```

### 4.4 Costo di giacenza (holding cost)
```
averageInventory = (openingInventory + closingInventory) / 2
holdingCost      = averageInventory × holdingCostPerUnitPerQuarter
```
*Rationale: costo su scorte medie evita incentivi a "svuotare alla fine del trimestre".*

### 4.5 Sforamento magazzino (overflow)
```
if (closingInventory > warehouseCapacity) {
  overflowQty     = closingInventory - warehouseCapacity
  overflowPenalty = overflowQty × holdingCostPerUnitPerQuarter × 3  // 3× penalità
  // Le unità in eccesso restano a magazzino ma pagano la penalità
} else {
  overflowPenalty = 0
}
```

### 4.6 Costo produzione (invariato per unità standard/straordinario)
```
uStd = min(productionQty, capStandard)
uOt  = productionQty - uStd
prodCost = uStd × unitCost + uOt × unitCost × overtimeUnitCostMultiplier
```

### 4.7 Profitto trimestre (aggiornato)
```
revenue           = unitsSold × price
totalCost         = prodCost + holdingCost + warehouseExpansionCost + overflowPenalty
                  + plants × plantFixedCostPerQuarter + overheadPerQuarter
                  + plantsBoughtThisQuarter × plantCapex
profit            = revenue - totalCost
cash              = cash_precedente + profit
```

---

## 5. Giustificazione numerica: **Holding Cost = 2,50 €/unità/trimestre**

| Componente | % annuo su costo unitario (55 €) | €/anno | €/trimestre |
|------------|----------------------------------|--------|-------------|
| Capitale immobilizzato (WACC 10%) | 10,0% | 5,50 | 1,38 |
| Magazzinaggio/spazi/handling | 4,0% | 2,20 | 0,55 |
| Assicurazione | 1,0% | 0,55 | 0,14 |
| Obsolescenza/rotture (rischio, non tasso effettivo) | 3,0% | 1,65 | 0,41 |
| **Totale** | **18,0%** | **9,90** | **2,48** ≈ **2,50** |

**Perché non sul prezzo (100 €)?** Il costo di giacenza è un costo *operativo* legato al COGS (55 €), non al valore di vendita. Usare il prezzo gonfierebbe artificialmente il costo e scoraggerebbe qualunque scorta.

**Effetto sul trade-off:**
- Margine unitario standard = 100 - 55 = **45 €**
- Tenere 1 unità 1 trimestre costa **2,50 €** → **5,6% del margine**
- Tenere 1 unità 4 trimestri (1 anno) costa **10 €** → **22% del margine**
- *Messaggio al giocatore:* "Accumulare scorte ha senso per coprire picchi domanda o risparmiare straordinari, ma ogni trimestre in magazzino erode il margine."

---

## 6. Esempio numerico completo (Trade-off sovra/sotto-produzione)

**Scenario:** 1 stabilimento, no straordinari, prezzo = 100 €, domanda = 3.000 unità/trimestre (costante), Q1 scorte=0.

| Trimestre | Decisione produzione | Domanda | Disponibile | Vendite | Scorte fine | Holding cost | Obsol. | Profitto trim. | Note |
|-----------|---------------------|---------|-------------|---------|-------------|--------------|--------|----------------|------|
| **Q1** | 3.000 (esatta) | 3.000 | 3.000 | 3.000 | 0 | 0 | 0 | 3.000×45 - 30k - 20k = **65.000** | Baseline |
| **Q2** | 3.000 | 3.000 | 3.000 | 3.000 | 0 | 0 | 0 | **65.000** | |
| **Totale 2Q** | | | | **6.000** | | **0** | | **130.000** | |

### Variante A: SOVRAPPRODUZIONE (build inventory per evitare straordinari futuri)
*Ipotesi: Q3 domanda sale a 4.000 (capacità 3.000 → servirebbero straordinari)*

| Trimestre | Produzione | Domanda | Disponibile | Vendite | Scorte fine | Holding cost | Profitto trim. |
|-----------|------------|---------|-------------|---------|-------------|--------------|----------------|
| Q1 | 3.000 | 3.000 | 3.000 | 3.000 | 0 | 0 | 65.000 |
| Q2 | **3.500** | 3.000 | 3.500 | 3.000 | **490** (500 - 2% obs) | (0+490)/2 × 2,5 = **613** | 3.000×45 - (3.000×55 + 500×55) - 613 - 50k = **34.387** |
| Q3 | 3.000 | **4.000** | 3.490 | **3.490** | 0 | (490+0)/2 × 2,5 = **613** | 3.490×45 - 3.000×55 - 613 - 50k = **81.437** |
| **Totale 3Q** | | | | **9.490** | | **1.226** | **180.824** |

**Confronto vs straordinari in Q3 (senza scorte):**
- Q3 con straordinari: produci 4.000 (3.000 std + 1.000 OT @ 77 €), vendi 4.000
  - Costo prod = 3.000×55 + 1.000×77 = 242.000
  - Profitto Q3 = 4.000×45 - 242.000 - 50.000 = **28.000**
- **Totale 3Q con straordinari** = 65k + 65k + 28k = **158.000**
- **Vantaggio scorte** = 180.824 - 158.000 = **+22.824 €** (≈ +14%)

> **Lezione:** Costruire scorte in Q2 (costo 613 + 500 unità × 55 € capitale immobilizzato) evita il costo straordinario (22 €/unità extra) in Q3. Il trade-off è reale e quantificabile.

### Variante B: SOTTOPRODUZIONE (stockout)

| Trimestre | Produzione | Domanda | Vendite | Lost sales | Profitto |
|-----------|------------|---------|---------|------------|----------|
| Q1 | 2.500 | 3.000 | 2.500 | 500 | 2.500×45 - 2.500×55 - 50k = **37.500** |
| Q2 | 3.000 | 3.000 | 3.000 | 0 | **65.000** |
| **Totale** | | | **5.500** | **500** | **102.500** |

**Perso vs baseline:** 130.000 - 102.500 = **-27.500 €** (500 unità × 45 € margine + 500 × 55 € costi fissi non assorbiti).

---

## 7. Casi limite espliciti

| Caso | Comportamento |
|------|---------------|
| **Primo trimestre (Q1)** | `openingInventory = 0`. Il giocatore può produrre fino a capacità e accumulare scorte da subito. |
| **Magazzino vuoto + domanda > produzione** | `unitsSold = productionQty`, `lostSales = demand - productionQty`, `closingInventory = 0`. Nessun holding cost. |
| **Scorte coprono tutta la domanda** | `unitsSold = demand`, `lostSales = 0`, `closingInventory = openingInventory + productionQty - demand - obsolescence`. Holding cost su scorte medie. |
| **Obsolescenza azzera scorte** | Se `rawClosing × 0.02 ≥ rawClosing` (solo se rawClosing=0), `obsolescenceLoss = rawClosing`, `closingInventory = 0`. |
| **Sforamento capacità magazzino** | Penalità 3× holding cost per unità in eccesso. Le unità restano a magazzino (non vengono "buttate" automaticamente). |
| **Estensione magazzino in ritardo** | `warehouseExpansions` deciso in Qn è attivo da Qn (stesso trimestre). Il giocatore deve anticipare. |
| **Produzione = 0** | Ammesso. `unitsSold = min(demand, openingInventory)`. Holding cost su scorte che si svuotano. |

---

## 8. Cosa NON cambia (invarianze motore attuale)

| Elemento | Confermato invariato |
|----------|---------------------|
| **Domanda di mercato** | Formula attrattività → quota → domanda identica (v0.2 con elasticità asimmetrica + rumore/eventi). |
| **Capacità produttiva** | `plantCapacity = 3.000`, `overtimeCapacityMultiplier = 1.4`, `overtimeUnitCostMultiplier = 1.4`. |
| **Costi fissi** | `plantFixedCostPerQuarter =

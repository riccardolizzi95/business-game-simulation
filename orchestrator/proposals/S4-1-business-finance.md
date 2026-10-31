# Proposta — S4-1: Regole della cassa vincolata (liquidità come vincolo di gioco)

- Ruolo: **business-finance**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 10:23:10

---

# Proposta: Regole della Cassa Vincolata (S4-1)

## 1. Sintesi dell'approccio

Aggiungo **tracciamento della cassa** come vincolo operativo: ogni trimestre la cassa varia per flussi operativi e capex; se insufficiente, scatta un **fido oneroso** (overdraft) con tasso progressivo; sotto una soglia critica → **sconfitta (bankruptcy)**.  
**Nessuna modifica** a: formula domanda, elasticità asimmetrica, allocazione capacità, calcolo profitto unitario. Il determinismo bit-per-bit senza `seed` resta intatto.

---

## 2. Nuovi campi in `EngineConfig`

```typescript
// Aggiungere a EngineConfig (apps/web/src/lib/game-engine/index.ts)
export interface EngineConfig {
  // ... campi esistenti ...
  
  // === CASH / LIQUIDITÀ ===
  /** Cassa iniziale per ogni giocatore (€). */
  initialCash: number;
  
  /** Fido massimo concedibile come % della cassa iniziale (es. 0.5 = 50%). */
  overdraftLimitPctOfInitialCash: number;
  
  /** Tasso base annuo sul fido utilizzato (es. 0.08 = 8%). Applicato pro-quota trimestrale. */
  overdraftBaseRateAnnual: number;
  
  /** Spread addizionale per ogni 10% di utilizzo del fido oltre il 50% (es. 0.02 = +200 bps per scaglione). */
  overdraftSpreadPerTier: number;
  
  /** Soglia di sconfitta: cassa < - (initialCash * bankruptcyThresholdPctOfInitialCash). 
   *  Es. 0.25 → fallimento se cassa < -250.000 con initialCash=1.000.000. */
  bankruptcyThresholdPctOfInitialCash: number;
  
  /** Se true, quando la cassa prevista andrebbe sotto -overdraftLimit, 
   *  la produzione viene tagliata al massimo finanziabile invece di usare fido oltre il limite. */
  hardCapProductionWhenIlliquid: boolean;
}

export const DEFAULT_CONFIG: EngineConfig = {
  // ... valori esistenti ...
  
  // === CASH DEFAULTS ===
  initialCash: 1_000_000,
  overdraftLimitPctOfInitialCash: 0.5,        // fido max = 500.000
  overdraftBaseRateAnnual: 0.08,              // 8% annuo
  overdraftSpreadPerTier: 0.02,               // +2% per scaglione >50% utilizzo
  bankruptcyThresholdPctOfInitialCash: 0.25,  // fallimento se cassa < -250.000
  hardCapProductionWhenIlliquid: true,        // taglia produzione invece di sforare fido
};
```

---

## 3. Nuovi campi in `PlayerDecision` (input giocatore)

```typescript
// Aggiungere a PlayerDecision
export interface PlayerDecision {
  // ... campi esistenti ...
  
  /** Prelievo volontario / conferimento capitale (€). Positivo = conferimento, negativo = prelievo (dividendi). 
   *  Vincolato: non può portare cassa sotto -overdraftLimit. */
  cashInjection?: number;  // default 0
}
```

---

## 4. Nuovi campi in `PlayerResult` (output motore)

```typescript
// Aggiungere a PlayerResult
export interface PlayerResult {
  // ... campi esistenti ...
  
  // === CASH FLOW ===
  /** Cassa all'inizio del trimestre (€). */
  cashOpening: number;
  
  /** Incassi da vendite = sales × price (€). */
  cashInSales: number;
  
  /** Costi variabili produzione (standard + straordinario) (€). */
  cashOutProduction: number;
  
  /** Costi fissi: overhead + plantFixedCost × plants (€). */
  cashOutFixed: number;
  
  /** Capex stabilimenti acquistati questo trimestre (€). */
  cashOutCapex: number;
  
  /** Interessi passivi su fido utilizzato (€). */
  cashOutInterest: number;
  
  /** Conferimento/prelievo volontario del giocatore (€). */
  cashInjection: number;
  
  /** Cassa a fine trimestre prima di interessi/overdraft (€). 
   *  = cashOpening + cashInSales - cashOutProduction - cashOutFixed - cashOutCapex + cashInjection */
  cashPreInterest: number;
  
  /** Fido utilizzato a fine trimestre (€, ≥ 0). 
   *  = max(0, -cashPreInterest) limitato a overdraftLimit. */
  overdraftUsed: number;
  
  /** Limite fido per questo trimestre (€). = initialCash × overdraftLimitPctOfInitialCash. */
  overdraftLimit: number;
  
  /** Tasso effettivo trimestrale applicato al fido (decimale, es. 0.021 = 2.1%/trimestre). */
  overdraftRateQuarterly: number;
  
  /** Cassa a fine trimestre (€). = cashPreInterest - cashOutInterest. 
   *  Negativa = scoperto. */
  cashClosing: number;
  
  /** Flag: true se il giocatore è in stato di fallimento (bankrupt). */
  isBankrupt: boolean;
  
  /** Flag: true se la produzione è stata tagliata per illiquidità (hard cap). */
  productionCappedByCash: boolean;
  
  /** Unità effettivamente prodotte/vendute dopo eventuale taglio cassa. */
  actualSales: number;
  
  /** Unità perse per mancanza cassa (solo se hardCapProductionWhenIlliquid=true). */
  lostSalesByCash: number;
}
```

---

## 5. Formule e logica di simulazione (da aggiungere in `simulateQuarter`)

### 5.1 Costanti derivate per trimestre
```typescript
const overdraftLimit = config.initialCash * config.overdraftLimitPctOfInitialCash;
const baseRateQuarterly = config.overdraftBaseRateAnnual / 4;  // pro-quota semplice
```

### 5.2 Flusso cassa "pre-interessi" (deterministico, usa solo campi esistenti + cashInjection)
```typescript
const cashInSales = result.sales * decision.price;
const cashOutProduction = result.productionCost;  // già calcolato dal motore v0.1
const cashOutFixed = result.fixedCost;            // già calcolato (overhead + plantFixed)
const cashOutCapex = result.capex;                // già calcolato (plantsToBuy × plantCapex)
const cashInjection = decision.cashInjection ?? 0;

const cashPreInterest = cashOpening 
  + cashInSales 
  - cashOutProduction 
  - cashOutFixed 
  - cashOutCapex 
  + cashInjection;
```

### 5.3 Determinazione fido utilizzato e tasso effettivo
```typescript
let overdraftUsed = Math.max(0, -cashPreInterest);
let productionCappedByCash = false;
let lostSalesByCash = 0;
let actualSales = result.sales;

// HARD CAP: se cassa insufficiente e flag attivo, taglia produzione invece di sforare fido
if (config.hardCapProductionWhenIlliquid && overdraftUsed > overdraftLimit) {
  // Calcolo massimo finanziabile: cashOpening + cashInSales + overdraftLimit - cashOutFixed - cashOutCapex + cashInjection
  // Ma cashInSales dipende da sales... iterazione semplice:
  // Trovo max sales tale che cashPreInterest >= -overdraftLimit
  // cashPreInterest(sales) = cashOpening + sales*price - prodCost(sales) - fixed - capex + injection
  // prodCost(sales) = min(sales, capStd)*unitCost + max(0, sales-capStd)*unitCost*otMult
  
  const maxFinanceableSales = computeMaxFinanceableSales({
    cashOpening, price: decision.price, 
    capStd: result.capacityStandard, capTot: result.capacityTotal,
    unitCost: config.unitCost, otMult: config.overtimeUnitCostMultiplier,
    fixedCost: cashOutFixed, capex: cashOutCapex, injection: cashInjection,
    overdraftLimit
  });
  
  if (maxFinanceableSales < result.sales) {
    actualSales = maxFinanceableSales;
    lostSalesByCash = result.sales - maxFinanceableSales;
    productionCappedByCash = true;
    
    // Ricalcola costi produzione e cashInSales con actualSales
    const uStd = Math.min(actualSales, result.capacityStandard);
    const uOt = actualSales - uStd;
    const newProdCost = uStd * config.unitCost + uOt * config.unitCost * config.overtimeUnitCostMultiplier;
    const newCashInSales = actualSales * decision.price;
    
    cashPreInterest = cashOpening + newCashInSales - newProdCost - cashOutFixed - cashOutCapex + cashInjection;
    overdraftUsed = Math.max(0, -cashPreInterest);
    // Aggiorna anche result.revenue, result.productionCost, result.profit per coerenza
    result.revenue = newCashInSales;
    result.productionCost = newProdCost;
    result.sales = actualSales;
    result.lostSales = (result.lostSales ?? 0) + lostSalesByCash;
    result.profit = result.revenue - result.productionCost - result.fixedCost - result.capex;
  }
}

// Clamp fido al limite (se non hardCap o se ancora oltre per arrotondamenti)
overdraftUsed = Math.min(overdraftUsed, overdraftLimit);
```

### 5.4 Calcolo tasso fido a scaglioni (tiered)
```typescript
// Utilizzo % del fido
const utilizationPct = overdraftLimit > 0 ? overdraftUsed / overdraftLimit : 0;

// Scaglioni: 0-50% = base rate; 50-60% = base+1×spread; 60-70% = base+2×spread; ecc.
const tiersAbove50 = Math.max(0, Math.floor((utilizationPct - 0.5) / 0.1) + 1);
const effectiveRateAnnual = config.overdraftBaseRateAnnual + tiersAbove50 * config.overdraftSpreadPerTier;
const overdraftRateQuarterly = effectiveRateAnnual / 4;

const cashOutInterest = overdraftUsed * overdraftRateQuarterly;
```

### 5.5 Cassa chiusura e bankruptcy check
```typescript
const cashClosing = cashPreInterest - cashOutInterest;

const bankruptcyThreshold = -config.initialCash * config.bankruptcyThresholdPctOfInitialCash;
const isBankrupt = cashClosing < bankruptcyThreshold;

// Se bankrupt: azzera tutto, flagga, partita finita per questo player
if (isBankrupt) {
  // Opzionale: azzerare capacità future, bloccare decisioni successive
}
```

### 5.6 Funzione ausiliaria `computeMaxFinanceableSales` (deterministica, pura)
```typescript
function computeMaxFinanceableSales(params: {
  cashOpening: number;
  price: number;
  capStd: number;
  capTot: number;
  unitCost: number;
  otMult: number;
  fixedCost: number;
  capex: number;
  injection: number;
  overdraftLimit: number;
}): number {
  // Binary search su sales ∈ [0, capTot] per trovare max tale che cashPreInterest >= -overdraftLimit
  let lo = 0, hi = params.capTot, best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const uStd = Math.min(mid, params.capStd);
    const uOt = mid - uStd;
    const prodCost = uStd * params.unitCost + uOt * params.unitCost * params.otMult;
    const cashIn = mid * params.price;
    const cashPre = params.cashOpening + cashIn - prodCost - params.fixedCost - params.capex + params.injection;
    if (cashPre >= -params.overdraftLimit) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}
```

---

## 6. Casi limite espliciti

| Caso | Comportamento |
|------|---------------|
| **Primo trimestre (Q1)** | `cashOpening = config.initialCash` per tutti. Nessun interesse pregresso. |
| **Cassa esattamente 0** | `overdraftUsed = 0`, `overdraftRateQuarterly = baseRate/4`, `cashClosing = -cashOutInterest` (leggermente negativo per interessi su 0 = 0). Nessun bankruptcy. |
| **Cassa negativa ma > -overdraftLimit** | Fido utilizzato = `-cashPreInterest`, interessi calcolati su quell'importo, `cashClosing` più negativo. Nessun taglio produzione. |
| **Cassa prevista < -overdraftLimit** + `hardCapProductionWhenIlliquid=true` | Produzione tagliata a `maxFinanceableSales`, `productionCappedByCash=true`, `lostSalesByCash > 0`. Fido usato = `overdraftLimit` max. |
| **Cassa prevista < -overdraftLimit** + `hardCapProductionWhenIlliquid=false` | Fido clampato a `overdraftLimit`, `cashPreInterest` effettivo = `-overdraftLimit`, interessi su `overdraftLimit`. Il giocatore "brucia" cassa futura. |
| **Bankruptcy** | `cashClosing < -initialCash × 0.25` (default -250k). `isBankrupt=true`. Motore può restituire risultato finale e marcare player come fuori gioco. |
| **Cash injection negativo (dividendi)** | Permesso solo se `cashPreInterest + cashInjection >= -overdraftLimit`. Altrimenti clampato/rigettato (validazione lato client + server). |
| **Seed assente (determinismo v0.1)** | Tutte le formule sopra sono pure e deterministiche. `marketConditions` non influisce su cassa (solo su domanda→vendite). |

---

## 7. Cosa NON cambia (invarianti)

| Area | Conferma |
|------|----------|
| **Domanda di mercato** | Formula identica: `attractiveness = (refPrice/price)^elasticity` (asimmetrica below/above). `totalDemand` modulato solo da `marketConditions.demandMultiplier` (rumore/eventi) se `seed` fornito. |
| **Allocazione vendite** | `sales = min(demand, capacityTotal)` invariato. `lostSales = demand - sales` invariato. |
| **Costi produzione unitari** | `unitCost` standard, `unitCost × overtimeUnitCostMultiplier` per straordinario. Invariati. |
| **Costi fissi** | `overheadPerQuarter + plants × plantFixedCostPerQuarter`. Invariati. |
| **Capex** | `plantsToBuy × plantCapex`. Invariato. |
| **Profitto contabile** | `revenue - productionCost - fixedCost - capex`. Invariato (ora `revenue` e `productionCost` riflettono `actualSales` se tagliato da cassa). |
| **Determinismo senza seed** | Bit-per-bit identico a v0.2 per tutti i campi *eccetto* i nuovi campi cassa (che sono derivati deterministici). |
| **Struttura `EngineConfig`/`PlayerDecision`

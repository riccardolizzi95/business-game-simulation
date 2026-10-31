# Proposta — S10-1: Parametri INIZIALI di partita: tutti i costi derivati, nessuna costante cablata

- Ruolo: **game-designer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 22:05:46

---

# Parametri di Setup Iniziali — Design Definitivo (S10-1)

> **Obiettivo:** Zero costanti cablate. Tutti i costi derivano da **7 parametri di setup** scelti all'avvio partita.  
> **Non-regressione:** coi default si riottengono *esattamente* `unitCost = 55 €`, `overhead = 20.000 €`, `plantFixedCost = 30.000 €/trim`, `plantCapacity = 3.000 u`.

---

## 1. Parametri di Setup (minimi, indipendenti, tutti con default giustificato)

| # | Parametro | Default | Unità | Descrizione |
|---|-----------|---------|-------|-------------|
| 1 | `standardPrice` | 100 | € | Prezzo standard di riferimento del prodotto |
| 2 | `variableCostRatio` | 0.55 | — | Incidenza del **costo variabile unitario** sul prezzo standard |
| 3 | `materialShareOfVariableCost` | 0.60 | — | Quota **materie prime** sul costo variabile (lavoro = 1 − questo) |
| 4 | `referenceVolume` | 10.000 | unità | Volume di riferimento per allocare i costi fissi (≈ domanda mercato) |
| 5 | `plantCapacity` | 3.000 | unità/trim | Capacità standard per stabilimento |
| 6 | `overheadPerQuarter` | 20.000 | €/trim | Overhead aziendale fisso (struttura, SG&A, ecc.) |
| 7 | `plantFixedCostPerQuarter` | 30.000 | €/trim | Costo fisso per stabilimento (affitto, manutenzione, ammortamento) |

> **Nota:** `laborShareOfVariableCost = 1 − materialShareOfVariableCost` (derivato, non parametro).

---

## 2. Formule di Derivazione (eseguite **una sola volta** all'avvio partita)

```typescript
// Input: i 7 parametri sopra
// Output: costanti usate dal motore (identiche a quelle odierne coi default)

const unitVariableCost        = standardPrice * variableCostRatio;                    // €55
const materialCostPerUnit     = unitVariableCost * materialShareOfVariableCost;       // €33
const laborCostPerUnit        = unitVariableCost * (1 - materialShareOfVariableCost); // €22

const plantsAtRefVolume       = referenceVolume / plantCapacity;                      // 3,333…
const totalFixedCostAtRefVol  = overheadPerQuarter + plantsAtRefVolume * plantFixedCostPerQuarter; // €120.000
const fixedCostPerUnitAtRef   = totalFixedCostAtRefVol / referenceVolume;             // €12/unità
```

**Costanti motore risultanti (quelle che il `game-engine` usa davvero):**

| Costante motore | Valore default | Derivazione |
|-----------------|----------------|-------------|
| `unitCost` (costo variabile unitario) | 55 € | `unitVariableCost` |
| `materialCostPerUnit` | 33 € | `materialCostPerUnit` |
| `laborCostPerUnit` | 22 € | `laborCostPerUnit` |
| `overheadPerQuarter` | 20.000 € | parametro diretto |
| `plantFixedCostPerQuarter` | 30.000 € | parametro diretto |
| `plantCapacity` | 3.000 u | parametro diretto |
| `fixedCostPerUnitAtRefVolume` | 12 € | `fixedCostPerUnitAtRef` (solo per reporting/KPI) |

> Nessun altro numero appare nel codice. Il motore riceve **solo le costanti derivate**.

---

## 3. Dimostrazione Non-Regressione (default → valori attuali)

| Grandezza | Formula con default | Risultato | Valore attuale motore |
|-----------|---------------------|-----------|----------------------|
| `unitVariableCost` | 100 × 0.55 | **55 €** | `unitCost = 55` ✓ |
| `materialCostPerUnit` | 55 × 0.60 | **33 €** | (nuovo, per trasparenza) |
| `laborCostPerUnit` | 55 × 0.40 | **22 €** | (nuovo, per trasparenza) |
| `overheadPerQuarter` | parametro 6 | **20.000 €** | `overheadPerQuarter = 20.000` ✓ |
| `plantFixedCostPerQuarter` | parametro 7 | **30.000 €** | `plantFixedCostPerQuarter = 30.000` ✓ |
| `plantCapacity` | parametro 5 | **3.000 u** | `plantCapacity = 3.000` ✓ |
| `totalFixedCost @ 10k vol` | 20.000 + (10.000/3.000)×30.000 | **120.000 €** | coerente con 4 impianti = 140k |
| `fixedCostPerUnit @ 10k` | 120.000 / 10.000 | **12 €/u** | (solo KPI, non usato in sim) |

**Conclusione:** il motore si comporta **bit-per-bit** come oggi. La non-regressione è **garantita per costruzione**.

---

## 4. Scenari Alternativi (economie di partita diverse)

### Scenario A — **Premium / Lusso** (margine ampio, volumi bassi, lavoro specializzato)

| Parametro | Valore | Note |
|-----------|--------|------|
| `standardPrice` | 250 € | Prezzo alto |
| `variableCostRatio` | 0.40 | Costo variabile = 40% prezzo (margine variabile 60%) |
| `materialShareOfVariableCost` | 0.50 | Materiali pregiati, ma molto lavoro qualificato |
| `referenceVolume` | 5.000 u | Nicchia |
| `plantCapacity` | 2.000 u/trim | Impianti flessibili, piccola scala |
| `overheadPerQuarter` | 50.000 € | Brand, R&D, marketing, struttura snella |
| `plantFixedCostPerQuarter` | 40.000 € | Impianti specializzati |

**Derivati:**
- `unitVariableCost` = 250 × 0.40 = **100 €** (mat. 50 €, lav. 50 €)
- `plantsAtRefVol` = 5.000 / 2.000 = 2,5
- `totalFixedCost@ref` = 50.000 + 2,5×40.000 = **150.000 €**
- `fixedCostPerUnit@ref` = 150.000 / 5.000 = **30 €/u**
- **Costo totale unitario @ ref** = 100 + 30 = **130 €** → **Margine = 120 € (48%)**

> **Dinamica:** conviene **premium price + qualità/brand** (leva marketing futura). Straordinari costosi (lavoro specializzato), capacità limitata → gestire saturazione con prezzo, non volume.

---

### Scenario B — **Commodity / Volume** (margine sottile, economie di scala, materiali dominanti)

| Parametro | Valore | Note |
|-----------|--------|------|
| `standardPrice` | 60 € | Prezzo basso, guerra prezzo |
| `variableCostRatio` | 0.70 | Costo variabile = 70% prezzo (margine variabile 30%) |
| `materialShareOfVariableCost` | 0.75 | Materie prime dominano (commodity) |
| `referenceVolume` | 20.000 u | Volumi alti |
| `plantCapacity` | 5.000 u/trim | Impianti grandi, economie di scala |
| `overheadPerQuarter` | 30.000 € | Struttura snella |
| `plantFixedCostPerQuarter` | 50.000 € | Impianti efficienti ma capex alto |

**Derivati:**
- `unitVariableCost` = 60 × 0.70 = **42 €** (mat. 31,5 €, lav. 10,5 €)
- `plantsAtRefVol` = 20.000 / 5.000 = 4
- `totalFixedCost@ref` = 30.000 + 4×50.000 = **230.000 €**
- `fixedCostPerUnit@ref` = 230.000 / 20.000 = **11,5 €/u**
- **Costo totale unitario @ ref** = 42 + 11,5 = **53,5 €** → **Margine = 6,5 € (10,8%)**

> **Dinamica:** conviene **volume massimo + efficienza impianti** (leva distribuzione/futuro capex). Straordinari poco costosi (lavoro basso), ma capacità va riempita. Prezzo è leva critica: -1% prezzo → -1,8% domanda → serve volume per coprire fissi.

---

### Scenario C — **Mid-Market "Balanced"** (default parametrizzato, identico a oggi)

| Parametro | Valore |
|-----------|--------|
| `standardPrice` | 100 € |
| `variableCostRatio` | 0.55 |
| `materialShareOfVariableCost` | 0.60 |
| `referenceVolume` | 10.000 u |
| `plantCapacity` | 3.000 u |
| `overheadPerQuarter` | 20.000 € |
| `plantFixedCostPerQuarter` | 30.000 € |

→ Riproduce **esattamente** l'economia attuale (vedi §3).

---

## 5. Cosa NON Cambia (invariant del motore)

| Area | Invariante |
|------|------------|
| **Domanda/Elasticità** | `totalDemand = 10.000`, `priceElasticity = 1.8`, `refPrice = standardPrice` (parametro 1) |
| **Straordinari** | `overtimeCapacityMultiplier = 1.4`, `overtimeUnitCostMultiplier = 1.4` (solo sul `unitVariableCost`) |
| **Capex** | `plantCapex = 250.000 €` (parametro motore, non setup partita) |
| **Capitale/Durata** | `initialCapital = 1.000.000 €`, `totalQuarters = 8` |
| **Formula profitto** | `profit = revenue − (uStd×unitVarCost + uOt×unitVarCost×1.4) − (plants×plantFixedCost + overhead) − capex` |
| **Leve decisionali** | Prezzo, Produzione (stabilimenti + straordinari) — identiche |

> I 7 parametri di setup **sostituiscono solo** i vecchi numeri cablati (`unitCost`, `overhead`, `plantFixedCost`, `plantCapacity` e la loro coerenza). Tutto il resto del motore resta intatto.

---

## 6. Implementazione Minima (per il `game-engine`)

```typescript
// types.ts — nuovo tipo per setup partita
export interface GameSetupParams {
  standardPrice: number;                    // 1
  variableCostRatio: number;                // 2
  materialShareOfVariableCost: number;      // 3
  referenceVolume: number;                  // 4
  plantCapacity: number;                    // 5
  overheadPerQuarter: number;               // 6
  plantFixedCostPerQuarter: number;         // 7
}

// simulate.ts — funzione pura di derivazione (chiamata all'avvio partita)
export function deriveEngineConfig(setup: GameSetupParams): EngineConfig {
  const unitVariableCost = setup.standardPrice * setup.variableCostRatio;
  const materialCostPerUnit = unitVariableCost * setup.materialShareOfVariableCost;
  const laborCostPerUnit = unitVariableCost * (1 - setup.materialShareOfVariableCost);

  return {
    ...DEFAULT_ENGINE_CONFIG,  // elasticità, capex, capitale, trimestri, moltiplicatori straordinari
    refPrice: setup.standardPrice,
    unitCost: unitVariableCost,                    // ← sostituisce il vecchio 55 cablato
    overheadPerQuarter: setup.overheadPerQuarter,  // ← sostituisce 20.000 cablato
    plantFixedCostPerQuarter: setup.plantFixedCostPerQuarter, // ← sostituisce 30.000 cablato
    plantCapacity: setup.plantCapacity,            // ← sostituisce 3.000 cablato
    // Nuovi campi per trasparenza/UI (non usati in sim core):
    materialCostPerUnit,
    laborCostPerUnit,
    fixedCostPerUnitAtRefVolume: (setup.overheadPerQuarter + (setup.referenceVolume / setup.plantCapacity) * setup.plantFixedCostPerQuarter) / setup.referenceVolume,
  };
}
```

**Default esportabile** (`DEFAULT_SETUP_PARAMS`) = tabella §1.  
**Nessun altro numero** nel codice.

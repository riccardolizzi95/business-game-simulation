# Proposta — S6-1: Regole della leva MARKETING: brand, campagne e domanda

- Ruolo: **business-marketing**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 14:51:23

---

# Proposta: Regole della leva MARKETING (brand, campagne, domanda)

---

## 1. Variabili decisionali (cosa decide il giocatore ogni trimestre)

| Variabile | Tipo | Range | Default | Costo cash |
|-----------|------|-------|---------|------------|
| `marketingBudget` | €/trimestre | 0 – 200.000 | 0 | **Immediato** (esce da cassa all'istante) |
| `campaignFocus` | slider 0–1 | 0 = solo *performance* (vendite immediate), 1 = solo *awareness* (brand) | 0.5 | — |

> **Niente posizionamento/segmentazione nel v1**: si aggiungeranno in epiche successive (TBD). Oggi il marketing è **un'unica leva di domanda** che si somma al prezzo.

---

## 2. Stato persistente: Brand Equity

| Campo | Tipo | Iniziale | Note |
|-------|------|----------|------|
| `brandEquity` | 0.0 – 1.0 | 0.0 | Si accumula con *awareness*, decade se non si investe |

**Dinamica di accumulo/decadimento (ogni trimestre):**

```
awarenessInvestment = marketingBudget × campaignFocus          // € destinati al brand
performanceInvestment = marketingBudget × (1 − campaignFocus)  // € destinati alle vendite immediate

Δbrand = awarenessInvestment × ACCUMULATION_RATE − brandEquity × DECAY_RATE
brandEquity' = clamp(brandEquity + Δbrand, 0.0, 1.0)
```

| Parametro | Valore | Significato |
|-----------|--------|-------------|
| `ACCUMULATION_RATE` | **0.000008** per € | 100k € in awareness → +0.8 brand equity (massimo teorico 1.0 in ~4 trimestri se focus=1) |
| `DECAY_RATE` | **0.05** (5%/trimestre) | Senza investimenti, brand dimezza in ~14 trimestri |

> **Determinismo**: `brandEquity` è stato deterministico salvato nel `CompanyState`; nessun RNG.

---

## 3. Effetto immediato della campagna (performance)

```
campaignMultiplier = 1 + CAMPAIGN_EFFECTIVENESS × sqrt(performanceInvestment / REF_BUDGET)
```

| Parametro | Valore | Significato |
|-----------|--------|-------------|
| `CAMPAIGN_EFFECTIVENESS` | **0.15** | Al budget di riferimento dà +15% domanda |
| `REF_BUDGET` | **50.000 €** | Budget a cui è calibrato l'effetto di riferimento |

**Rendimenti decrescenti espliciti**: `sqrt(x)` → raddoppiare il budget dà `√2 ≈ 1.41×` l'effetto, non 2×.

---

## 4. Formula di attrattività aggiornata (accanto al prezzo)

```
baseAttractiveness = (refPrice / price) ^ priceElasticity           // invariato dal motore v0.1
brandMultiplier    = 1 + brandEquity × MAX_BRAND_BOOST              // 0 → 1.0, max +50%
campaignMultiplier = 1 + CAMPAIGN_EFFECTIVENESS × sqrt(perfInv / REF_BUDGET)  // ≥ 1

attractiveness = baseAttractiveness × brandMultiplier × campaignMultiplier
```

| Parametro | Valore | Nota |
|-----------|--------|------|
| `MAX_BRAND_BOOST` | **0.50** | Brand forte = +50% attrattività *moltiplicativa* sul prezzo |

**Quota di mercato e domanda** restano identiche:
```
quota_i = attractiveness_i / Σ attractiveness_j
domanda_i = quota_i × totalDemand
```

> **Prezzo rimane rilevante**: è la *base* moltiplicativa. Senza marketing, `brandMultiplier=campaignMultiplier=1` → formula v0.1 identica bit-per-bit.

---

## 5. Costi e vincoli di cassa (scelta vera)

- `marketingBudget` **esce da cassa all'inizio del trimestre** (prima del calcolo profitto).
- Nessun costo fisso aggiuntivo; il trade-off è: *liquidità oggi vs domanda domani*.
- Cap soft: `marketingBudget ≤ min(200.000, cashDisponibile × 0.5)` (evita suicidi di cassa).

---

## 6. Esempio numerico su 3 trimestri

**Assunzioni**: 2 player (A e B), `totalDemand=10.000`, `refPrice=100`, `elasticity=1.8`, `priceElasticity=1.8`.  
Player A: prezzo **95 €** (leggermente sotto ref), investe in marketing.  
Player B: prezzo **100 €** (ref), **zero marketing**.

| Trimestre | A: marketingBudget | A: campaignFocus | A: awarenessInv | A: perfInv | A: brandEquity (inizio) | A: brandMult | A: campMult | A: attrattività | A: quota | A: domanda | A: cash speso |
|-----------|-------------------|------------------|-----------------|------------|------------------------|--------------|-------------|----------------|----------|------------|---------------|
| **Q1** | 100.000 | 0.6 | 60.000 | 40.000 | 0.00 | 1.00 | 1.13 | (100/95)^1.8 × 1.00 × 1.13 = **1.22** | 55% | 5.500 | −100k |
| **Q2** | 100.000 | 0.6 | 60.000 | 40.000 | 0.43* | 1.22 | 1.13 | 1.22 × 1.22 × 1.13 = **1.68** | 63% | 6.300 | −100k |
| **Q3** | 0 | — | 0 | 0 | 0.72* | 1.36 | 1.00 | 1.22 × 1.36 × 1.00 = **1.66** | 62% | 6.200 | 0 |

\* Calcolo brand:  
Q1: `Δ = 60.000×0.000008 − 0×0.05 = 0.48` → brand=0.48  
Q2: `Δ = 60.000×0.000008 − 0.48×0.05 = 0.48 − 0.024 = 0.456` → brand=0.936 → clamp 1.0? No, 0.936  
Q3: `Δ = 0 − 0.936×0.05 = −0.0468` → brand=0.889

**Player B (sempre)**: attrattività = (100/100)^1.8 × 1 × 1 = **1.00** → quota complementare.

**Risultato**: A spende 200k in 2 trimestri, guadagna ~1.800 unità extra vs B (≈ +170k € ricavi a 95 €), **ROI ~85% in 2Q** ma con rischio cassa. Se A smette (Q3), brand decade lentamente e mantiene vantaggio.

---

## 7. Cosa NON cambia del motore attuale (preservazione determinismo)

| Elemento | Stato |
|----------|-------|
| `simulateQuarter` signature | Invariata: input `PlayerDecision` + `EngineConfig` + `MarketConditions` → `PlayerResult` |
| Formula prezzo→domanda (`baseAttractiveness`) | **Identica** a v0.1; marketing è *moltiplicatore addizionale* |
| Rumore/eventi di mercato (`market.ts`) | Invariati; marketing non tocca `MarketConditions` |
| Classifica (`rankByProfit`) | Invariata; profitto include ora `marketingBudget` come costo |
| Test di regressione (11 test v0.1) | **Devono restare verdi** con `marketingBudget=0, campaignFocus=0.5` (default) |
| Determinismo bit-per-bit | Garantito: nessuna nuova sorgente di casualità; `brandEquity` è stato deterministico |

---

## 8. Nuovi campi da aggiungere (solo tipi, niente logica qui)

**`types.ts` → `PlayerDecision`**:
```ts
marketingBudget: number;      // €, default 0
campaignFocus: number;        // 0–1, default 0.5
```

**`types.ts` → `CompanyState` (persistito)**:
```ts
brandEquity: number;          // 0–1, default 0
```

**`types.ts` → `EngineConfig`** (parametri bilanciamento):
```ts
marketing: {
  maxBudgetPerQuarter: 200_000;
  accumulationRate: 0.000008;
  decayRate: 0.05;
  maxBrandBoost: 0.50;
  campaignEffectiveness: 0.15;
  refBudget: 50_000;
  cashFractionCap: 0.5;
}
```

---

## 9. Prossimi passi (fuori scope questa proposta)

- Modulo `marketing.ts` con `applyMarketing(decision, state, config) → { brandEquity, campaignMultiplier }`
- Integrazione in `simulate.ts` prima del calcolo attrattività
- Test: regressione v0.1 + 4 nuovi (brand accumulo, decadimento, sqrt diminishing, cash cap)
- UI: slider budget + focus nel tab Marketing (Sprint 4/5)

---

**Pronto per revisione Game Designer + PM.** Nessun codice eseguito; solo specifica formale con numeri.

# Proposta — S16-5: Indice di qualità 0-10 del prodotto e suo effetto sulla domanda

- Ruolo: **game-designer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-28 21:10:00

---

# Proposta S16-5: Indice di Qualità 0–10 e Effetto sulla Domanda

---

## 1. Indice di Qualità Unificato `productQualityIndex ∈ [0, 10]`

### 1.1 Componenti normalizzate su scala 0–10

| Componente | Fonte | Normalizzazione | Note |
|------------|-------|-----------------|------|
| **Materie prime** | `MATERIAL_QUALITY_INDEX` (0–100 in `supply.ts`) | `matQ = MATERIAL_QUALITY_INDEX / 10` | Economy=3.0, **Standard=5.0**, Premium=7.5, Ultra=9.5 |
| **Forza lavoro** | `balanceScore(mix) ∈ [0,1]` (S16-3) | `hrQ = balanceScore × 10` | Mix ideale 1:3:2 → 10.0; default (tutti Skilled) → 7.07 |
| **Straordinari** | `OVERTIME_SCRAP_PENALTY` (esiste in `quality.ts`) | Penalità moltiplicativa `(1 − overtimePenalty)` | `overtimePenalty = 0.10` se straordinari attivi, altrimenti 0 |
| **Pubblicità (qualità percepita)** | `brandEquity ∈ [0,100]` (S16-4 corretto) | `adQ = min(brandEquity/100 × 1.5 × (realQ/10), 0.5)` | **Bonus proporzionale alla qualità reale**, tetto 0.5 su 10 |

> **Perché `adQ` max 0.5 (non 1.5)?** L'indice `productQualityIndex` rappresenta la **qualità oggettiva + piccolo halo percepito**. La parte dinamica e consistente della percezione (fino a +1.5) resta nel sistema di marketing che produce `perceivedQuality` a partire da `realQuality = productQualityIndex`. Così non si conta due volte lo stesso effetto.

### 1.2 Formula di combinazione

```
realQ = (w_mat × matQ + w_hr × hrQ) × (1 − overtimePenalty)
productQualityIndex = clamp(realQ + adQ, 0, 10)
```

### 1.3 Pesi `w_mat = 0.55`, `w_hr = 0.45` (somma 1)

**Motivazione del 55/45 (vs 60/40 attuale):**
- La leva HR (mix, formazione, retention) ha **profondità strategica maggiore** della scelta materiale (procurement transazionale).
- Il `balanceScore` di Bhattacharyya è **non monotono in expert** e penalizza davvero gli estremi: premia chi gestisce la complessità.
- 55/45 sposta il baricentro decisionale verso la gestione persone senza rendere irrilevante la materia prima.
- Coerente con S16-3 che già proponeva questo ribilanciamento.

---

## 2. Punto di Non-Regressione (leve spente)

| Leva | Configurazione "spenta" | Valore |
|------|-------------------------|--------|
| Materie prime | **Standard** | `matQ = 5.0` |
| Forza lavoro | **Default (tutti Skilled)** | `hrQ = 7.07` |
| Straordinari | **No** | `overtimePenalty = 0` |
| Pubblicità | **Brand equity = 0** | `adQ = 0` |

```
realQ_baseline = (0.55 × 5.0 + 0.45 × 7.07) × 1.0 = 2.75 + 3.18 = 5.93
productQualityIndex_baseline = 5.93  (≈ **5.9** su 10)
```

> **Dichiarazione formale:** `Q_ref = 5.93`. Quando `perceivedQuality = Q_ref`, il moltiplicatore domanda **deve valere esattamente 1**. Questo garantisce che il gioco attuale (leve spente) non cambi di una virgola.

---

## 3. Formula Domanda: Entrata della Scala 0–10

### 3.1 Architettura a due stadi (già implicita nel motore)

```
realQuality      = productQualityIndex                    // 0–10, oggettivo + micro-halo
perceivedQuality = marketingSystem(realQuality, brandEquity) // 0–10, dinamico con smoothing/penalità
qualityMultiplier = (perceivedQuality / Q_ref) ^ ε_q
attrattività_i   = (refPrice / price_i) ^ ε_p × qualityMultiplier_i
```

### 3.2 Elasticità Qualità `ε_q = 1.0` (proposta)

**Motivazione numerica:**
- `ε_q = 1.0` ⇒ **elasticità unitaria**: +10% qualità percepita → +10% attrattività (a parità di prezzo).
- Leggibile, testabile, confrontabile con `ε_p = 1.8` (prezzo).
- Evita l'effetto "super-lineare" di `ε_q = 1.2` che fa esplodere i premi di prezzo per qualità alte.

### 3.3 Premio di Prezzo Giustificato da Qualità 8

| Parametro | Valore |
|-----------|--------|
| `Q_ref` | 5.93 |
| `perceivedQuality` (prodotto premium) | 8.00 |
| Rapporto `Q/Q_ref` | 1.349 |
| `qualityMultiplier = 1.349^1.0` | **1.349** (+34.9% attrattività) |
| Elasticità prezzo `ε_p` | 1.8 |
| **Fattore prezzo equivalente** = `(Q/Q_ref)^(ε_q/ε_p)` | `1.349^(1/1.8) = 1.349^0.556 = **1.182**` |

> **Risposta numerica:** un prodotto a **qualità percepita 8** (vs baseline 5.93) giustifica un **premio di prezzo del +18.2%** per mantenere la stessa attrattività del baseline.  
> Esempio: se `refPrice = €100`, il prodotto Q8 può vendere a **€118** e avere la stessa domanda del baseline a €100.

---

## 4. Tabella Esempi (5+ Configurazioni)

| # | Materiale | Mix HR (J:S:E) | Straord. | Brand Eq. | matQ | hrQ | realQ | adQ | **productQualityIndex** | Note |
|---|-----------|----------------|----------|-----------|------|-----|-------|-----|-------------------------|------|
| **0** | **Standard** | **Default (0:1:0)** | No | 0 | 5.00 | 7.07 | **5.93** | 0.00 | **5.93** | **Baseline (non-regressione)** |
| 1 | Economy | 1:3:2 (ideale) | No | 0 | 3.00 | 10.00 | 5.10 | 0.00 | 5.10 | Materiale scarso compensa HR perfetto |
| 2 | Premium | 1:3:2 (ideale) | No | 0 | 7.50 | 10.00 | 8.53 | 0.00 | 8.53 | **Top di gamma senza adv** |
| 3 | Ultra | 1:3:2 (ideale) | No | 100 | 9.50 | 10.00 | 9.73 | 0.49 | **10.00** | Tetto scala (clamp) |
| 4 | Standard | 1:3:2 (ideale) | No | 50 | 5.00 | 10.00 | 7.23 | 0.27 | 7.50 | HR eccellente + adv medio |
| 5 | Premium | Tutti Expert (0:0:1) | No | 0 | 7.50 | 3.33 | 5.62 | 0.00 | 5.62 | **Eccesso expert penalizza** (balanceScore=0.333) |
| 6 | Standard | 1:3:2 (ideale) | **Sì** | 0 | 5.00 | 10.00 | 6.78 | 0.00 | 6.78 | Penalità straordinari −10% |
| 7 | Standard | Default (0:1:0) | No | **100** | 5.00 | 7.07 | 5.93 | **0.22** | 6.15 | Adv su prodotto medio: bonus piccolo (∝ realQ) |

> **Legenda:** `realQ = (0.55×matQ + 0.45×hrQ)×(1−otPenalty)`, `adQ = min(brandEq/100 × 1.5 × realQ/10, 0.5)`.  
> Riga 7 mostra la **correzione overpromising**: brandEq=100 su prodotto medio (realQ=5.93) dà solo +0.22, non +1.5.

---

## 5. Correzione S16-4: Overpromising che Distingue Qualità Reale

### 5.1 Difetto Originale (confermato)
Penalità lineare `excess × 0.30` → punto fisso **sempre `realQuality + 1.24`** indipendentemente da `realQuality`.  
Prodotto scadente (Q=3) percepito 4.24 = **errore**.

### 5.2 Meccanismo Corretto: Bonus Proporzionale alla Qualità Reale

```typescript
// In marketing.ts — calcolo brandBonus
brandBonus = min(brandEquity / 100 * 1.5 * (realQuality / 10), 1.5)
// A brandEquity=100:  bonus = 1.5 * (realQuality/10)
//   realQuality=10 → bonus=1.50  (tetto)
//   realQuality=7  → bonus=1.05
//   realQuality=5  → bonus=0.75
//   realQuality=3  → bonus=0.45
```

### 5.3 Verifica Punto Fisso (smoothing=0.40, brandEquity=100)

| realQuality | brandBonus | targetPerceived | Eccesso vs (real+1) | Penalità (0.30×eccesso) | **Punto Fisso Perceived** |
|-------------|------------|-----------------|---------------------|-------------------------|---------------------------|
| **10.0** | 1.50 | 11.50 | 0.50 | 0.15 | **10.35** (clamp 10) |
| **7.0** | 1.05 | 8.05 | **0.05** | 0.015 | **7.04** |
| **5.0** | 0.75 | 5.75 | −0.25 | 0 | **5.75** |
| **3.0** | 0.45 | 3.45 | −0.55 | 0 | **3.45** |

**Risultato:**  
- Prodotto **eccellente (7)** → percepito **7.04** (quasi realtà, niente overpromising)  
- Prodotto **medio (5)** → percepito **5.75** (bonus onesto, nessuna penalità)  
- Prodotto **scadente (3)** → percepito **3.45** (bonus minimo, **nessuna illusione**)  

> La penalità lineare originale serviva solo a limitare il tetto fisso +1.5. Con bonus proporzionale, **l'overpromising si auto-limita**: chi ha qualità bassa *non può* promettere troppo perché il bonus è piccolo. La penalità 0.30×eccesso resta come sicurezza per casi limite (es. smoothing alto + brandEq medio), ma non viene quasi mai attivata.

---

## 6. Note di Implementazione e Test

### 6.1 Punti di Integrazione (solo riferimento, non codice)
- `quality.ts`: nuova funzione `calculateProductQualityIndex(decision, state) → number`
- `marketing.ts`: `resolvePerceivedQuality` usa `realQuality = productQualityIndex` e `brandBonus` corretto
- `simulate.ts`: `qualityMultiplier = (perceivedQuality / Q_ref) ** EPS_Q` con `Q_ref = 5.93`, `EPS_Q = 1.0`
- `types.ts`: aggiungere `productQualityIndex` in `PlayerResult` per UI

### 6.2 Casi di Test Obbligatori (QA)
| Test | Input | Atteso |
|------|-------|--------|
| Non-regressione | Standard, default HR, no OT, brand=0 | `productQualityIndex = 5.93`, `qualityMultiplier = 1.000` |
| Solo materiale | Premium, default HR, no OT, brand=0 | `productQualityIndex ≈ 6.89` |
| Solo HR | Standard, mix ideale, no OT, brand=0 | `productQualityIndex ≈ 7.23` |
| Penalità OT | Standard, mix ideale, **OT sì**, brand=0 | `productQualityIndex ≈ 6.51` (7.23 × 0.9) |
| Adv proporzionale | Standard, default HR, no OT, **brand=100** | `adQ = 0.22`, `productQualityIndex = 6.15` |
| Clamp max | Ultra, mix ideale, no OT, brand=100 | `productQualityIndex = 10.00` |
| Overpromising fix | realQuality=3, brand=100, smoothing=0.40 | `perceivedQuality ≈ 3.45` (non 4.24) |

### 6.3 Parametri da Esporre in `EngineConfig` (per bilanciamento futuro)
```typescript
QUALITY_REF: 5.93,           // baseline non-regressione
EPS_QUALITY: 1.0,            // elasticità qualità
W_MATERIAL: 0.55,            // peso materia prima
W_WORKFORCE: 0.45,           // peso forza lavoro
OVERTIME_QUALITY_PENALTY: 0.10,
AD_QUALITY_MAX_BONUS: 0.5,   // tetto contributo adv su realQ
BRAND_BONUS_MAX: 1.5,        // tetto bonus marketing su perceivedQuality
```

---

## 7. Decisioni Chiave Riassunte

| Decisione | Valore | Perché |
|-----------|--------|--------|
| Scala qualità | **0–10** | Richiesta committente, confrontabile |
| Pesi mat/HR | **55/45** | HR più strategico, coerenza S16-3 |
| Baseline `Q_ref` | **5.93** | Standard + default HR + no adv → non-regressione |
| Elasticità qualità `ε_q` | **1.0** | Lineare, leggibile, premio prezzo Q8 = +18% |
| Bonus adv su `realQ` | **max 0.5**, ∝ `realQ` | Evita double-counting, scala con qualità |
| Fix overpromising | **brandBonus ∝ realQuality** | Punto fisso distingue Q3 vs Q7 (verificato) |

---

**Prossimo passo:** il coordinamento implementa `calculateProductQualityIndex`, aggiorna `marketing.ts` con `brandBonus` corretto, e collega `qualityMultiplier = (perceivedQuality/5.93)^1.0` in `simulate.ts`. I test sopra definiscono la Definition of Done.

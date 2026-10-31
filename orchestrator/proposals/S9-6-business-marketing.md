# Proposta — S9-6: Qualità percepita: come entra nella conquista di quota di mercato

- Ruolo: **business-marketing**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:36:29

---

# Proposta S9-6: Qualità percepita — dalla qualità reale alla conquista di quota

---

## 1. Parametri invariati (da GDD v0.1, S9-1, S9-2, S9-4, S9-5)

| Parametro | Valore | Nota |
|---|---|---|
| **Costo unitario base** | €55,00 | = materiali €27,50 + lavoro €16,50 + altri €11,00 (S9-5 aggiorna lavoro a €16,50) |
| **Prezzo riferimento** | €100 | Invariato |
| **Domanda totale/trim** | 10.000 u | Invariata |
| **Capacità/stabilimento** | 3.000 u | Invariata |
| **Costo giacenza finito** | €2,50/u/trim | Invariato |
| **Elasticità prezzo** | 1,8 | Invariata (GDD v0.1) |
| **Default qualità materiale** | **Standard** (livello 2/4) | Da S9-2/S9-4 |
| **Default livello personale** | **Base (L1)** | Da S9-5 |
| **Scarto default** | **0%** | Standard (+1,5 pp) + Base (−1,5 pp) = 0 |

> **Cosa NON cambia**: motore v0.2, leve Prezzo/Produzione, profili costo S9-1, approvvigionamento S9-2, scarto S9-4, HR S9-5. Si aggiunge solo il modulo **Qualità Percepita** che entra nell'attrattività di mercato.

---

## 2. Qualità Reale (Real Quality — RQ)

La qualità reale è un indice **0–100** che sintetizza materia prima e personale. È **osservabile internamente** dal giocatore (report fine trimestre).

### 2.1 Livelli qualità materiale (da S9-2/S9-4)

| Livello | Codice | Indice qualità (0–100) | Costo materiale/u | Contributo scarto (pp) |
|---|---|---|---|---|
| Economy | `eco` | **60** | €22,00 | +3,5 |
| **Standard** | `std` | **75** | **€27,50** | **+1,5** |
| Premium | `pre` | **85** | €34,00 | +0,5 |
| Ultra | `ult` | **95** | €43,00 | 0,0 |

> **Base di calcolo**: Standard = €27,50 (50% del €55 base). Economy risparmia €5,50 ma perde 15 punti qualità. Premium costa €6,50 in più per +10 punti. Ultra costa €15,50 in più per +20 punti.

### 2.2 Livelli qualità personale (da S9-5)

| Livello | Codice | Indice qualità (0–100) | Costo lavoro/u | Offset scarto (pp) | Produttività |
|---|---|---|---|---|---|
| **Base (L1)** | `base` | **70** | **€16,50** | **−1,5** | 60 u/FTE |
| Qualificato (L2) | `qual` | **82** | €19,80 | −2,5 | 63 u/FTE |
| Esperto (L3) | `exp` | **92** | €23,93 | −3,5 | 67 u/FTE |

### 2.3 Formula Qualità Reale (RQ)

```
RQ = w_mat × materialQualityIndex + w_hr × personnelQualityIndex
```

| Peso | Valore | Giustificazione |
|---|---|---|
| `w_mat` | **0,60** | La materia prima determina le specifiche tecniche "dure" del prodotto |
| `w_hr` | **0,40** | Il personale influenza finitura, consistenza, difettosità non visibili a scheda tecnica |

**Default (Standard + Base)**:  
`RQ_default = 0,60 × 75 + 0,40 × 70 = 45 + 28 = **73**` → questo è il **referenceQuality** (`refQuality = 73`).

**Esempi**:
- Economy + Base: `0,6×60 + 0,4×70 = 64` (−9 vs default)
- Standard + Qualificato: `0,6×75 + 0,4×82 = 77,8` (+4,8)
- Premium + Qualificato: `0,6×85 + 0,4×82 = 83,8` (+10,8)
- Ultra + Esperto: `0,6×95 + 0,4×92 = 93,8` (+20,8)

---

## 3. Qualità Percepita (Perceived Quality — PQ)

Il mercato **non vede RQ direttamente**. La percezione si aggiorna con ritardo (inerzia cognitiva, cicli d'acquisto, passaparola).

### 3.1 Dinamica di aggiornamento (esponenziale)

```
PQ_t = (1 − α) × PQ_{t−1} + α × (RQ_t + marketingBoost_t)
```

| Parametro | Valore | Giustificazione |
|---|---|---|
| `α` (smoothing factor) | **0,25** | **Time constant = 4 trimestri** (≈1 anno). Coerente con cicli B2B e ricambio clienti. |
| `PQ_0` (iniziale) | **73** | = `refQuality`. All'avvio il mercato percepisce esattamente il default. |
| `marketingBoost_t` | **0…+15** | Da campagne "brand quality" (vedi §5). Massimo +15 punti. |

**Proprietà**:
- Se RQ salta da 73 a 83,8 (Premium+Qualificato) e resta lì:  
  Q1: 75,7 | Q2: 77,7 | Q3: 79,2 | Q4: 80,4 | Q5: 81,3 | Q6: 81,9 | Q7: 82,4 | Q8: 82,7 → **asintoto a 83,8**.
- Il mercato "si accorge" gradualmente. Nessun salto istantaneo.

### 3.2 Caso limite: peggioramento qualità
Stessa formula, simmetrica. Se RQ scende (es. taglio costi → Economy), PQ decresce con lo stesso ritardo. **Non c'è asimmetria**: il mercato dimentica la qualità passata alla stessa velocità con cui l'ha appresa.

---

## 4. Formula di attrattività aggiornata

L'attrattività determina la quota di mercato (insieme a prezzo e brand).

```
attractiveness_i = (refPrice / price_i) ^ priceElasticity
                 × (PQ_i / refQuality) ^ qualityElasticity
                 × brandFactor_i
```

| Parametro | Valore | Giustificazione |
|---|---|---|
| `priceElasticity` | **1,8** | Invariato (GDD v0.1) |
| `qualityElasticity` | **0,8** | **< priceElasticity** → il prezzo resta la leva dominante. Qualità conta ma non rende il prezzo irrilevante. |
| `refQuality` | **73** | = RQ di default (Standard + Base) |
| `brandFactor_i` | da Marketing (S6-1) | Default = 1,0 |

### 4.1 Verifica vincolo "moltiplicatore = 1 senza nuove leve"

Se il giocatore **non tocca** le nuove leve:
- `price_i = refPrice = 100` → fattore prezzo = 1^1,8 = 1
- `PQ_i = refQuality = 73` → fattore qualità = 1^0,8 = 1
- `brandFactor_i = 1` (default marketing)
- **Risultato**: `attractiveness_i = 1 × 1 × 1 = 1` ✓

Il motore si comporta **esattamente come oggi** finché il giocatore non attiva materiale ≠ Standard, personale ≠ Base, o marketing ≠ default.

---

## 5. Divergenza Percezione–Realtà (Marketing Boost & Correzione)

Il marketing può **gonfiare** la percezione sopra la sostanza, ma con rischi espliciti.

### 5.1 Marketing Boost
- Campagne "Quality/Brand" (nuovo tipo campagna, costo: budget marketing × % allocazione) generano `marketingBoost_t ∈ [0, +15]`.
- **Regola**: `marketingBoost_t = 15 × sqrt(budgetQualityShare)` — rendimenti decrescenti.  
  Es: 25% budget → boost 7,5; 100% budget → boost 15 (massimo).

### 5.2 Soglia di divergenza e correzione automatica

```
gap_t = PQ_t − RQ_t
```

| Fascia gap | Conseguenza |
|---|---|
| **gap ≤ 10** | **Zona sicura**. Nessuna correzione. Il mercato accetta la narrazione. |
| **10 < gap ≤ 20** | **Zona d'ombra**. Ogni trimestre: `PQ_t ← PQ_t − 0,30 × (gap_t − 10)` (correzione parziale). Brand equity −1 pt/trim. |
| **gap > 20** | **Crisi di credibilità** (evento). `PQ_t ← RQ_t + 5` (snap-down brutale). Brand equity −10 pt. Evento loggato: "Il mercato scopre il divario tra promesse e prodotto". |

> **Perché questi numeri**:  
> - Max boost marketing = +15. Se RQ=73, PQ max senza correzione = 88 → gap=15 (zona d'ombra).  
> - Per entrare in crisi (gap>20) serve RQ basso (es. Economy=64) + marketing max → PQ=79, gap=15 (ancora zona d'ombra). **Crisi possibile solo se RQ crolla mentre marketing spinge** (es. taglio qualità nascosto da campagne).  
> - La correzione 0,30×(gap−10) riporta in zona sicura in 3–4 trimestri se marketing cessa.

### 5.3 Interazione con Brand (Marketing S6-1)
- `brandFactor` moltiplica l'attrattività **indipendentemente** da PQ.
- Ma `brandEquity` (0–100) subisce i colpi della zona d'ombra/crisi.  
  `brandFactor = 1 + (brandEquity − 50) / 100 × brandElasticity` (brandElasticity = 0,5, da S6-1).
- **Conseguenza**: gonfiare PQ oltre la soglia erode il brand, che a sua volta riduce l'attrattività futura — **doppia penalità**.

---

## 6. Esempio numerico: quando alzare la qualità NON conviene

### Scenario
- Giocatore singolo (monopolio per semplicità), prezzo fisso **€100**, capacità illimitata (no vincolo vendite).
- Confronta due configurazioni a regime (PQ = RQ, nessun marketing boost).

| | **Config A: Default** (Standard + Base) | **Config B: Upgrade** (Premium + Qualificato) |
|---|---|---|
| Materiale | Standard (€27,50) | Premium (€34,00) |
| Personale | Base (€16,50) | Qualificato (€19,80) |
| Altri costi | €11,00 | €11,00 |
| **Costo unitario** | **€55,00** | **€64,80** (+€9,80, **+17,8%**) |
| Scarto | 0% | 0% (Premium +0,5 + Qualificato −2,5 = −2,0 → max 0) |
| RQ / PQ (regime) | **73** | **83,8** |
| Fattore qualità `(PQ/73)^0,8` | **1,000** | **1,116** (+11,6% attrattività) |
| Domanda (quota × 10.000) | **10.000** | **11.160** |
| Margine unitario (100 − costo) | **€45,00** | **€35,20** (−€9,80) |
| **Profitto trimestrale** | **450.000** | **392.832** (−€57.168, **−12,7%**) |

### Perché non conviene
- L'elasticità qualità (0,8) è **bassa**: +14,8% qualità reale → solo +11,6% domanda.
- Il costo unitario sale **€9,80** (materiale +€6,50, lavoro +€3,30) — **nessun risparmio scarto** (già 0% in entrambi i casi).
- Il margine crolla da €45 a €35,20 (−21,8%), l'incremento volumi (+11,6%) non compensa.

### Quando INVECE conviene (controesempio)
| Situazione | Risultato |
|---|---|
| **Partenza da Economy+Base** (RQ=64, scarto 2%, costo eff. €56,12) → **Standard+Base** | Costo −€1,12 (scarto 0%), qualità +9 pts, domanda +10,6%. **Profitto +13,4%**. Conviene. |
| **Prezzo premium** (giocatore alza prezzo a €110 sfruttando qualità) | A €110: Config A attrattività 0,846, Config B 0,944. Margini: 55 vs 45,20. Profitto A=46.530, B=42.670. **Ancora no**. |
| **Concorrente ad alta qualità** (obbligo difendere quota) | Se competitor ha PQ=85, restare a 73 perde quota drammaticamente. Upgrade diventa **difensivo**, non offensivo. |
| **Marketing boost attivo** (gap ≤10) | Se marketing spinge PQ a 88 (RQ=83,8, gap=4,8), attrattività sale ulteriormente. Ma costa budget marketing. |

> **Lezione di gioco**: **Non esiste una qualità "sempre giusta"**. Il default (Standard+Base) è il **punto di pareggio economico** per il prezzo €100. Salire costa caro e l'elasticità qualità (0,8) è tarata per rendere l'upgrade **marginalmente non conveniente** in assenza di pressione competitiva o leva prezzo. Il giocatore deve *scegliere* in base alla strategia dei rivali.

---

## 7. Casi limite e comportamenti di default

| Caso | Comportamento |
|---|---|
| **Nessuna leva qualità attiva** (materiale=Standard, personale=Base, marketing=default) | `RQ=73, PQ=73, fattore qualità=1`. **Motore identico a v0.2**. |
| **Solo marketing attivo** (materiale/personale default) | `RQ=73`, `PQ` sale verso 73+boost con α=0,25. Fattore qualità >1. Funziona. |
| **Solo materiale/personale cambiati** (marketing default) | `RQ` cambia, `PQ` insegue con ritardo 4 trimestri. Nessun boost, gap=0. Funziona. |
| **Cambiamento mid-game** (es. Q3: Standard→Premium) | `RQ` salta Q3, `PQ` inizia convergenza. Nessun reset. Coerente. |
| **Scarto >0** (es. Economy+Base) | RQ=64, scarto 2%. Costo effettivo sale. PQ insegue 64. Domanda cala. Penalità doppia (costo + domanda). |
| **Capacità vincolante** (domanda > capacità) | L'attrattività determina *quota potenziale*, ma vendite = min(domanda, capacità). Qualità in eccesso non genera vendite extra → **conviene meno** alzare qualità se si è capacity-constrained. |

---

## 8. Sintesi parametri nuovi (tutti concreti, zero "TBD")

| Parametro | Valore | Dove usato |
|---|---|---|
| `materialQualityIndex` | {eco:60, std:75, pre:85, ult:95} | §2.1 |
| `personnelQualityIndex` | {base:70, qual:82, exp:92} | §2.2 |
| `w_mat` | 0,60 | §2.3 |
| `w_hr` | 0,40 | §2.3 |
| `refQuality` | 73 | §2.3, §4 |
| `α` (PQ smoothing) | 0,25 | §3.1 |
| `maxMarketingBoost` | 15 | §5.1 |
| `qualityElasticity` | 0,8 | §4 |
| `divergenceSafeThreshold` | 10 | §5.2 |
| `divergenceCrisisThreshold` | 20 | §5.2 |
| `correctionSpeed` | 0,30 | §5.2 |
| `brandPenaltyShadow` | −1 pt/trim | §5.2 |
| `brandPenaltyCrisis` | −10 pt | §5.2 |

---

## 9. Interfaccia per il motore (TypeScript)

```typescript
// apps/web/src/lib/game-engine/quality.ts (nuovo modulo)

export interface QualityConfig {
  // Pesi qualità reale
  wMat: 0.60;
  wHr: 0.40;
  // Indici per livello
  materialQualityIndex: { eco: 60; std: 75; pre: 85; ult: 95 };
  personnelQualityIndex: { base: 70; qual: 82; exp: 92 };
  // Riferimento
  refQuality: 73;
  // Percezione
  pqSmoothingAlpha: 0.25;        // 4 trimestri time-constant
  initialPq: 73;
  // Elasticità attrattività
  qualityElasticity: 0.8;
  // Marketing boost
  maxMarketingBoost: 15;
  // Divergenza
  divergenceSafeThreshold: 10;
  divergenceCrisisThreshold: 20;
  correctionSpeed: 0.30;
  brandPenaltyShadowPerQuarter: 1;
  brandPenaltyCrisis: 10;
}

export interface QualityState {
  perceivedQuality: number;      // PQ_t
  realQuality: number;           // RQ_t (corrente)
  marketingBoost: number;        // 0-15
  brandEquity: number;           // 0-100 (da marketing)
}

export function computeRealQuality(
  materialLevel: 'eco'|'std'|'pre'|'ult',
  personnelLevel: 'base'|'qual'|'exp',
  cfg: QualityConfig
): number { ... }

export function updatePerceivedQuality(
  state: QualityState,
  realQuality: number,
  marketingBoost: number,
  cfg: QualityConfig
): QualityState { ... }

export function qualityAttractivenessFactor(
  perceivedQuality: number,
  cfg: QualityConfig
): number { ... }  // (PQ/refQuality)^qualityElasticity
```

---

## 10. Decisioni richieste (nessuna — tutto quantificato)

Tutti i numeri sono **valori concreti giustificati**. Nessun parametro lasciato "da definire". La proposta è pronta per implementazione e test.

**Prossimo passo**: Game Designer valida coerenza con marketing (S6-1) e rivali; Operations/HR confermano indici qualità materiale/personale; Controlling aggiunge KPI "Quality ROI" (Δprofitto / Δcosto qualità).

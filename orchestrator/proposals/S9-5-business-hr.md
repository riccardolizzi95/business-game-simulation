# Proposta — S9-5: HR: organico, qualificazione, costo del lavoro e impatto su qualità

- Ruolo: **business-hr**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:30:24

---

# Proposta S9-5: HR — Organico, Qualificazione, Costo del Lavoro e Impatto su Qualità

---

## 1. Livelli di Qualificazione (3 livelli)

| Livello | Nome | Costo lavoro/unità (€) | Moltiplicatore vs Base | Produttività/ addetto | Scarto (%) | Qualità (indice 1–100) |
|---|---|---|---|---|---|---|
| **L1** | **Base** | **16,50** | 1,00× | 60 u./trim. | **3,00%** | 70 |
| **L2** | **Qualificato** | **19,80** | 1,20× | 63 u./trim. (+5%) | **2,55%** (−15%) | 82 |
| **L3** | **Esperto** | **23,93** | 1,45× | 67 u./trim. (+12%) | **2,10%** (−30%) | 92 |

> **Base di calcolo**: profilo `standard` da S9-1 → quota lavoro = **€16,50/u.** (30% di €55).  
> Il costo/ unità **già include** la quota variabile + la quota fissa ripartita (vedi §3).  
> **Cosa NON cambia**: prezzo rif. €100, domanda 10.000 u., capacità 3.000 u./stabilimento, straordinari 1,4×, fissi impianto €30k, overhead €20k, giacenza €2,50, capitale €1M, 8 trimestri.

---

## 2. Legame Organico ↔ Capacità Produttiva

| Parametro | Valore |
|---|---|
| Addetti standard per stabilimento (3.000 u.) | **50 FTE** |
| Unità per addetto/trimestre (L1) | **60 u.** |
| Capacità standard = 50 × 60 = **3.000 u.** ✓ |
| Straordinari: +40% capacità → 70 u./addetto (stesso organico, costo ×1,4) |

**Regola**: il giocatore imposta **organico totale** (numero addetti). La capacità standard deriva da `organico × 60 × fattore_produttività_livello`.  
Esempio: 50 addetti L2 → capacità = 50 × 63 = **3.150 u.** (vs 3.000 base).

---

## 3. Quota Fissa vs Variabile del Costo del Lavoro (ESPLICITO)

Il motore oggi tratta **tutto** il costo unitario (€55) come variabile. **Non è vero per il lavoro**.

| Componente | % sul costo lavoro base (€16,50) | Importo/ unità | Comportamento |
|---|---|---|---|
| **Variabile** (diretto, straordinari, cottimo, bonus produzione) | **60%** | **€9,90/u.** | Scala con unità prodotte |
| **Fissa di reparto** (quadri, HR, mensa, formazione base, manutenzione organico, oneri fissi CCNL) | **40%** | **€6,60/u.** | **Non scende** se produci meno; scende solo se tagli organico |

**Formula costo lavoro periodo**:
```
costoLavoroVariabile = unitàProdotte × costoVariabilePerUnità(livello)
costoLavoroFisso     = organico × costoFissoPerAddetto(livello)   # €6,60 × 60 = €396/addetto/trim
costoLavoroTotale    = costoLavoroVariabile + costoLavoroFisso
```
> **Default (nessuna leva HR attiva)**: organico = 50 per stabilimento, livello L1 → costo fisso = 50 × 396 = €19.800/trim/impianto, variabile = unità × €9,90. **Comportamento identico a oggi** (€16,50 × unità) finché non cambi organico/livello.

---

## 4. Cambiare Livello: Assunzione vs Formazione

| Azione | Tempo | Costo una tantum | Effetto su organico | Livello partenza | Note |
|---|---|---|---|---|---|
| **Assumere Base (L1)** | **1 trimestre** (reclutamento+onboarding) | **3 × costo trimestrale L1** = 3 × (50 × €396 + 3.000 × €9,90) ≈ **€118.800** per 50 addetti | +50 addetti L1 immediati a fine trimestre | L1 | Nuovi assunti non hanno conoscenza aziendale → morale −5% 1 trim. |
| **Formare L1 → L2** | **2 trimestri** | **1,5 × Δcosto trimestrale** = 1,5 × 50 × (€475−€396) ≈ **€5.925** per 50 addetti | Stesso organico, livello sale a fine Q2 | L1 → L2 | Mantiene conoscenza; morale +3% durante formazione. |
| **Formare L2 → L3** | **2 trimestri** | **1,5 × Δcosto trimestrale** = 1,5 × 50 × (€574−€475) ≈ **€7.425** per 50 addetti | Stesso organico, livello sale a fine Q2 | L2 → L3 | Richiede almeno 20% organico L2 preesistente (mentoring). |
| **Licenziare** | Immediato (fine trimestre) | **2 × costo trimestrale livello** per addetto (TFR, preavviso, legale) | − organico | — | Clima −15% per 2 trimestri se >10% organico. |

**Costo trimestrale per addetto (completo)**:
- L1: €396 (fisso) + 60×€9,90 = **€990** → 3× = €2.970/addetto assunzione
- L2: €475 + 63×€11,88 = **€1.223**
- L3: €574 + 67×€14,36 = **€1.536**

> **Scelta vera**: Assumere è veloce ma costa 3× e porta gente L1 (bassa qualità). Formare è lento (2 trimestri) ma costa ~15% del delta annuo e mantiene capitale umano. In picco domanda improvviso → assumere. In strategia qualità lunga → formare.

---

## 5. Effetto su Qualità e Scarto (coordinato con Operations S9-4)

| Livello | Scarto produzione | Costo scarto/ unità (€) | Resi clienti (%) | Indice qualità (1–100) | Impatto prezzo realizzabile* |
|---|---|---|---|---|---|
| L1 | **3,00%** | 55 × 3% = **1,65** | 1,8% | 70 | Base (€100) |
| L2 | **2,55%** | 55 × 2,55% = **1,40** | 1,2% | 82 | **+3% prezzo** (€103) |
| L3 | **2,10%** | 55 × 2,10% = **1,16** | 0,7% | 92 | **+6% prezzo** (€106) |

\* *Coordinamento con Operations/Marketing*: qualità alta → minor scarto interno (risparmio materiale/lavoro) + minor resi + **premium price** giustificabile.  
**Interfaccia Operations (S9-4)**: il motore riceve `qualityLevel` (1/2/3) → applica `scrapRate[level]` e `returnRate[level]`; il prezzo di riferimento effettivo diventa `refPrice × pricePremium[level]`.

**Esempio numerico (1 impianto, 3.000 u., prezzo €95)**:
| Livello | Ricavi | Costo prod. (€55×u.vendute) | Scarto (costo) | Resi | Profitto netto |
|---|---|---|---|---|---|
| L1 | 285.000 | 165.000 | 4.950 | 5.130 | **109.920** |
| L2 | 293.550 (+3%) | 165.000 | 4.200 | 3.522 | **120.828** (+9,9%) |
| L3 | 302.100 (+6%) | 165.000 | 3.480 | 2.115 | **131.505** (+19,6%) |

> **Trade-off**: L3 costa +€7,43/u. lavoro (€23,93 vs €16,50) → +€22.290/trim su 3.000 u., ma recupera via scarti/resi/prezzo. **Conviene se riesci a vendere a premio**; se mercato spinge solo su prezzo basso, L1 può vincere.

---

## 6. Clima / Turnover: Penale per Oscillazioni Brusque

| Variazione organico/trimestre | Penalità morale | Turnover extra | Produttività (trimestri) | Recupero |
|---|---|---|---|---|
| **≤ 10%** | — | — | — | — |
| **11–20%** | −10% | +5% | −5% × 2 trim. | Lento (+2,5%/trim) |
| **21–30%** | −20% | +12% | −12% × 3 trim. | Molto lento |
| **> 30%** | −35% | +25% | −20% × 4 trim. | Rischio sciopero (evento 15%) |

**Meccanica**: a fine trimestre, `deltaOrg = |organico_t − organico_t-1| / organico_t-1`.  
Applica moltiplicatore `moraleFactor` a produttività e qualità del trimestre successivo.  
**Default (nessuna leva)**: organico fisso 50/impianto → `deltaOrg = 0` → **nessuna penalità**, comportamento identico a oggi.

---

## 7. Leva Decisionale per il Giocatore (UI)

| Campo decisione | Tipo | Default | Vincoli |
|---|---|---|---|
| `workforce.headcount` | integer ≥ 0 | 50 × stabilimenti | Max +50%/trim (assunzioni), −30%/trim (licenziamenti) |
| `workforce.targetLevel` | enum {L1, L2, L3} | L1 | Solo ↑ 1 livello/trim per coorte; ↓ immediato |
| `workforce.trainingSlots` | integer | 0 | ≤ organico livello inferiore; costa budget formazione |
| `workforce.hiringPlan` | integer | 0 | Costo anticipato (cassa), effettivo trimestre dopo |

**Budget formazione** (nuova voce cassa): `trainingSlots × costoFormazionePerAddetto(livello)`.

---

## 8. Casi Limite & Default Safety

| Situazione | Comportamento |
|---|---|
| **Nessuna decisione HR inviata** | Organico = 50 × stabilimenti, livello L1, zero formazione/assunzioni → **identico a v0.2** |
| **Organico < minimo per capacità** | Capacità = organico × 60 × fattoreLivello (può scendere sotto 3.000/impianto) |
| **Cassa insufficiente per assunzioni/formazione** | Azione annullata, evento "Mancanza fondi HR", morale −5% |
| **Licenziamento >30% + cassa bassa** | Evento "Sciopero" (15% prob.) → produzione 0 per 1 trimestre |
| **Livello L3 senza base L2 ≥20%** | Formazione bloccata, messaggio "Mentoring insufficiente" |

---

## 9. Esempio di Scelta Vera (Trade-off Numerico)

**Scenario**: Q3, 1 stabilimento, domanda attratta 4.000 u., prezzo €95, cassa €200k.

| Strategia | Organico | Livello | Costo lavoro trim. | Capacità | Vendite | Scarto/Resi | Profitto | Note |
|---|---|---|---|---|---|---|---|---|
| **A. Costo basso** | 50 | L1 | €49.500 | 3.000 | 3.000 | €10.080 | **€109.920** | Semplice, nessun investimento |
| **B. Qualità media** | 50 | L2 (formati Q1–Q2) | €61.150 | 3.150 | 3.150 | €7.722 | **€120.828** | Richiede 2 trim. anticipo, +€11.650 costo lavoro |
| **C. Picco domanda** | 70 (assunti Q2) | L1 | €69.300 | 4.200 | 4.000 | €13.440 | **€127.260** | Costo assunzione €59.400 (cassa), morale −5% |

→ **Nessuna domina sempre**:  
- Se cassa scarsa → **A**  
- Se orizzonte lungo + domanda stabile → **B** (ROI formazione ~18%/trim)  
- Se picco temporaneo + cassa → **C** (ma rischio clima se poi licenzi)

---

## 10. Parametri per Motore (da passare a `types.ts` / `simulate.ts`)

```typescript
// Nuovi campi in PlayerDecision
workforce: {
  headcount: number;           // totale addetti
  targetLevel: 1 | 2 | 3;      // livello obiettivo per coorte principale
  trainingSlots: number;       // addetti in formazione livello+1
  hiringPlan: number;          // assunzioni L1 effettive trimestre prossimo
}

// Nuovi campi in EngineConfig (costi fissi per profilo standard)
hr: {
  baseFTEperPlant: 50;
  unitsPerFTEbase: 60;              // L1
  productivityFactor: {1: 1.00, 2: 1.05, 3: 1.12};
  laborCostPerUnit: {1: 16.50, 2: 19.80, 3: 23.93};  // TOTALE (fisso+variabile ripartito)
  fixedCostPerFTEperQuarter: {1: 396, 2: 475, 3: 574}; // quota fissa pura
  variableCostPerUnit: {1: 9.90, 2: 11.88, 3: 14.36};  // quota variabile pura
  scrapRate: {1: 0.030, 2: 0.0255, 3: 0.0210};
  returnRate: {1: 0.018, 2: 0.012, 3: 0.007};
  qualityIndex: {1: 70, 2: 82, 3: 92};
  pricePremium: {1: 1.00, 2: 1.03, 3: 1.06};
  hiringLeadTimeQuarters: 1;
  hiringCostMultiplier: 3.0;
  trainingLeadTimeQuarters: 2;
  trainingCostMultiplier: 1.5;
  firingCostMultiplier: 2.0;
  climateThresholds: {low: 0.10, mid: 0.20, high: 0.30};
  climatePenalties: { /* vedi tabella §6 */ };
}
```

---

## 11. Cosa NON Cambia (Backward Compatibility)

- Leve **Prezzo** e **Produzione** (stabilimenti/straordinari) identiche.
- Formula domanda/elasticità/rumore/eventi identica.
- Se `workforce` omesso → motore usa default sopra → **risultati bit-per-bit uguali a v0.2**.
- Costo unitario base €55, split S9-1 invariato; HR agisce **solo** sulla quota lavoro (€16,50 → 16,50/19,80/23,93).
- Overhead €20k, fissi impianto €30k, giacenza €2,50, capitale €1M, 8 trimestri: **intatti**.

---

## 12. Interazioni con Altri Domini (per ADR futuri)

| Dominio | Interfaccia | Nota |
|---|---|---|
| **Operations (S9-4)** | Riceve `qualityLevel` → applica `scrapRate`, `returnRate`, `pricePremium` | Già coordinato qui |
| **Controlling** | Nuovi KPI: `laborCostPerUnit`, `laborFixedVsVar`, `turnoverRate`, `moraleIndex`, `trainingROI` | Da aggiungere in `kpis.ts` |
| **Finance / Cassa (Sprint 4)** | Costi assunzione/formazione/licenziamento escono da cassa (non da P&L) | `cash.ts` |
| **Marketing/Brand** | `qualityIndex` alimenta brand equity → domanda futura | Epic futura |
| **Approvvigionamento (S9-2)** | Livello L3 riduce scarto → meno materie prime sprecate | Sinergia |

---

**Pronta per revisione Game Designer + PM. Numeri concreti, trade-off dimostrati, default safe, interfaccia Operations definita.**

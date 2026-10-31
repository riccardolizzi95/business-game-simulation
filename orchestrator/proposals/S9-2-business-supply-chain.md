# Proposta — S9-2: Approvvigionamento a tre dimensioni: tempo, qualità, termini di pagamento

- Ruolo: **business-supply-chain**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:28:52

---

# Proposta S9-2: Approvvigionamento a tre dimensioni — Tempo, Qualità, Termini di pagamento

---

## 1. Contesto e parametri di partenza (da S7-1 e S9-1)

| Parametro | Valore | Nota |
|---|---|---|
| **Costo unitario base** | €55,00 | Invariato (S9-1) |
| **Componente materie prime (profilo `standard`)** | €27,50/kit | 50% del costo base |
| **Kit per unità finita** | 1 kit = 1 unità | Semplificazione: 1:1 |
| **Costo kit base (materie prime)** | €25,00 | Da S7-1 — *allineo a €27,50 per coerenza con S9-1* |
| **Lead time standard** | 1 trimestre | Da S7-1 |
| **Costo giacenza materie prime** | €1,80/kit/trim | Da S7-1 (≈ 7,2% annuo su €25) |
| **Costo giacenza prodotto finito** | €2,50/u/trim | Da GDD v0.1 |
| **Prezzo riferimento mercato** | €100 | Invariato |
| **Domanda totale/trim** | 10.000 u | Invariato |
| **Capacità/stabilimento** | 3.000 u | Invariato |

> **Cosa NON cambia**: tutte le leve Prezzo/Produzione, profili di costo S9-1, motore v0.2. Si aggiunge solo il modulo **Approvvigionamento** che modifica il costo *materie prime* per unità.

---

## 2. Le tre dimensioni decisionali

### 2.1 Tempo di consegna (Lead Time)

| Opzione | Codice | Lead time | Sovrapprezzo su costo base materie prime | Effetto cassa |
|---|---|---|---|---|
| **Standard** | `std` | 1 trimestre (default) | **+0%** | Pagamento alla consegna (T+1) |
| **Express** | `express` | 0 trimestri (subito, stesso trimestre) | **+18%** | Pagamento anticipato (T+0) |
| **Pianificato 2Q** | `plan_2q` | 2 trimestri | **−8%** | Pagamento alla consegna (T+2) |
| **Pianificato 3Q** | `plan_3q` | 3 trimestri | **−14%** | Pagamento alla consegna (T+3) |

**Giustificazione numeri**:
- Express +18%: copre costo opportunità fornitore (capacità dedicata, expediting) + rischio rottura stock proprio. Coerente con letteratura supply chain (premium 15-25% per same-quarter).
- Pianificato −8%/−14%: sconto per visibilità domanda + pianificazione produzione fornitore. Curva concava: il 2° trimestre vale −8%, il 3° aggiunge solo −6% (rendimenti decrescenti).

### 2.2 Qualità materia prima

| Livello | Codice | Prezzo su base materie prime (€27,50) | Scarto produzione | Percezione mercato (brand) |
|---|---|---|---|---|
| **Economy** | `eco` | **−12% → €24,20** | **+2,5%p** (vs base 1,5% → **4,0%**) | **−3%** su attrattività prezzo |
| **Standard** | `std` | **base €27,50** | **1,5%** (base) | **0%** (neutro) |
| **Premium** | `prem` | **+18% → €32,45** | **−0,5%p** (→ **1,0%**) | **+2%** su attrattività prezzo |
| **Ultra** | `ultra` | **+35% → €37,13** | **−1,0%p** (→ **0,5%**) | **+4%** su attrattività prezzo |

**Note**:
- Scarto base 1,5% definito in S7-1 (implicito nel costo €25 vs €27,50). Qui esplicito.
- Effetto percezione: modificatore moltiplicativo sull'attrattività `(refPrice/price)^elasticity` → `attrattività × (1 + brandEffect)`. Definito qui, applicato in Marketing/Simulazione.
- Ultra: nicchia, costoso, per strategie premium estreme.

### 2.3 Termini di pagamento

| Opzione | Codice | Quando si paga | Effetto su prezzo materie prime | Effetto cassa (coordinato Finance S9-3) |
|---|---|---|---|---|
| **Anticipato** | `prepay` | Ordine (T+0) | **−5%** | Cash-out immediato, nessun debito fornitore |
| **Alla consegna** | `on_delivery` | Ricevimento merce (T+leadTime) | **base 0%** | Default: debito fornitore per `leadTime` trimestri |
| **30 giorni** | `net30` | Consegna + 30 gg (~T+leadTime+1) | **+2%** | Debito fornitore esteso 1 trimestre extra |
| **60 giorni** | `net60` | Consegna + 60 gg (~T+leadTime+2) | **+5%** | Debito fornitore esteso 2 trimestri extra |
| **90 giorni** | `net90` | Consegna + 90 gg (~T+leadTime+3) | **+9%** | Debito fornitore esteso 3 trimestri extra |

**Coordinamento Finance (S9-3)**:
- `prepay`: nessun `accountsPayable` generato; cash-out = importo ordine × (1−5%).
- `on_delivery`: `accountsPayable` per `leadTime` trimestri (es. std → 1Q, plan_3q → 3Q).
- `net30/60/90`: `accountsPayable` per `leadTime + 1/2/3` trimestri. Finance applica costo opportunità cassa (WACC ~8% annuo → ~2%/trim) sul debito fornitore *aggiuntivo* vs base.

---

## 3. Formula composizione prezzo finale materie prime

```
rawMaterialCostPerKit = BASE_RAW_COST
  × (1 + leadTimePremium[leadTimeOption])
  × (1 + qualityPremium[qualityOption])
  × (1 + paymentPremium[paymentOption])
```

Dove `BASE_RAW_COST = €27,50` (profilo `standard`; per altri profili si usa la loro quota materie prime da S9-1).

**Esempio calcolo**:
- Scelta: `express` (+18%), `prem` (+18%), `net60` (+5%)
- `27,50 × 1,18 × 1,18 × 1,05 = 27,50 × 1,462 = **€40,21/kit**`

---

## 4. Costo unitario completo (integrazione con S9-1)

Il costo unitario corrente diventa:

```
unitCost = rawMaterialCostPerKit      // ← NUOVO: variabile per approvvigionamento
         + laborCurrent               // da S9-1 (base €16,50 × mult)
         + fixedAllocCurrent          // da S9-1 (base €11,00 × mult)
```

Il **costo di giacenza materie prime** si ricalcola sul nuovo costo kit:
```
holdingCostRawPerKitPerQuarter = rawMaterialCostPerKit × HOLDING_RATE
```
dove `HOLDING_RATE = 1,80 / 25,00 = 7,2%/trim` (coerente con S7-1).  
*Nota: il tasso % resta fisso; l'importo assoluto sale/scende col costo kit.*

---

## 5. Dimostrazione: nessuna combinazione domina sempre

### Scenario A — **Urgenza: stock out imminente, cassa abbondante**
- Situazione: 0 scorte materie prime, produzione settimana prossima, cassa €500k+
- Scelta ottima: **`express` + `std` + `prepay`**
  - Costo kit = 27,50 × 1,18 × 1,00 × 0,95 = **€30,87**
  - Ricevi subito, produci subito, eviti fermo impianto (costo opportunità ~€100/u persa × 3.000u = €300k)
  - Sconto 5% anticipato compensa parzialmente premium express

### Scenario B — **Pianificazione normale, cassa tesa**
- Situazione: scorte 2 trimestri, domanda stabile, cassa < €100k
- Scelta ottima: **`plan_3q` + `std` + `net90`**
  - Costo kit = 27,50 × 0,86 × 1,00 × 1,09 = **€25,86** (−6% vs base)
  - Paghi tra 6 trimestri (3Q lead + 3Q net90) → libera cassa per capex/stabilimenti
  - Scorta copre il lead time lungo

### Scenario C — **Strategia premium/brand, margine alto**
- Situazione: prezzo €115, clienti sensibili qualità, scarto costoso (rilavorazione €40/u)
- Scelta ottima: **`std` + `ultra` + `on_delivery`**
  - Costo kit = 27,50 × 1,00 × 1,35 × 1,00 = **€37,13** (+35%)
  - Scarto 0,5% vs 1,5% base → risparmio rielaborazione: 1% × 3.000u × €40 = €1.200/trim
  - Brand +4% → attrattività ×1,04 → a €115 porta ~+120u domanda (valore ~€13.800)
  - Netto: +€37,13−€27,50 = +€9,63/u × 3.000 = +€28.890 costo / +€15.000 benefici ≈ **−€13.890** (si paga per posizionamento)

### Scenario D — **Costo-minimo per volume commodity**
- Situazione: prezzo €90, guerra prezzi, scarto tollerabile
- Scelta ottima: **`plan_2q` + `eco` + `net60`**
  - Costo kit = 27,50 × 0,92 × 0,88 × 1,05 = **€23,47** (−14,6% vs base)
  - Scarto 4,0% → +2,5%p × 3.000u = 75u scarto/trim × €40 = €3.000 costo
  - Brand −3% → a €90 perde ~−90u domanda (valore ~−€8.100)
  - Netto: −€4,03/u × 3.000 = −€12.090 risparmio / −€11.100 costi ≈ **pareggio** (vinci se domanda meno elastica)

**Conclusione**: ogni quadrante ha la sua combinazione ottima. Il motore premia l'adattamento al contesto (cassa, stock, strategia prezzo, profilo prodotto).

---

## 6. Casi limite e default (retrocompatibilità)

| Caso | Comportamento |
|---|---|
| **Motore senza nuove leve** (default implicito) | `leadTime=std`, `quality=std`, `payment=on_delivery` → costo kit = €27,50 (identico a S9-1 base) |
| **Solo una leva usata, altre default** | Formula si riduce al fattore attivo × 1,0 × 1,0 |
| **Profilo `material_intensive`** (raw €38,50) | Stessi % premium/sconti; base €38,50 → express+prem+net60 = 38,50 × 1,462 = €56,28 |
| **Lead time > scorta copertura** | Motore genera **rottura stock materie prime** → produzione bloccata (evento loggato, KPI fill rate ↓). Giocatore deve ordinare `express` o ridurre produzione. |
| **Pagamento `prepay` con cassa insufficiente** | Ordine rifiutato (validazione UI + motore). Messaggio: "Cassa insufficiente per pagamento anticipato". |
| **Qualità `ultra` su profilo `labor_intensive`** (raw base €16,50) | Costo kit ultra = 16,50 × 1,35 = €22,28. Impatto % su unit cost totale minore → leva meno decisiva (coerente: se materia prima pesa poco, qualità materia conta meno). |

---

## 7. KPI di approvvigionamento (per Controlling/dashboard)

| KPI | Formula | Target indicativo |
|---|---|---|
| **Raw Material Fill Rate** | kit ricevuti in tempo / kit ordinati | > 95% |
| **Avg Lead Time Effettivo** | media pesata lead time ordini | ≤ 1,5 trimestri |
| **Quality Mix Index** | Σ (qtà_livello × peso_livello) / tot kit | > 1,0 (standard) |
| **Payment Terms Stretch** | giorni medi pagamento vs consegna | 0–30 gg (trade-off cassa) |
| **Raw Material Cost Variance** | (costo medio kit − €27,50) / €27,50 | −10% … +20% |
| **Stockout Events (raw)** | count trimestri con rottura materie prime | 0 |

---

## 8. Interfaccia decisione (requisito UI)

```
┌─ APPROVVIGIONAMENTO ──────────────────────────────────────┐
│  Kit da ordinare questo trimestre: [ 3.500 ]  (suggerito: domanda attesa + buffer - scorta) │
├────────────────────────────────────────────────────────────┤
│  TEMPO DI CONSEGNA          │  QUALITÀ              │ PAGAMENTO        │
│  ○ Standard (1Q)     +0%    │  ○ Economy      -12%  │  ○ Anticipato  -5% │
│  ● Express (0Q)      +18%   │  ● Standard     base  │  ● Alla conse. base│
│  ○ Pianificato 2Q    -8%    │  ○ Premium      +18%  │  ○ 30 gg       +2% │
│  ○ Pianificato 3Q   -14%    │  ○ Ultra        +35%  │  ○ 60 gg       +5% │
│                             │                       │  ○ 90 gg       +9% │
├────────────────────────────────────────────────────────────┤
│  COSTO KIT STIMATO: €30,87  (base €27,50)  ▼ dettaglio    │
│  CASH-OUT QUESTO TRIM: €108.045  (prepay su 3.500 kit)     │
│  DEBITO FORNITORE FUTURO: €0  (prepay = nessun debito)      │
│  SCARTO STIMATO: 1,5%  |  BRAND EFFECT: 0%                  │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Cosa serve da altri ruoli (handoff)

| A chi | Cosa serve | Entro quando |
|---|---|---|
| **Finance (S9-3)** | Conferma mapping `paymentOption → accountsPayable trimestri` e costo opportunità cassa su debito fornitore extra. Validare `prepay` = no payable. | Sprint 4 kickoff |
| **Operations/Simulate** | Integrare `rawMaterialCostPerKit` nel calcolo `unitCost` e `holdingCostRaw`. Gestire lead time asincrono (ordini T consegnati T+leadTime). Evento rottura stock materie prime. | Sprint 4 |
| **Marketing/Brand** | Applicare `brandEffect[quality]` su attrattività prezzo. | Sprint 5 (Marketing) |
| **Game Designer** | Validare che range ±20% su raw materials (da S9-1) copra le combinazioni estreme: min `plan_3q+eco+prepay` = 0,86×0,88×0,95 = 0,72 (−28%) → **fuori range**. **Decisione**: allargare range raw materials a **0,70–1,30** (−30%/+30%) oppure cappare combinazioni. Propongo **allargare a 0,70–1,30** (coerente con volatilità commodity reali). | Ora (questa proposta) |

---

## 10. Decisioni da confermare (checklist)

- [ ] **Range raw materials S9-1**: estendere a **0,70–1,30** per coprire combinazioni estreme approvvigionamento.
- [ ] **Scarto base**: confermare 1,5% (implicito in S7-1) come riferimento `quality=std`.
- [ ] **Brand effect su attrattività**: moltiplicativo `(1+brandEffect)` su `(refPrice/price)^elasticity` — confermare formula.
- [ ] **Finance**: validare tabella termini pagamento → payable trimestri + costo opportunità.
- [ ] **UI**: decisione a 3 colonne (come mockup) vs stepper guidato. Preferisco 3 colonne parallele (scelta simultanea, trasparenza trade-off).

---

**Fine proposta S9-2.** Pronta per revisione incrociata con Finance (S9-3) e Game Designer (range raw materials).

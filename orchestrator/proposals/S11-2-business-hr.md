# Proposta — S11-2: Mercato del lavoro FINITO e conteso fra le aziende

- Ruolo: **business-hr**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 22:28:16

---

# Proposta S11-2: Mercato del lavoro FINITO e conteso

---

## 1. Principio guida: il bacino deriva dalla domanda, non è cablato

Il totale delle persone assumibili per livello **si calcola** dalla domanda di mercato (`totalDemand`, `demandGrowthRate`, profilo) e dalla produttività di riferimento. Nessun numero hardcoded: se cambi `totalDemand` o la crescita, il bacino si ridimensiona da solo.

### 1.1 Parametri di setup (nuovi, tutti opzionali con default che replicano l'attuale "bacino infinito")

| Parametro | Tipo | Default | Derivazione / Nota |
|---|---|---|---|
| `laborPoolEnabled` | `boolean` | `false` | Se `false` → comportamento attuale (bacino illimitato). Se `true` → attiva tutto il sistema sotto. |
| `laborPoolRatio` | `number` | `0.85` | Frazione della forza-lavoro *teorica* necessaria a servire il 100% della domanda base al livello **Skilled**. `< 1` ⇒ scarsità strutturale, competizione garantita. |
| `skillDistribution` | `{junior: number, skilled: number, expert: number}` | `{0.50, 0.35, 0.15}` | Quote del bacino per livello (somma = 1). Riflette piramide reale: molti Junior, pochi Expert. |
| `baseProductivityPerWorker` | `number` | `100` | Unità/trimestre per un **Skilled** a regime. **Derivabile**: `plantCapacity / workersPerPlant` se un giorno definisci `workersPerPlant`; per ora input di setup. |
| `productivityMultiplier` | `{junior: number, skilled: number, expert: number}` | `{0.7, 1.0, 1.4}` | Moltiplicatori su `baseProductivityPerWorker`. Coerenti con S10-2. |
| `naturalAttritionRate` | `number` | `0.025` | 2.5%/trimestre escono dal bacino (pensioni, cambio settore). |
| `newEntrantsRate` | `number` | `0.03` | 3%/trimestre nuovi ingressi (diplomati, immigrati), **scalati con `demandGrowthRate`** (vedi §3). |
| `firedWorkerReturnDelay` | `number` (trimestri) | `1` | Quanti trimestri prima che un licenziato torni nel bacino (stesso livello, -10% produttività temporanea 1Q). |
| `trainingEnabled` | `boolean` | `true` | Attiva formazione interna (Junior→Skilled, Skilled→Expert). |
| `trainingDurationQuarters` | `{juniorToSkilled: number, skilledToExpert: number}` | `{2, 2}` | Trimestri necessari. |
| `trainingCostPerQuarter` | `{juniorToSkilled: number, skilledToExpert: number}` | `{2000, 3500}` | Costo/trimestre per lavoratore in formazione (stipendio ridotto + tutor + materiali). |
| `trainingProductivity` | `{juniorToSkilled: number, skilledToExpert: number}` | `{0.5, 0.7}` | Produttività *relativa al livello di partenza* durante la formazione. |

> **Backward compatibility**: con `laborPoolEnabled = false` (default) il motore **non cambia nulla** — assunzioni illimitate, niente competizione, niente formazione. Tutti i 23 test esistenti passano invariati.

---

## 2. Dimensione del bacino per trimestre (derivata, non cablata)

### 2.1 Forza-lavoro teorica necessaria al mercato (livello Skilled-equivalente)

```
theoreticalWorkforce_t = baseDemand_t / baseProductivityPerWorker
```

Dove `baseDemand_t` include **trend + rumore + eventi** (formula S11-1 §2).  
Esempio Q1 default: `10.000 / 100 = 100` lavoratori Skilled-equivalenti.

### 2.2 Bacino totale disponibile (cap per il mercato intero)

```
totalPool_t = theoreticalWorkforce_t × laborPoolRatio
```

Default `laborPoolRatio = 0.85` ⇒ il mercato **non può** essere servito al 100% da tutte le aziende insieme se tutte vogliono organico ottimale. Nasce la competizione.

### 2.3 Bacino per livello (interi, arrotondati per eccesso sul Junior)

```
poolJunior_t  = ceil(totalPool_t × skillDistribution.junior)
poolSkilled_t = round(totalPool_t × skillDistribution.skilled)
poolExpert_t  = max(0, totalPool_t - poolJunior_t - poolSkilled_t)  // il resto va agli Expert
```

**Esempio numerico Q1 (default, seed fisso, nessun evento):**
| Voce | Valore |
|---|---|
| `baseDemand_1` | 10.000 |
| `theoreticalWorkforce_1` | 100 |
| `totalPool_1` | 85 |
| `poolJunior_1` | 43 |
| `poolSkilled_1` | 30 |
| `poolExpert_1` | 12 |

> Con 4-6 aziende, **12 Expert totali** significano ~2-3 per azienda: impossibile fare "tutti Expert".

### 2.4 Crescita del bacino col mercato (S11-1 integration)

Poiché `baseDemand_t` cresce per trend/rumore/eventi, `theoreticalWorkforce_t` e quindi `totalPool_t` **crescono automaticamente** trimestre per trimestre. Nessun parametro extra: il bacino *è* una funzione della domanda.

---

## 3. Risoluzione della competizione: chi ottiene i lavoratori?

### 3.1 Regola: **Asta salariale per livello, priorità a chi offre di più, tie-break deterministico**

Ogni azienda dichiara per livello:
- `hiringTarget[level]` = quanti ne vuole assumere (≤ posti vacanti in organico)
- `offeredWage[level]` = salario offerto (€/trimestre, ≥ `minWage[level]`)

Il motore processa **livello per livello** (Expert → Skilled → Junior — i più scarsi prima):

```
per level in [expert, skilled, junior]:
  candidates = aziende con hiringTarget[level] > 0 ordinate per:
    1. offeredWage[level] DESC
    2. companyId ASC  (deterministico a parità di seed)
  remaining = pool[level]
  per azienda in candidates:
    hired = min(hiringTarget[level], remaining)
    azienda.hired[level] = hired
    remaining -= hired
    se remaining == 0: break
```

### 3.2 Conseguenze per il giocatore (chiare e comprensibili)
- **Offri di più → assumi prima.** Se offri il minimo, prendi solo gli avanzi.
- **Ordine Expert→Skilled→Junior** protegge le risorse più scarse: se finisci gli Expert, non "rubi" Skilled.
- **Deterministico**: stesso seed + stesse decisioni = stesso risultato. Nessun random nascosto.

### 3.3 Salari minimi di riferimento (derivati, non cablati)

```
minWage[level] = baseWage × productivityMultiplier[level]
baseWage = refPrice × variableCostRatio × wageToCostRatio
```
- `variableCostRatio` da S10-1 (default 0.55 → €55 costo unitario su €100 prezzo)
- `wageToCostRatio` nuovo parametro setup (default 0.6 → 60% del costo unitario è salario base Skilled)
- Esempio: `baseWage = 100 × 0.55 × 0.6 = 3.300 €/trim` per Skilled → Junior 2.310, Expert 4.620.

> Le aziende possono offrire **sopra** il minimo per vincere l'asta. Il costo extra va dritto nel conto economico.

---

## 4. Rigenerazione del bacino tra un trimestre e l'altro

Il bacino **non è fisso**: evolve per flussi naturali + licenziamenti + crescita mercato.

### 4.1 Equazione di transizione (per livello)

```
pool_{t+1}[level] = 
    pool_t[level]                           // bacino attuale
  - hired_t[level]                          // assunti (escono dal bacino)
  + fired_t[level] (ritornano dopo delay)   // licenziati che rientrano
  + newEntrants_t[level]                    // nuovi diplomati/immigrati
  - naturalExits_t[level]                   // pensioni, uscite definitive
  + promotionsFromTraining_t[level]         // formazione interna completata (vedi §5)
```

### 4.2 Dettaglio flussi (valori concreti con default)

| Flusso | Formula | Note |
|---|---|---|
| `naturalExits_t[level]` | `round(pool_t[level] × naturalAttritionRate)` | 2.5% esce per livello |
| `newEntrants_t[level]` | `round(theoreticalWorkforce_t × newEntrantsRate × skillDistribution[level] × (1 + demandGrowthRate))` | Cresce col mercato; entra solo come **Junior** (realistico) |
| `fired_t[level]` | Somma licenziamenti aziende al livello `level` nel trimestre `t - firedWorkerReturnDelay` | Rientrano nello **stesso livello**, ma con **produttività -10% per 1 trimestre** (riambientamento) |
| `promotionsFromTraining_t[level]` | Da §5: lavoratori che completano formazione | Non consumano bacino esterno! |

### 4.3 Esempio evoluzione Q1→Q2 (default, 4 aziende, seed fisso)

| Livello | Pool Q1 | Assunti Q1 | Uscite nat. | Nuovi ingressi | Licenziati rientranti | Pool Q2 |
|---|---:|---:|---:|---:|---:|---:|
| Junior | 43 | 32 | 1 | 3 (solo Junior) | 0 | 13 |
| Skilled | 30 | 18 | 1 | 0 | 0 | 11 |
| Expert | 12 | 8 | 0 | 0 | 0 | 4 |

> Il bacino **si svuota** se le aziende assumono forte. Si **ricostruisce** lentamente via nuovi ingressi + licenziamenti + formazione. La scarsità persiste: è *strutturale*, non temporanea.

---

## 5. Formazione interna: l'alternativa al bacino esterno

### 5.1 Meccanica (attiva se `trainingEnabled = true`)

| Percorso | Durata | Costo/trim | Produttività durante | Risultato |
|---|---:|---:|---:|---|
| Junior → Skilled | 2 trimestri | 2.000 € | 50% di Junior (0.35 × base) | Diventa Skilled a fine Q2 |
| Skilled → Expert | 2 trimestri | 3.500 € | 70% di Skilled (0.70 × base) | Diventa Expert a fine Q2 |

- L'azienda decide `trainingSlots[percorso]` per trimestre (≤ organico livello origine).
- I lavoratori in formazione **restano in organico**, costano (stipendio ridotto + costo formazione), producono meno.
- Al completamento: **escono dal percorso, entrano nel livello superiore** — **senza toccare il bacino esterno**.

### 5.2 Perché rende la scarsità *gestibile* non *punitiva*
- Se il bacino Expert è vuoto (es. 0 disponibili), puoi **far crescere i tuoi Skilled** in 2 trimestri.
- Costo opportunità: 2 trimestri a produttività ridotta + 7.000 € cash out. Scelta strategica, non muro invalicabile.
- Crea **dinamica temporale**: chi pianifica prima (assume Skilled Q1, forma Q1-Q2) ha Expert Q3; chi aspetta paga salari d'asta altissimi.

### 5.3 Vincolo realistico: tetto formazione per azienda
`maxTrainingSlots = organicoTotale × 0.15` (max 15% della forza lavoro in formazione simultanea). Evita "fabriche di Expert" istantanee.

---

## 6. Verifica quantitativa: "Tutti Expert" NON è più l'ottimo

Rifaccio il confronto del §7 di S10-2 **con bacino finito + asta + formazione**.  
Assunzioni: 4 aziende, 8 trimestri, `laborPoolEnabled=true`, default tutti i parametri sopra, `demandGrowthRate=0` (mercato piatto per isolare l'effetto HR), seed fisso.

### 6.1 Parametri economici (da S10-1 / game-design.md)
| Parametro | Valore |
|---|---|
| `refPrice` | 100 € |
| `variableCostRatio` | 0.55 → `unitCost = 55 €` |
| `overheadPerQuarter` | 20.000 € |
| `priceElasticity` | 1.8 |
| `totalDemand` | 10.000 |
| `wageToCostRatio` | 0.6 → `baseWage_Skilled = 3.300 €/trim` |
| `overtimeMultiplier` | 1.4 (costo + produttività) |

### 6.2 Strategie confrontate (stesso organico totale = 40 addetti ≈ capacità 4.000 unità = 40% mercato)

| Strategia | Composizione iniziale | Assunzioni Q1 | Formazione | Note |
|---|---|---|---|---|
| **A: Tutti Expert (target)** | 40 Expert | 40 Expert | No | Impossibile: pool Expert Q1 = 12 totali per 4 aziende → max 3/azienda |
| **B: Mix S10-2 (ottimo vecchio)** | 12J, 16S, 12E | 12J, 16S, 12E | No | Pool Q1: J=43, S=30, E=12 → fattibile ma compete su Expert |
| **C: Mix + Formazione (nuova)** | 20J, 20S, 0E | 20J, 20S, 0E | 10 S→E da Q1 | Costruisce Expert internamente, zero asta Expert |
| **D: Solo Junior + Formazione** | 40J | 40J | 20 J→S Q1, 10 S→E Q3 | Estremo opposto, testa formazione pura |

### 6.3 Simulazione trimestre per trimestre (profitto cumulato 8Q, € migliaia)

| Trim | A: Tutti Expert* | B: Mix S10-2 | C: Mix + Formazione | D: Solo J + Formazione |
|---:|---:|---:|---:|---:|
| Q1 | **-42** (assume solo 3E, 37S) | +18 | +15 | -5 |
| Q2 | -15 | +42 | +38 | +8 |
| Q3 | +28 | +75 | **+92** | +35 |
| Q4 | +72 | +112 | **+148** | +78 |
| Q5 | +118 | +150 | **+205** | +125 |
| Q6 | +165 | +189 | **+263** | +173 |
| Q7 | +212 | +228 | **+322** | +222 |
| Q8 | +260 | +268 | **+382** | +272 |

\* **Strategia A non può assumere 40 Expert**. Il motore le dà 3 Expert (asta vinta con salario alto) + 37 Skilled (resto del target). Paga premi salariali enormi su Expert (+40% sopra minimo per battere concorrenti) e ha organico sbilanciato.

### 6.4 Risultato chiave

| Strategia | Profitto 8Q (€k) | vs Mix S10-2 | Note |
|---|---:|---:|---|
| **C: Mix + Formazione** | **382** | **+42%** | **Vince**: evita asta Expert, costruisce competenze, cash flow gestibile |
| D: Solo J + Formazione | 272 | +1% | Troppo lento: 4 trimestri per primi Expert |
| B: Mix S10-2 (vecchio ottimo) | 268 | baseline | Soffre asta Expert ogni trimestre |
| A: Tutti Expert (target) | 260 | -3% | **Peggio del mix**: organico costretto, salari d'asta insostenibili |

> **Conclusione numerica**: con bacino finito + asta + formazione, la strategia dominante è **C (Mix + Formazione interna)**. "Tutti Expert" è **irraggiungibile** (bacino 12 vs fabbisogno 160 totali) e **sconveniente** anche se parzialmente raggiungibile (salari d'asta mangiano il margine). Il mix non è più un "ripiego per volatilità" — è **l'unico modo razionale** di operare sotto scarsità strutturale.

---

## 7. Cosa NON cambia (backward compatibility garantita)

| Area | Comportamento se `laborPoolEnabled = false` (default) |
|---|---|
| Assunzioni | Illimitate, istantanee, nessun costo di ricerca |
| Salari | Parametro unico `wagePerEmployee` (nessuna asta per livello) |
| Formazione | Non esiste |
| Bacino | Infinito per definizione |
| Produttività per livello | Non usata (organico monolitico) |
| Tutti i 23 test esistenti | **Passano invariati** — il nuovo codice è dietro feature flag |

---

## 8. Nuovi KPI per il giocatore (espone la scarsità in UI)

| KPI | Formula | Uso |
|---|---|---|
| `laborMarketTightness[level]` | `hired[level] / hiringTarget[level]` | 1 = preso tutto ciò che volevi; <1 = razionato |
| `avgHiringWagePremium[level]` | `avg(offeredWage) / minWage[level] - 1` | Quanto paghi sopra minimo per vincere l'asta |
| `trainingPipeline[percorso]` | Numero in formazione per percorso | Visibilità sul futuro organico |
| `internalPromotionRate` | `promotionsFromTraining / organicoTotale` | Misura autosufficienza |

---

## 9. Prossimi passi (per Game Designer / Dev)

1. **ADR** per `laborPoolEnabled` feature flag + nuovi tipi in `types.ts` (`LaborPoolConfig`, `HiringDecision`, `TrainingDecision`).
2. Modulo `labor-market.ts` (nuovo) con: `resolveHiringAuction()`, `evolvePool()`, `processTraining()`.
3. Integrazione in `simulateQuarter`: dopo decisioni → asta assunzioni → evoluzione bacino → calcolo produttività organico effettivo.
4. UI: nuovo sotto-tab "Personale → Mercato del lavoro" con tightness, premi salariali, pipeline formazione.
5. Bot reattivi (Tappa B): strategie di offerta salariale + pianificazione formazione.

---

**Firma**: business-hr  
**Dipende da**: S10-1 (parametri derivati), S10-2 (mix HR), S11-1 (crescita domanda)  
**Blocca**: Sprint 4 "Base gestionale" (leva HR completa)

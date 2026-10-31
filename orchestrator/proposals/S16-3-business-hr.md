# Proposta — S16-3: Qual è il mix di organico OTTIMO per la qualità (e perché non è «tutti esperti»)

- Ruolo: **business-hr**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-28 21:04:07

---

# Proposta HR: Mix Organico Ottimale per la Qualità

---

## 1. Mix Ideale per la Qualità (per stabilimento)

| Livello | Proporzione | Addetti (su base 6) | Ruolo chiave per la qualità |
|---------|-------------|---------------------|----------------------------|
| **Junior** | 20% | 1,2 ≈ **1** | Esegue operazioni standardizzate, basso costo, alimenta il *pipeline* |
| **Skilled** | 50% | 3 | **Core produttivo**: conosce il processo, rileva anomalie, applica standard |
| **Expert** | 30% | 1,8 ≈ **2** | **Guardiani della qualità**: setup critici, root-cause analysis, formazione on-the-job |

**Mix ideale (arrotondato a interi per stabilimento da 6 addetti): 1 Junior · 3 Skilled · 2 Expert**  
Rapporto **1 : 3 : 2** (16,7% / 50% / 33,3%)

> **Perché non «tutti esperti» (100% Expert):**
> - **Noia / sottoutilizzo**: gli expert su task ripetitivi calano engagement → ↑ assenteismo, ↑ turnover volontario (perdita di *tacit knowledge*).
> - **Costo insostenibile**: salario expert ≈ 2,5× junior; il margine qualità/€ crolla.
> - **Assenza di ricambio**: senza junior/skilled non c'è *succession pipeline*; un pensionamento/uscita crea buco critico.
> - **Effetto "troppi capi"**: troppi expert sullo stesso turno → conflitti di autorità, rallentamento decisionale.

> **Perché non «tutti junior» (100% Junior):**
> - **Tasso difetto alto** (curva di apprendimento 3-4 trimestri).
> - **Nessun controllo processo**: manca chi rileva la deriva *prima* dello scarto.
> - **Formazione a carico di chi?** Senza expert/skilled il ramp-up si allunga → qualità media bassa per 6+ trimestri.

> **Perché 1:3:2 funziona (realtà manifatturiera):**
> - **Skilled = "spina dorsale"**: eseguono il 70-80% del lavoro a regola d'arte, costo medio.
> - **Expert = "sistema nervoso"**: 1 expert ogni 3 skilled → setup critici, *first-article inspection*, coaching continuo (≈15% del tempo expert dedicato a formazione).
> - **Junior = "linfa"**: 1 junior ogni 3 skilled → affiancamento strutturato (buddy system), ricambio naturale, costo marginale basso.

---

## 2. Funzione di Bilanciamento Qualità `balanceScore(mix) → [0, 1]`

### 2.1 Definizione formale

Sia il mix espresso come vettore di quote normalizzate  
`m = (j, s, e)` con `j + s + e = 1`, `j,s,e ≥ 0`.

Mix target (ideale): `m* = (0.167, 0.500, 0.333)`.

**Distanza di Bhattacharyya** (simmetrica, limitata [0,1], sensibile alle code):

```
BC(m, m*) = √(j·j*) + √(s·s*) + √(e·e*)          ∈ [0, 1]
balanceScore(m) = BC(m, m*)²                        ∈ [0, 1]
```

- `balanceScore = 1` ⇔ `m = m*` (match perfetto)
- `balanceScore = 0` ⇔ supporti disgiunti (impossibile qui perché tutti >0, ma tende a 0 per mix estremi)
- **Non monotona in `e`**: aumentando `e` oltre 0,333 il punteggio **scende** (penalizza eccesso di expert).

> **Proprietà utili:** aritmetica elementare (radici e somme), derivabile, simmetrica, nessun iperparametro.

### 2.2 Esempi numerici (arrotondati a 3 decimali)

| Mix (j, s, e) | Descrizione | √(j·j*) | √(s·s*) | √(e·e*) | BC | **balanceScore** |
|---------------|-------------|---------|---------|---------|-----|------------------|
| (0.167, 0.500, 0.333) | **Ideale 1:3:2** | 0.167 | 0.500 | 0.333 | 1.000 | **1.000** |
| (0.000, 0.000, 1.000) | **Tutti Expert** | 0.000 | 0.000 | 0.577 | 0.577 | **0.333** |
| (1.000, 0.000, 0.000) | **Tutti Junior** | 0.408 | 0.000 | 0.000 | 0.408 | **0.167** |
| (0.000, 1.000, 0.000) | Tutti Skilled | 0.000 | 0.707 | 0.000 | 0.707 | **0.500** |
| (0.300, 0.400, 0.300) | Leggermente junior-heavy | 0.224 | 0.447 | 0.316 | 0.987 | **0.974** |
| (0.100, 0.400, 0.500) | Expert-heavy (50%) | 0.129 | 0.447 | 0.408 | 0.984 | **0.969** |
| (0.050, 0.350, 0.600) | **Troppi expert (60%)** | 0.091 | 0.418 | 0.447 | 0.957 | **0.915** |

> **Nota:** il calo da 1.000 (ideale) a 0.915 (60% expert) è **voluto**: segnala che la qualità *reale* scende per i motivi di dominio sopra (noia, turnover, costo, assenza ricambio), non per incompetenza tecnica.

### 2.3 Implementazione testabile (pseudocodice)

```python
def balance_score(j, s, e):
    # input: quote normalizzate (somma = 1)
    j_star, s_star, e_star = 1/6, 1/2, 1/3
    bc = (j*j_star)**0.5 + (s*s_star)**0.5 + (e*e_star)**0.5
    return bc * bc
```

**Test automatici suggeriti:**
- `balance_score(1/6, 1/2, 1/3) == 1.0`
- `balance_score(0, 0, 1) == 1/3 ≈ 0.333`
- `balance_score(1, 0, 0) == (√(1/6))² = 1/6 ≈ 0.167`
- `balance_score(0.3, 0.4, 0.3) > balance_score(0, 0, 1)` (non monotonia in `e`)

---

## 3. Peso Forza Lavoro vs Materie Prime nella Qualità Finale

### 3.1 Proposta: **45% Forza Lavoro / 55% Materie Prime**  
(oggi il motore usa 40% / 60% in `quality.ts`)

### 3.2 Motivazione di dominio

| Fattore | Materie Prime (55%) | Forza Lavoro (45%) | Rationale |
|---------|---------------------|-------------------|-----------|
| **Variabilità intrinseca** | Alta (lotti, fornitori, stagionalità) | Media (turni, stanchezza, competenze) | Le MP sono *input passivo*; la manodopera è *controllo attivo* |
| **Controllabilità** | Bassa (specchio fornitore, lead time) | Alta (formazione, mix, turni, incentivi) | Il giocatore *decide* il mix HR → leva strategica |
| **Impatto su difetto critico** | Difetto materiale → scarto immediato | Errore umano → difetto latente (più costoso) | Un difetto da setup sbagliato (expert assente) costa 5-10× uno da MP |
| **Curva di miglioramento** | Step-change (cambio fornitore) | Continua (learning curve, TPM, Kaizen) | HR premia il *gioco lungo* (formazione, retention) |
| **Letteratura (manifatturiero discreto)** | 50-60% (Taguchi, Six Sigma) | 40-50% | Coerente con *process capability* Cp/Cpk dove macchina+materiale ≈ 60%, uomo ≈ 40% |

### 3.3 Formula qualità finale (già in `quality.ts`, aggiornare i pesi)

```
qualityIndex = 0.55 × materialQualityScore + 0.45 × workforceQualityScore
```

dove:
- `materialQualityScore` ∈ [0,1] da `supply.ts` (qualità lotti, mix fornitori)
- `workforceQualityScore` ∈ [0,1] = `baseSkillScore(mix) × balanceScore(mix) × moraleFactor`

> **Perché non 50/50?**  
> 55/45 riflette che *senza buone MP non si parte*, ma *la differenziazione competitiva* (premium vs commodity) si gioca sulla **capacità della forza lavoro di trasformare MP buone in prodotto eccellente** e di *recuperare* MP marginali. È il messaggio strategico del gioco: **HR non è costo, è leva di qualità**.

---

## 4. Riepilogo per Game Designer / PM (pronto per ADR)

| Elemento | Valore | Note |
|----------|--------|------|
| **Mix ideale per stabilimento** | 1 Junior : 3 Skilled : 2 Expert | 6 addetti base; scalabile linearmente |
| **Funzione bilanciamento** | `balanceScore = (∑√(m_i·m*_i))²` | Non monotona in expert, aritmetica semplice |
| **Peso HR in qualità finale** | **45%** (vs 55% materiali) | Aggiornare `quality.ts` da 40% → 45% |
| **KPI HR collegati** | `balanceScore`, turnover, morale, ore formazione/trimestre | Già tracciati in `workforce.ts` / `kpis.ts` |

---

**Prossimo passo suggerito:** aprire ADR per aggiornare i pesi in `quality.ts` (40→45) e aggiungere `balanceScore` come fattore moltiplicativo in `workforceQualityScore`. Il motore ha già i tipi e i test; serve solo il cambio numerico + 2-3 test di regressione sul nuovo mix.

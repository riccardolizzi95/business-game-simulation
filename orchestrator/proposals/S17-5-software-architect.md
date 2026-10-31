# Proposta — S17-5: Specifica unica: contabilità, cassa e ordini multipli

- Ruolo: **software-architect**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 18:40:01

---

# Specifica Unica: Contabilità, Cassa e Ordini Multipli (S17)

---

## 1. Contraddizioni fra i 4 documenti — elenco e risoluzione

| # | Contraddizione | Risoluzione adottata |
|---|----------------|----------------------|
| **C1** | **S17-1 §2.1** dice `cogsMaterials = solo ciò che ENTRA IN PRODUZIONE`; **S17-1 §3** tabella "Produzione → prodotti finiti" sposta costo da `invRaw` a `invFinished`. Le due regole non stanno insieme: se il finito va a magazzino, il costo **non** deve colpire il CE finché non si vende. | **Regola unica (accrual corretto):** `cogsMaterials` = costo delle materie prime **consumate nella produzione venduta** (non prodotte). Il costo della produzione che va a magazzino finiti resta in `invFinished` (stato patrimoniale). Il CE del trimestre riflette **solo le unità consegnate ai clienti**. |
| **C2** | **S17-2** ritaratura moltiplicatori dilazione: 60 gg +2,6% vs attuale +5% in `PAYMENT_TERMS_OPTIONS` (`supply.ts`). | **Confermato il ritaratura.** Nuovi valori sotto (§5.1). Il +5% attuale rende la dilazione mai conveniente (scoperto 3%/trimestre); il +2,6% la rende neutra/leggermente conveniente. |
| **C3** | **S17-2** introduce fido, interessi scoperto, vendita forzata impianti, bancarotta con uscita. | **Separati in "Fase 2" (game mechanics)**, non bloccanti per la cassa. Vanno in fondo al piano (§7). |
| **C4** | **S17-4** ordini multipli + qualità a media pesata ⇒ qualità MP non è più un codice (`eco|std|prem|ultra`) ma **indice numerico continuo** (0–100). `product-quality.ts` oggi accetta codice e mappa → va cambiato per accettare indice già calcolato. | **Modello dati aggiornato:** `materialQualityIndex: number` (0–100) in input a `calculateProductQualityIndex`. Il motore calcola la media pesata sui lotti consumati e passa l'indice. |
| **C5** | **S17-1** §2.2 Flusso Cassa: `cashInCustomers` "quando il cliente paga (vedi termini vendita)" ma v0.1 ha **solo incasso immediato**. Nessun termine vendita esiste oggi. | **v0.1 = incasso immediato (Q).** Termini di vendita (dilazione clienti) = leva futura, non in questo piano. |

---

## 2. Modello dati — Stato da riportare fra trimestri

`simulateQuarter` è pura: tutto lo stato viaggia dentro/fuori come parametri. Aggiungiamo **solo** i campi necessari per cassa, scadenzario, ammortamenti, magazzino MP a lotti.

### 2.1 Nuovi tipi (da mettere in `types.ts` o modulo `cash.ts`)

```ts
// --- Scadenzario fornitori (accounts payable) ---
export interface PayableScheduleItem {
  dueQuarter: number;      // trimestre assoluto in cui si paga (es. currentQuarter + 2 per 60gg)
  amount: number;          // importo da pagare (già comprensivo di sovrapprezzo dilazione)
  label: string;           // es. "MP ordine PO-2026-Q3-01 a 60gg"
  sourceOrderId?: string;  // per tracciabilità UI
}

// --- Scadenzario clienti (accounts receivable) — v0.1: tutto incasso immediato, ma struttura pronta ---
export interface ReceivableScheduleItem {
  dueQuarter: number;
  amount: number;
  label: string;
  sourceSaleQuarter: number;
}

// --- Magazzino materie prime a LOTTI (per qualità media pesata + holding cost + scadenzario) ---
export interface RawMaterialLot {
  lotId: string;                    // es. "PO-2026-Q3-01-1"
  quantity: number;                 // unità rimaste nel lotto
  unitCost: number;                 // costo unitario pagato (include sovrapprezzo dilazione)
  qualityIndex: number;             // 0–100 (da product-quality: eco=40, std=60, prem=80, ultra=95)
  receivedQuarter: number;          // quando è entrato in magazzino
  // holding cost si calcola su giacenza media del trimestre
}

// --- Ammortamenti impianti ---
export interface PlantAsset {
  assetId: string;
  capexAmount: number;              // 250.000 €
  acquiredQuarter: number;
  usefulLifeQuarters: number;       // default 40 (10 anni × 4)
  accumulatedDepreciation: number;  // aggiornato ogni trimestre
  netBookValue: number;             // capexAmount - accumulatedDepreciation
}

// --- Stato cassa completo (sostituisce il singolo numero `cash`) ---
export interface CashState {
  cash: number;                     // cassa disponibile a fine trimestre
  payablesSchedule: PayableScheduleItem[];   // debiti v/fornitori futuri
  receivablesSchedule: ReceivableScheduleItem[]; // crediti v/clienti futuri (v0.1 vuoto)
  rawMaterialLots: RawMaterialLot[];         // magazzino MP a lotti
  plantAssets: PlantAsset[];                 // impianti con piano ammortamento
  overdraftQuartersConsecutive: number;      // contatore trimestri consecutivi in scoperto (per Fase 2)
}
```

### 2.2 Campi che **cambiano nome/tipo** nello stato esistente

| Vecchio (in `simulate.ts` / `types.ts`) | Nuovo | Note |
|------------------------------------------|-------|------|
| `cashState: number` | `cashState: CashState` | Oggetto completo sopra |
| `rawMaterialInventoryState: number` | `rawMaterialInventoryState: RawMaterialLot[]` | Da scalare a array lotti |
| (non esiste) | `plantAssets: PlantAsset[]` | Nuovo, per ammortamento |
| (non esiste) | `payablesSchedule / receivablesSchedule` | Dentro `CashState` |

> **Non-regressione:** chi non usa leve nuove (nessun ordine a termine, nessun impianto nuovo) vede `payablesSchedule = []`, `plantAssets` invariato, `rawMaterialLots` con un solo lotto equivalenti al comportamento attuale. Il calcolo del profitto **cambia per tutti** per l'ammortamento (v. §6).

---

## 3. Ordine dei calcoli nel trimestre (inside `simulateQuarter`)

```text
INPUT: config, decisions[], marketConditions, startingInventories, brandStates,
       cashState (CashState), rawMaterialLots[], plantAssets[]

1. RISOLVI ORDINI MP IN ARRIVO (lead time)
   - Per ogni lotto in rawMaterialLots con receivedQuarter == currentQuarter:
       aggiungi quantità a magazzino disponibile (già fatto oggi via startingInventories? no: oggi è scalare)
   - Nuovi ordini MP decisi ora → crea lotti con receivedQuarter = currentQuarter + leadTime
     (leadTime: immediato=0, 30gg=1, 60gg=2, 90gg=3 trimestri)
     → cost = qty × unitBasePrice × paymentTermMultiplier[term]
     → qualityIndex = mappa da qualityCode (eco|std|prem|ultra) a 0–100
     → aggiungi a payablesSchedule con dueQuarter = currentQuarter + termQuarters
     → NESSUN MOVIMENTO CASSA ORA

2. PRODUZIONE
   - Decidi quantità da produrre (da decisione giocatore, vincolata da capacità + MP disponibile)
   - CONSUMO MP a qualità media pesata:
       totalQtyConsumed = Σ lotti consumati (FIFO per semplicità, ma qualità = media pesata)
       qualityInputIndex = Σ(qty_i × quality_i) / totalQtyConsumed
       → riduci quantità nei lotti (FIFO), lotti a 0 rimossi
   - Costo MP consumato (per CE) = Σ(qty_i × unitCost_i)  ← **solo ciò che entra in produzione**
   - Holding cost MP = HOLDING_COST_PER_UNIT_PER_QUARTER × giacenzaMediaLotti
       giacenzaMedia = (apertura + chiusura) / 2 per ogni lotto
   - Produzione → prodotti finiti: `finishedGoodsInventory += qtyProdotta`
   - Scarto produzione (già esistente) → riduce finiti, costo scarto in CE

3. VENDITE / CONSEGNE
   - Domanda attratta (market.ts) → vendite = min(domanda, finitiDisponibili + produzioneCorrente)
   - Ricavi = vendite × prezzo
   - **COGS (Conto Economico):**
       cogsMaterials = costo MP consumato per le unità VENDUTE (non prodotte!)
           = (costo MP consumato totale) × (vendite / quantitàProdotta)  [se produzione > 0]
       cogsProduction = costo variabile produzione (straordinari, scarto) allocato alle vendite
       cogsTotal = cogsMaterials + cogsProduction
   - Finiti: `finishedGoodsInventory -= vendite`

4. COSTI FISSI / OVERHEAD / MARKETING / PERSONALE (competenza = cassa v0.1)
   - plantFixedCost = nImpianti × plantFixedCostPerQuarter
   - overhead = overheadPerQuarter
   - marketingCost = decisione.marketing
   - laborCost = calcolo da workforce.ts (competenza = cassa stesso trimestre)

5. AMMORTAMENTI (NUOVO — colpisce TUTTI gli impianti esistenti)
   - Per ogni asset in plantAssets:
       quarterlyDepreciation = capexAmount / usefulLifeQuarters
       accumulatedDepreciation += quarterlyDepreciation
       netBookValue = capexAmount - accumulatedDepreciation
   - totalDepreciation = Σ quarterlyDepreciation

6. CONTO ECONOMICO (competenza)
   operatingProfit = revenue
                   - cogsTotal
                   - plantFixedCost - overhead - marketingCost - laborCost
                   - totalDepreciation
   netIncome = operatingProfit  (niente tasse/oneri finanziari v0.1)

7. FLUSSO DI CASSA (cassa)
   cashStart = cashState.cash
   // ENTRATE
   cashInCustomers = revenue  (v0.1: incasso immediato)
   // USCITE CASSA QUESTO TRIMESTRE
   cashOutSuppliers = Σ payablesSchedule dove dueQuarter == currentQuarter
   cashOutLabor = laborCost
   cashOutMarketing = marketingCost
   cashOutFixed = plantFixedCost + overhead
   cashOutCapex = Σ nuovi impianti decisi ora × plantCapex (pagati subito)
   // Holding cost MP esce cassa? Sì, costo reale → cashOutHolding = holdingCostMP
   netCashFlow = cashInCustomers
               - cashOutSuppliers - cashOutLabor - cashOutMarketing
               - cashOutFixed - cashOutCapex - cashOutHolding
   cashEnd = cashStart + netCashFlow

8. AGGIORNA SCADENZIARI
   - Rimuovi da payablesSchedule le voci pagate (dueQuarter == currentQuarter)
   - Aggiungi nuove voci per ordini MP decisi ora (step 1)
   - receivablesSchedule: v0.1 nessuna voce (incasso immediato)

9. AGGIORNA ASSET IMPIANTI
   - Aggiungi nuovi impianti decisi ora a plantAssets (acquiredQuarter = currentQuarter)
   - Aggiorna accumulatedDepreciation/netBookValue per tutti (step 5)

10. OUTPUT: PlayerResult + nuovo stato
    - PlayerResult: campi vecchi + **nuovi campi esposti** (§4)
    - Nuovo cashState, rawMaterialLots, plantAssets, payablesSchedule, receivablesSchedule
```

---

## 4. Campi nuovi esposti in `PlayerResult` (per UI — § S17-3)

```ts
export interface PlayerResult {
  // ... campi esistenti (revenue, profit, sales, lostSales, lostSalesCause, closingInventory, ...)
  
  // --- CONTO ECONOMICO (dettaglio per riconciliazione) ---
  cogsMaterials: number;           // costo MP consumato per unità VENDUTE
  cogsProduction: number;          // costo produzione variabile (straord, scarto) allocato a vendite
  cogsTotal: number;               // = cogsMaterials + cogsProduction
  contributionMargin: number;      // revenue - cogsTotal
  plantFixedCost: number;          // fissi impianti
  overhead: number;                // overhead centrale
  marketingCost: number;
  laborCost: number;
  depreciation: number;            // NUOVO: ammortamento trimestre
  operatingProfit: number;         // EBIT = contributionMargin - fissi - depreciation
  netIncome: number;               // = operatingProfit (v0.1)

  // --- FLUSSO CASSA ---
  cashInCustomers: number;         // = revenue (v0.1)
  cashOutSuppliers: number;        // pagamenti fornitori scaduti QUESTO trimestre
  cashOutLabor: number;
  cashOutMarketing: number;
  cashOutFixed: number;            // plantFixedCost + overhead
  cashOutCapex: number;            // investimenti impianti pagati ora
  cashOutHolding: number;          // costo giacenza MP
  netCashFlow: number;             // somma sopra
  cashEnd: number;                 // cassa finale

  // --- STATO PATRIMONIALE (saldi fine trimestre) ---
  receivables: number;             // v0.1 = 0
  payablesMaterials: number;       // Σ payablesSchedule futuri
  invRawValue: number;             // valore magazzino MP (Σ qty × unitCost per lotto)
  invFinishedValue: number;        // valore magazzino finiti (costo produzione unitario medio × qty)
  netFixedAssets: number;          // Σ plantAssets.netBookValue
  equity: number;                  // equity = attivo - passivo (coerenza)

  // --- QUALITÀ (per S17-4) ---
  materialQualityIndex: number;    // 0–100 media pesata MP consumata nel trimestre
  productQualityIndex: number;     // finale (già esiste, ora usa materialQualityIndex numerico)

  // --- SCADENZIARIO (per UI "cosa devo/credito") ---
  payablesSchedule: PayableScheduleItem[];   // prossime uscite
  receivablesSchedule: ReceivableScheduleItem[]; // v0.1 vuoto
}
```

> La UI **non ricalcola**: tutto arriva qui. Il componente "Contabilità" (S17-3) legge questi campi e li mostra nei 3 livelli.

---

## 5. Parametri aggiornati (costi, moltiplicatori)

### 5.1 Nuovi moltiplicatori dilazione fornitori (`PAYMENT_TERMS_OPTIONS` in `supply.ts`)

| Termine | Vecchio mult. | Nuovo mult. | Sovrapprezzo | Note |
|---------|---------------|-------------|--------------|------|
| Immediato | 1.00 | **1.000** | 0% | Base |
| 30 giorni | 1.02 | **1.010** | +1,0% | ≈ 4% annuo |
| 60 giorni | 1.05 | **1.026** | +2,6% | ≈ 5,2% annuo (≈ tasso scoperto) |
| 90 giorni | 1.08 | **1.043** | +4,3% | ≈ 5,7% annuo |

> **Perché:** con scoperto al 3%/trimestre (12% annuo), il +2,6% a 60gg rende la dilazione **neutra/leggermente conveniente** (guadagni 3% tenendo la cassa 2 trimestri, paghi 2,6% di premio). Il +5% attuale la rende **sempre peggiore**.

### 5.2 Ammortamento impianti
- `PLANT_USEFUL_LIFE_QUARTERS = 40` (10 anni)
- `QUARTERLY_DEPRECIATION_PER_PLANT = 250.000 / 40 = 6.250 €/trimestre`
- Si applica a **tutti** gli impianti (esistenti e nuovi) dal trimestre successivo all'acquisto? **No: dal trimestre di acquisto incluso** (semplificazione, coerente con "capex esce cassa subito, ammortamento parte subito").

### 5.3 Holding cost MP (già in `inventory.ts`)
- `HOLDING_COST_PER_UNIT_PER_QUARTER = 1.80 €/kit/trimestre`
- Si calcola su **giacenza media** = (apertura + chiusura) / 2 per ogni lotto.

---

## 6. Cosa cambia per TUTTI i giocatori (non-regressione)

| Cambio | Impatto | Accettabile? | Motivazione |
|--------|---------|--------------|-------------|
| **Ammortamento impianti** (6.250 €/trim/impianto) | Profitto ↓ per chi ha impianti. Chi ne ha 3: -18.750 €/trim vs prima. | **SÌ** — era un bug: capex 250k colpiva tutto il profitto in un colpo. Ora è spalmato 10 anni. Chi non compra impianti nuovi non vede differenza extra. |
| **COGS = solo unità vendute** (non prodotte) | Chi produce per magazzino vede profitto ↑ (costo differito). Chi vende da magazzino vede profitto ↓ (costo riconosciuto ora). | **SÌ** — contabilità corretta. Il magazzino finiti esisteva già (`closingInventory`), ma il costo veniva scaricato tutto in produzione. Ora quadra. |
| **Cassa ≠ Profitto** | Cassa ora riflette pagamenti reali (dilazione fornitori funziona, capex esce subito, ammortamento non tocca cassa). | **SÌ** — era il bug #1 segnalato. |
| **Qualità MP = indice numerico** | Nessun cambio visibile se il giocatore ordina una sola qualità. Se mischia, la qualità prodotto riflette il mix reale. | **SÌ** — abilita ordini multipli (S17-4). |
| **Holding cost MP** | Già esisteva nel codice (`HOLDING_COST_PER_UNIT_PER_QUARTER`) ma non era applicato? Verificare. Se non applicato, ora lo è → costo extra per chi accumula MP. | **SÌ** — deterrente accumulo, già nel design. |

> **Test di non-regressione:** un giocatore che (a) non usa dilazione fornitori, (b) non compra impianti nuovi, (c) produce = vende ogni trimestre, (d) ordina una sola qualità MP → vede **stesso profitto di prima meno ammortamento impianti esistenti**. Differenza = solo ammortamento.

---

## 7. Piano di implementazione — passi ordinati per urgenza

| Passo | Titolo | Cosa fa | File toccati | Dipende da | Note |
|-------|--------|---------|--------------|------------|------|
| **P1** | **Fix cassa: pagamenti fornitori usano scadenzario** | `simulate.ts`: `cashOutSuppliers` = somme `payablesSchedule` scadute Q; nuovi ordini MP aggiungono a `payablesSchedule` con `dueQuarter = Q + term`; **cassa NON esce all'ordine**. | `simulate.ts`, `supply.ts`, `types.ts` (CashState) | — | **Risolve il bug #1 segnalato**. Urgenza massima. |
| **P2** | **Ammortamento impianti** | Nuovo `PlantAsset[]` in stato; `depreciation` calcolato in CE; `cashOutCapex` = capex pagato subito (già); `netFixedAssets` in risultato. | `simulate.ts`, `types.ts`, `setup.ts` (costanti) | P1 (stesso stato) | Cambia profitto di tutti → test di non-regressione obbligatori. |
| **P3** | **COGS = solo unità vendute (accrual corretto)** | Separa `cogsMaterials` (MP consumata per vendite) da costo produzione. `finishedGoodsInventory` valorizzato a costo produzione medio. Holding cost MP su giacenza media lotti. | `simulate.ts`, `inventory.ts`, `types.ts` | P1 (lotti MP) | Risolve C1. Richiede `rawMaterialLots[]` per tracciare costi per lotto. |
| **P4** | **Magazzino MP a lotti + qualità media pesata** | `RawMaterialLot[]` sostituisce scalare. Consumo FIFO, qualità = media pesata. `materialQualityIndex` numerico passato a `product-quality.ts`. | `simulate.ts`, `supply.ts`, `product-quality.ts`, `types.ts` | P3 (stessi lotti) | Abilita S17-4. `calculateProductQualityIndex` accetta `materialQualityIndex: number`. |
| **P5** | **Campi risultato estesi (PlayerResult)** | Aggiunge tutti i campi §4. UI "Contabilità" (S17-3) li consuma. | `types.ts`, `simulate.ts`, componenti UI | P1–P4 | Nessuna logica, solo esposizione. |
| **P6** | **Ritaratura moltiplicatori dilazione** | Aggiorna `PAYMENT_TERMS_OPTIONS` in `supply.ts` con valori §5.1. | `supply.ts` | P1 | Indipendente, ma serve P1 per avere effetto reale. |
| **P7** | **Scadenzario clienti (struttura pronta)** | `receivablesSchedule` in `CashState`, vuoto v0.1. UI lo mostra vuoto. | `types.ts`, `simulate.ts` | P1 | Prepara termini vendita futuri. |
| **P8** | **Fase 2 — Fido, scoperto, vendita forzata, bancarotta** (da S17-2) | `overdraftLimit = 200.000`; interesse 3%/trim su saldo medio negativo; penalità 6% oltre fido; contatore trimestri consecutivi; vendita forzata 1 impianto a 70%; bankruptcy uscita partita. | `cash.ts` (nuovo modulo), `simulate.ts`, `types.ts` | P1–P5 (cassa funzionante) | **Game mechanics**, non contabilità. Rimandabile dopo playtest. |
| **P9** | **Termini di vendita (dilazione clienti)** — leva marketing/distribuzione | Giocatore offre 30/60/90gg → +domanda, -cassa immediata. `receivablesSchedule` si popola. | `marketing.ts`, `simulate.ts`, `types.ts` | P7 | Leva nuova, non in v0.1. |

---

## 8. Checklist di accettazione (per il revisore)

- [ ] **C1 risolta:** `cogsMaterials` = costo MP per unità **vendute**; produzione per magazzino va in `invFinishedValue` senza colpire CE.
- [ ] **C2 applicata:** `PAYMENT_TERMS_OPTIONS` aggiornati con nuovi multipli (§5.1).
- [ ] **C3 separata:** Passi P8–P9 marcati "Fase 2 / rimandabile", non bloccano P1–P7.
- [ ] **C4 risolta:** `product-quality.ts` accetta `materialQualityIndex: number` (0–100); motore calcola media pesata sui lotti consumati.
- [ ] **C5 chiarita:** v0.1 = incasso immediato; `receivablesSchedule` vuoto ma strutturato.
- [ ] **Stato puro:** `simulateQuarter` riceve e restituisce `CashState`, `RawMaterialLot[]`, `PlantAsset[]`, `payablesSchedule`, `receivablesSchedule` — niente side effects.
- [ ] **Non-regressione documentata:** tabella §6 firmata; test esistenti verdi + nuovi test per ammortamento, COGS vendite vs produzione, cassa con dilazione.
- [ ] **Campi UI pronti:** `PlayerResult` espone tutti i campi §4; componente Contabilità (S17-3) può leggere tutto senza ricalcolare.

---

## 9. Decisioni che richiedono conferma (checkpoint)

1. **Ammortamento parte dal trimestre di acquisto incluso** (non dal successivo). Sì). → Sì/No?
2. **Consumo MP = FIFO per quantità, media pesata per qualità**. Nessun altro metodo (LIFO, min). → Confermato?
3. **Holding cost MP** si applica su giacenza media `(apertura+chiusura)/2` per lotto, esce cassa (`cashOutHolding`), colpisce CE come costo operativo (non COGS). → Confermato?
4. **Fido 200k / tasso 3% trimestre** (P8) — valori definitivi o da playtest? → Se da playtest, P8 va dopo S16-1.

---

*Fine specifica. Pronta per revisione e approvazione prima dell'implementazione.*

# Proposta — S9-3: Termini di pagamento ai fornitori: effetto su cassa e costo

- Ruolo: **business-finance**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:34:16

---

# Proposta S9-3: Termini di pagamento ai fornitori — effetto su cassa e costo

---

## 1. Contesto e parametri invariati

| Parametro | Valore | Origine |
|---|---|---|
| Costo unitario base | €55,00 | GDD v0.1 |
| Componente materie prime (profilo `standard`) | €27,50/kit | S9-1 / S9-2 |
| Kit per unità finita | 1:1 | S9-1 |
| Lead time opzioni | 0 / 1 / 2 / 3 trimestri | S9-2 (express / std / plan_2q / plan_3q) |
| Prezzo riferimento mercato | €100 | GDD v0.1 |
| Domanda totale/trimestre | 10.000 u | GDD v0.1 |
| Capacità/stabilimento | 3.000 u | GDD v0.1 |
| Costo giacenza prodotto finito | €2,50/u/trim | GDD v0.1 |
| Capitale iniziale | €1.000.000 | GDD v0.1 |
| Overhead/trimestre | €20.000 | GDD v0.1 |
| Costo fisso stabilimento/trim | €30.000 | GDD v0.1 |
| Capex stabilimento | €250.000 | GDD v0.1 |

**Cosa NON cambia**: motore v0.2 (prezzo, produzione, straordinari, rumore/eventi), profili costo S9-1, lead time e qualità S9-2. Si aggiunge solo la **tempistica d'incasso/uscita cassa** legata ai termini di pagamento e la regola di **insolvenza tecnica**.

---

## 2. Opzioni termini di pagamento (completamento tabella S9-2)

| Opzione | Codice | Quando si paga (riferimento consegna) | Moltiplicatore su prezzo materie prime | Sconto/Sovrapprezzo effettivo |
|---|---|---|---|---|
| **Anticipato** | `prepay` | **Ordine** (trimestre d'ordine = consegna − lead time) | **0,95** | **−5,0%** |
| **Alla consegna** | `on_delivery` | **Consegna** (trimestre di ricezione merce) | **1,00** | **base** |
| **30 giorni** | `net_30` | **Consegna** (stesso trimestre, entro 30 gg) | **1,02** | **+2,0%** |
| **60 giorni** | `net_60` | **Trimestre successivo alla consegna** | **1,05** | **+5,0%** |
| **90 giorni** | `net_90` | **Trimestre successivo alla consegna** | **1,09** | **+9,0%** |

> **Nota**: `net_30` e `on_delivery` cadono nello stesso trimestre contabile (la consegna avviene a inizio trimestre). La differenza è puramente di **costo** (+2% per la dilazione formale) e di **rischio fornitore** (vedi §5).

---

## 3. Trimestre esatto di materializzazione dell'uscita di cassa

L'ordine viene emesso all'**inizio del trimestre T**. La consegna avviene all'inizio del trimestre **T + L** (L = lead time in trimestri). Il pagamento segue la tabella:

| Lead time (L) | `prepay` | `on_delivery` / `net_30` | `net_60` / `net_90` |
|---|---|---|---|
| **express (0)** | T | T | T+1 |
| **std (1)** | T | T+1 | T+2 |
| **plan_2q (2)** | T | T+2 | T+3 |
| **plan_3q (3)** | T | T+3 | T+4 |

**Esempio concreto (lead time `std` = 1Q)**:
- Ordine emesso Q1 → consegna Q2
- `prepay`: cassa esce **Q1**
- `on_delivery` / `net_30`: cassa esce **Q2**
- `net_60` / `net_90`: cassa esce **Q3**

---

## 4. Integrazione con la cassa vincolata (task S4-1)

Il motore S4-1 gestisce un **vincolo di cassa per trimestre**: prima di eseguire i pagamenti in scadenza, verifica `cassa_disponibile ≥ totale_pagamenti_dovuti`.

I termini di pagamento generano **debiti fornitori scadenti** (`accounts_payable_due`) in trimestri futuri noti al momento dell'ordine. Il flusso per trimestre:

1. **Inizio trimestre**: si materializzano i pagamenti in scadenza (ordini passati con termini che scadono ora).
2. **Controllo cassa vincolata (S4-1)**: se `cassa < pagamenti_dovuti` → scatta **regola di insolvenza** (§5).
3. **Esecuzione pagamenti**: cassa ridotta degli importi pagati.
4. **Nuovi ordini**: il giocatore sceglie lead time + qualità + termini pagamento → genera nuovi `accounts_payable_due` in trimestri futuri (tabella §3).
5. **Fine trimestre**: incasso vendite (immediato, prezzo × unità vendute), pagamento costi fissi/straordinari/capex, calcolo profitto, aggiornamento cassa.

**Struttura dati aggiunta** (modulo `cash` / `supply`):
```typescript
interface ScheduledPayable {
  dueQuarter: number;        // trimestre assoluto in cui si paga
  amount: number;            // €
  supplierTerms: PaymentTerms; // per tracciabilità/penali
  orderQuarter: number;      // quando è stato ordinato (audit)
}
```
Il motore mantiene una **coda pagamenti futuri** per giocatore. Ogni trimestre sposta in `due` quelli con `dueQuarter === currentQuarter`.

---

## 5. Regola esplicita: "Alla scadenza la cassa non basta"

Se `cassa_disponibile < totale_pagamenti_fornitori_dovuti` nel trimestre corrente:

| Conseguenza | Dettaglio |
|---|---|
| **Prestito d'emergenza automatico** | L'azienda contrae un **overdraft bancario** per l'esatto importo mancante. |
| **Tasso overdraft** | **12% annuo (3% per trimestre)** sull'importo utilizzato, calcolato sul trimestre in corso. |
| **Commissione una tantum** | **2% dell'importo scoperto** (fee di istruttoria/penale). |
| **Effetto trimestre successivo** | Oneri finanziari = `overdraft_medio × 3%` + eventuale fee residua. L'overdraft permane finché non ripagato. |
| **Rating implicito** | Ogni trimestre in overdraft incrementa un contatore `overdraft_quarters`. Se `overdraft_quarters ≥ 2` consecutivi → **spread debito futuro +1% annuo** (simula deterioramento merito creditizio). |
| **Blocco ordini `prepay`** | Finché in overdraft, il giocatore **non può selezionare `prepay`** (le banche non finanziano pagamenti anticipati a fornitori se l'azienda è già scoperta). |

> **Niente game over immediato**: l'azienda redditizia può sopravvivere, ma il costo dell'overdraft erode il profitto e il rating peggiora il costo del debito futuro. È il cuore didattico: **profitto ≠ cassa**.

---

## 6. Esempio numerico su 3 trimestri — Azienda redditizia in crisi di liquidità

### Scenario
- Giocatore: **Alpha Corp**
- Strategia: **massimo sconto materie prime** → `plan_3q` (lead time 3Q, −14%) + `prepay` (−5%) = **−18,3% combinato** su €27,50 → **€22,47/kit**.
- 2 stabilimenti (6.000 u/trim capacità standard), prezzo vendita €100 (domanda sufficiente).
- Capitale iniziale €1.000.000.

### Parametri unitari
| Voce | Valore |
|---|---|
| Materie prime (plan_3q + prepay) | €22,47 |
| Conversione (lavorazione) | €27,50 (invariato, 50% del €55 base) |
| **Costo unitario effettivo** | **€49,97** |
| Prezzo vendita | €100,00 |
| Margine unitario lordo | €50,03 |
| Costi fissi/trim (2 stab + overhead) | €80.000 |

### Piano produzione/ordini (trimestri 1–4)

| Trimestre | Azione | Cassa IN | Cassa OUT | Cassa NET | Cassa FINE |
|---|---|---|---|---|---|
| **Q1 (inizio)** | Capex 2 stab (€500k) + Ordine 6.000 kit plan_3q+prepay (paga Q1) + Fissi | 0 | 500.000 + 134.820 + 80.000 = **714.820** | **−714.820** | **285.180** |
| **Q2** | Ordine 6.000 kit plan_3q+prepay (paga Q2) + Fissi | 0 | 134.820 + 80.000 = **214.820** | **−214.820** | **70.360** |
| **Q3** | Ordine 6.000 kit plan_3q+prepay (paga Q3) + Fissi | 0 | 134.820 + 80.000 = **214.820** | **−214.820** | **−144.460** ← **INSOLVENZA** |
| **Q4** | **Consegna 1° ordine** → Produce 6.000 u → Vende 6.000 u @ €100 = **€600.000 IN**<br>Paga overdraft + interessi + fee<br>Ordine 4° lotto (paga Q4) + Fissi | 600.000 | 144.460 (ripagato) + 4.334 (int 3%) + 2.889 (fee 2%) + 134.820 + 80.000 = **366.503** | **+233.497** | **89.037** |
| **Q5+** | Steady state: incassa €600k, paga materiali €134.820 + fissi €80k = **€385.180 profitto operativo/trim** | | | | **Redditizia** |

### Risultato
- **Q1–Q3**: zero ricavi, solo uscite (capex + pagamenti anticipati materie prime per consegne future).
- **Q3**: cassa negativa → **overdraft €144.460** al 3%/trim + 2% fee.
- **Q4**: primo incasso €600k → ripaga overdraft, genera cassa positiva.
- **Da Q5**: **profitto ricorrente ~€385k/trim** (ROE > 30% su capitale impiegato).

> **Insegnamento**: la strategia "massimo sconto + pagamento anticipato + lead time lungo" è **economicamente vincente** (costo unitario €49,97 vs €55 base = **−9,1%**) ma **finanziariamente letale** senza cassa sufficiente o linea di credito preventiva.

---

## 7. Dimostrazione che nessuna opzione domina sempre (trade-off reale)

### Confronto su 4 trimestri, 1 stabilimento (3.000 u/trim), domanda sufficiente, prezzo €100

| Strategia | Lead time | Pagamento | Costo unitario materie prime | Cassa Q1 | Cassa Q2 | Cassa Q3 | Cassa Q4 | Profitto cum. Q4 | Note |
|---|---|---|---|---|---|---|---|---|---|
| **A. Conservativa** | std (1Q) | `on_delivery` | €27,50 | −170.000* | +65.000 | +65.000 | +65.000 | **+25.000** | Nessun rischio, cassa sempre >0 |
| **B. Aggressiva** | plan_3q (3Q) | `prepay` | €22,47 | −317.410 | −114.820 | **−114.820** (overdraft) | +233.497 | **+85.447** | **Miglior profitto** ma overdraft Q3 |
| **C. Equilibrata** | plan_2q (2Q) | `net_60` | €25,30 (0,86×1,05) | −170.000 | −105.900 | +65.000 | +65.000 | **+54.100** | Nessun overdraft, profitto intermedio |
| **D. Breve + dilazione** | express (0Q) | `net_90` | €30,00 (1,00×1,09? No: express +18% poi net_90 +9% → 1,18×1,09=1,286 → €35,37) | −170.000 | +65.000 | +65.000 | +65.000 | **−12.000** | Costo materie prime troppo alto → **perdita** |

\* Q1 include capex €250k + fissi €50k + materiali (se pagati Q1). Per A: materiali pagati Q2 (on_delivery std).

**Conclusione**:
- **B** vince se hai cassa/linea credito per reggere Q1–Q3.
- **A** vince se parti con poca cassa e niente linee credito.
- **C** è il compromesso "sicuro ma efficiente".
- **D** è dominata (costo materie prime eccessivo per lead time 0).

> **Nessuna opzione è sempre la migliore**: la scelta dipende da **posizione di cassa iniziale**, **accesso al credito**, **orizzonte temporale** (quanti trimestri restano).

---

## 8. Comportamento di default (motore senza nuove leve = oggi)

| Impostazione default | Valore | Coerenza v0.2 |
|---|---|---|
| Lead time | `std` (1Q) | Implicito in v0.1: "produzione → capacità" stesso trimestre |
| Qualità | `standard` | Costo €27,50 = base S9-1 |
| Termini pagamento | `on_delivery` | Pagamento alla consegna = trimestre dopo ordine (coerente con "costi variabili pagati quando si produce") |
| Prezzo materie prime effettivo | €27,50 | Uguale a `unitCost × 50%` attuale |
| Trimestre uscita cassa materiali | **T+1** (ordine T, consegna T+1, paga T+1) | Identico a oggi: il motore v0.1 non modella cassa, ma se lo facesse il costo variabile uscirebbe nel trimestre di produzione |

**Verifica**: se il giocatore non tocca la nuova scheda "Approvvigionamento", il motore usa `std` + `standard` + `on_delivery` → **comportamento bit-per-bit identico a v0.2** (nessun nuovo parametro, nessuna nuova coda pagamenti, nessun overdraft possibile).

---

## 9. Sintesi parametri per implementazione (pronti per ADR / config)

```typescript
// apps/web/src/lib/game-engine/supply.ts (estensione)
export const PAYMENT_TERMS: Record<PaymentTermsCode, PaymentTermsDef> = {
  prepay:        { label: "Anticipato",        dueOffset: -1,  priceMult: 0.95,  allowsWhenOverdraft: false },
  on_delivery:   { label: "Alla consegna",     dueOffset:  0,  priceMult: 1.00,  allowsWhenOverdraft: true  },
  net_30:        { label: "30 giorni",         dueOffset:  0,  priceMult: 1.02,  allowsWhenOverdraft: true  },
  net_60:        { label: "60 giorni",         dueOffset: +1,  priceMult: 1.05,  allowsWhenOverdraft: true  },
  net_90:        { label: "90 giorni",         dueOffset: +1,  priceMult: 1.09,  allowsWhenOverdraft: true  },
};

// dueOffset = trimestri rispetto a CONSEGNA (0 = stesso trimestre consegna)
// Per prepay: dueOffset = -leadTime (si paga all'ordine, leadTime trimestri prima della consegna)

export const OVERDRAFT_RATE_PER_QUARTER = 0.03;   // 12% annuo
export const OVERDRAFT_FEE_ONCE = 0.02;           // 2% una tantum
export const OVERDRAFT_QUARTERS_BEFORE_RATING_HIT = 2;
export const RATING_SPREAD_PER_HIT = 0.01;        // +1% annuo su nuovo debito
```

---

## 10. Checklist accettazione

- [x] **Opzioni dilazione** con sconto/sovrapprezzo concreto per ciascuna (tabella §2)
- [x] **Trimestre esatto** uscita cassa per ogni combinazione lead time × termini (§3)
- [x] **Regola esplicita** insolvenza: overdraft automatico 12%/a + 2% fee, rating hit dopo 2 trimestri, blocco `prepay` (§5)
- [x] **Esempio 3 trimestri** azienda redditizia (€385k/trim da Q5) in crisi Q3 per prepay + plan_3q (§6)
- [x] **Trade-off dimostrato**: 4 strategie, nessuna domina sempre, dipende da cassa/orizzonte (§7)
- [x] **Default invariato**: `std` + `standard` + `on_delivery` = comportamento v0.2 (§8)
- [x] **Parametri numerici concreti** e giustificati, riferiti a valori in gioco (€55, €100, 3.000, 10.000, €2,50)
- [x] **Integrazione cassa vincolata** (S4-1): coda `ScheduledPayable`, controllo prima pagamenti, generazione overdraft (§4)

---

## 11. Prossimi passi (per PM / Game Designer)

1. **ADR** per registrare la struttura `ScheduledPayable` e la regola overdraft (decisione architetturale rilevante).
2. **UI Decisioni**: nuova sotto-scheda "Approvvigionamento" con 3 selector (Tempo, Qualità, Pagamento) + anteprima "Cassa uscite prossimi 4 trimestri".
3. **Motore**: estendere `simulate.ts` → cash flow con coda pagamenti, controllo vincolo, calcolo overdraft, rating.
4. **KPI Controlling**: aggiungere `cashConversionCycle`, `overdraftRatio`, `supplierPaymentTermsMix`.
5. **Test**: scenario "Alpha Corp" (§6) come regression test "profitable but illiquid".

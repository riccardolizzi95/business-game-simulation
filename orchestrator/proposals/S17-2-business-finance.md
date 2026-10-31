# Proposta — S17-2: Il flusso di cassa e lo scadenzario: cosa esce e quando

- Ruolo: **business-finance**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 18:34:45

---

# Proposta: Flusso di Cassa e Scadenzario (S17-2)

---

## 1. Scadenzario completo — Uscite ed Entrate per decisione

| Decisione | Trimestre uscita cassa | Note |
|-----------|------------------------|------|
| **Materie prime — pagamento immediato** | Q (corrente) | Prezzo base (es. 95.000 €) |
| **Materie prime — a 30 giorni** | Q+1 | Sovrapprezzo implicito ≈ 1% trimestrale (es. 96.000 €) |
| **Materie prime — a 60 giorni** | Q+2 | Sovrapprezzo implicito ≈ 1,3% trimestrale (es. 97.500 €) |
| **Materie prime — a 90 giorni** | Q+3 | Sovrapprezzo implicito ≈ 1,7% trimestrale (es. 99.500 €) |
| **Personale (stipendi, straordinari, assunzioni/licenziamenti)** | Q | Pagato nel trimestre in cui matura |
| **Marketing** | Q | Cassa esce quando si delibera la campagna |
| **Costi fissi (overhead, manutenzione impianti)** | Q | Rateati per trimestre |
| **Acquisto stabilimento (capex 250.000 €)** | Q (cassa) / Q…Q+N (ammortamento) | **Cassa esce subito**; in conto economico va l'ammortamento (es. 10 anni = 6.250 €/trimestre). Niente impatto pieno sul profitto. |
| **Investimenti qualità / R&D** | Q | Trattati come costo d'esercizio (o capex se capitalizzati: stessa regola impianti) |
| **Interessi su scoperto / debito bancario** | Q | Calcolati sul saldo medio negativo del trimestre |
| **Rimborso capitale debito (se previsto)** | Q | Quota capitale del piano di ammortamento |

| Entrate | Trimestre incasso | Note |
|---------|-------------------|------|
| **Vendite (ricavi)** | Q (incasso immediato) | **Base v0.1**: i clienti pagano alla consegna. |
| **Vendite a termini (nuova leva opzionale)** | Q+1 / Q+2 / Q+3 | Se il giocatore *offre* dilazione ai clienti: +domanda, -cassa immediata. Va progettata come leva distinta (marketing/distribuzione), non di default. |

> **Regola d'oro**: ogni voce ha **una sola riga nello scadenzario**. Niente "costo in profitto + cassa separata". Il motore calcola **due flussi distinti**: Conto Economico (competenza) e Cassa (cassa).

---

## 2. Regole dello scoperto (overdraft)

| Parametro | Valore proposto | Rationale |
|-----------|-----------------|-----------|
| **Fido massimo (credit limit)** | 20% del **capitale iniziale** = 200.000 € (o 15% dell'attivo totale se >) | Semplice, scalabile, comprensibile. |
| **Tasso base su scoperto** | 12% annuo → **3% per trimestre** sul saldo medio negativo | Coerente con costo del debito "reale". |
| **Tasso di penalità (oltre fido)** | 24% annuo → **6% per trimestre** | Doppio, segnale forte ma non letale. |
| **Conseguenze progressive** | | |
| 1° trimestre oltre fido | Avviso + tasso penalità | "La banca vi chiama". |
| 2° trimestre consecutivo oltre fido | **Vendita forzata** 1 impianto al 70% del valore (175.000 € incasso) + blocco nuovi investimenti | Recupero liquidità, conseguenza tangibile. |
| 3° trimestre consecutivo oltre fido | **Bankruptcy** → giocatore esce dalla partita (punteggio congelato) | Game over chiaro, non "punizione oscura". |

> **Saldo medio negativo** = media dei saldi di cassa giornalieri (approssimato: `(cassa_inizio + cassa_fine) / 2` se entrambi negativi, altrimenti area sotto zero). Implementazione semplice, niente daily simulation.

---

## 3. Vantaggio REALE della dilazione fornitori (30/60/90 giorni)

Oggi: **paghi 105.000 € a 60 gg vs 95.000 € immediato, ma cassa esce subito** → irrazionale.

**Nuova meccanica**: il sovrapprezzo è il **costo implicito del finanziamento fornitore**. Conviene se **costo fornitore < costo banca**.

| Termine | Prezzo materie prime | Costo implicito annuo | Quando conviene vs scoperto 12% |
|---------|---------------------|----------------------|--------------------------------|
| Immediato | 95.000 € | — | Base |
| 30 gg | 96.000 € | ~4,2% | Sempre (4,2% < 12%) |
| 60 gg | 97.500 € | ~5,3% | Sempre (5,3% < 12%) |
| 90 gg | 99.500 € | ~6,3% | Sempre (6,3% < 12%) |

**Esempio numerico (ordine 95.000 € base):**
- **Immediato**: cassa -95.000 € in Q, nessun interesse.
- **A 60 gg**: cassa -97.500 € in **Q+2**. Nel frattempo hai 95.000 € liberi per 2 trimestri.
  - Se li usi per evitare scoperto al 12%: risparmi `95.000 × 3% × 2 = 5.700 €` di interessi bancari.
  - Costo fornitore = 2.500 €. **Guadagno netto = 3.200 €**.
  - Se non serve liquidità (cassa abbondante), **non conviene** → il giocatore sceglie in base alla propria posizione.

**Regola**: il motore **non addebita la cassa in Q** per ordini dilazionati; registra `accountsPayableDue[Q+n] += importo`. Il giocatore vede l'impegno futuro nel prospetto cassa.

---

## 4. Cosa deve vedere il giocatore PRIMA di chiudere il trimestre

**Schermata "Anteprima Cassa" (obbligatoria prima del confirm)** — 3 sezioni:

### A. Prospetto flussi cassa — Prossimi 4 trimestri (Q, Q+1, Q+2, Q+3)
| Riga | Q (corrente) | Q+1 | Q+2 | Q+3 |
|------|--------------|-----|-----|-----|
| Cassa inizio | 827.800 | 712.000 | 645.000 | 580.000 |
| **Entrate operative** (incasso vendite) | +1.200.000 | +1.150.000 | +1.100.000 | +1.050.000 |
| **Uscite operative** | | | | |
|  Materie prime (già impegnate) | -95.000 | -97.500 | -99.500 | - |
|  Personale | -180.000 | -180.000 | -185.000 | -185.000 |
|  Marketing | -50.000 | -50.000 | -50.000 | -50.000 |
|  Costi fissi / overhead | -50.000 | -50.000 | -50.000 | -50.000 |
|  Interessi scoperto (stima) | -2.800 | -3.000 | -1.500 | -0 |
| **Flusso operativo netto** | +822.200 | +769.500 | +714.000 | +765.000 |
| **Investimenti (capex)** | -250.000 | - | - | - |
| **Finanziamento** (nuovo debito / rimborso) | +0 | +0 | +0 | +0 |
| **Cassa fine (saldo cassa fine** | **712.000** | **645.000** | **580.000** | **515.000** |
| **Scoperto usato / Fido** | 0 / 200.000 | 0 / 200.000 | 0 / 200.000 | 0 / 200.000 |

> **Colori**: cassa fine < 0 → **rosso**; 0–50.000 → **arancio**; > 50.000 → **verde**. Scoperto > 80% fido → badge "⚠️ Vicino al limite".

### B. Alert automatici (bloccanti o warning)
| Condizione | Tipo | Messaggio |
|------------|------|-----------|
| Cassa fine Q < 0 | **Bloccante** | "Chiuderesti il trimestre con cassa negativa (-12.000 €). Rivedi ordini o chiedi fido." |
| Cassa fine Q < 50.000 € | Warning | "Margine di sicurezza basso. Un imprevisto ti porterebbe in scoperto." |
| Scoperto proiettato > fido in Q+1 | Warning | "Nel prossimo trimestre supereresti il fido (220.000 € / 200.000 €)." |
| Impegni fornitori (Q+1..Q+3) > cassa proiettata + fido | Warning | "Hai 340.000 € di pagamenti fornitori in arrivo, ma solo 250.000 € di cassa+fido disponibili." |

### C. Riepilogo "Una riga per decisione" (impatto cassa immediato vs differito)
| Tua scelta | Cassa Q | Cassa Q+1 | Cassa Q+2 | Note |
|------------|---------|-----------|-----------|------|
| Materie prime: 60 gg | 0 | 0 | -97.500 | +2.500 € vs immediato, ma cassa libera 2 trimestri |
| Nuovo impianto | -250.000 | 0 | 0 | Ammortamento 6.250 €/trim in conto economico |
| Campagna marketing | -50.000 | 0 | 0 | Effetto domanda da Q+1 |

---

## 5. Cambiamenti al motore (solo per allineamento — non codice)

1. **`simulate.ts`**: separa `cashFlow` da `profit`. Input: `previousCash`, `decisions`, `payablesSchedule[]`. Output: `newCash`, `payablesScheduleNext`, `interestExpense`, `overdraftUsed`, `bankruptcyFlag`.
2. **`supply.ts`**: `accountsPayableDue` già esiste → **usarlo**. Non sommare costo acquisto ai costi trimestre; registrare scadenza.
3. **`types.ts`**: aggiungere `PlayerResult.cashFlowStatement` (array 4 trimestri), `payablesSchedule`, `overdraftLimit`, `overdraftRate`, `penaltyRate`.
4. **Capex**: `plantCapex` esce da cassa in Q; in `profit` va solo `depreciationPerQuarter = plantCapex / usefulLifeQuarters` (default 40 trimestri = 10 anni).
5. **Incasso vendite**: base = immediato (Q). Leva futura "termini clienti" → nuovo campo `decision.customerPaymentTerms` che sposta incasso e modifica domanda (elasticità positiva).

---

## 6. Numeri di riferimento per bilanciamento (da validare in playtest)

| Parametro | Valore |
|-----------|--------|
| Capitale iniziale | 1.000.000 € |
| Fido base | 200.000 € (20%) |
| Tasso scoperto | 3% / trimestre (12% annuo) |
| Tasso penalità | 6% / trimestre (24% annuo) |
| Vita utile impianto | 40 trimestri (10 anni) → ammortamento 6.250 €/trim |
| Sovrapprezzo fornitore 30/60/90 gg | +1.000 / +2.500 / +4.500 € su base 95.000 € |
| Costo implicito annuo fornitore | 4,2% / 5,3% / 6,3% |

---

## 7. Checklist accettazione (per QA / PM)

- [ ] Scadenzario uscite/entrate coperto per **tutte** le leve attive (materiali, personale, marketing, capex, interessi, rimborso debito).
- [ ] Regole scoperto: limite, tasso base, tasso penalità, 3 step conseguenze (avviso → vendita forzata → bankruptcy).
- [ ] Dilazione fornitori: vantaggio quantificato (costo implicito < tasso banca → convenienza se serve liquidità).
- [ ] Anteprima cassa: 4 trimestri, alert bloccanti/warning, riga per decisione.
- [ ] Capex: cassa out Q, ammortamento in profit (non capex pieno).
- [ ] Incasso vendite: immediato di default; termini clienti = leva futura esplicita.

---

**Prossimo passo**: il Game Designer trasforma questo in specifiche UI/UX (wireframe anteprima cassa) e l'Architect valuta impatto su `simulate.ts` + `types.ts` (ADR se serve).

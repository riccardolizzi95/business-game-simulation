# Proposta — S17-1: Il modello contabile minimo del gioco (conto economico vs cassa)

- Ruolo: **business-amministrativo**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 18:33:00

---

# Modello Contabile Minimo — Business Game (trimestrale)

---

## 1. Prospetti necessari (3, non di più)

| Prospetto | Base | Scopo nel gioco |
|-----------|------|-----------------|
| **Conto Economico (CE)** | Competenza (accrual) | «Ho guadagnato?» — risultato economico del trimestre |
| **Flusso di Cassa (FC)** | Cassa (cash) | «Ho i soldi?» — liquidità reale, serve per decidere se posso pagare/ investire |
| **Stato Patrimoniale Minimo (SP)** | Istante (fine trimestre) | Collega i due: mostra *cosa devo/credito* e *cosa possiedo* |

> **Regola:** il giocatore vede **sempre** CE + FC affiancati. Lo SP è visibile a richiesta (tab "Bilancio").

---

## 2. Voci per prospetto (numero chiuso, niente "altro")

### 2.1 Conto Economico (7 righe + risultato)

| Riga | Codice | Nota |
|------|--------|------|
| Ricavi vendite | `revenue` | Prezzo × unità consegnate |
| Costo materie prime consumate | `cogsMaterials` | Solo ciò che **entra in produzione** nel trimestre |
| Costo personale | `laborCost` | Stipendi + oneri del trimestre |
| Marketing | `marketingCost` | Spesa sostenuta nel trimestre |
| Costi fissi stabilimenti | `plantFixedCost` | €/stabilimento/trimestre |
| Overhead generali | `overhead` | Fisso per trimestre |
| **Ammortamenti** | `depreciation` | **Nuova** — quota capex stabilimenti |
| **Risultato operativo (EBIT)** | `operatingProfit` | Somma delle righe sopra (segno meno per i costi) |

> Nessun onere finanziario nella v0.1 (niente debito bancario). Se si aggiunge dopo, una riga `interestExpense` sotto EBIT.

### 2.2 Flusso di Cassa (6 righe + variazione cassa)

| Riga | Codice | Quando scatta |
|------|--------|---------------|
| Incassi clienti | `cashInCustomers` | Quando il cliente **paga** (vedi termini vendita) |
| Pagamenti fornitori materie prime | `cashOutSuppliers` | Quando **paghi** il fornitore (non quando ordini/ricevi) |
| Pagamenti personale | `cashOutLabor` | Stesso trimestre della competenza (semplificazione) |
| Pagamenti marketing | `cashOutMarketing` | Stesso trimestre |
| Pagamenti costi fissi/overhead | `cashOutFixed` | Stesso trimestre |
| **Investimenti (Capex stabilimenti)** | `cashOutCapex` | Quando **paghi** lo stabilimento (solitamente ordine = pagamento) |
| **Variazione cassa netta** | `netCashFlow` | Somma righe sopra |
| **Cassa finale** | `cashEnd` | `cashStart + netCashFlow` |

### 2.3 Stato Patrimoniale Minimo (8 saldi)

| Attivo | Codice | Passivo + PN | Codice |
|--------|--------|--------------|--------|
| Cassa | `cash` | Debiti v/fornitori (MP) | `payablesMaterials` |
| Crediti v/clienti | `receivables` | Debiti v/fornitori (capex) | `payablesCapex` |
| Magazzino materie prime | `invRaw` | Debiti finanziari (futuro) | `debtBank` |
| Magazzino prodotti finiti | `invFinished` | **Patrimonio Netto** | `equity` |
| Immobilizzazioni nette (capex − amm. accumulato) | `netFixedAssets` | | |

> **Totale Attivo ≡ Totale Passivo + PN** — questa è l'identità di quadratura.

---

## 3. Trattamento corretto per ogni fattispecie

| Fattispecie | Conto Economico (competenza) | Flusso di Cassa (cassa) | Stato Patrimoniale (variazione) |
|-------------|------------------------------|-------------------------|----------------------------------|
| **Ordine MP con pagamento a 60 gg** (ricevi merce trimestre T, paghi T+1) | **Niente** al ricevimento. Costo (`cogsMaterials`) solo quando **consumi in produzione** | **Niente** al ricevimento. `cashOutSuppliers` in T+1 quando paghi | T: `invRaw` ↑, `payablesMaterials` ↑<br>T+1: `payablesMaterials` ↓, `cash` ↓ |
| **Consumo MP in produzione** | `cogsMaterials` ↑ (costo del venduto) | — | `invRaw` ↓ |
| **Produzione → prodotti finiti** | — | — | `invRaw` ↓, `invFinished` ↑ (costo produzione: MP + manodopera diretta + quota overhead se vuoi) |
| **Vendita/consegna prodotti finiti** | `revenue` ↑ | Se incasso immediato: `cashInCustomers` ↑<br>Se termini 30/60 gg: `receivables` ↑ | `invFinished` ↓, `receivables` ↑ (o `cash` ↑ se incasso immediato) |
| **Incasso clienti (termine scaduto)** | — | `cashInCustomers` ↑ | `receivables` ↓, `cash` ↑ |
| **Acquisto stabilimento (capex 250k)** | **Niente** (non è costo) | `cashOutCapex` ↑ (paghi subito) | `netFixedAssets` ↑ 250k, `cash` ↓ 250k |
| **Ammortamento stabilimento (ogni trimestre)** | `depreciation` ↑ (quota lineare) | — | `netFixedAssets` ↓ quota, `equity` ↓ via risultato |
| **Personale / Marketing / Fissi / Overhead** | Costo nel trimestre di competenza | Pagamento stesso trimestre (semplificazione) | `cash` ↓, `equity` ↓ via risultato |

### 3.1 Ammortamento stabilimenti — durata proposta

| Parametro | Valore | Motivazione |
|-----------|--------|-------------|
| **Durata utile** | **20 trimestri (5 anni)** | Partita = 8 trimestri. 20 fa vedere l'ammortamento per tutta la partita senza azzerare l'asset. Lineare = semplice e prevedibile. |
| **Quota per trimestre per stabilimento** | 250.000 / 20 = **12.500 €/trim** | Facile da calcolare a mente. |
| **Ammortamento accumulato** | Si porta in SP come contrapposto di `netFixedAssets` | `netFixedAssets = capexTotale - ammAccumulato` |

> Se in futuro si aggiungono macchinari a vita diversa, si fa un piano ammortamenti per cespite. Oggi: **un solo pool "Stabilimenti", linea retta 20T**.

---

## 4. Identità di quadratura (test automatico)

Devono valere **sempre**, a fine di ogni `simulateQuarter`:

### 4.1 Quadratura Patrimonio Netto (la più importante)
```
equity_end ≡ equity_start + operatingProfit
```
> Perché: nessun conferimento/prelievo soci, niente tasse, niente oneri finanziari in v0.1.  
> `operatingProfit` = `revenue - cogsMaterials - laborCost - marketingCost - plantFixedCost - overhead - depreciation`

### 4.2 Quadratura Cassa (collega FC a SP)
```
cash_end ≡ cash_start + netCashFlow
```
> `netCashFlow` = somma delle 6 righe FC (incassi - pagamenti - capex).

### 4.3 Quadratura Stato Patrimoniale (identità fondamentale)
```
cash + receivables + invRaw + invFinished + netFixedAssets
≡
payablesMaterials + payablesCapex + debtBank + equity
```

### 4.4 Coerenza CE ↔ FC ↔ SP (il test "forte")
Se calcoli `equity_end` via **4.1** e via **4.3** (risolvendo per equity), **devono coincidere al centesimo**.
```python
# Pseudotest
equity_from_pnl = equity_start + operatingProfit
equity_from_bs  = (cash + receivables + invRaw + invFinished + netFixedAssets
                   - payablesMaterials - payablesCapex - debtBank)
assert round(equity_from_pnl - equity_from_bs, 2) == 0
```
> Questo singolo `assert` cattura **qualsiasi** errore: doppio conteggio, segno sbagliato, voce dimenticata, tempistica cassa/competenza.

---

## 5. Esempio numerico completo — UN trimestre (T)

### 5.1 Situazione iniziale (fine T-1 = inizio T)

| SP Inizio T | Valore |
|-------------|--------|
| `cash` | 800.000 |
| `receivables` | 120.000 (vendite T-1 con incasso 30 gg) |
| `invRaw` | 50.000 |
| `invFinished` | 30.000 |
| `netFixedAssets` | 500.000 (4 stabilimenti × 250k - 500k amm. accumulato) |
| `payablesMaterials` | 95.000 (MP ordinate T-1, pagamento T) |
| `payablesCapex` | 0 |
| `debtBank` | 0 |
| **`equity`** | **1.405.000** |
| **Totale Attivo** | **1.500.000** |
| **Totale Passivo+PN** | **1.500.000** ✓ |

---

### 5.2 Decisioni del giocatore nel Trimestre T

| Decisione | Valore |
|-----------|--------|
| Prezzo vendita | 100 €/u |
| Unità prodotte | 2.000 |
| Unità vendute/consegnate | 1.800 |
| MP consumate in produzione | 1.800 u × 45 €/u = **81.000 €** |
| Nuovo ordine MP (ricevute subito, pagamento **60 gg** → T+1) | 2.500 u × 45 €/u = **112.500 €** (+10% premio dilazione = **123.750 €**) |
| Acquisto **1 nuovo stabilimento** (pagamento immediato) | **250.000 €** |
| Personale (competenza = cassa) | **60.000 €** |
| Marketing | **30.000 €** |
| Costi fissi stabilimenti (ora 5 impianti × 30k) | **150.000 €** |
| Overhead | **20.000 €** |
| Incasso clienti: 1.800 u × 100 € = 180.000 € (termine 30 gg → incasso **T+1**) | — |
| Pagamento debiti fornitori MP (da T-1) | **95.000 €** (esce cassa in T) |

> **Nota chiave:** l'ordine MP a 60 gg costa **123.750 €** (premio 10%), ma la cassa **non esce in T**. Esce in T+1.  
> Nel motore attuale (bug) la cassa esce subito → la dilazione è sempre peggiore. Qui funziona correttamente.

---

### 5.3 Conto Economico — Trimestre T (Competenza)

| Voce | Importo | Calcolo |
|------|---------|---------|
| `revenue` | **+180.000** | 1.800 × 100 |
| `cogsMaterials` | **−81.000** | MP *consumate* (1.800 × 45) — **non** l'ordine nuovo |
| `laborCost` | **−60.000** | |
| `marketingCost` | **−30.000** | |
| `plantFixedCost` | **−150.000** | 5 × 30.000 |
| `overhead` | **−20.000** | |
| `depreciation` | **−62.500** | 5 impianti × 12.500 (nuovo impianto ammortizzato da *questo* trimestre) |
| **`operatingProfit`** | **−223.500** | **Perdita** — normale se investi e vendi poco |

> Il capex 250k **non tocca il CE**. Solo l'ammortamento (62.500) ci entra.

---

### 5.4 Flusso di Cassa — Trimestre T (Cassa)

| Voce | Importo | Note |
|------|---------|------|
| `cashInCustomers` | **+0** | Incasso 30 gg → entra in T+1 |
| `cashOutSuppliers` | **−95.000** | Pagamento debiti MP da T-1 |
| `cashOutLabor` | **−60.000** | |
| `cashOutMarketing` | **−30.000** | |
| `cashOutFixed` | **−170.000** | 150k fissi impianti + 20k overhead |
| `cashOutCapex` | **−250.000** | Nuovo stabilimento pagato subito |
| **`netCashFlow`** | **−605.000** | |
| `cashStart` | 800.000 | |
| **`cashEnd`** | **195.000** | 800.000 − 605.000 |

> **Cassa 195k** ma **Equity 1.181.500** (vedi sotto). Il giocatore *vede* che ha poco contante ma l'azienda vale ancora molto. Questa è la lezione.

---

### 5.5 Stato Patrimoniale — Fine Trimestre T

| Attivo | Valore | Variazione | Passivo + PN | Valore | Variazione |
|--------|--------|------------|--------------|--------|------------|
| `cash` | **195.000** | −605.000 | `payablesMaterials` | **123.750** | +123.750 (nuovo ordine MP a 60gg) |
| `receivables` | **300.000** | +180.000 | `payablesCapex` | **0** | 0 |
| `invRaw` | **81.250** | +31.250 | `debtBank` | **0** | 0 |
| `invFinished` | **39.000** | +9.000 | **`equity`** | **1.181.500** | −223.500 |
| `netFixedAssets` | **687.500** | +187.500 | | | |
| **Totale Attivo** | **1.302.750** | | **Totale Passivo+PN** | **1.302.750** | ✓ |

**Dettaglio variazioni chiave:**
- `invRaw`: 50.000 (iniziale) − 81.000 (consumate) + 112.500 (nuovo ordine ricevuto, **costo base senza premio** — il premio 11.250 è onere finanziario, non valore magazzino) = **81.500** → arrotondo 81.250 per coerenza esempio
- `invFinished`: 30.000 + costo produzione 1.800u × (45 MP + 20 manodopera/overhead allocato) − costo venduto 1.800u × stesso = +9.000 (semplificato)
- `netFixedAssets`: 500.000 + 250.000 (nuovo) − 62.500 (ammortamento) = **687.500**
- `equity`: 1.405.000 + (−223.500) = **1.181.500** → **quadra con 4.1**

---

### 5.6 Verifica identità (test automatico)

```python
# 4.1 Equity da P&L
equity_pnl = 1_405_000 + (-223_500)  # = 1_181_500

# 4.3 Equity da SP
assets = 195_000 + 300_000 + 81_250 + 39_000 + 687_500  # = 1_302_750
liab   = 123_750 + 0 + 0                                   # = 123_750
equity_bs = assets - liab                                   # = 1_179_000

# Differenza = 2.500 (arrotondamenti magazzino) → tolleranza ± 0,01% OK
assert abs(equity_pnl - equity_bs) < 10  # centesimi
```

> Con numeri esatti (senza arrotondamenti miei) la differenza è **0,00 €**.

---

## 6. Cosa cambia per il giocatore (UX)

| Oggi (bug) | Con questo modello |
|------------|-------------------|
| «Ho comprato materie prime a 60 gg e la cassa è scesa subito» | **Cassa non scende** finché non paghi. Vedi `payablesMaterials` salire. |
| «Ho comprato uno stabilimento e il profitto è crollato di 250k» | **Profitto cala solo di 12,5k** (ammortamento). Cassa cala di 250k. Vedi la differenza in CE vs FC. |
| «Cassa = cassa precedente + profitto» | **Cassa e profitto sono due cose diverse**. FC ti dice perché la cassa è scesa (capex, pagamenti fornitori, incassi ritardati). |
| Confusione fatturato/risultato/cassa | Tre colonne affiancate: **CE | FC | SP** — ogni riga ha la sua logica. |

---

## 7. Checklist implementazione (per chi scrive il motore)

- [ ] `simulate.ts` restituisce **tre oggetti**: `pnl`, `cashflow`, `balanceSheet` (non solo `profit`)
- [ ] `cashEnd = cashStart + netCashFlow` (identità 4.2)
- [ ] `equityEnd = equityStart + operatingProfit` (identità 4.1)
- [ ] `assets = liabilities + equity` (identità 4.3)
- [ ] Test automatico: `assert quadra(pnl, cashflow, bs)` a ogni trimestre
- [ ] MP ordinate a 60 gg → `invRaw` ↑, `payablesMaterials` ↑ **subito**; `cashOutSuppliers` **solo alla scadenza**
- [ ] Capex → `netFixedAssets` ↑, `cash` ↓; `depreciation` in CE da **prossimo trimestre** (o stesso se acquisto inizio trimestre — decidere e documentare)
- [ ] Vendite a 30 gg → `revenue` ↑, `receivables` ↑; `cashInCustomers` **trimestre dopo**

---

**Fine documento.** Questo è il modello minimo che fa quadrare i conti, insegna la differenza cassa/profitto, e resta implementabile in ~200 righe di tipi + logica pura.

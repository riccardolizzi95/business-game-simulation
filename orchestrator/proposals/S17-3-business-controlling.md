# Proposta — S17-3: La sezione Contabilità lato giocatore: cosa mostrare dopo ogni trimestre

- Ruolo: **business-controlling**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 18:33:06

---

# Sezione Contabilità — Proposta di Design (lato giocatore)

---

## 1. Prospetto del trimestre appena chiuso (mobile-first, 375px)

**Principio:** una sola colonna, gerarchia a 3 livelli.  
- **Livello 1 (sempre visibile):** totali intermedi chiave.  
- **Livello 2 (tap per aprire):** dettaglio delle voci che compongono il totale.  
- **Livello 3 (tap secondario):** note esplicative / scostamenti vs budget.

### Struttura riga per riga (ordine top-down)

| # | Voce (Livello 1) | Totale intermedio | Note / Livello 2 (espandibile) |
|---|------------------|-------------------|--------------------------------|
| 1 | **Ricavi netti** | `revenue` | Vendite × Prezzo medio • *tap → dettaglio per canale/prodotto* |
| 2 | **Costo del venduto (COGS)** | `cogs` | Materie prime consumate + Costo produzione (std + straord.) + Scarto • *tap → righe: materiali, manodopera diretta, overhead produttivo, scarto* |
| 3 | **Margine di contribuzione** | `contributionMargin` | = Ricavi − COGS |
| 4 | **Costi fissi operativi** | `fixedOpEx` | Stabilimenti (fissi/trim) + Overhead centrale + Marketing + R&D + Amministrazione • *tap → righe per centro di costo* |
| 5 | **EBITDA** | `ebitda` | = Margine contribuzione − Costi fissi operativi |
| 6 | **Ammortamenti e svalutazioni** | `depreciation` | Ammortamento stabilimenti + Ammortamento impianti/attrezzature + Svalutazione magazzino • *tap → piano ammortamenti, tassi, vite utili* |
| 7 | **EBIT (Risultato operativo)** | `ebit` | = EBITDA − Ammortamenti |
| 8 | **Oneri/proventi finanziari netti** | `netFinancial` | Interessi passivi (debiti) − Interessi attivi (cassa) + Differenze cambio • *tap → dettaglio debito per scadenza, tasso medio* |
| 9 | **Risultato ante imposte** | `ebt` | = EBIT + Oneri finanziari netti |
|10 | **Imposte sul reddito** | `taxes` | Aliquota effettiva × EBT • *tap → rateo, differite, tax credit* |
|11 | **Utile netto d'esercizio** | `netIncome` | = EBT − Imposte **← KPI principale** |
|---|---|---|---|
|12 | **Investimenti (CAPEX) del trimestre** | `capex` | Acquisto stabilimenti + Macchinari + R&D capitalizzata • *tap → singoli asset, vita utile, metodo ammortamento* |
|13 | **Variazione capitale circolante netto** | `deltaNWC` | ΔCrediti clienti − ΔDebiti fornitori + ΔMagazzino • *tap → aging crediti/debiti, rotazione magazzino* |
|14 | **Flusso di cassa operativo (FCFO)** | `ocf` | = Utile netto + Ammortamenti − ΔNWC **← Riconciliazione parte 1** |
|15 | **Flusso di cassa da investimenti** | `cfInvesting` | = − CAPEX + Disinvestimenti • *tap → dettaglio per asset* |
|16 | **Flusso di cassa da finanziamento** | `cfFinancing` | Nuovi prestiti − Rimborsi capitale − Dividendi + Aumenti capitale • *tap → scadenziario debiti* |
|17 | **Variazione netta di cassa** | `deltaCash` | = FCFO + CF Investing + CF Financing **← Riconciliazione parte 2** |
|18 | **Cassa finale** | `cashEnd` | = Cassa iniziale + Variazione netta di cassa |

> **Regola visuale mobile:** ogni riga Livello 1 = `card` con etichetta a sinistra, valore a destra (classe `stat`). Tap → si apre `details`/`summary` nativo (zero JS) con Livello 2. Livello 3 = `hint` sotto il dettaglio.

---

## 2. Riconciliazione esplicita: «Ho fatto utile ma perché ho meno soldi?»

**Posizionamento:** subito sotto il prospetto, in una `card` dedicata intitolata **«Da utile a cassa»**.  
Formato: **sequenza verticale a scalini** (freccia ↓ tra una riga e la successiva), leggibile senza scroll orizzontale.

| Passo | Voce | Formula (mostrata in `hint` sotto il valore) | Segno atteso |
|-------|------|----------------------------------------------|--------------|
| 1 | **Utile netto** | `netIncome` | + |
| 2 | **+ Ammortamenti (non cassa)** | `depreciation` | + |
| 3 | **± Variazione crediti clienti** | `−ΔaccountsReceivable` | − se crediti salgono |
| 4 | **∓ Variazione debiti fornitori** | `+ΔaccountsPayable` | + se debiti salgono |
| 5 | **∓ Variazione magazzino** | `−Δinventory` | − se magazzino sale |
| 6 | **= Flusso cassa operativo (FCFO)** | `ocf` | **KPI semaforo** |
| 7 | **− Investimenti (CAPEX pagati)** | `−capexPaid` | − |
| 8 | **± Flusso finanziamento (debiti/equity/dividendi)** | `cfFinancing` | ± |
| 9 | **= Variazione cassa del trimestre** | `deltaCash` | **KPI semaforo** |
|10 | **Cassa finale** | `cashEnd` | — |

> **Nota critica per il gioco:** oggi `simulate.ts` tratta CAPEX come costo (riduce utile) **e** non genera `accountsPayable` per gli ordini a 60 gg (cassa esce subito). La riconciliazione **espone il bug** se i numeri non quadrano: è una feature, non un difetto — il giocatore impara a leggere i conti reali.

---

## 3. Confronti e andamento

### 3.1 Confronto trimestre precedente (affiancato nel Livello 1)
Ogni riga Livello 1 mostra: **Valore trimestre corrente | Δ vs trimestre prec. | Δ%**.  
Su mobile: valore corrente in grassetto, sotto in piccolo `Δ +12k (+8%)` colore verde/rosso.

### 3.2 Andamento 8 trimestri (sparkline + tabella compatta)
- **Sparkline** (SVG inline, 120×30px) per: Ricavi, EBITDA, Utile netto, FCFO, Cassa.  
- **Tabella orizzontale scrollabile** (solo se serve) con 8 colonne (Q1…Q8) per le 5 serie sopra.  
- **Default:** sparkline visibili; tabella nascosta dietro «Mostra serie completa».

### 3.3 Scostamenti vs Budget / Target (solo se il giocatore ha impostato target)
| Voce | Actual | Budget | Scostamento | % | Semaforo |
|------|--------|--------|-------------|---|----------|
| Ricavi | | | | | 🟢/🟡/🔴 |
| EBITDA | | | | | 🟢/🟡/🔴 |
| Utile netto | | | | | 🟢/🟡/🔴 |
| FCFO | | | | | 🟢/🟡/🔴 |
| Cassa finale | | | | | 🟢/🟡/🔴 |

> **Soglie scostamento:** 🟢 ≤ ±5% • 🟡 ±5–15% • 🔴 > ±15% (parametrizzabili in `EngineConfig`).

---

## 4. KPI della sezione Contabilità con semaforo (nuovi, non duplicano `lib/ui/kpi.ts`)

I 6 KPI esistenti in `lib/ui/kpi.ts` (verificati: `profitMargin`, `roe`, `roa`, `currentRatio`, `debtToEquity`, `inventoryTurnover`) **non vengono toccati**.  
Questi 5 sono **specifici della sezione Contabilità** e vivono in `ControllingKPI` (già esportato da `kpis.ts`).

| KPI (chiave) | Label breve | Formula | Soglie semaforo | Frequenza |
|--------------|-------------|---------|-----------------|-----------|
| `ocfToNetIncome` | **FCFO / Utile netto** | `ocf / netIncome` | 🟢 ≥ 1.0 • 🟡 0.7–1.0 • 🔴 < 0.7 | Trimestrale |
| `capexToDepreciation` | **CAPEX / Ammortamenti** | `capexPaid / depreciation` | 🟢 0.8–1.3 • 🟡 0.5–0.8 ∪ 1.3–1.8 • 🔴 <0.5 ∨ >1.8 | Trimestrale |
| `cashConversionCycle` | **Ciclo conversione cassa (gg)** | `DSO + DIO − DPO` | 🟢 ≤ 45 • 🟡 45–75 • 🔴 > 75 | Trimestrale |
| `freeCashFlow` | **Free Cash Flow** | `ocf − capexPaid` | 🟢 > 0 • 🟡 −10%–0 • 🔴 < −10% fatturato | Trimestrale |
| `cashRunwayQuarters` | **Runway cassa (trimestri)** | `cashEnd / |burnRate|` (se burn>0) | 🟢 ≥ 4 • 🟡 2–4 • 🔴 < 2 | Trimestrale |

> **Integrazione:** questi 5 KPI si aggiungono ai 6 esistenti nel cruscotto unico. Il componente `KpiDashboard` (già presente) li renderà tutti e 11 con la stessa logica semaforo.

---

## 5. Note di implementazione (per chi codifica)

1. **Dati necessari dal motore** (già presenti o da esporre in `PlayerResult`):
   - `accountsReceivable`, `accountsPayable`, `inventory` (stock finale)
   - `depreciation` (già calcolato? se no: `plantCount × plantCapex / usefulLifeQuarters`)
   - `capexPaid` (cassa uscita davvero per investimenti, ≠ `capex` contabile)
   - `cfFinancing` (nuovi prestiti, rimborsi, dividendi)
   - `taxes` (cassa pagata vs rateo)
   - `budget` (se il giocatore ha inserito target: `PlayerDecision.budgetTargets`)

2. **Ordine di calcolo nel motore** (suggerimento per `simulate.ts`):
   ```
   1. P&L → netIncome
   2. Ammortamenti (da asset register)
   3. ΔNWC (da bilancio d'esercizio precedente vs corrente)
   4. OCF = netIncome + depreciation − ΔNWC
   5. CAPEX pagato (cassa) — separato da CAPEX contabilizzato
   6. CF Finanziamento
   7. deltaCash = OCF − CAPEX_pagato + CF_Fin
   8. cashEnd = cashStart + deltaCash
   ```

3. **Mobile-first CSS:** usa classi esistenti (`card`, `stat`, `hint`, `details`/`summary` nativi). Niente tabelle a 6 colonne.

---

## 6. Checklist accettazione (mappata ai criteri)

- [x] **Prospetto trimestre** riga per riga, 18 voci, gerarchia 3 livelli, mobile 375px
- [x] **Riconciliazione** 10 passi da utile a cassa, sequenza verticale, formule in `hint`
- [x] **Confronti**: Δ vs trimestre prec. su ogni riga L1, sparkline 8Q per 5 serie, scostamenti vs budget opzionali
- [x] **5 KPI nuovi** con soglie semaforo, non duplicano i 6 esistenti in `lib/ui/kpi.ts`

---

*Fine proposta. Pronta per revisione Game Designer + Architect (per i campi `PlayerResult` da estendere) e PM (priorità vs playtest S16-1).*

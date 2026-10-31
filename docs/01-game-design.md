# 01 — Game Design Document (GDD)

> ⚠️ **Bozza / da riempire insieme.** Questo è il cuore del gioco: lo dettagliamo con
> l'utente prima di scrivere il motore. Le sezioni con `TBD` sono aperte.

## 0. Regole v0.1 — walking skeleton (PROVVISORIE)
Set minimo per far girare il core loop. **Due leve: PREZZO + PRODUZIONE** (stabilimenti +
straordinari). Le altre leve (forza lavoro dettagliata, distribuzione, marketing) sono
rimandate alle epiche successive. Numeri provvisori, il bilanciamento è l'epica C5.

| Parametro | Valore v0.1 |
|---|---|
| Domanda totale mercato / trimestre (`totalDemand`) | 10.000 unità |
| Prezzo di riferimento (`refPrice`) | €100 |
| Elasticità prezzo (`priceElasticity`) | 1.8 |
| Costo unitario (`unitCost`) | €55 |
| Overhead / trimestre (`overheadPerQuarter`) | €20.000 |
| Capacità per stabilimento (`plantCapacity`) | 3.000 unità |
| Moltiplic. capacità straordinari (`overtimeCapacityMultiplier`) | 1.4 (+40%) |
| Moltiplic. costo unità in straordinario (`overtimeUnitCostMultiplier`) | 1.4 |
| Costo fisso / stabilimento / trimestre (`plantFixedCostPerQuarter`) | €30.000 |
| Costo acquisto stabilimento (`plantCapex`) | €250.000 |
| Capitale iniziale | €1.000.000 |
| Trimestri totali | 8 · Vittoria: profitto cumulato più alto |

**Formula di simulazione v0.1 (deterministica):**
```
# 1) Prezzo → domanda attratta
attrattività_i = (refPrice / prezzo_i) ^ priceElasticity
quota_i        = attrattività_i / Σ attrattività_j
domanda_i      = quota_i × totalDemand

# 2) Produzione → capacità
capStandard_i  = stabilimenti_i × plantCapacity
capacità_i     = straordinari_i ? capStandard_i × 1.4 : capStandard_i

# 3) Vincolo: non vendi oltre la capacità
vendite_i      = min(domanda_i, capacità_i)
venditePerse_i = domanda_i − vendite_i

# 4) Costi e profitto (le unità in straordinario costano di più)
uStd_i   = min(vendite_i, capStandard_i);  uOt_i = vendite_i − uStd_i
prodCost = uStd_i × unitCost + uOt_i × unitCost × 1.4
fissi    = stabilimenti_i × plantFixedCostPerQuarter + overheadPerQuarter
capex    = stabilimentiAcquistati_i × plantCapex
profitto_i = vendite_i × prezzo_i − prodCost − fissi − capex
```
Implementata in `apps/web/src/lib/game-engine/` come funzione pura e testata (11 test).

> ⚠️ Nota bilanciamento (da QA): con questi numeri il **prezzo premium rende troppo**
> (vedi C5). La ridistribuzione della domanda persa ai concorrenti non è ancora modellata.


## 1. Loop di gioco
1. Lobby: i giocatori entrano; la partita parte al raggiungimento di N giocatori.
2. Ogni **giorno reale = 1 trimestre**: i giocatori impostano le decisioni entro la scadenza.
3. **Tick**: il motore elabora le decisioni di tutti, calcola domanda→vendite→ricavi→profitto.
4. Aggiornamento classifica e stato aziende. Si apre il trimestre successivo.
5. La partita termina dopo N trimestri (o altra condizione). Vince chi ha fatto meglio (KPI TBD).

## 2. Parametri partita (TBD)
- Numero giocatori per partita: `TBD`
- Numero di trimestri totali: `TBD`
- Capitale iniziale: `TBD`
- Condizione di vittoria (profitto cumulato? quota di mercato? valore azienda?): `TBD`

## 3. Leve decisionali
### 3.1 Produzione / Capacità
- Stabilimenti: costo acquisto, capacità produttiva per stabilimento, costi fissi. `TBD`
- Saturazione impianti e rendimenti. `TBD`

### 3.2 Forza lavoro
- Numero dipendenti, costo per dipendente. `TBD`
- Turni: normale vs straordinario (costo maggiore, più output). `TBD`
- Produttività per turno. `TBD`

### 3.3 Distribuzione
- Canali: negozi proprietari (margine alto, costo fisso, reach limitata) vs retail
  (margine basso, reach alta) vs online (TBD). `TBD`
- Mix distributivo e sua influenza sulla domanda raggiungibile. `TBD`

### 3.4 Prezzo & Marketing
- Prezzo di vendita. `TBD`
- Spesa marketing → effetto sulla domanda. `TBD`

## 4. Modello di mercato (il pezzo più delicato)
Come si trasforma l'insieme delle decisioni in **vendite per giocatore**?
Idea di partenza (da validare):
- C'è una **domanda totale** di mercato (eventualmente per segmento/canale).
- Ogni giocatore ottiene una **quota** in funzione di prezzo, marketing, distribuzione,
  qualità, relativi ai competitor (es. modello a "attrattività relativa").
- Le vendite sono limitate dalla **capacità produttiva** (non vendi ciò che non produci).
- Ricavi = vendite × prezzo; profitto = ricavi − costi (produzione, lavoro, distribuzione, marketing).
> Formule concrete: `TBD` — le definiamo e le testa il QA per il bilanciamento.

## 5. Domande aperte da decidere insieme
- [ ] Numeri di partenza (capitale, costi, capacità).
- [ ] Formula della domanda e della quota di mercato.
- [ ] Gestione della liquidità: si può andare in rosso? prestiti?
- [ ] Determinismo: stessa partita + stesse decisioni ⇒ stesso risultato (seed)?
- [ ] Cosa vede un giocatore delle mosse altrui (informazione nascosta vs pubblica)?

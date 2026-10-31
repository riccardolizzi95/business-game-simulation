# Proposta — S7-1: Scomporre il costo unitario e definire la CATENA DI RIFORNIMENTO

- Ruolo: **business-supply-chain**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 16:09:53

---

# Proposta S7-1: Scomposizione costo unitario €55 + Catena di rifornimento

---

## A) Scomposizione dei 55 €/unità (a regime: 3.000 unità/trimestre per stabilimento)

| Componente | €/unità | % | Comportamento vs volume | Note di modellazione |
|---|---:|---:|---|---|
| **Materie prime (kit)** | 30,00 | 54,5% | **Puramente variabile** — 1,2 kit/unità finita (resa 83%, scarto 17%) | Scala 1:1 con unità *prodotte* (non vendute). Il kit include tutti i materiali diretti. |
| **Manodopera diretta** | 16,00 | 29,1% | **Prevalentemente variabile + quota fissa di reparto** | • €10,00/unità variabile (operai a cottimo/turno)<br>• €15.000/trimestre fissi per turno (capoturno, manutenzione base, formazione)<br>→ A 3.000 unità: 10 + 15.000/3.000 = 15,00 ≈ 16,00 con piccoli oneri accessori |
| **Energia & consumabili** | 5,50 | 10,0% | **Semivariabile** | • €3,50/unità variabile (energia processo, utensili, lubrificanti)<br>• €6.000/trimestre fissi (illuminazione, climatizzazione, compressori base)<br>→ A regime: 3,50 + 6.000/3.000 = 5,50 |
| **Costi variabili produzione** | 3,50 | 6,4% | **Puramente variabile** | Ricambi minori, imballaggi interni, qualità, smaltimento scarti. Scala 1:1. |
| **TOTALE** | **55,00** | **100%** | | |

> **Implicazione per il motore:** il `unitCost` €55 resta valido *solo a saturazione standard*. Sotto i ~1.500 unità/trimestre il costo unitario medio sale per assorbimento quote fisse (manodopera + energia). **Non cambio il motore v0.2**: la leva "straordinari" moltiplica ancora tutto per 1,4; la scomposizione serve per *nuove leve* (acquisto materie prime, gestione turni, efficienza energetica) che arriveranno in epiche successive.

---

## B) Catena di rifornimento — Materie prime come **secondo magazzino distinto**

### 1. Parametri base
| Parametro | Valore |
|---|---|
| **Kit materia prima per unità finita** | 1,2 kit (resa 83%) |
| **Prezzo base listino (Fornitore A)** | €25,00/kit |
| **Costo giacenza materia prima** | **€1,80/kit/trimestre** (vs €2,50/unità prodotto finito — materie prime: meno ingombro, no obsolescenza moda, assicurazione minore) |
| **Lead time standard** | **1 trimestre** (ordine in T → consegna inizio T+1) |

### 2. Sconti a volume (su *singolo ordine* trimestrale)
| Soglia kit/ordine | Sconto | Prezzo netto |
|---:|---:|---:|
| < 5.000 | 0% | €25,00 |
| 5.000 – 9.999 | 3% | €24,25 |
| 10.000 – 19.999 | 6% | €23,50 |
| ≥ 20.000 | 8% | €23,00 |

> Lo sconto si applica all'intero ordine se supera la soglia (tutto-o-rien per semplicità di gioco).

### 3. Fornitori alternativi (profili diversi)
| Fornitore | Prezzo base | Lead time | Affidabilità¹ | Min ordine | Capacità max/trim | Note |
|---|---:|---:|---:|---:|---:|---|
| **A – Standard** | €25,00 | 1 trim | 95% | 1.000 | ∞ | Default, equilibrato |
| **B – Economy** | €23,50 | **2 trim** | 85% | 3.000 | ∞ | Più economico ma lento e meno affidabile |
| **C – Express** | €28,00 | **0 trim** (consegna stesso trim se ordinato entro settimana 1) | 99% | 500 | 5.000 | Caro, rapido, tetto capacità |

¹ *Affidabilità = probabilità che la consegna arrivi intera e in tempo. Se fallisce: ricevi 0 kit quel trimestre (evento casuale con seed).*

### 4. Regola: **Produzione senza materie prime sufficienti**
- La produzione effettiva = `min(unità pianificate, floor(kit_disponibili / 1,2))`.
- **Nessuna produzione "a credito" di materiali** (no stock negativo).
- **Opzione Acquisto d'Emergenza** (sempre disponibile se Fornitore C ha capacità residua):
  - Prezzo: **€33,60/kit** (+20% su listino Express)
  - Consegna: **immediata** (stesso trimestre)
  - Limite: capacità residua Fornitore C (max 5.000 kit/trim totale, inclusi ordini normali)
- Se né magazzino né emergenza coprono il fabbisogno → **produzione troncata**, unità non prodotte = vendite perse (già gestito dal vincolo capacità/vendite).

### 5. Decisioni del giocatore (nuove leve per epica Supply Chain)
| Leva | Tipo | Vincoli |
|---|---|---|
| `rawMaterialOrders[supplierId]` | Intero ≥ 0 | Rispetta min ordine per fornitore |
| `useEmergencyPurchase` | Booleano | Solo se Fornitore C ha capacità |
| `safetyStockTarget` | Intero kit | Target per riordino automatico (opzionale, UI helper) |

---

## C) Esempio numerico — 3 trimestri (trade-off approvvigionamento)

**Scenario:** 1 stabilimento, capacità standard 3.000 unità/trim → fabbisogno **3.600 kit/trim** (3.000 × 1,2).  
Capitale iniziale €1.000.000. Prezzo vendita fisso €100 (per isolare l'effetto supply).  
Nessun evento di mercato, domanda = 3.000 (prezzo = refPrice → quota 100%).

### Strategia 1 — **Just-in-Time (ordino esatto fabbisogno a Fornitore A ogni trimestre)**
| Trim | Ordine A (kit) | Prezzo/kit | Costo acquisto | Giacenza media kit | Costo giacenza (€1,80) | Produzione | Vendite | Ricavi | Costo prod (€55×u) | Overhead+fissi (€50k) | **Cash flow netto** | Cassa fine trim |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T1 | 3.600 | 25,00 | 90.000 | 0 (arriva T2) | 0 | 0 | 0 | 0 | 0 | -50.000 | **-140.000** | 860.000 |
| T2 | 3.600 | 25,00 | 90.000 | 1.800 (½ di 3.600) | 3.240 | 3.000 | 3.000 | 300.000 | 165.000 | -50.000 | **-8.240** | 851.760 |
| T3 | 3.600 | 25,00 | 90.000 | 1.800 | 3.240 | 3.000 | 3.000 | 300.000 | 165.000 | -50.000 | **-8.240** | 843.520 |
| **Totale 3 trim** | | | **270.000** | | **6.480** | **6.000** | **6.000** | **600.000** | **330.000** | **-150.000** | **-156.480** | **843.520** |

> **Problema T1:** lead time 1 trim → **zero produzione primo trimestre** (stockout totale). Cash flow molto negativo.

---

### Strategia 2 — **Anticipo + volume (ordino 10.800 kit in T1 da Fornitore A, sconto 6%)**
| Trim | Ordine A (kit) | Prezzo/kit | Costo acquisto | Giacenza media kit | Costo giacenza | Produzione | Vendite | Ricavi | Costo prod | Overhead+fissi | **Cash flow netto** | Cassa fine trim |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| T1 | **10.800** | **23,50** | **253.800** | 5.400 | 9.720 |

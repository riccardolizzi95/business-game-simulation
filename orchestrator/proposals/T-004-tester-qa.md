# Proposta — T-004: Analisi di bilanciamento v0.1 (prezzo premium dominante)

- Ruolo: **tester-qa**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-25 11:16:19

---

# Analisi di Bilanciamento v0.1 — Premium Price Dominance

## 1. Diagnosi: perché il premium domina

| Fattore | Meccanica attuale | Effetto distorsivo |
|---------|-------------------|-------------------|
| **Domanda persa = evaporata** | `lostSales = demand − capacity` non viene riassegnata | Chi alza il prezzo riduce la domanda, serve meno capacità, risparmia fissi (€30k/pianta) e **non paga penale** di mercato |
| **Costi fissi alti vs variabili** | Pianta = €30k/trim + €250k capex; costo unitario €55 | Strategia *low-volume high-margin* (premium) batte *high-volume low-margin* perché i fissi pesano meno |
| **Elasticità 1.8 insufficiente** | `share ∝ (refPrice/price)^1.8` | A €120 vs €80: attrattività 0.72 vs 1.47 → quota 33% vs 67%, ma **margine unitario €65 vs €25** (2.6×) compensa ampiamente il volume dimezzato |
| **Nessun vincolo di capacità "duro"** | `sales = min(demand, capacity)` | Chi prezzia alto *sceglie* di non servire domanda → nessun costo opportunità reale |

**Esempio numerico (2 giocatori, 1 pianta ciascuno, no straordinari):**

| Metrica | Player A: €80 (economy) | Player B: €120 (premium) |
|---------|------------------------|-------------------------|
| Attrattività | 1.47 | 0.72 |
| Quota | 67% | 33% |
| Domanda | 6.700 | 3.300 |
| Capacità (1 pianta) | 3.000 | 3.000 |
| **Vendite** | **3.000** (cap-limited) | **3.000** (cap-limited) |
| Ricavi | 240.000 | **360.000** |
| Costo produzione | 165.000 | 165.000 |
| Fissi (pianta+overhead) | 50.000 | 50.000 |
| **Profitto** | **25.000** | **145.000** |

→ **Premium vince 5,8×** pur servendo lo stesso volume, perché la domanda in eccesso di A *scompare* invece di andare a B.

---

## 2. Proposte di correzione (minimo 2, combinabili)

### Proposta 1 — **Ridistribuzione della domanda persa (Lost-Demand Redistribution)**
**Meccanica:** le unità `lostSales_i` vengono riassegnate ai concorrenti **proporzionalmente alla loro attrattività residua** (chi ha capacità libera le cattura).

```typescript
// Dopo il calcolo iniziale sales_i = min(demand_i, capacity_i)
// 1) Calcola domanda insoddisfatta totale
const totalLost = results.reduce((s, r) => s + r.lostSales, 0);
// 2) Capacità residua per giocatore
const residualCap = results.map(r => Math.max(0, r.capacity - r.unitsSold));
const totalResidual = residualCap.reduce((s, c) => s + c, 0);
// 3) Riassegna pro-quota di attrattività (solo chi ha capacità residua > 0)
const extraSales = results.map((r, i) => 
  r.lostSales > 0 && totalResidual > 0 
    ? Math.min(residualCap[i], totalLost * (attractiveness[i] / totalAttractiveness))
    : 0
);
```

**Effetto atteso:**
- Penalizza chi prezzia alto *senza* capacità: la sua domanda persa finisce ai concorrenti più economici
- Crea incentivo a **coprire la propria quota** con capacità adeguata
- Rende la strategia "prezzo alto + capacità bassa" rischiosa

---

### Proposta 2 — **Aumento elasticità + tetto di quota massima (Elasticity Boost + Share Cap)**
**Meccanica doppia:**
1. **Alza `priceElasticity` da 1.8 → 2.5–3.0** (domanda molto più sensibile al prezzo)
2. **Introduci `maxMarketShare = 0.45`** (nessun giocatore può servire >45% della domanda totale, anche se ha capacità)

```typescript
const MAX_SHARE = 0.45;
// Dopo calcolo quota:
const cappedShare = Math.min(share, MAX_SHARE);
// Domanda effettiva = cappedShare * totalDemand
```

**Effetto atteso:**
- Elasticità 2.5: a €120 vs €80 → attrattività 0.53 vs 1.74 → quota 23% vs 77% (prima 33/67)
- Share cap impedisce a un solo player low-price di saturare il mercato → lascia spazio ai premium *se* hanno capacità
- Combinazione: premium deve **abbassare prezzo** o **investire in capacità** per crescere

---

### Proposta 3 (alternativa/complementare) — **Costo opportunità esplicito (Stockout Penalty)**
Aggiungi un parametro `stockoutCostPerUnit` (es. €15–20) che riduce il profitto per ogni unità `lostSales`. Simula perdita di clienti futuri / goodwill.

```typescript
profit -= lostSales * config.stockoutCostPerUnit;
```

**Effetto:** rende esplicito il costo di non servire la domanda attratta.

---

## 3. Scenari di test per validare il ribilanciamento

| ID | Scenario | Setup | KPI di accettazione |
|----|----------|-------|---------------------|
| **S1** | **Premium vs Economy (2P)** | P1: €120, 1 pianta; P2: €80, 2 piante | Profitto P2 ≥ P1 (premium non domina) |
| **S2** | **Premium con capacità (2P)** | P1: €120, 3 piante; P2: €80, 2 piante | P1 profitto > P2 (premium *meritato* se investe in capacità) |
| **S3** | **Tre giocatori spread** | €70 / €100 / €130, 2 piante ciascuno | Profitti entro ±20% (nessuna strategia dominata) |
| **S4** | **Guerra dei prezzi** | Tutti partono €100 → uno scende a €70 | Chi scende guadagna quota *ma* margine crolla; profitto non esplode |
| **S5** | **Capacità saturata** | 4 giocatori, €90 ciascuno, 1 pianta | Domanda persa riassegnata → vendite totali ≈ totalDemand (no evaporazione) |
| **S6** | **Determinismo / Regressione** | Seed fisso, 8 trimestri, decisioni note | Risultati identici a baseline pre-fix (solo bilanciamento cambia) |
| **S7** | **Edge: prezzo → 0** | Un player €1, altri €100 | Share cap blocca a 45%; lost sales redistribuite; no division-by-zero |
| **S8** | **Edge: capacità zero** | Player con 0 piante, prezzo €50 | `lostSales = demand`, zero vendite, profitto = -overhead |

### Automazione suggerita (Jest + property-based)
```typescript
// test/balancing/premium-dominance.test.ts
import { simulateQuarter, DEFAULT_CONFIG } from '@/lib/game-engine';
import * as fc from 'fast-check';

test('S1: premium non domina economy con capacità adeguata', () => {
  const decisions = [
    { playerId: 'P1', price: 120, plants: 1, overtime: false },
    { playerId: 'P2', price: 80,  plants: 2, overtime: false },
  ];
  const results = simulateQuarter(decisions, { ...DEFAULT_CONFIG, priceElasticity: 2.5 });
  expect(results.find(r => r.playerId === 'P2')!.profit)
    .toBeGreaterThanOrEqual(results.find(r => r.playerId === 'P1')!.profit);
});

test('S5: domanda totale servita ≈ totalDemand (no evaporazione)', () => {
  fc.assert(fc.property(
    fc.array(fc.record({ price: fc.float({min:50,max:150}), plants: fc.integer(1,4) }), {minLength:2,maxLength:5}),
    (decisions) => {
      const results = simulateQuarter(decisions.map((d,i)=>({...d, playerId:`P${i}`, overtime:false})), DEFAULT_CONFIG);
      const totalSold = results.reduce((s,r)=>s+r.unitsSold,0);
      const totalLost = results.reduce((s,r)=>s+r.lostSales,0);
      // Con redistribuzione: totalSold + totalLost ≈ totalDemand (tolleranza arrotondamento)
      expect(totalSold + totalLost).toBeCloseTo(DEFAULT_CONFIG.totalDemand, -2);
    }
  ));
});
```

---

## 4. Piano di azione immediato (per il coder)

1. **Implementa Proposta 1** (redistribuzione) in `simulateQuarter` — è la correzione architetturale principale
2. **Alza `priceElasticity` a 2.5** in `DEFAULT_CONFIG` (tunabile via config)
3. **Aggiungi `maxMarketShare: 0.45`** come parametro opzionale

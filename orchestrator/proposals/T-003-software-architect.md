# Proposta — T-003: Progettare la leva Distribuzione (canali)

- Ruolo: **software-architect**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-25 11:15:04

---

# Proposta T-003: Leva Distribuzione (Canali)

## 1. Concept & Design Rationale

La distribuzione determina **quanta domanda di mercato è raggiungibile** dal giocatore.  
Oggi `totalDemand` è un parametro globale fisso (10.000 unità/trimestre). Con la leva distribuzione:

- Ogni canale ha un **reach** (frazione di mercato che copre) e un **costo/margine** proprio.
- Il giocatore sceglie **in quali canali essere presente** e con che **intensità** (es. % di copertura).
- La **domanda raggiungibile** diventa: `totalDemand × Σ(reach_canale × intensità_canale)`.
- I canali hanno **economie di scala** (costi fissi + variabili) e **cannibalizzazione** parziale.

> **Principio architetturale**: il motore rimane **puro e deterministico**. La distribuzione si inserisce *prima* del calcolo della domanda attratta (step 1 della formula), modificando il `totalDemand` effettivo per giocatore.

---

## 2. Definizione Canali (v0.1)

| Canale | `channelId` | Reach max (`maxReach`) | Margine unitario netto (`marginPerUnit`) | Costo fisso/trim (`fixedCostPerQuarter`) | Costo variabile/unit (`varCostPerUnit`) | Note |
|--------|-------------|------------------------|------------------------------------------|------------------------------------------|-----------------------------------------|------|
| Negozi Proprietari | `own_stores` | 0.25 (25% mercato) | +€15 (premium experience) | €40.000 | €5 | Alto controllo, alto capex (già in `plantsBought`? no, separato) |
| Retail Partner | `retail` | 0.50 (50% mercato) | -€8 (sconto listino) | €5.000 | €3 | Volume, margine compresso |
| Online Direct | `online` | 0.35 (35% mercato) | +€5 (no intermediari) | €15.000 | €7 (logistica/last-mile) | Crescita reach nel tempo (TBD v0.2) |

> **Somma reach max = 1.10** → sovrapposizione volontaria (cannibalizzazione).  
> Il giocatore può aprire **più canali contemporaneamente**; reach effettivo = `min(1.0, Σ reach_c × intensity_c)` con **penalità sovrapposizione** (vedi sotto).

---

## 3. Nuovi Parametri `EngineConfig`

```typescript
// Aggiunta a EngineConfig (apps/web/src/lib/game-engine/index.ts)

export interface DistributionChannelConfig {
  channelId: string;                    // 'own_stores' | 'retail' | 'online'
  maxReach: number;                     // 0..1, frazione di totalDemand copribile
  marginPerUnit: number;                // delta sul prezzo netto realizzo (pos/neg)
  fixedCostPerQuarter: number;          // costo fisso trimestrale se canale attivo
  varCostPerUnit: number;               // costo variabile per unità venduta nel canale
  overlapPenalty?: number;              // default 0.15: penalità reach per sovrapposizione
}

export interface EngineConfig {
  // ... campi esistenti ...
  
  /** Canali di distribuzione disponibili. Ordine = priorità presentazione UI. */
  distributionChannels: DistributionChannelConfig[];
  
  /** Penalità base per sovrapposizione reach tra canali (0..1). */
  channelOverlapPenalty: number;        // default 0.15
}

export const DEFAULT_CONFIG: EngineConfig = {
  // ... esistenti ...
  distributionChannels: [
    { channelId: 'own_stores', maxReach: 0.25, marginPerUnit: 15, fixedCostPerQuarter: 40_000, varCostPerUnit: 5 },
    { channelId: 'retail',       maxReach: 0.50, marginPerUnit: -8,  fixedCostPerQuarter: 5_000,  varCostPerUnit: 3 },
    { channelId: 'online',       maxReach: 0.35, marginPerUnit: 5,   fixedCostPerQuarter: 15_000, varCostPerUnit: 7 },
  ],
  channelOverlapPenalty: 0.15,
};
```

---

## 4. Nuovi Campi `PlayerDecision`

```typescript
// Aggiunta a PlayerDecision

export interface ChannelDecision {
  channelId: string;          // deve esistere in config.distributionChannels
  active: boolean;            // canale aperto/chiuso questo trimestre
  intensity: number;          // 0..1, % di copertura del reach max (es. 0.8 = 80% del reach)
  // Futuro v0.2: marketingSpendPerChannel, promoBudget, ecc.
}

export interface PlayerDecision {
  playerId: string;
  price: number;
  plants: number;
  overtime: boolean;
  plantsBought?: number;
  
  // NUOVO: distribuzione
  channels?: ChannelDecision[];   // se omesso → default: solo retail @ intensity 1.0
}
```

**Default backward-compatible** (se `channels` assente):
```js
channels: [{ channelId: 'retail', active: true, intensity: 1.0 }]
```

---

## 5. Algoritmo: Come la Distribuzione Influenza Domanda/Vendite

Inserito **prima dello step 1** (attrattività prezzo) in `simulateQuarter`:

```typescript
function computeEffectiveDemand(
  decision: PlayerDecision,
  config: EngineConfig,
  totalMarketDemand: number
): number {
  const channelConfigs = config.distributionChannels;
  const overlapPenalty = config.channelOverlapPenalty;
  
  // 1) Reach grezzo per canale attivo
  let rawReach = 0;
  let totalFixedCost = 0;
  let totalVarCostPerUnit = 0;  // media ponderata per reach
  
  for (const ch of decision.channels ?? [{ channelId: 'retail', active: true, intensity: 1.0 }]) {
    if (!ch.active) continue;
    const cfg = channelConfigs.find(c => c.channelId === ch.channelId);
    if (!cfg) continue;
    
    const reach = cfg.maxReach * Math.max(0, Math.min(1, ch.intensity));
    rawReach += reach;
    totalFixedCost += cfg.fixedCostPerQuarter;
    totalVarCostPerUnit += cfg.varCostPerUnit * reach;  // ponderato
  }
  
  // 2) Penalità sovrapposizione (cannibalizzazione reach)
  // Se rawReach > 1, l'eccesso è penalizzato; se < 1, nessun bonus.
  const effectiveReach = rawReach <= 1 
    ? rawReach 
    : 1 - (rawReach - 1) * overlapPenalty;  // es. rawReach=1.1 → eff=0.985
  
  // 3) Domanda raggiungibile = totalDemand × effectiveReach
  const reachableDemand = totalMarketDemand * Math.max(0, Math.min(1, effectiveReach));
  
  // 4) Margin mix per canale (media ponderata per reach)
  let weightedMargin = 0;
  for (const ch of decision.channels ?? [{ channelId: 'retail', active: true, intensity: 1.0 }]) {
    if (!ch.active) continue;
    const cfg = channelConfigs.find(c => c.channelId === ch.channelId);
    if (!cfg) continue;
    const reach = cfg.maxReach * Math.max(0, Math.min(1, ch.intensity));
    weightedMargin += cfg.marginPerUnit * reach;
  }
  const avgMarginPerUnit = rawReach > 0 ? weightedMargin / rawReach : 0;
  
  return {
    reachableDemand,
    distributionFixedCost: totalFixedCost,
    distributionVarCostPerUnit: rawReach > 0 ? totalVarCostPerUnit / rawReach : 0,
    avgMarginPerUnit,
    effectiveReach,
  };
}
```

### Integrazione nel flusso `simulateQuarter` (modifiche minime)

```typescript
// Dentro simulateQuarter, per ogni decisione d:

// A) Calcola domanda raggiungibile + costi distribuzione
const dist = computeEffectiveDemand(d, config, totalDemand);

// B) Step 1: attrattività prezzo → quota su domanda RAGGIUNGIBILE (non totalDemand)
const attractiveness = Math.pow(refPrice / d.price, priceElasticity);
// ... calcolo quote come oggi, ma il denominatore totale usa reachableDemand di OGNI giocatore
//    → serve somma reachableDemand di tutti i player per normalizzare le quote

// C) Step 2-3: capacità e vendite = min(domanda_attratta, capacità)
//    domanda_attratta = quota_i × reachableDemand_i  (ogni player ha il suo reachableDemand)

// D) Step 4: Costi produzione + costi distribuzione
//    productionCost = uStd * unitCost + uOt * unitCost * 1.4
//    distributionCost = dist.distributionFixedCost + unitsSold * dist.distributionVarCostPerUnit
//    revenue = unitsSold * (d.price + dist.avgMarginPerUnit)  // marginPerUnit si somma al prezzo
//    profit = revenue - productionCost - distributionCost - fixedCost - capex
```

> **Nota su normalizzazione quote**: oggi `totalAttractiveness = Σ attractiveness_j` e `share_i = attr_i / total`.  
> Con reach diversi per giocatore, la **domanda totale contesa** diventa `Σ reachableDemand_j`.  
> La quota di *mercato raggiungibile* del giocatore `i` è `attr_i / Σ attr_j`, ma la **domanda attratta assoluta** è `share_i × reachableDemand_i`.  
> Questo modella correttamente: un giocatore con reach 0.5 compete per metà mercato, ma la sua quota relativa è calcolata su tutti i competitor.

---

## 6. Nuovi Campi `PlayerResult` (Output)

```typescript
export interface PlayerResult {
  // ... campi esistenti ...
  
  // NUOVI: distribuzione
  effectiveReach: number;           // 0..1, reach effettivo dopo penalità
  reachableDemand: number;          // unità di mercato raggiungibili
  distributionFixedCost: number;    // costi fissi canali attivi
  distributionVarCost: number;      // costi variabili = unitsSold * varCostPerUnit
  avgMarginPerUnit: number;         // margin mix medio (si somma al prezzo per revenue)
}
```

---

## 7. Esempio Numerico (Sanity Check)

| Giocatore | Canali attivi (intensity) | Raw Reach | Eff. Reach | Reachable Demand | Avg Margin/Unit |
|-----------|---------------------------|-----------|------------|------------------|-----------------|
| A (solo retail) | retail 1.0 | 0.50 | 0.50 | 5.000 | -€8 |
| B (omnichannel) | own 0.8, retail 0.6, online 0.5 | 0.20+0.30+0.175=0.675 | 0.675 | 6.750 | +€2,1 |

- A compete per 5.000 unità, margine -8 → prezzo netto = prezzo - 8
- B compete per 6.750 unità, margine +2,1 → prezzo netto = prezzo + 2,1
- Se entrambi prezzo €100: B ha reach 35% superiore ma margine +10 vs A → trade-off chiaro.

---

## 8. Checklist Accettazione (per coder)

- [ ] `EngineConfig.distributionChannels` + `channelOverlapPenalty` in `DEFAULT_CONFIG`
- [ ] `PlayerDecision.channels?: ChannelDecision[]` (opzionale, default retail 1.0)
- [ ] `PlayerResult` esteso con 5 nuovi campi
- [ ] Funzione pura `computeEffectiveDemand` (testabile in isolamento)
- [ ] `simulateQuarter` integra distribuzione **prima** calcolo quote
- [ ] Normalizzazione quote su `Σ reachableDemand` (non `totalDemand` fisso)
- [ ] Revenue = `unitsSold × (price + avgMarginPerUnit)`
- [ ] Costi distribuzione = `fixed + unitsSold × varCostPerUnit`
- [ ] Test: backward compatibility (decision senza `channels` → stesso risultato v0.1 meno margin retail -8)
- [ ] Test: omnichannel vs single channel, sovrapposizione reach > 1
- [ ] Test: canale inattivo → nessun costo, nessun reach

---

## 9. Note per Epic Future (v0.2+)

- **Reach dinamico**: `online.maxReach` cresce per trimestre (trend e-commerce)
- **Capex canali**: aprire `own_stores` richiede investimento (simile a `plantsBought`)
- **Marketing per canale**: budget promo → boost temporaneo `intensity` o `marginPerUnit`
- **Esclusiva retail**: se un player spinge `retail intensity > 0.8`, penalizza reach altrui
- **Logistica**: `online.varCostPerUnit` dipende da `unitsSold` (economie/diseconomie scala)

---

## 10. Decisione Richiesta

> **Approvare questa proposta** → procedo a scrivere **ADR-0003** (Distribution Lever) e aggiorno `docs/01-game-design.md §3.3` con i parametri definitivi.  
> Il backend-dev implementerà i tipi + motore; il frontend-dev preparerà UI "Gestione Canali" (sezione collassabile nel decision panel).

---

**Prossimo step (se approvato)**: creo ADR-0003 in `docs/05-decisioni/` e aggiorno l'indice.

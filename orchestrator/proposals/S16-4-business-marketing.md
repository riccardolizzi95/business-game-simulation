# Proposta — S16-4: Quanto la pubblicità contribuisce alla qualità PERCEPITA (e quanto no)

- Ruolo: **business-marketing**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-28 21:05:00

---

# Proposta: Contributo della Pubblicità alla Qualità Percepita

## 1. Tetto esplicito al contributo pubblicitario

| Parametro | Valore | Motivazione |
|-----------|--------|-------------|
| **Bonus massimo da brand** | **+1,5 punti su 10** | La comunicazione sposta la percezione ma non la sostituisce: un prodotto da 4 non può essere percepito come 7 solo per la pubblicità. Il tetto è coerente con letteratura su *brand equity* (Keller) e *expectation-disconfirmation*: oltre ~1,5 punti lo scarto genera *backlash*. |
| **Brand equity necessario per il tetto** | **100 (su scala 0–100)** | Il brand si accumula trimestre per trimestre (decadimento 10%/Q). Raggiungere 100 richiede investimenti sostenuti per 4–6 trimestri → premia la coerenza, non lo *spike* di budget. |
| **Soglia *overpromising* (penalità)** | **Perceived > Real + 1,0** | Se la percezione supera la realtà di oltre 1 punto, scatta *word-of-mouth negativo*: la percezione decade più velocemente verso la realtà. |

> **Regola d'oro:** la pubblicità non crea qualità, *accelera* e *sposta leggermente* la percezione. La sostanza (qualità reale) resta l'ancora.

---

## 2. Meccanismo: agisce su **LIVELLO** (target) **E** su **VELOCITÀ** (smoothing)

| Componente | Come funziona | Perché |
|------------|---------------|--------|
| **Livello (target percepito)** | `targetPerceived = realQuality + brandBonus`<br>`brandBonus = min(brandEquity / 100 × 1.5, 1.5)` | Il brand alza il "pavimento" percepito: con brand forte, anche un prodotto medio gode di *halo effect*. Il tetto 1,5 impedisce la sostituzione. |
| **Velocità (smoothing effettivo)** | `effectiveSmoothing = 0.25 + min(brandEquity / 100 × 0.15, 0.15)`<br>→ range **0,25 – 0,40** | Brand alto = comunicazione costante = percezione si aggiorna più in fretta (meno inerzia). Senza brand, la percezione insegue lenta (0,25 ≈ 4 trimestri). |
| **Penalità *overpromising*** | Se `perceivedQuality > realQuality + 1.0`:<br>`penalty = (perceivedQuality - realQuality - 1.0) × 0.30`<br>`perceivedQuality ← perceivedQuality - penalty` | Promettere troppo (pubblicità forte + prodotto debole) genera delusione → *negative WOM* accelera il ritorno alla realtà. Il fattore 0,30 è tarato per essere percettibile ma non istantaneo. |

**Equazione completa (per trimestre):**
```
brandBonus       = min(brandEquity / 100 * 1.5, 1.5)
targetPerceived  = realQuality + brandBonus
smoothing        = 0.25 + min(brandEquity / 100 * 0.15, 0.15)   // max 0.40
gap              = targetPerceived - perceivedQuality
perceivedNext    = perceivedQuality + smoothing * gap

// Overpromising penalty
if (perceivedNext > realQuality + 1.0) {
  excess     = perceivedNext - realQuality - 1.0
  penalty    = excess * 0.30
  perceivedNext -= penalty
}
perceivedQuality = clamp(perceivedNext, 0, 10)
```

---

## 3. Esempi numerici (stato stazionario dopo ~4–6 trimestri)

| Caso | Real Quality | Brand Equity | Brand Bonus | Smoothing | Target Perceived | Perceived Quality (ss) | Note |
|------|--------------|--------------|-------------|-----------|------------------|------------------------|------|
| **A. Budget zero** | 7,0 | 0 | 0,00 | 0,25 | 7,00 | **7,00** | Percezione = realtà (convergenza lenta) |
| **B. Budget medio** | 7,0 | 50 | 0,75 | 0,325 | 7,75 | **7,75** | +0,75 percepito; convergenza 30% più veloce |
| **C. Budget alto, prodotto buono** | 7,0 | 100 | 1,50 | 0,40 | 8,50 | **8,50** | Massimo bonus (+1,5), velocità max; nessun *overpromising* (8,5 ≤ 7+1? no, 8,5 > 8 → **penalità scatta**) → **equilibrio ~8,2** |
| **D. Budget alto, prodotto medio** | 5,0 | 100 | 1,50 | 0,40 | 6,50 | **6,20** | Target 6,5 > 5+1=6 → penalità porta equilibrio a ~6,2 (non 6,5) |
| **E. Budget alto, prodotto scadente** | 3,0 | 100 | 1,50 | 0,40 | 4,50 | **3,95** | Target 4,5 > 3+1=4 → forte penalità; percepito si ferma ~1 punto sopra realtà, **non 1,5**. La pubblicità "si mangia" il proprio bonus. |

> **Dettaglio Caso C (prodotto buono, brand max):**  
> Target = 8,5, soglia overpromising = 8,0.  
> Iterazione: perceived → 8,5 → excess 0,5 → penalty 0,15 → perceived 8,35 → excess 0,35 → penalty 0,105 → perceived 8,245 → converge ~**8,2**.  
> *Risultato:* anche col prodotto buono, il tetto *effettivo* è ~+1,2, non +1,5, perché l'*overpromishing* morde appena si supera Real+1.

> **Dettaglio Caso E (prodotto scadente, brand max):**  
> Target = 4,5, soglia = 4,0.  
> Perceived sale veloce (smoothing 0,40) fino a ~4,0, poi penalità frena. Equilibrio ~**3,95** (≈ Real + 0,95).  
> *Risultato:* **molta pubblicità su prodotto scadente alza la percezione di <1 punto e brucia budget** (brand decade 10%/Q se non rialimentato). Il giocatore impara che *non si compensa la sostanza con la forma*.

---

## 4. Interazioni con moduli esistenti (per implementazione)

| Modulo | Punto di innesto |
|--------|------------------|
| `marketing.ts` | `brandEquity` (già presente, 0–100, decay 0,10/Q) → letto da `quality.ts` |
| `quality.ts` | `perceivedQuality` (già presente, smoothing 0,25) → **sostituire smoothing fisso con `effectiveSmoothing`** e aggiungere `brandBonus` + penalità |
| `simulate.ts` | Nessun cambiamento: `quality.ts` espone `updatePerceivedQuality(realQuality, brandEquity, perceivedQuality)` → chiamata nel tick |

---

## 5. Testabilità (casi da verificare)

1. **Zero brand, qualità costante** → perceived converge a real in ~4Q (smoothing 0,25).
2. **Brand 100, real 7** → perceived stazionario ~8,2 (non 8,5 per penalità).
3. **Brand 100, real 3** → perceived stazionario ~3,95 (bonus eroso da penalità).
4. **Brand sale 0→100 in 4Q** → perceived accelera convergenza + guadagna ~1,2 punti extra.
5. **Brand decade 100→0 (stop adv)** → perceived ritorna verso real con smoothing 0,25, bonus svanisce.

---

## 6. Parametri esposti per bilanciamento (config)

```ts
// In EngineConfig o quality.ts
perceivedQuality: {
  baseSmoothing: 0.25,
  maxBrandBonus: 1.5,           // tetto assoluto
  brandEquityForMaxBonus: 100,  // brand a cui si raggiunge il tetto
  maxSmoothingBoost: 0.15,      // smoothing max = 0.40
  overpromisingThreshold: 1.0,  // perceived > real + questo → penalità
  overpromisingPenaltyFactor: 0.30
}
```

Tutti numeri **motivati, limitati, testabili**. Nessuna leva "magica": la pubblicità aiuta, ma la realtà vince sempre.

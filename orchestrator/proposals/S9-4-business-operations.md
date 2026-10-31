# Proposta — S9-4: Scarto produttivo: dalla qualità di materiali e personale ai difetti

- Ruolo: **business-operations**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:33:49

---

# Proposta S9-4: Scarto produttivo — dalla qualità materiali e personale ai difetti

---

## 1. Contesto e parametri invariati (da GDD v0.1, S9-1, S9-2)

| Parametro | Valore | Nota |
|---|---|---|
| **Costo unitario base** | €55,00 | Invariato (comprende materiali €27,50 + manodopera €15,00 + altri €12,50) |
| **Prezzo riferimento** | €100 | Invariato |
| **Domanda totale/trim** | 10.000 u | Invariato |
| **Capacità/stabilimento** | 3.000 u | Invariato |
| **Costo giacenza finito** | €2,50/u/trim | Invariato |
| **Livelli qualità materia (S9-2)** | Economy/Standard/Premium/Ultra | Vedi tabella §2.1 |
| **Default attuale** | Standard material, Base personnel, No overtime | **Deve dare scarto = 0%** |

> **Cosa NON cambia**: motore v0.2, leve Prezzo/Produzione, profili costo S9-1, approvvigionamento S9-2. Si aggiunge solo il modulo **Scarto Produzione** che riduce le unità vendibili e genera costi/ricavi residui.

---

## 2. Architettura dello scarto

### 2.1 Contributi elementari (ciascuno in punti percentuale, pp)

| Fonte | Livello | Contributo scarto (pp) | Nota |
|---|---|---|---|
| **Materia prima** (da S9-2) | Economy | **+3,5** | Peggiore |
|  | Standard | **+1,5** | Base |
|  | Premium | **+0,5** | Migliore |
|  | Ultra | **0,0** | Migliore assoluta |
| **Personale** (interfaccia HR S9-5) | Base | **−1,5** | Compensa Standard |
|  | Skilled | **−2,5** |  |
|  | Expert | **−3,5** |  |
|  | Master | **−4,5** | Migliore |
| **Straordinari** | Attivi | **+1,0** | Affaticamento |
|  | Non attivi | **0,0** |  |

> **Convenzione**: contributi *positivi* peggiorano lo scarto, *negativi* lo migliorano. Il personale "sottrae" scarto grazie a competenza/attenzione.

### 2.2 Formula tasso di scarto netto

```
scrapRate = max( 0,
    materialScrapContribution
  + personnelScrapOffset        // valore negativo = riduzione
  + overtimeScrapPenalty
)
```

- **Pavimento a 0%**: non esiste "scarto negativo".
- **Default (Standard + Base + No OT)**: +1,5 −1,5 + 0 = **0%** → motore attuale invariato.

### 2.3 Interfaccia formale con HR (S9-5)

```typescript
// Contratto minimo che HR deve fornire
interface PersonnelQualityEffect {
  level: 'base' | 'skilled' | 'expert' | 'master';
  scrapOffsetPp: number;      // −1,5 / −2,5 / −3,5 / −4,5
  laborCostPerUnit: number;   // €/unità — da sommare al costo unitario
  trainingLeadTimeQuarters: number; // trimestri per salire di livello
}
```

HR decide i costi/lead time; Operations usa solo `scrapOffsetPp` e `laborCostPerUnit`.

---

## 3. Destino dei pezzi scartati (scelta per stabilimento/trimestre)

| Opzione | Codice | Recupero valore | Costo addizionale | Unità buone finali | Cash flow | Quando ha senso |
|---|---|---|---|---|---|---|
| **Scartare (discard)** | `scrap` | 0% | €0 | 0 | −costo sostenuto | Scarto molto alto, nessun impianto rilavorazione |
| **Rilavorare** | `rework` | 90% diventano buone | **+50% costo unitario base** (€27,50/u) | 0,9 × unità_scartate | −€27,50 × unità_scartate | Scarto medio-basso, capacità libera |
| **Vendere a sconto** | `discount` | 100% vendute come "B-stock" | €0 | 0 | **+40% × prezzo_vendita** × unità_scartate | Scarto alto, serve cassa immediata, brand non critico |

**Note**:
- Rilavorazione consuma capacità produttiva: 1 unità rilavorata = 1 unità di capacità (stessa linea).
- Vendita a sconto: prezzo = 40% del prezzo di listino del giocatore (non €100). Nessun effetto brand modellato qui (Marketing futuro).
- Default: `scrap` (coerente con motore attuale dove scarto=0).

---

## 4. Dimostrazione numerica: due strade equivalenti, costi diversi

### 4.1 Assunzioni di costo personale (da concordare con HR S9-5)

| Livello | Costo manodopera/u | Delta vs Base |
|---|---|---|
| Base | €15,00 | — |
| Skilled | €16,50 | +€1,50 (+10%) |
| Expert | €18,75 | +€3,75 (+25%) |
| Master | €21,75 | +€6,75 (+45%) |

> Costo unitario base €55 = Materiali €27,50 (Standard) + Manodopera €15,00 (Base) + Altri €12,50.

### 4.2 Path A: Materia **Economy** + Personale **Master**

| Voce | Valore |
|---|---|
| Materiali (Economy) | €24,20 (−12% vs €27,50) |
| Manodopera (Master) | €21,75 |
| Altri | €12,50 |
| **Costo unitario prima scarto** | **€58,45** |
| Scarto netto | max(0, +3,5 −4,5 + 0) = **0%** |
| Unità buone / unità avviate | 1,000 |
| **Costo unitario buono effettivo** | **€58,45** |

### 4.3 Path B: Materia **Ultra** + Personale **Base**

| Voce | Valore |
|---|---|
| Materiali (Ultra) | €37,13 (+35% vs €27,50) |
| Manodopera (Base) | €15,00 |
| Altri | €12,50 |
| **Costo unitario prima scarto** | **€64,63** |
| Scarto netto | max(0, 0,0 −1,5 + 0) = **0%** |
| Unità buone / unità avviate | 1,000 |
| **Costo unitario buono effettivo** | **€64,63** |

### 4.4 Confronto

| Metrica | Path A (Economy+Master) | Path B (Ultra+Base) | Delta |
|---|---|---|---|
| Costo unitario buono | €58,45 | €64,63 | **−€6,18 (−9,6%)** |
| Scarto | 0% | 0% | = |
| Investimento personale | Alto (formazione Master) | Basso | Path A richiede tempo/risorse HR |
| Flessibilità | Personale Master scarsamente sostituibile | Materia Ultra ordinabile | Path B più agile su volumi |
| Rischio fornitura | Economy = fornitore commodity, rischio rottura basso | Ultra = fornitore nicchia, rischio concentrazione | Diverso profilo rischio |

**Conclusione**: Path A costa **~€6/unità in meno** ma richiede personale Master (lead time formazione, retention risk). Path B costa di più ma si attiva subito cambiando fornitore. **Nessuna domina sempre** — la scelta dipende da orizzonte temporale, cassa, strategia HR.

---

## 5. Esempi di trade-off reali (scelte non banali)

### 5.1 Straordinari: più output ma più scarto

Situazione: domanda 3.500 u, capacità standard 3.000 u (1 stabilimento). Prezzo €100.

| Opzione | Unità prodotte | Scarto | Unità buone | Costo unitario medio* | Ricavo | Profitto |
|---|---|---|---|---|---|---|
| **No OT** | 3.000 | 0% (Std+Base) | 3.000 | €55,00 | €300.000 | €300k − €165k − €50k = **€85k** |
| **Con OT** | 4.200 | 1,0% (+1,0pp OT) | 4.158 | €55×0,714 + €77×0,286 = **€61,3** | €415.800 | €415,8k − €254,8k − €50k = **€111k** |

*Costo medio ponderato: 3.000 u @€55 + 1.200 u @€77 (1,4×) = €254.800 / 4.158 buone = €61,3/u.

**Verdetto**: OT conviene (+€26k) **se** la domanda c'è. Ma se domanda = 3.200:
- No OT: vende 3.000, profitto €85k
- Con OT: produce 4.200, scarta 42, vende 3.200 (capacità mercato), 958 invendute → magazzino €2.500 + costo produzione sprecato. **OT perde**.

→ La leva OT è **vera scelta**: dipende da domanda attesa e costo magazzino.

### 5.2 Rilavorare vs Scartare vs Scontare

Situazione: 1.000 unità scartate (scarto 10% su 10.000 prodotte), prezzo vendita €100, costo unitario €55.

| Opzione | Cash flow immediato | Unità buone recuperate | Costo opportunità capacità | Valore atteso netto |
|---|---|---|---|---|
| **Scartare** | €0 | 0 | 0 | **−€55.000** (costo sostenuto perso) |
| **Rilavorare** | −€27.500 | 900 | 900 u capacità | 900×€100 − 900×€55 − €27.500 = **+€13.000** |
| **Scontare (40%)** | +€40.000 | 0 | 0 | **+€40.000 − €55.000 = −€15.000** |

**Verdetto**:
- Se **capacità libera** → Rilavorare domina (+€13k vs −€15k vs −€55k).
- Se **capacità satura** (ogni unità rilavorata sposta una vendita a €100) → Rilavorare costa €100 margine perso + €27,50 = €127,50/u → Scontare (+€40k) domina.
- Se **cassa critica** → Scontare dà €40k subito.

→ Scelta **non banale**, dipende da saturazione impianti e fabbisogno cassa.

---

## 6. KPI di produzione (estende `ControllingKPI`)

| KPI | Formula | Target indicativo |
|---|---|---|
| **Scrap Rate %** | unità_scartate / unità_avviate | < 2% (eccellenza < 0,5%) |
| **First Pass Yield** | 1 − scrapRate | > 98% |
| **Rework Rate** | unità_rilavorate / unità_scartate | 0% se capacità satura, >80% se libera |
| **Costo scarto per unità buona** | (costo_scarto + costo_rilavorazione − ricavo_sconto) / unità_buone_vendute | < €3/u |
| **OEE Qualità** | unità_buone / unità_avviate | Componente qualità OEE |

---

## 7. Eventi/imprevisti legati allo scarto (per Market Events v0.2+)

| Evento | Probabilità/trim | Effetto | Durata |
|---|---|---|---|
| **Picco difettosità materiale** | 5% | Scarto materia +2,0pp (tutti i livelli) | 1 trim |
| **Turnover personale chiave** | 3% | Offset personale −1,0pp (livello effettivo scende) | 2 trim |
| **Guasto impianto critico** | 4% | Scarto +1,5pp + capacità −20% | 1 trim |
| **Nuovo standard qualità cliente** | 2% (da Q3) | Scarto base +0,5pp permanente | Permanente |

---

## 8. Casi limite e default safety

| Caso | Comportamento |
|---|---|
| **Default (Standard + Base + No OT)** | Scarto = 0% → **identico a motore v0.2** |
| **Solo materia cambiata (es. Economy), personale Base** | Scarto = +3,5 −1,5 = **2,0%** |
| **Solo personale cambiato (es. Expert), materia Standard** | Scarto = +1,5 −3,5 = **0%** (pavimento) |
| **Straordinari + materia Economy + personale Base** | Scarto = +3,5 −1,5 +1,0 = **3,0%** |
| **Scarto > 20%** | Cap automatico al 20% (evita divisioni per zero / loop infiniti), log warning |
| **Rilavorazione senza capacità** | Opzione disabilitata in UI, forced `scrap` o `discount` |
| **Vendita sconto con prezzo < €22** (40% < costo variabile) | Warning: "Vendi sotto costo variabile", ma permesso (cash desperation) |

---

## 9. Riepilogo parametri concreti (pronti per implementazione)

```typescript
// apps/web/src/lib/game-engine/scrap.ts (nuovo modulo)
export const SCRAP_CONFIG = {
  // Contributi materia (da S9-2)
  materialScrapPp: {
    eco:   +3.5,
    std:   +1.5,
    prem:  +0.5,
    ultra:  0.0,
  } as const,

  // Offset personale (interfaccia HR S9-5)
  personnelScrapOffsetPp: {
    base:    -1.5,
    skilled: -2.5,
    expert:  -3.5,
    master:  -4.5,
  } as const,

  // Penalità straordinari
  overtimeScrapPenaltyPp: 1.0,

  // Destino scarto
  scrapFate: {
    scrap:     { recoveryRate: 0.00, addedCostPerUnit: 0,     capacityPerUnit: 0,   cashMultiplier: 0.00 },
    rework:    { recoveryRate: 0.90, addedCostPerUnit: 27.50, capacityPerUnit: 1,   cashMultiplier: 0.00 }, // 50% unitCost base
    discount:  { recoveryRate: 0.00, addedCostPerUnit: 0,     capacityPerUnit: 0,   cashMultiplier: 0.40 }, // 40% prezzo vendita
  } as const,

  // Pavimenti/massimali
  minScrapRate: 0.00,
  maxScrapRate: 0.20,
  reworkSuccessRate: 0.90,
} as const;
```

---

## 10. Cosa serve da HR (S9-5) per chiudere il cerchio

| Voce | Valore atteso | Note |
|---|---|---|
| `laborCostPerUnit` per livello | €15,00 / €16,50 / €18,75 / €21,75 | Da validare con HR |
| `trainingLeadTimeQuarters` | 0 / 2 / 4 / 6 | Tempo per salire livello |
| `maxPersonnelPerLevel` | Vincoli organico | Es. max 20% Master |
| `hiringCostPerLevel` | Costo assunzione/formazione | Capex HR |

> **Consegna**: HR fornisce la tabella sopra; Operations usa `scrapOffsetPp` e `laborCostPerUnit` nel motore. Nessun altro accoppiamento.

---

## 11. Checklist accettazione

- [x] Tasso scarto base (1,5% materia Standard) + formula con materia/personale/OT
- [x] Effetto OT quantificato (+1,0pp)
- [x] Destino scarto: 3 opzioni con numeri (scrap/rework/discount)
- [x] Dimostrato equivalenza Path A (Economy+Master €58,45) vs Path B (Ultra+Base €64,63) — stesso scarto 0%, costo diverso
- [x] Default (Standard+Base+No OT) = 0% scarto → motore invariato
- [x] Trade-off reali mostrati (OT conviene solo se domanda > capacità; rework conviene solo se capacità libera)
- [x] Tutti i parametri numerici concreti e giustificati
- [x] Interfaccia HR formale definita (`PersonnelQualityEffect`)

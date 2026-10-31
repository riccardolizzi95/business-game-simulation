# Proposta — S9-1: Struttura di costo PARAMETRICA per partita (materie prime / lavoro / fissi)

- Ruolo: **game-designer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 21:27:40

---

# Proposta S9-1: Struttura di costo parametrica per profilo di prodotto

## 1. Profili di prodotto (archetipi)

Quattro profili, tutti con **costo unitario base €55** (stesso totale, ripartizione diversa). Il profilo **`standard`** è il default e riproduce **esattamente** l'economia attuale.

| Profilo (`id`) | Nome | Materie prime | Lavoro | Costi fissi allocati | Costo unitario base |
|---|---|---|---|---|---|
| `standard` | **Standard** (default) | 50% → **€27,50** | 30% → **€16,50** | 20% → **€11,00** | **€55,00** |
| `material_intensive` | **Material-Intensive** (es. elettronica, chimica) | 70% → **€38,50** | 15% → **€8,25** | 15% → **€8,25** | **€55,00** |
| `labor_intensive` | **Labor-Intensive** (es. assemblaggio premium, artigianato) | 30% → **€16,50** | 55% → **€30,25** | 15% → **€8,25** | **€55,00** |
| `capital_intensive` | **Capital-Intensive** (es. macchinari, automotive) | 40% → **€22,00** | 20% → **€11,00** | 40% → **€22,00** | **€55,00** |

> **Cosa NON cambia**: prezzo riferimento €100, domanda 10.000 u./trim., capacità 3.000 u./stabilimento, straordinari 1,4× (capacità e costo), costi fissi impianto €30k/trim., overhead €20k/trim., giacenza €2,50/u./trim., capitale iniziale €1M, 8 trimestri. Le leve **Prezzo** e **Produzione** (stabilimenti/straordinari) restano identiche; si aggiungono le leve **Approvvigionamento** e **HR** che agiscono sui componenti.

---

## 2. Traduzione in valori assoluti e oscillazione in partita

Ogni componente ha un **costo base per unità** (tabella sopra) e un **moltiplicatore dinamico** che varia per effetto delle decisioni del giocatore. Il costo unitario corrente è la somma dei tre componenti attuali.

### Range di oscillazione (moltiplicatori sul costo base del componente)

| Componente | Min | Max | Driver principali (leve) |
|---|---|---|---|
| `rawMaterials` (materie prime) | **0,80** (−20%) | **1,20** (+20%) | Livello approvvigionamento, tier fornitori, indice commodity, contratti quadro |
| `labor` (lavoro) | **0,75** (−25%) | **1,25** (+25%) | Automazione, formazione, mix straordinari/ordinario, pressione salariale |
| `fixedAlloc` (fissi allocati) | **0,85** (−15%) | **1,15** (+15%) | Tasso utilizzo impianti, ammortamento nuovi stabilimenti, capex automazione |

Le **percentuali** derivano *a posteriori*:
```
pctRaw = rawMaterialsCurrent / unitCostCurrent
pctLabor = laborCurrent / unitCostCurrent
pctFixed = fixedAllocCurrent / unitCostCurrent
```
Sommano sempre 100%. Nessun parametro "percentuale" viene memorizzato: si memorizzano i tre **costi correnti per unità** (o i tre moltiplicatori).

### Esempio: `material_intensive` con buon approvvigionamento (moltiplicatore 0,85)
- Raw: 38,50 × 0,85 = **32,73**
- Labor: 8,25 × 1,00 = **8,25**
- Fixed: 8,25 × 1,00 = **8,25**
- **Unit cost = 49,23** (−10,5% vs base)
- Quote: 66,5% / 16,8% / 16,8%

---

## 3. Impatto strategico per profilo (con esempio numerico)

**Scenario comune (Q3, 1 stabilimento, no straordinari, prezzo €95, 2 player simmetrici):**
- Domanda attratta each = 5.000 u. → capacità 3.000 → **vendite 3.000**, persi 2.000
- Ricavi = 3.000 × 95 = **€285.000**
- Costi fissi periodo = 30.000 (impianto) + 20.000 (overhead) = **€50.000**

| Profilo | Situazione | Costo unitario | Costo produzione (3.000 u.) | Profitto trim. | Δ vs Standard base |
|---|---|---|---|---|---|
| **Standard** | Base (nessun investimento) | 55,00 | 165.000 | **70.000** | — |
| **Material-Intensive** | **Buon approvvigionamento** (raw ×0,85) | 49,23 | 147.690 | **87.310** | **+17.310** |
|  | Cattivo approvvigionamento (raw ×1,15) | 60,78 | 182.340 | **52.660** | **−17.340** |
| **Labor-Intensive** | **Buon HR** (labor ×0,80) | 48,95 | 146.850 | **88.150** | **+18.150** |
|  | Cattivo HR (labor ×1,20) | 61,05 | 183.150 | **51.850** | **−18.150** |
| **Capital-Intensive** | **Alta saturazione** (2 impianti al 90% → fixed ×0,88) | 51,26 | 153.780 | **81.220** | **+11.220** |
|  | Bassa saturazione (1 impianto al 50% → fixed ×1,10) | 57,20 | 171.600 | **63.400** | **−6.600** |

### Cosa premia / punisce ogni profilo

| Profilo | **Premia** (leva decisiva) | **Punisce** (leva trascurata) | Perché non è ridondante |
|---|---|---|---|
| `standard` | Equilibrio: miglioramenti moderati su tutte e tre le leve danno ritorni simili | Nessuna leva domina; errore su una leva si paga meno che negli altri profili | **Baseline di non-regressione**: motore senza nuove leve = comportamento identico a oggi |
| `material_intensive` | **Approvvigionamento**: ogni −1% sul raw vale ~€0,385/u. (vs €0,165 standard) | HR e automazione: impatto marginale (labor+fixed = solo 30% del costo) | Se ignori approvvigionamento, il costo unitario **esplode** (+20% = +€7,7/u.); negli altri profili lo stesso shock vale ≤€3,3/u. |
| `labor_intensive` | **HR / Automazione**: ogni −1% sul labor vale ~€0,30/u. (vs €0,165 standard) | Approvvigionamento: raw pesa solo 30% | Turni straordinari costosi (labor base alto → overtime 1,4× morde di più); formazione/automazione diventano **necessarie**, non opzionali |
| `capital_intensive` | **Saturazione impianti / Capex**: fixed allocato scende forte con utilizzo alto (economies of scale) | Sottoutilizzo: fixed allocato sale → costo unitario sale anche senza produrre | Spinge a **pochi impianti grandi** ben riempiti; penalizza strategie "tanti impianti flessibili". Leva distribuzione/volume diventa critica. |

> **Dimostrazione di non-dominanza**:  
> - A parità di investimento (es. −10% su una leva), `material_intensive` guadagna **€11.550/trim.** sul raw, `labor_intensive` guadagna **€9.075/trim.** sul labor, `capital_intensive` guadagna **€5.940/trim.** sul fixed (a 90% utilizzo).  
> - Ma se il mercato richiede **flessibilità** (domanda volatile), `capital_intensive` soffre il fixed allocato alto; se le commodity **impazziscono**, `material_intensive` è esposto; se i salari **schizzano**, `labor_intensive` paga il conto. **Nessun profilo vince sempre**.

---

## 4. Campi proposti per `EngineConfig` (coerenti con `types.ts`)

```ts
// Nuovi tipi in types.ts
export type ProductProfileId = 'standard' | 'material_intensive' | 'labor_intensive' | 'capital_intensive';

export interface ComponentCosts {
  rawMaterials: number;   // €/unità corrente
  labor: number;          // €/unità corrente
  fixedAlloc: number;     // €/unità corrente (overhead allocato + manutenzione/u. + quote ammortamento/u.)
}

export interface ComponentMultipliers {
  rawMaterials: number;   // moltiplicatore su base (default 1.0)
  labor: number;          // moltiplicatore su base
  fixedAlloc: number;     // moltiplicatore su base
}

export interface ProductProfileConfig {
  id: ProductProfileId;
  name: string;
  baseComponentCosts: ComponentCosts;   // somma = 55 per tutti
  oscillationRange: {
    rawMaterials: { min: number; max: number };  // es. { min: 0.80, max: 1.20 }
    labor: { min: number; max: number };         // es. { min: 0.75, max: 1.25 }
    fixedAlloc: { min: number; max: number };    // es. { min: 0.85, max: 1.15 }
  };
  // Descrizione strategica (per UI/tooltip)
  strategicFocus: {
    primaryLever: 'supply' | 'hr' | 'capacity';
    secondaryLever: 'supply' | 'hr' | 'capacity';
    weakness: string;
  };
}

// Estensione EngineConfig
export interface EngineConfig {
  // ... campi esistenti ...
  productProfile: ProductProfileId;                    // scelto in lobby, default 'standard'
  productProfiles: Record<ProductProfileId, ProductProfileConfig>; // definizioni complete
  currentComponentMultipliers: ComponentMultipliers;   // stato vivo della partita (inizializzati a 1.0)
}
```

### Valori concreti per `productProfiles` (da mettere in `DEFAULT_CONFIG`)

```ts
productProfiles: {
  standard: {
    id: 'standard',
    name: 'Standard',
    baseComponentCosts: { rawMaterials: 27.50, labor: 16.50, fixedAlloc: 11.00 },
    oscillationRange: {
      rawMaterials: { min: 0.80, max: 1.20 },
      labor: { min: 0.75, max: 1.25 },
      fixedAlloc: { min: 0.85, max: 1.15 }
    },
    strategicFocus: { primaryLever: 'supply', secondaryLever: 'hr', weakness: 'Nessuna leva domina; ritorni moderati su tutto' }
  },
  material_intensive: {
    id: 'material_intensive',
    name: 'Material-Intensive',
    baseComponentCosts: { rawMaterials: 38.50, labor: 8.25, fixedAlloc: 8.25 },
    oscillationRange: {
      rawMaterials: { min: 0.80, max: 1.20 },
      labor: { min: 0.75, max: 1.25 },
      fixedAlloc: { min: 0.85, max: 1.15 }
    },
    strategicFocus: { primaryLever: 'supply', secondaryLever: 'capacity', weakness: 'Esposizione commodity; HR/automazione basso impatto' }
  },
  labor_intensive: {
    id: 'labor_intensive',
    name: 'Labor-Intensive',
    baseComponentCosts: { rawMaterials: 16.50, labor: 30.25, fixedAlloc: 8.25 },
    oscillationRange: {
      rawMaterials: { min: 0.80, max: 1.20 },
      labor: { min: 0.75, max: 1.25 },
      fixedAlloc: { min: 0.85, max: 1.15 }
    },
    strategicFocus: { primaryLever: 'hr', secondaryLever: 'supply', weakness: 'Straordinari costosi; sensibile a shock salariali' }
  },
  capital_intensive: {
    id: 'capital_intensive',
    name: 'Capital-Intensive',
    baseComponentCosts: { rawMaterials: 22.00, labor: 11.00, fixedAlloc: 22.00 },
    oscillationRange: {
      rawMaterials: { min: 0.80, max: 1.20 },
      labor: { min: 0.75, max: 1.25 },
      fixedAlloc: { min: 0.85, max: 1.15 }
    },
    strategicFocus: { primaryLever: 'capacity', secondaryLever: 'supply', weakness: 'Sottoutilizzo punito; serve volume stabile' }
  }
}
```

---

## 5. Casi limite & garanzia non-regressione

| Caso | Comportamento |
|---|---|
| **Motore senza nuove leve** (codice attuale) | `productProfile = 'standard'`, `currentComponentMultipliers = {1,1,1}` → `unitCost = 27,5+16,5+11 = 55`. **Identico bit-per-bit a v0.2**. |
| **Profilo `standard` + moltiplicatori 1.0** | Riproduce **esattamente** l'economia attuale (costo 55, quote 50/30/20). Nessuna regressione. |
| **Moltiplicatore al min/massimo** | Clampato dentro `oscillationRange`. Somma componenti = nuovo unitCost. Quote ricalcolate. |
| **Cambio profilo a partita iniziata** | **Vietato**: `productProfile` si sceglie in lobby (immutabile per la partita). Solo i moltiplicatori variano. |
| **Straordinari** | Costo unitario straordinario = `unitCostCurrent × 1.4` (moltiplicatore applicato **dopo** la somma componenti). Coerente con oggi. |
| **Giacenza** | `HOLDING_COST_PER_UNIT_PER_QUARTER = 2.50` invariato (costo logistico, non produttivo). |
| **KPI Controlling** | `unitCost` nei KPI = somma tre componenti correnti. `costBreakdown` = { raw, labor, fixed } per analisi. |

---

## 6. Note di bilanciamento (per QA)

- **Ampiezza oscillazione** (±20/25/15%) calibrata perché un investimento "massimo" su una leva sposti il profitto trim. di **~15-18k €** (≈25% del profitto base), abbastanza da essere decisivo ma non da rompere il gioco.
- **Capital-intensive** ha range fixed più stretto (±15%) perché il fixed allocato è già alto (40%); un ±20% creerebbe troppa varianza.
- **Labor-intensive** ha range labor più ampio (−25%/+25%) per riflettere automazione (forte riduzione) e straordinari/scioperi (forte aumento).
- **Eventi di mercato** (già in v0.2) possono colpire `rawMaterials` (commodity shock) o `labor` (salario minimo) → moltiplicatori temporanei fuori range base, poi rientro.

---

**Prossimo passo (Architect/Dev):** aggiungere i tipi sopra in `types.ts`, inizializzare `currentComponentMultipliers` in `simulate.ts` al tick 0, e far leggere `unitCost` come somma dei tre componenti correnti (invece della costante `config.unitCost`). Le leve **Supply** e **HR** (S9-2, S9-3) scriveranno sui moltiplicatori.

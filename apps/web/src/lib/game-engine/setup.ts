/**
 * Parametri di SETUP della partita e derivazione dei costi.
 *
 * Regole definite dal Game Designer (orchestrator/proposals/S10-1-game-designer.md), su
 * indicazione dell'utente: **nessun costo va cablato come numero fisso**. Si impostano pochi
 * parametri a inizio partita e da quelli si deriva tutto, «in modo da rendere dinamico il tutto
 * e non vincolato a un unico scenario».
 *
 * È il motivo per cui due documenti di design erano arrivati a contraddirsi sul prezzo del kit
 * (25,00 € contro 27,50 €): finché un costo è un numero scritto a mano, prima o poi qualcuno ne
 * scrive un altro.
 *
 * Modulo PURO: nessun effetto collaterale, nessuna casualità.
 */

/** Parametri scelti a inizio partita. Da questi si deriva l'intera struttura di costo. */
export interface GameSetup {
  /** Prezzo standard di riferimento del prodotto (€). */
  standardPrice: number;
  /** Incidenza del costo variabile unitario sul prezzo standard (0..1). */
  variableCostRatio: number;
  /** Quota delle materie prime sul costo variabile (0..1). Il resto è costo del lavoro. */
  materialShareOfVariableCost: number;
  /** Volume di riferimento per allocare i costi fissi su base unitaria (unità/trimestre). */
  referenceVolume: number;
  /** Capacità standard di uno stabilimento (unità/trimestre). */
  plantCapacity: number;
  /** Overhead aziendale fisso (€/trimestre). */
  overheadPerQuarter: number;
  /** Costo fisso per stabilimento (€/trimestre). */
  plantFixedCostPerQuarter: number;
  /**
   * Scorta di materie prime con cui si parte (kit).
   * Serve a non trovarsi fermi al primo trimestre: da qui in poi ci si riapprovvigiona ordinando.
   */
  initialRawMaterialStock: number;
}

/**
 * Default che riproducono ESATTAMENTE l'economia attuale: prezzo 100 €, costo unitario 55 €.
 * La non-regressione è garantita dall'aritmetica, non da una coincidenza da verificare a mano.
 */
export const DEFAULT_SETUP: GameSetup = {
  standardPrice: 100,
  variableCostRatio: 0.55,
  materialShareOfVariableCost: 0.6,
  referenceVolume: 10_000,
  plantCapacity: 3_000,
  overheadPerQuarter: 20_000,
  plantFixedCostPerQuarter: 30_000,
  // Due trimestri di produzione a capacita' piena di uno stabilimento: si parte tranquilli, ma
  // se non si ordina ci si ferma al terzo. E' la scorta che rende il riordino una vera decisione.
  initialRawMaterialStock: 6_000,
};

/** Costi derivati dai parametri di setup. */
export interface DerivedCosts {
  /** Costo variabile per unità (materie prime + lavoro). */
  unitCost: number;
  /** Quota di materie prime per unità. */
  materialCostPerUnit: number;
  /** Quota di costo del lavoro per unità. */
  laborCostPerUnit: number;
  /** Costi fissi totali al volume di riferimento (€/trimestre). */
  totalFixedCostAtRefVolume: number;
  /** Costi fissi allocati per unità al volume di riferimento. */
  fixedCostPerUnitAtRef: number;
}

/**
 * Arrotonda ai centesimi.
 *
 * Indispensabile, non cosmetico: in virgola mobile `100 × 0.55` vale 55.00000000000001 e
 * `55 × 0.4` vale 22.000000000000004. Senza arrotondamento un `toBe(55)` fallisce e il
 * messaggio d'errore («expected 55.00000000000001 to be 55») sembra un assurdo — è esattamente
 * l'ostacolo su cui si è arenato chi ha implementato questo modulo prima.
 * Arrotondare è anche corretto nel dominio: i costi sono importi in euro.
 */
export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Deriva l'intera struttura di costo dai parametri di setup. Funzione pura. */
export function deriveCosts(setup: GameSetup = DEFAULT_SETUP): DerivedCosts {
  const unitCost = roundCents(setup.standardPrice * setup.variableCostRatio);
  const materialCostPerUnit = roundCents(unitCost * setup.materialShareOfVariableCost);
  // Il lavoro è il complemento del materiale, calcolato per differenza: così la somma delle
  // due quote è sempre esattamente `unitCost`, senza scarti di arrotondamento.
  const laborCostPerUnit = roundCents(unitCost - materialCostPerUnit);

  const plantsAtRefVolume = setup.referenceVolume / setup.plantCapacity;
  const totalFixedCostAtRefVolume = roundCents(
    setup.overheadPerQuarter + plantsAtRefVolume * setup.plantFixedCostPerQuarter,
  );
  const fixedCostPerUnitAtRef = roundCents(totalFixedCostAtRefVolume / setup.referenceVolume);

  return {
    unitCost,
    materialCostPerUnit,
    laborCostPerUnit,
    totalFixedCostAtRefVolume,
    fixedCostPerUnitAtRef,
  };
}

/** Profili di prodotto pronti all'uso (S10-1). Cambiano l'economia, non le regole. */
export const PRODUCT_PROFILES: Record<string, Partial<GameSetup>> = {
  /** Riproduce l'economia attuale. */
  standard: {},
  /** Prezzo alto, margine ampio, peso del lavoro specializzato. */
  premium: { standardPrice: 180, variableCostRatio: 0.45, materialShareOfVariableCost: 0.4 },
  /** Prezzo basso, margine sottile, materiali dominanti. */
  commodity: { standardPrice: 60, variableCostRatio: 0.72, materialShareOfVariableCost: 0.75 },
};

/** Applica un profilo di prodotto sopra i default, lasciando intatto ciò che il profilo non tocca. */
export function setupFromProfile(profile: keyof typeof PRODUCT_PROFILES | string): GameSetup {
  return { ...DEFAULT_SETUP, ...(PRODUCT_PROFILES[profile] ?? {}) };
}

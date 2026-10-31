/**
 * Modulo forza lavoro (HR) — organico a mix, bacino finito, asta salariale.
 *
 * Implementa le decisioni S10-2 (organico come mix) e S11-2 (mercato del lavoro finito e conteso).
 * Con `laborPoolEnabled = false` (default) il comportamento è identico al motore precedente
 * (bacino illimitato, nessuna competizione).
 */

import { mulberry32 } from "./market";

// ============================================================================
// PARAMETRI DECISI (S10-2 e S11-2) — costanti esportate
// ============================================================================

/** Livelli di competenza. */
export type WorkforceLevel = "junior" | "skilled" | "expert";

/** Mix di organico: numero di addetti per livello. */
export interface WorkforceMix {
  junior: number;
  skilled: number;
  expert: number;
}

/** Parametri per ciascun livello (S10-2). */
export interface LevelParams {
  /** Stipendio per trimestre (€). */
  salary: number;
  /** Produttività (unità/trimestre per addetto). */
  productivity: number;
  /** Scarto base percentuale (es. 0.03 = 3%). */
  defectRate: number;
  /** Costo una-tantum di assunzione (€). */
  hiringCost: number;
  /** Trimestri necessari per completare l'assunzione (ramp-up). */
  hiringQuarters: number;
  /** Costo una-tantum di licenziamento (€). */
  firingCost: number;
}

export const LEVEL_PARAMS: Record<WorkforceLevel, LevelParams> = {
  junior: {
    salary: 2_500,
    productivity: 125,
    defectRate: 0.03,
    hiringCost: 2_000,
    hiringQuarters: 1,
    firingCost: 7_500,
  },
  skilled: {
    salary: 3_500,
    productivity: 175,
    defectRate: 0.015,
    hiringCost: 5_000,
    hiringQuarters: 2,
    firingCost: 21_000,
  },
  expert: {
    salary: 5_000,
    productivity: 250,
    defectRate: 0.005,
    hiringCost: 15_000,
    hiringQuarters: 3,
    firingCost: 60_000,
  },
};

/** Organico di default per stabilimento (S10-2 §2). */
export const DEFAULT_MIX_PER_PLANT: WorkforceMix = {
  junior: 6,
  skilled: 8,
  expert: 4,
};

/** Parametri del bacino di mercato (S11-2 §1). */
export interface LaborPoolConfig {
  /** Se false, bacino illimitato, nessuna competizione (comportamento pre‑S11). */
  enabled: boolean;
  /** Frazione della forza‑lavoro teorica necessaria a servire il 100% della domanda. */
  poolRatio: number;
  /** Distribuzione dei livelli nel bacino (somma = 1). */
  skillDistribution: Record<WorkforceLevel, number>;
  /** Produttività di riferimento per uno Skilled (unità/trimestre). */
  baseProductivityPerWorker: number;
  /** Moltiplicatori di produttività rispetto a baseProductivityPerWorker. */
  productivityMultiplier: Record<WorkforceLevel, number>;
  /** Tasso di uscita naturale per trimestre (pensioni, cambio settore). */
  naturalAttritionRate: number;
  /** Tasso di nuovi ingressi per trimestre (scalato con la crescita della domanda). */
  newEntrantsRate: number;
  /** Trimestri di attesa prima che un licenziato rientri nel bacino. */
  firedWorkerReturnDelay: number;
  /** Se true, attiva la formazione interna tra livelli. */
  trainingEnabled: boolean;
  /** Durata della formazione in trimestri. */
  trainingDurationQuarters: {
    juniorToSkilled: number;
    skilledToExpert: number;
  };
  /** Costo per trimestre per lavoratore in formazione. */
  trainingCostPerQuarter: {
    juniorToSkilled: number;
    skilledToExpert: number;
  };
  /** Produttività relativa al livello di partenza durante la formazione. */
  trainingProductivity: {
    juniorToSkilled: number;
    skilledToExpert: number;
  };
}

export const DEFAULT_LABOR_POOL_CONFIG: LaborPoolConfig = {
  enabled: false,
  poolRatio: 0.85,
  skillDistribution: { junior: 0.50, skilled: 0.35, expert: 0.15 },
  baseProductivityPerWorker: 100,
  productivityMultiplier: { junior: 0.7, skilled: 1.0, expert: 1.4 },
  naturalAttritionRate: 0.025,
  newEntrantsRate: 0.03,
  firedWorkerReturnDelay: 1,
  trainingEnabled: true,
  trainingDurationQuarters: { juniorToSkilled: 2, skilledToExpert: 2 },
  trainingCostPerQuarter: { juniorToSkilled: 2_000, skilledToExpert: 3_500 },
  trainingProductivity: { juniorToSkilled: 0.5, skilledToExpert: 0.7 },
};

// ============================================================================
// CALCOLI BASE (indipendenti dal bacino)
// ============================================================================

/**
 * Calcola il costo del personale per trimestre dato un mix.
 * Il costo è fisso: si paga a prescindere dalla produzione.
 */
export function calculateWorkforceCost(mix: WorkforceMix): number {
  let cost = 0;
  for (const level of Object.keys(mix) as WorkforceLevel[]) {
    cost += mix[level] * LEVEL_PARAMS[level].salary;
  }
  return cost;
}

/**
 * Calcola la capacità produttiva effettiva (unità/trimestre) fornita dal mix.
 * Tiene conto della produttività per addetto.
 */
export function calculateWorkforceCapacity(mix: WorkforceMix): number {
  let capacity = 0;
  for (const level of Object.keys(mix) as WorkforceLevel[]) {
    capacity += mix[level] * LEVEL_PARAMS[level].productivity;
  }
  return capacity;
}

/**
 * Calcola lo scarto percentuale medio ponderato del mix.
 */
export function calculateAverageDefectRate(mix: WorkforceMix): number {
  let totalDefects = 0;
  let totalWorkers = 0;
  for (const level of Object.keys(mix) as WorkforceLevel[]) {
    const workers = mix[level];
    totalDefects += workers * LEVEL_PARAMS[level].defectRate;
    totalWorkers += workers;
  }
  return totalWorkers > 0 ? totalDefects / totalWorkers : 0;
}

// ============================================================================
// BACINO CONDIVISO (stato persistente)
// ============================================================================

/** Stato del bacino per un livello. */
export interface LaborPoolLevelState {
  /** Numero di lavoratori disponibili per assunzione. */
  available: number;
  /** Licenziati che torneranno dopo `firedWorkerReturnDelay` trimestri.
   *  Array di quantità per ogni trimestre di attesa rimanente. */
  returning: number[];
}

/** Stato completo del bacino di mercato. */
export interface LaborPoolState {
  /** Per ogni livello. */
  levels: Record<WorkforceLevel, LaborPoolLevelState>;
  /** Trimestre corrente (per evoluzione). */
  quarter: number;
}

/**
 * Crea lo stato iniziale del bacino in base alla domanda teorica.
 * @param baseDemand Domanda totale di mercato (unità/trimestre).
 * @param config Configurazione del bacino.
 */
export function initializeLaborPool(
  baseDemand: number,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): LaborPoolState {
  if (!config.enabled) {
    // Con bacino disabilitato, lo stato è vuoto (non verrà usato).
    return {
      levels: {
        junior: { available: 0, returning: [] },
        skilled: { available: 0, returning: [] },
        expert: { available: 0, returning: [] },
      },
      quarter: 0,
    };
  }

  // Forza‑lavoro teorica necessaria (in Skilled‑equivalenti).
  const theoreticalWorkforce = baseDemand / config.baseProductivityPerWorker;
  // Bacino totale disponibile.
  const totalPool = theoreticalWorkforce * config.poolRatio;

  const levels: Record<WorkforceLevel, LaborPoolLevelState> = {
    junior: { available: 0, returning: [] },
    skilled: { available: 0, returning: [] },
    expert: { available: 0, returning: [] },
  };

  for (const level of Object.keys(config.skillDistribution) as WorkforceLevel[]) {
    const share = config.skillDistribution[level];
    // Disponibili iniziali = quota del bacino totale.
    // Nota: non convertiamo in unità equivalenti perché la distribuzione è già per livello.
    levels[level].available = Math.floor(totalPool * share);
  }

  return { levels, quarter: 0 };
}

/**
 * Evolve il bacino di un trimestre:
 * - Applica l'uscita naturale (attrition).
 * - Fa rientrare i licenziati in attesa.
 * - Aggiunge nuovi ingressi (scalati con la crescita della domanda).
 * @param pool Stato attuale.
 * @param demandGrowthRate Tasso di crescita della domanda (es. 0.02 per +2%).
 * @param config Configurazione.
 */
export function evolveLaborPool(
  pool: LaborPoolState,
  demandGrowthRate: number,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): LaborPoolState {
  if (!config.enabled) {
    return { ...pool, quarter: pool.quarter + 1 };
  }

  const newLevels: Record<WorkforceLevel, LaborPoolLevelState> = {
    junior: { available: 0, returning: [] },
    skilled: { available: 0, returning: [] },
    expert: { available: 0, returning: [] },
  };

  for (const level of Object.keys(pool.levels) as WorkforceLevel[]) {
    const state = pool.levels[level];
    // 1) Uscita naturale.
    let available = state.available;
    const lost = Math.floor(available * config.naturalAttritionRate);
    available -= lost;

    // 2) Rientro dei licenziati.
    // Sposta ogni gruppo di returning di un trimestre verso disponibili.
    let returningNow = 0;
    const newReturning: number[] = [];
    for (let i = 0; i < state.returning.length; i++) {
      const qty = state.returning[i];
      if (i === 0) {
        returningNow += qty;
      } else {
        newReturning[i - 1] = (newReturning[i - 1] || 0) + qty;
      }
    }
    available += returningNow;

    // 3) Nuovi ingressi.
    // La crescita della domanda influenza il tasso di nuovi ingressi.
    const adjustedEntrantsRate = config.newEntrantsRate * (1 + demandGrowthRate);
    const entrants = Math.floor(available * adjustedEntrantsRate);
    available += entrants;

    newLevels[level] = {
      available,
      returning: newReturning,
    };
  }

  return { levels: newLevels, quarter: pool.quarter + 1 };
}

/**
 * Aggiunge licenziati al bacino (torneranno dopo `firedWorkerReturnDelay` trimestri).
 */
export function addFiredWorkersToPool(
  pool: LaborPoolState,
  fired: WorkforceMix,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): LaborPoolState {
  if (!config.enabled) return pool;

  const newLevels = { ...pool.levels };
  for (const level of Object.keys(fired) as WorkforceLevel[]) {
    const qty = fired[level];
    if (qty <= 0) continue;
    const state = newLevels[level];
    // Estende l'array returning alla lunghezza necessaria.
    const returning = [...state.returning];
    const delay = config.firedWorkerReturnDelay;
    while (returning.length < delay) returning.push(0);
    returning[delay - 1] += qty;
    newLevels[level] = { ...state, returning };
  }
  return { ...pool, levels: newLevels };
}

// ============================================================================
// ASSEGNAZIONE (ASTA SALARIALE)
// ============================================================================

/** Richiesta di assunzione di una singola azienda. */
export interface HiringBid {
  playerId: string;
  /** Mix desiderato. */
  desired: WorkforceMix;
  /** Offerta salariale moltiplicatore rispetto allo stipendio base (es. 1.05 = +5%). */
  wageMultiplier: number;
}

/** Risultato dell'asta per una singola azienda. */
export interface HiringResult {
  playerId: string;
  /** Mix effettivamente ottenuto. */
  hired: WorkforceMix;
  /** Costo totale di assunzione (costo una‑tantum). */
  hiringCost: number;
}

/**
 * Risolve l'assegnazione del bacino disponibile tra più aziende.
 * Algoritmo deterministico a parità di seed:
 * 1. Ordine decrescente di wageMultiplier (offerta più alta prima).
 * 2. A parità di offerta, ordine deterministico per playerId.
 * 3. Assegna per ogni livello separatamente, fino a esaurimento disponibilità.
 */
export function resolveHiringAuction(
  bids: HiringBid[],
  pool: LaborPoolState,
  seed: number,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): {
  results: HiringResult[];
  updatedPool: LaborPoolState;
} {
  if (!config.enabled) {
    // Bacino illimitato: ogni azienda ottiene tutto ciò che desidera.
    const results: HiringResult[] = bids.map(bid => ({
      playerId: bid.playerId,
      hired: { ...bid.desired },
      hiringCost: calculateHiringCost(bid.desired),
    }));
    return { results, updatedPool: pool };
  }

  // Ordine deterministico.
  const rng = mulberry32(seed);
  const sortedBids = [...bids].sort((a, b) => {
    if (a.wageMultiplier !== b.wageMultiplier) {
      return b.wageMultiplier - a.wageMultiplier; // decrescente
    }
    // Tie‑break: usa un hash deterministico del playerId.
    const hashA = simpleHash(a.playerId, rng);
    const hashB = simpleHash(b.playerId, rng);
    return hashA - hashB;
  });

  const available: Record<WorkforceLevel, number> = {
    junior: pool.levels.junior.available,
    skilled: pool.levels.skilled.available,
    expert: pool.levels.expert.available,
  };

  const results: HiringResult[] = [];
  const hiredByLevel: Record<WorkforceLevel, number> = { junior: 0, skilled: 0, expert: 0 };

  for (const bid of sortedBids) {
    const hired: WorkforceMix = { junior: 0, skilled: 0, expert: 0 };
    for (const level of Object.keys(bid.desired) as WorkforceLevel[]) {
      const want = bid.desired[level];
      const remaining = available[level] - hiredByLevel[level];
      const got = Math.min(want, remaining);
      hired[level] = got;
      hiredByLevel[level] += got;
    }
    results.push({
      playerId: bid.playerId,
      hired,
      hiringCost: calculateHiringCost(hired),
    });
  }

  // Aggiorna il bacino sottraendo gli assunti.
  const updatedLevels = { ...pool.levels };
  for (const level of Object.keys(available) as WorkforceLevel[]) {
    updatedLevels[level].available = available[level] - hiredByLevel[level];
  }

  return {
    results,
    updatedPool: { ...pool, levels: updatedLevels },
  };
}

/** Calcola il costo una‑tantum di assunzione per un mix. */
function calculateHiringCost(mix: WorkforceMix): number {
  let cost = 0;
  for (const level of Object.keys(mix) as WorkforceLevel[]) {
    cost += mix[level] * LEVEL_PARAMS[level].hiringCost;
  }
  return cost;
}

/** Hash semplice e deterministico per tie‑break. */
function simpleHash(str: string, rng: () => number): number {
  // Usa il PRNG per generare un numero basato sul seed, ma diverso per ogni stringa.
  // Prendiamo i primi 4 caratteri e li combiniamo.
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 4); i++) {
    h = (h << 5) - h + str.charCodeAt(i);
  }
  // Mescola con un numero casuale deterministico dal seed.
  const random = rng();
  return (h * random) >>> 0;
}

// ============================================================================
// FORMAZIONE INTERNA
// ============================================================================

/** Stato della formazione per un'azienda. */
export interface TrainingState {
  /** Addetti in formazione da Junior a Skilled: quanti rimangono ancora X trimestri. */
  juniorToSkilled: number[];
  /** Addetti in formazione da Skilled a Expert: quanti rimangono ancora X trimestri. */
  skilledToExpert: number[];
}

/**
 * Avvia la formazione per alcuni addetti.
 * @param currentTraining Stato attuale.
 * @param juniorToSkilled Quanti Junior avviano la formazione in questo trimestre.
 * @param skilledToExpert Quanti Skilled avviano la formazione.
 * @param config Configurazione.
 * @returns Nuovo stato della formazione.
 */
export function startTraining(
  currentTraining: TrainingState,
  juniorToSkilled: number,
  skilledToExpert: number,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): TrainingState {
  if (!config.trainingEnabled) return currentTraining;

  const newJuniorToSkilled = [...currentTraining.juniorToSkilled];
  const newSkilledToExpert = [...currentTraining.skilledToExpert];

  // Aggiungi i nuovi in coda con la durata completa.
  const durationJS = config.trainingDurationQuarters.juniorToSkilled;
  for (let i = 0; i < juniorToSkilled; i++) {
    newJuniorToSkilled.push(durationJS);
  }
  const durationSE = config.trainingDurationQuarters.skilledToExpert;
  for (let i = 0; i < skilledToExpert; i++) {
    newSkilledToExpert.push(durationSE);
  }

  return {
    juniorToSkilled: newJuniorToSkilled,
    skilledToExpert: newSkilledToExpert,
  };
}

/**
 * Avanza la formazione di un trimestre.
 * @param training Stato attuale.
 * @param config Configurazione.
 * @returns Nuovo stato e quanti hanno completato la formazione (junior→skilled, skilled→expert).
 */
export function advanceTraining(
  training: TrainingState,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): {
  newTraining: TrainingState;
  completedJuniorToSkilled: number;
  completedSkilledToExpert: number;
} {
  if (!config.trainingEnabled) {
    return {
      newTraining: training,
      completedJuniorToSkilled: 0,
      completedSkilledToExpert: 0,
    };
  }

  let completedJS = 0;
  let completedSE = 0;
  const newJS: number[] = [];
  const newSE: number[] = [];

  for (const remaining of training.juniorToSkilled) {
    if (remaining <= 1) {
      completedJS++;
    } else {
      newJS.push(remaining - 1);
    }
  }
  for (const remaining of training.skilledToExpert) {
    if (remaining <= 1) {
      completedSE++;
    } else {
      newSE.push(remaining - 1);
    }
  }

  return {
    newTraining: { juniorToSkilled: newJS, skilledToExpert: newSE },
    completedJuniorToSkilled: completedJS,
    completedSkilledToExpert: completedSE,
  };
}

/**
 * Calcola il costo della formazione per il trimestre.
 */
export function calculateTrainingCost(
  training: TrainingState,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): number {
  if (!config.trainingEnabled) return 0;
  const jsCount = training.juniorToSkilled.length;
  const seCount = training.skilledToExpert.length;
  return (
    jsCount * config.trainingCostPerQuarter.juniorToSkilled +
    seCount * config.trainingCostPerQuarter.skilledToExpert
  );
}

/**
 * Calcola la produttività degli addetti in formazione (unità/trimestre).
 */
export function calculateTrainingProductivity(
  training: TrainingState,
  config: LaborPoolConfig = DEFAULT_LABOR_POOL_CONFIG,
): number {
  if (!config.trainingEnabled) return 0;
  let prod = 0;
  // Junior in formazione: produttività = junior * trainingProductivity.
  const jsProdPerWorker = LEVEL_PARAMS.junior.productivity * config.trainingProductivity.juniorToSkilled;
  prod += training.juniorToSkilled.length * jsProdPerWorker;
  // Skilled in formazione: produttività = skilled * trainingProductivity.
  const seProdPerWorker = LEVEL_PARAMS.skilled.productivity * config.trainingProductivity.skilledToExpert;
  prod += training.skilledToExpert.length * seProdPerWorker;
  return prod;
}

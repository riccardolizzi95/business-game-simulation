/**
 * Modulo qualità e scarto produttivo.
 *
 * Implementa la logica di scarto basata su:
 * - Livello di qualità della materia prima (da S9-2)
 * - Qualificazione del personale (da S9-5)
 * - Presenza di straordinari
 *
 * Fornisce funzioni per calcolare il tasso di scarto e applicare i destini dei pezzi scartati.
 */

import { EngineConfig } from "./types";

// --- Costanti derivate dalla proposta S9-4 ---

/** Contributo di scarto per livello di qualità della materia prima (in punti percentuali). */
export const MATERIAL_SCRAP_CONTRIBUTION: Record<string, number> = {
  economy: 3.5,
  standard: 1.5,
  premium: 0.5,
  ultra: 0.0,
} as const;

/** Offset di scarto per livello di qualificazione del personale (in punti percentuali, negativo = riduce scarto). */
export const PERSONNEL_SCRAP_OFFSET: Record<string, number> = {
  base: -1.5,
  skilled: -2.5,
  expert: -3.5,
  master: -4.5,
} as const;

/** Penalità di scarto per straordinari attivi (in punti percentuali). */
export const OVERTIME_SCRAP_PENALTY = 1.0;

/** Destini dei pezzi scartati. */
export type ScrapDisposition = "discard" | "rework" | "discount";

/** Parametri per il calcolo dello scarto. */
export interface ScrapParams {
  /** Livello di qualità della materia prima (deve essere una chiave di MATERIAL_SCRAP_CONTRIBUTION). */
  materialQuality: keyof typeof MATERIAL_SCRAP_CONTRIBUTION;
  /** Livello di qualificazione del personale (deve essere una chiave di PERSONNEL_SCRAP_OFFSET). */
  personnelLevel: keyof typeof PERSONNEL_SCRAP_OFFSET;
  /** Straordinari attivi? */
  overtime: boolean;
  /**
   * Tasso di difetto (in punti percentuali) del personale REALE, quando si conosce il mix
   * dell'organico invece di un livello unico. Se presente sostituisce `personnelLevel`.
   *
   * Serve perché `workforce.ts` ragiona su una composizione di livelli e restituisce una
   * media, mentre qui il modello è a livello singolo: senza questo ponte esplicito le due
   * interfacce non combaciano, ed è esattamente il punto in cui l'integrazione si era rotta.
   */
  personnelDefectOverridePp?: number;
}

/** Risultato del calcolo dello scarto. */
export interface ScrapResult {
  /** Tasso di scarto netto [0..1]. */
  scrapRate: number;
  /** Contributo della materia prima (pp). */
  materialContribution: number;
  /** Offset del personale (pp). */
  personnelOffset: number;
  /** Penalità straordinari (pp). */
  overtimePenalty: number;
}

/**
 * Calcola il tasso di scarto netto in base ai parametri.
 * @param params Parametri di qualità.
 * @returns Tasso di scarto netto [0..1].
 */
export function calculateScrapRate(params: ScrapParams): ScrapResult {
  const materialContribution = MATERIAL_SCRAP_CONTRIBUTION[params.materialQuality];
  const personnelOffset =
    params.personnelDefectOverridePp ?? PERSONNEL_SCRAP_OFFSET[params.personnelLevel];
  const overtimePenalty = params.overtime ? OVERTIME_SCRAP_PENALTY : 0;

  const scrapRatePp = materialContribution + personnelOffset + overtimePenalty;
  const scrapRate = Math.max(0, scrapRatePp) / 100; // converti in frazione

  return {
    scrapRate,
    materialContribution,
    personnelOffset,
    overtimePenalty,
  };
}

/** Parametri per applicare lo scarto a una produzione. */
export interface ApplyScrapParams extends ScrapParams {
  /** Quantità prodotta (prima dello scarto). */
  producedQty: number;
  /** Destino dei pezzi scartati. */
  disposition: ScrapDisposition;
  /** Prezzo di vendita per unità (usato per il destino "discount"). */
  sellingPrice: number;
  /** Configurazione del motore (per costi). */
  config: EngineConfig;
}

/** Risultato dell'applicazione dello scarto. */
export interface ApplyScrapResult {
  /** Unità buone dopo lo scarto (pronte per la vendita). */
  goodUnits: number;
  /** Unità scartate. */
  scrappedUnits: number;
  /** Unità recuperate (rilavorate o vendute a sconto). */
  recoveredUnits: number;
  /** Costo aggiuntivo della rilavorazione (€). */
  reworkCost: number;
  /** Ricavo aggiuntivo dalla vendita a sconto (€). */
  discountRevenue: number;
  /** Tasso di scarto netto applicato. */
  scrapRate: number;
}

/**
 * Applica lo scarto alla produzione e gestisce i pezzi scartati secondo il destino scelto.
 * @param params Parametri completi.
 * @returns Risultato con unità buone, costi/ricavi aggiuntivi.
 */
export function applyScrap(params: ApplyScrapParams): ApplyScrapResult {
  const { producedQty, disposition, sellingPrice, config } = params;

  const scrapResult = calculateScrapRate(params);
  const scrapRate = scrapResult.scrapRate;

  const scrappedUnits = Math.floor(producedQty * scrapRate); // arrotonda per difetto? La proposta non specifica, usiamo floor per evitare frazioni.
  const goodUnitsBeforeRecovery = producedQty - scrappedUnits;

  let recoveredUnits = 0;
  let reworkCost = 0;
  let discountRevenue = 0;

  switch (disposition) {
    case "discard":
      // Niente recupero
      break;
    case "rework": {
      // 90% dei pezzi scartati diventano buoni
      recoveredUnits = Math.floor(scrappedUnits * 0.9);
      // Costo di rilavorazione: +50% del costo unitario base delle materie prime (€27,50/u)
      // NOTA: Incoerenza con rawMaterialCost in config (25 vs 27,5). Usiamo 27,5 come da proposta.
      const rawMaterialCostPerUnit = 27.5;
      reworkCost = scrappedUnits * rawMaterialCostPerUnit * 0.5; // +50%
      break;
    }
    case "discount": {
      // Tutti i pezzi scartati venduti a sconto (40% del prezzo di vendita)
      recoveredUnits = scrappedUnits;
      discountRevenue = scrappedUnits * sellingPrice * 0.4;
      break;
    }
  }

  const goodUnits = goodUnitsBeforeRecovery + recoveredUnits;

  return {
    goodUnits,
    scrappedUnits,
    recoveredUnits,
    reworkCost,
    discountRevenue,
    scrapRate,
  };
}

/**
 * Verifica che con i parametri di default (Standard, Base, no straordinari) lo scarto sia zero.
 * Funzione di utilità per test e validazione.
 */
export function defaultScrapIsZero(): boolean {
  const params: ScrapParams = {
    materialQuality: "standard",
    personnelLevel: "base",
    overtime: false,
  };
  const result = calculateScrapRate(params);
  return result.scrapRate === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Qualità percepita dal mercato (S9-6).
//
// Il mercato non si accorge subito né di un miglioramento né di un peggioramento: la percezione
// insegue la qualità reale con un ritardo. È ciò che rende la qualità una scommessa invece che
// un'altra manopola lineare — investi oggi e raccogli fra qualche trimestre, e lo stesso vale
// per i danni quando tagli.
// ─────────────────────────────────────────────────────────────────────────────

/** Peso della materia prima nella qualità reale del prodotto. */
export const MATERIAL_QUALITY_WEIGHT = 0.6;
/** Peso del personale nella qualità reale del prodotto. */
export const PERSONNEL_QUALITY_WEIGHT = 0.4;

/** Indice di qualità della materia prima (0-100). */
export const MATERIAL_QUALITY_INDEX: Record<string, number> = {
  economy: 60,
  standard: 75,
  premium: 85,
  ultra: 95,
};

/** Indice di qualità apportato dal personale (0-100). */
export const PERSONNEL_QUALITY_INDEX: Record<string, number> = {
  base: 70,
  skilled: 82,
  expert: 92,
};

/**
 * Qualità di riferimento del mercato: materiale standard lavorato da personale base.
 * È il punto in cui il moltiplicatore di attrattività vale esattamente 1, cioè la
 * configurazione attuale del gioco. Da qui la non-regressione.
 */
export const REFERENCE_QUALITY =
  MATERIAL_QUALITY_WEIGHT * MATERIAL_QUALITY_INDEX.standard +
  PERSONNEL_QUALITY_WEIGHT * PERSONNEL_QUALITY_INDEX.base;

/** Quanto in fretta la percezione insegue la realtà (0..1). 0,25 ⇒ ~4 trimestri per adeguarsi. */
export const PERCEIVED_QUALITY_SMOOTHING = 0.25;

/** Elasticità della qualità percepita nell'attrattività. */
export const QUALITY_ELASTICITY = 1.2;

/** Stato della percezione di mercato, che sopravvive fra i trimestri. */
export interface PerceivedQualityState {
  value: number;
}

/** All'inizio il mercato ti considera nella media: nessun vantaggio, nessuna penalità. */
export const INITIAL_PERCEIVED_QUALITY: PerceivedQualityState = { value: REFERENCE_QUALITY };

/** Qualità REALE del prodotto, dalla combinazione di materiali e personale. */
export function calculateRealQuality(
  materialLevel: keyof typeof MATERIAL_QUALITY_INDEX,
  personnelLevel: keyof typeof PERSONNEL_QUALITY_INDEX,
): number {
  const material = MATERIAL_QUALITY_INDEX[materialLevel] ?? MATERIAL_QUALITY_INDEX.standard;
  const personnel = PERSONNEL_QUALITY_INDEX[personnelLevel] ?? PERSONNEL_QUALITY_INDEX.base;
  return MATERIAL_QUALITY_WEIGHT * material + PERSONNEL_QUALITY_WEIGHT * personnel;
}

/**
 * Evoluzione della percezione in un trimestre: media esponenziale fra ciò che il mercato
 * credeva e ciò che ha appena sperimentato. Il marketing può accelerare l'adeguamento, ma
 * non sostituisce la sostanza: agisce sull'input, non sul valore finale.
 */
export function evolvePerceivedQuality(
  previous: PerceivedQualityState,
  realQuality: number,
  marketingBoost = 0,
  smoothing: number = PERCEIVED_QUALITY_SMOOTHING,
): PerceivedQualityState {
  return {
    value: (1 - smoothing) * previous.value + smoothing * (realQuality + marketingBoost),
  };
}

/**
 * Moltiplicatore di attrattività dato dalla qualità percepita.
 * Vale ESATTAMENTE 1 quando la percezione è quella di riferimento: è la garanzia che senza
 * la leva qualità la formula di mercato resti identica a prima.
 */
export function perceivedQualityMultiplier(
  perceived: PerceivedQualityState,
  referenceQuality: number = REFERENCE_QUALITY,
): number {
  if (referenceQuality <= 0) return 1;
  return Math.pow(perceived.value / referenceQuality, QUALITY_ELASTICITY);
}

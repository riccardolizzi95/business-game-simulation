/**
 * KPI di controllo di gestione, derivati da un risultato di trimestre.
 *
 * Set definito dal ruolo business-controlling (orchestrator/proposals/S4-2-*.md):
 * i denominatori nulli restituiscono `null` (dato non calcolabile), tranne il
 * lostSalesRatio che vale 0 quando non c'è domanda attratta — non aver perso vendite
 * perché non c'era domanda è un fatto, non un dato mancante.
 */
import type { PlayerResult } from "./types";

/** Tipo che rappresenta i KPI di Controlling calcolati da un PlayerResult. */
export interface ControllingKPI {
  /** EBITDA Margin (ricavo - produzione - fissi) / ricavo. Restituisce null se revenue = 0. */
  ebitdaMargin: number | null;
  /** Contribution Margin per Unit (ricavo - produzione) / vendite. Restituisce null se sales = 0. */
  contributionMarginPerUnit: number | null;
  /** Capacity Utilization (vendite / capacità totale). Restituisce null se totalCapacity = 0. */
  capacityUtilization: number | null;
  /** Lost Sales Ratio (vendite perse / domanda attratta). Restituisce 0 se attractedDemand = 0. */
  lostSalesRatio: number;
  /** Average Unit Cost (costo produzione / vendite). Restituisce null se sales = 0. */
  averageUnitCost: number | null;
  /** Market Share (già calcolato come share). */
  marketShare: number;
}

/**
 * Calcola i KPI di Controlling da un singolo PlayerResult.
 * Tutti i calcoli sono puri; le divisioni per zero sono gestite restituendo null (o 0 per lostSalesRatio).
 */
export function calculateControllingKPI(result: PlayerResult): ControllingKPI {
  const { revenue, productionCost, fixedCost, unitsSold, lostSales, demandUnits, capacity, share } = result;

  // 1) EBITDA Margin
  const ebitdaMargin = revenue !== 0 ? (revenue - productionCost - fixedCost) / revenue : null;

  // 2) Contribution Margin per Unit
  const contributionMarginPerUnit = unitsSold !== 0 ? (revenue - productionCost) / unitsSold : null;

  // 3) Capacity Utilization
  const capacityUtilization = capacity !== 0 ? unitsSold / capacity : null;

  // 4) Lost Sales Ratio
  const lostSalesRatio = demandUnits !== 0 ? lostSales / demandUnits : 0;

  // 5) Average Unit Cost
  const averageUnitCost = unitsSold !== 0 ? productionCost / unitsSold : null;

  // 6) Market Share (già calcolato come share)
  const marketShare = share;

  return {
    ebitdaMargin,
    contributionMarginPerUnit,
    capacityUtilization,
    lostSalesRatio,
    averageUnitCost,
    marketShare,
  };
}

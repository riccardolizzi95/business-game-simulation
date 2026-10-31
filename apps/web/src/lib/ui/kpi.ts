/**
 * Soglie dei KPI e loro semaforo. Estratto da `page.tsx` nel refactor S15-1,
 * invariato rispetto a prima.
 */

// Soglie dei KPI (dalla proposta del Controlling, S4-2).
// `higherIsBetter` è indispensabile: per vendite perse e costo unitario vale l'opposto —
// senza questa distinzione un 23,5% di vendite perse risulterebbe "Buono".
export const thresholds = {
  ebitdaMargin: { good: 0.15, concerning: 0.05, higherIsBetter: true },
  contributionMarginPerUnit: { good: 20, concerning: 5, higherIsBetter: true }, // euro per unità
  capacityUtilization: { good: 0.8, concerning: 0.5, higherIsBetter: true },
  lostSalesRatio: { good: 0.05, concerning: 0.15, higherIsBetter: false },
  averageUnitCost: { good: 55, concerning: 70, higherIsBetter: false }, // euro, con unitCost 55
  marketShare: { good: 0.25, concerning: 0.10, higherIsBetter: true },
};

/**
 * Returns status object for a KPI based on thresholds.
 * Returns null if value is null (no status).
 */
export function getKpiStatus<T extends keyof typeof thresholds>(
  name: T,
  value: number | null
): { label: string; class: 'good' | 'warning' | 'bad' } | null {
  if (value === null) return null;
  const t = thresholds[name];
  const reachedGood = t.higherIsBetter ? value >= t.good : value <= t.good;
  const reachedConcerning = t.higherIsBetter ? value < t.concerning : value > t.concerning;
  if (reachedGood) return { label: 'Buono', class: 'good' };
  if (reachedConcerning) return { label: 'Preoccupante', class: 'bad' };
  return { label: 'Attenzione', class: 'warning' };
}

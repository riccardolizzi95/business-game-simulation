/**
 * Leva MARKETING — brand equity e campagne.
 *
 * Regole definite dal ruolo business-marketing (orchestrator/proposals/S6-1-*.md). I valori
 * numerici qui sotto SONO quelli decisi lì: se vanno cambiati, si cambia prima il design.
 *
 * Il budget si divide fra due effetti con orizzonti diversi:
 *  - **awareness** → costruisce `brandEquity`, che si accumula nel tempo e decade se smetti;
 *  - **performance** → spinta immediata sulla domanda del trimestre, senza memoria.
 *
 * Entrambi hanno rendimenti decrescenti: `sqrt(x)` significa che raddoppiare il budget dà
 * circa 1,41× l'effetto, non 2×. Senza questo la strategia ottimale sarebbe banalmente
 * "spendi tutto".
 *
 * Modulo PURO e deterministico: nessun effetto collaterale, nessuna casualità.
 */

/** Quota del budget che va all'awareness (il resto va alla performance). 0..1 */
export const DEFAULT_CAMPAIGN_FOCUS = 0.5;

/** Brand equity accumulata per euro investito in awareness. 100k € → +0,8 di equity. */
export const ACCUMULATION_RATE = 0.000008;

/** Decadimento trimestrale della brand equity se non la si alimenta. */
export const BRAND_DECAY_RATE = 0.1;

/** Spinta massima all'attrattività a brand equity piena (1,0): +50%. */
export const MAX_BRAND_BOOST = 0.5;

/** Effetto della campagna al budget di riferimento: +15% di attrattività. */
export const CAMPAIGN_EFFECTIVENESS = 0.15;

/** Budget a cui è calibrato l'effetto di riferimento. */
export const REF_BUDGET = 50_000;

/** Tetto assoluto di spesa per trimestre. */
export const MAX_MARKETING_BUDGET = 200_000;

/** Stato del brand, che sopravvive da un trimestre all'altro. */
export interface BrandState {
  /** Brand equity accumulata, 0..1 (satura a 1). */
  brandEquity: number;
}

export const INITIAL_BRAND: BrandState = { brandEquity: 0 };

/** Ripartizione del budget fra i due orizzonti. */
export function splitBudget(
  marketingBudget: number,
  campaignFocus: number = DEFAULT_CAMPAIGN_FOCUS,
): { awarenessInvestment: number; performanceInvestment: number } {
  const budget = Math.max(0, Math.min(marketingBudget, MAX_MARKETING_BUDGET));
  const focus = Math.max(0, Math.min(campaignFocus, 1));
  return {
    awarenessInvestment: budget * focus,
    performanceInvestment: budget * (1 - focus),
  };
}

/**
 * Evoluzione della brand equity in un trimestre: prima decade, poi si aggiunge il nuovo
 * investimento in awareness. L'ordine conta — un brand perde slancio comunque, e ciò che
 * investi oggi non recupera retroattivamente quello che hai perso.
 */
export function evolveBrand(
  state: BrandState,
  awarenessInvestment: number,
  decayRate: number = BRAND_DECAY_RATE,
): BrandState {
  const decayed = state.brandEquity * (1 - decayRate);
  const gained = Math.max(0, awarenessInvestment) * ACCUMULATION_RATE;
  return { brandEquity: Math.min(1, decayed + gained) };
}

/** Moltiplicatore di attrattività dato dal brand accumulato. 1 = nessun effetto. */
export function brandMultiplier(state: BrandState): number {
  return 1 + Math.max(0, Math.min(state.brandEquity, 1)) * MAX_BRAND_BOOST;
}

/**
 * Moltiplicatore di attrattività dato dalla campagna del trimestre corrente.
 * Rendimenti decrescenti via radice quadrata: al budget di riferimento vale
 * `1 + CAMPAIGN_EFFECTIVENESS`, quadruplicando il budget l'effetto raddoppia.
 */
export function campaignMultiplier(performanceInvestment: number): number {
  if (performanceInvestment <= 0) return 1;
  return 1 + CAMPAIGN_EFFECTIVENESS * Math.sqrt(performanceInvestment / REF_BUDGET);
}

/**
 * Moltiplicatore complessivo da applicare all'attrattività di prezzo.
 *
 * Vale ESATTAMENTE 1 quando non c'è né brand né budget: è ciò che garantisce che il motore
 * senza marketing resti identico alla versione precedente.
 */
export function marketingMultiplier(
  state: BrandState,
  performanceInvestment: number,
): number {
  return brandMultiplier(state) * campaignMultiplier(performanceInvestment);
}

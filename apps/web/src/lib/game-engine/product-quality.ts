/**
 * Indice di qualità del prodotto, su scala 0..10.
 *
 * Richiesta del committente: la qualità dev'essere un valore confrontabile da mostrare ai
 * giocatori, così da diventare un terreno di gara oltre al prezzo. 10 = condizioni massime.
 *
 * Design del team (S16-3 HR, S16-4 marketing, S16-5 game designer), con tre correzioni fatte in
 * fase di implementazione:
 *  1. `balanceScore` è il coefficiente di Bhattacharyya AL QUADRATO, come definito in S16-3.
 *     S16-5 lo applicava senza quadrato e otteneva numeri diversi dai propri esempi.
 *  2. S16-5 assumeva un organico di default «tutti skilled»: in realtà `DEFAULT_MIX_PER_PLANT`
 *     è 6 junior / 8 skilled / 4 expert, cioè già quasi bilanciato (0,959).
 *  3. Il punto di riferimento NON è un numero scritto a mano (5,93 nel documento) ma è CALCOLATO
 *     dalla configurazione di partenza: così il moltiplicatore vale esattamente 1 per costruzione
 *     e la non-regressione non dipende da un'aritmetica da rifare a mano ogni volta.
 */
import { MATERIAL_QUALITY_INDEX } from "./quality";
import { DEFAULT_MIX_PER_PLANT, type WorkforceMix } from "./workforce";
import { DEFAULT_MATERIAL_QUALITY, type MaterialQualityOption } from "./supply";

/** Peso delle materie prime nella qualità reale (S16-5 §1.3). */
export const MATERIAL_WEIGHT = 0.55;
/** Peso della forza lavoro nella qualità reale (S16-5 §1.3). */
export const WORKFORCE_WEIGHT = 0.45;

/** Penalità di qualità quando si lavora con gli straordinari. */
export const OVERTIME_QUALITY_PENALTY = 0.10;

/** Quanto al massimo la pubblicità può alzare l'indice percepito (S16-5 §1.1). */
export const AD_HALO_MAX = 0.5;

/**
 * Mix ideale per la QUALITÀ: 1 junior : 3 skilled : 2 expert (S16-3).
 * Non è «tutti esperti»: senza junior e skilled mancano ricambio, affiancamento e chi fa il
 * lavoro ripetitivo, e un reparto di soli esperti costa molto rendendo meno.
 */
export const IDEAL_MIX_SHARES = { junior: 1 / 6, skilled: 1 / 2, expert: 1 / 3 };

/** Indice di qualità della materia prima, riportato su scala 0..10. */
const MATERIAL_INDEX_10: Record<MaterialQualityOption, number> = {
  eco: MATERIAL_QUALITY_INDEX.economy / 10,
  std: MATERIAL_QUALITY_INDEX.standard / 10,
  prem: MATERIAL_QUALITY_INDEX.premium / 10,
  ultra: MATERIAL_QUALITY_INDEX.ultra / 10,
};

/**
 * Quanto un organico è BILANCIATO rispetto al mix ideale: 1 = perfetto, 0 = agli antipodi.
 *
 * Coefficiente di Bhattacharyya al quadrato fra le quote del mix e quelle ideali. È limitato a
 * [0,1], vale 1 solo sul mix ideale e — punto chiave — **non è monotono nel numero di esperti**:
 * superare la quota ideale fa SCENDERE il punteggio.
 */
export function balanceScore(mix: WorkforceMix): number {
  const total = mix.junior + mix.skilled + mix.expert;
  if (total <= 0) return 0;
  const bc =
    Math.sqrt((mix.junior / total) * IDEAL_MIX_SHARES.junior) +
    Math.sqrt((mix.skilled / total) * IDEAL_MIX_SHARES.skilled) +
    Math.sqrt((mix.expert / total) * IDEAL_MIX_SHARES.expert);
  return bc * bc;
}

/** Ingredienti dell'indice di qualità di un giocatore in un trimestre. */
export interface ProductQualityInputs {
  /** Qualità della materia prima acquistata (scelta singola). */
  materialQuality?: MaterialQualityOption;
  /**
   * Indice di qualità del materiale su scala 0..100, già calcolato dal motore.
   * Serve con gli ordini multipli: il magazzino contiene lotti di qualità diverse e quella che
   * conta è la MEDIA PESATA, non una scelta. Se presente ha la precedenza sul codice.
   */
  materialQualityIndex?: number;
  /** Organico. Assente ⇒ mix di default. */
  workforceMix?: WorkforceMix;
  /** Straordinari attivi nel trimestre. */
  overtime?: boolean;
  /** Brand accumulato (0..1), da cui l'alone di qualità percepita. */
  brandEquity?: number;
}

/** Qualità REALE (0..10): materiali e organico, penalizzati dagli straordinari. */
export function realQualityIndex(inputs: ProductQualityInputs = {}): number {
  const material = inputs.materialQualityIndex !== undefined
    ? inputs.materialQualityIndex / 10
    : MATERIAL_INDEX_10[inputs.materialQuality ?? DEFAULT_MATERIAL_QUALITY];
  const workforce = balanceScore(inputs.workforceMix ?? DEFAULT_MIX_PER_PLANT) * 10;
  const penalty = inputs.overtime ? OVERTIME_QUALITY_PENALTY : 0;
  return (MATERIAL_WEIGHT * material + WORKFORCE_WEIGHT * workforce) * (1 - penalty);
}

/**
 * Alone di qualità percepita dato dalla pubblicità: piccolo, e **proporzionale alla qualità
 * reale**. È la correzione al difetto di S16-4, dove la percezione saliva di 1,24 punti sopra la
 * realtà qualunque fosse il prodotto: così spingere pubblicità su merce scadente non paga, perché
 * il bonus è piccolo proprio quando il prodotto è scarso.
 */
export function adHalo(brandEquity = 0, realQuality = 0): number {
  const raw = brandEquity * AD_HALO_MAX * (realQuality / 10);
  return Math.min(Math.max(raw, 0), AD_HALO_MAX);
}

/** Indice di qualità del prodotto mostrato ai giocatori: 0..10. */
export function productQualityIndex(inputs: ProductQualityInputs = {}): number {
  const real = realQualityIndex(inputs);
  const index = real + adHalo(inputs.brandEquity, real);
  return Math.min(Math.max(index, 0), 10);
}

/**
 * Qualità della configurazione di PARTENZA: materiale standard, organico di default, niente
 * straordinari, nessun brand. Calcolata, non scritta a mano: è il punto in cui il moltiplicatore
 * di domanda vale esattamente 1, cioè la garanzia che il gioco di oggi non cambi.
 */
export const REFERENCE_QUALITY_INDEX = realQualityIndex();

/** Elasticità della qualità nella domanda (S16-5 §3.2). */
export const QUALITY_DEMAND_ELASTICITY = 1.0;

/**
 * Moltiplicatore di attrattività dato dalla qualità: 1 esatto alla qualità di riferimento.
 * Sta accanto al prezzo, non lo sostituisce.
 */
export function qualityDemandMultiplier(index: number): number {
  if (REFERENCE_QUALITY_INDEX <= 0) return 1;
  return Math.pow(index / REFERENCE_QUALITY_INDEX, QUALITY_DEMAND_ELASTICITY);
}

/**
 * Modulo della catena di rifornimento materie prime con tre dimensioni:
 * tempo di consegna, qualità materia prima, termini di pagamento.
 *
 * Design S9-2 e S9-3.
 *
 * Gestisce: stato del magazzino materie prime, ordini con lead time variabile,
 * costi di acquisto con sovrapprezzi/sconti per tempo/qualità/termini,
 * scadenzario dei pagamenti.
 *
 * Modulo puro e deterministico: nessun I/O, nessun RNG.
 *
 * I numeri delle opzioni (moltiplicatori, lead time, offset) sono presi esattamente
 * dalle decisioni di design S9-2 e S9-3. Non modificare arbitrariamente.
 */

// ============================================================================
// 1. PARAMETRI BASE (da configurazione)
// ============================================================================

import { DEFAULT_CONFIG } from "./types";

/** Costo unitario base delle materie prime (€/kit) — valore dalla configurazione.
 *  Usato per la combinazione di default (standard/standard/alla consegna) per riprodurre il costo attuale.
 *  Nota: il design S9-2 indica €27,50, ma la configurazione corrente è €25,00 per compatibilità con il motore v0.1. */
export const STANDARD_MATERIAL_COST_PER_UNIT = DEFAULT_CONFIG.rawMaterialCost;

/** Lead time standard (1 trimestre). */
export const STANDARD_LEAD_TIME_QUARTERS = 1;

/** Costo di giacenza materie prime per unità per trimestre (€/unità/trimestre).
 *  Stabilito da Supply Chain (S5-2). */
export const RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER = 1.80;

/** Tasso di scarto base (1,5%) come definito in S9-2. */
export const BASE_SCRAP_RATE = 0.015;

// ============================================================================
// 2. DIMENSIONE TEMPO DI CONSEGNA (Lead Time)
// ============================================================================

export type DeliveryTimeOption = "express" | "std" | "plan_2q" | "plan_3q";

export interface DeliveryTimeSpec {
  code: DeliveryTimeOption;
  label: string;
  leadTimeQuarters: number; // trimestri da ordine a consegna
  priceMultiplier: number;  // moltiplicatore sul costo base materie prime
}

/** Opzioni di tempo di consegna con lead time e moltiplicatori di prezzo (S9-2). */
export const DELIVERY_TIME_OPTIONS: DeliveryTimeSpec[] = [
  { code: "express", label: "Express", leadTimeQuarters: 0, priceMultiplier: 1.18 },
  { code: "std",     label: "Standard", leadTimeQuarters: 1, priceMultiplier: 1.00 },
  { code: "plan_2q", label: "Pianificato 2Q", leadTimeQuarters: 2, priceMultiplier: 0.92 },
  { code: "plan_3q", label: "Pianificato 3Q", leadTimeQuarters: 3, priceMultiplier: 0.86 },
];

export const DEFAULT_DELIVERY_TIME: DeliveryTimeOption = "std";

// ============================================================================
// 3. DIMENSIONE QUALITÀ MATERIA PRIMA
// ============================================================================

export type MaterialQualityOption = "eco" | "std" | "prem" | "ultra";

export interface MaterialQualitySpec {
  code: MaterialQualityOption;
  label: string;
  priceMultiplier: number; // moltiplicatore sul costo base materie prime
  scrapRateDelta: number;  // variazione punti percentuali rispetto al tasso base (1,5%)
  brandEffect: number;     // modificatore attrattività (es. +0,02 = +2%)
}

/** Opzioni di qualità materia prima con moltiplicatori di prezzo, delta scarto ed effetto brand (S9-2). */
export const MATERIAL_QUALITY_OPTIONS: MaterialQualitySpec[] = [
  { code: "eco",   label: "Economy",   priceMultiplier: 0.88, scrapRateDelta: +2.5, brandEffect: -0.03 },
  { code: "std",   label: "Standard",  priceMultiplier: 1.00, scrapRateDelta: 0.0,  brandEffect: 0.00 },
  { code: "prem",  label: "Premium",   priceMultiplier: 1.18, scrapRateDelta: -0.5, brandEffect: +0.02 },
  { code: "ultra", label: "Ultra",     priceMultiplier: 1.35, scrapRateDelta: -1.0, brandEffect: +0.04 },
];

export const DEFAULT_MATERIAL_QUALITY: MaterialQualityOption = "std";

// ============================================================================
// 4. DIMENSIONE TERMINI DI PAGAMENTO
// ============================================================================

export type PaymentTermsOption = "prepay" | "on_delivery" | "net_30" | "net_60" | "net_90";

export interface PaymentTermsSpec {
  code: PaymentTermsOption;
  label: string;
  priceMultiplier: number; // moltiplicatore sul costo materie prime (dopo tempo/qualità)
  cashOutQuarterOffset: number; // 0 = stesso trimestre della consegna, 1 = trimestre dopo, ecc.
}

/** Opzioni di termini di pagamento con moltiplicatori di prezzo e offset di uscita cassa (S9-3). */
export const PAYMENT_TERMS_OPTIONS: PaymentTermsSpec[] = [
  { code: "prepay",      label: "Anticipato",       priceMultiplier: 0.95, cashOutQuarterOffset: 0 },
  { code: "on_delivery", label: "Alla consegna",    priceMultiplier: 1.00, cashOutQuarterOffset: 0 },
  { code: "net_30",      label: "30 giorni",        priceMultiplier: 1.02, cashOutQuarterOffset: 0 },
  { code: "net_60",      label: "60 giorni",        priceMultiplier: 1.05, cashOutQuarterOffset: 1 },
  { code: "net_90",      label: "90 giorni",        priceMultiplier: 1.09, cashOutQuarterOffset: 1 },
];

export const DEFAULT_PAYMENT_TERMS: PaymentTermsOption = "on_delivery";

// ============================================================================
// 5. FUNZIONI DI CALCOLO PREZZO E SCADENZARIO
// ============================================================================

/**
 * Calcola il prezzo unitario finale della materia prima date le tre dimensioni.
 *
 * @param baseCost Costo base per unità (es. STANDARD_MATERIAL_COST_PER_UNIT).
 * @param delivery Opzione tempo di consegna.
 * @param quality Opzione qualità.
 * @param payment Opzione termini di pagamento.
 * @returns Prezzo unitario finale (€/kit).
 */
export function calculateMaterialUnitPrice(
  baseCost: number,
  delivery: DeliveryTimeOption = DEFAULT_DELIVERY_TIME,
  quality: MaterialQualityOption = DEFAULT_MATERIAL_QUALITY,
  payment: PaymentTermsOption = DEFAULT_PAYMENT_TERMS
): number {
  const deliverySpec = DELIVERY_TIME_OPTIONS.find(d => d.code === delivery)!;
  const qualitySpec = MATERIAL_QUALITY_OPTIONS.find(q => q.code === quality)!;
  const paymentSpec = PAYMENT_TERMS_OPTIONS.find(p => p.code === payment)!;

  let price = baseCost;
  price *= deliverySpec.priceMultiplier;
  price *= qualitySpec.priceMultiplier;
  price *= paymentSpec.priceMultiplier;

  return price;
}

/**
 * Determina il trimestre in cui la cassa esce per un ordine.
 *
 * @param orderQuarter Trimestre in cui viene emesso l'ordine (0‑based).
 * @param delivery Opzione tempo di consegna.
 * @param payment Opzione termini di pagamento.
 * @returns Trimestre in cui avviene l'uscita di cassa (0‑based).
 */
export function calculateCashOutQuarter(
  orderQuarter: number,
  delivery: DeliveryTimeOption,
  payment: PaymentTermsOption
): number {
  const deliverySpec = DELIVERY_TIME_OPTIONS.find(d => d.code === delivery)!;
  const paymentSpec = PAYMENT_TERMS_OPTIONS.find(p => p.code === payment)!;

  // Prepay: pagamento all'ordine, indipendentemente dal lead time (S9-3)
  if (payment === "prepay") {
    return orderQuarter;
  }

  const leadTime = deliverySpec.leadTimeQuarters;
  const deliveryQuarter = orderQuarter + leadTime;
  const cashOutQuarter = deliveryQuarter + paymentSpec.cashOutQuarterOffset;

  return cashOutQuarter;
}

/**
 * Calcola il tasso di scarto di produzione in base alla qualità scelta.
 *
 * @param baseScrapRate Tasso di scarto base (es. 0,015 = 1,5%).
 * @param quality Opzione qualità.
 * @returns Tasso di scarto finale (0..1).
 */
/**
 * Effetto della sola QUALITÀ DEL MATERIALE sul tasso di scarto.
 *
 * Non è il calcolo dello scarto complessivo: quello vive in `quality.ts` e combina anche
 * qualificazione del personale e straordinari. Qui c'è solo il contributo che compete a
 * questo modulo. Si chiamava `calculateScrapRate` come la funzione di `quality.ts`, e i due
 * export omonimi entravano in conflitto nel barrel: due implementazioni diverse della stessa
 * cosa, nessuna delle due usata dal motore.
 */
export function scrapRateForMaterialQuality(
  baseScrapRate: number,
  quality: MaterialQualityOption = DEFAULT_MATERIAL_QUALITY
): number {
  const qualitySpec = MATERIAL_QUALITY_OPTIONS.find(q => q.code === quality)!;
  const delta = qualitySpec.scrapRateDelta / 100; // da punti percentuali a frazione
  return Math.max(0, baseScrapRate + delta);
}

/**
 * Calcola l'effetto sul brand (moltiplicatore di attrattività) della qualità scelta.
 *
 * @param quality Opzione qualità.
 * @returns Moltiplicatore (es. 1,02 per +2%).
 */
export function calculateBrandEffectMultiplier(
  quality: MaterialQualityOption = DEFAULT_MATERIAL_QUALITY
): number {
  const qualitySpec = MATERIAL_QUALITY_OPTIONS.find(q => q.code === quality)!;
  return 1 + qualitySpec.brandEffect;
}

// ============================================================================
// 6. GESTIONE ORDINI E MAGAZZINO (versione avanzata con tre dimensioni)
// ============================================================================

/** Ordine in transito verso il magazzino, con informazioni di pricing e pagamento. */
export interface PendingOrder {
  /** Quantità ordinata. */
  quantity: number;
  /** Trimestre in cui l'ordine diventa disponibile (consegna). */
  arrivalQuarter: number;
  /** Trimestre in cui la cassa esce (pagamento). */
  cashOutQuarter: number;
  /** Prezzo unitario effettivo (€/kit). */
  unitPrice: number;
  /** Opzioni scelte per questo ordine. */
  delivery: DeliveryTimeOption;
  quality: MaterialQualityOption;
  payment: PaymentTermsOption;
}

/** Stato del magazzino materie prime. */
export interface RawMaterialInventoryState {
  /** Scorte disponibili all'inizio del trimestre (prima di ricevere nuovi ordini). */
  stock: number;
  /**
   * Magazzino a LOTTI: ogni lotto porta con se' prezzo e qualita' con cui e' stato comprato.
   * Assente ⇒ magazzino «piatto» alla vecchia maniera, tutto di qualita' standard.
   */
  lots?: RawMaterialLot[];
  /** Ordini in transito, non ancora disponibili. */
  pendingOrders: PendingOrder[];
}

/** Risultato dell'evoluzione del magazzino per un trimestre. */
export interface SupplyEvolutionResult {
  /** Stato del magazzino aggiornato al termine del trimestre. */
  newState: RawMaterialInventoryState;
  /** Scorte effettivamente disponibili (dopo arrivo ordini, prima del consumo). */
  available: number;
  /** Quantità ordinata in questo trimestre. */
  ordered: number;
  /** Quantità effettivamente consumata (può essere < consumption se insufficienti). */
  consumed: number;
  /** Scorte finali del trimestre. */
  closingStock: number;
  /** Costo totale di acquisto (con sconti a volume applicati, se presenti). */
  purchaseCost: number;
  /** Costo di giacenza sulle scorte finali. */
  holdingCost: number;
  /** True se le scorte disponibili erano insufficienti per il consumo richiesto. */
  insufficient: boolean;
  /** Debiti fornitori generati in questo trimestre (da pagare in futuro). */
  accountsPayableDue: { quarter: number; amount: number }[];
}

/**
 * Evolve lo stato del magazzino materie prime per un trimestre, con le tre dimensioni.
 *
 * @param state Stato corrente del magazzino.
 * @param order Quantità ordinata in questo trimestre.
 * @param consumption Quantità consumata per la produzione in questo trimestre.
 * @param currentQuarter Numero del trimestre corrente (0‑based).
 * @param baseCost Costo base materie prime (default: STANDARD_MATERIAL_COST_PER_UNIT).
 * @param delivery Opzione tempo di consegna (default: "std").
 * @param quality Opzione qualità (default: "std").
 * @param payment Opzione termini di pagamento (default: "on_delivery").
 * @param holdingCostPerUnit Costo di giacenza per unità (default: RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER).
 * @returns Risultato dell'evoluzione con stato aggiornato e costi.
 */
export function evolveSupplyStateWithOptions(
  state: RawMaterialInventoryState,
  order: number,
  consumption: number,
  currentQuarter: number,
  baseCost: number = STANDARD_MATERIAL_COST_PER_UNIT,
  delivery: DeliveryTimeOption = DEFAULT_DELIVERY_TIME,
  quality: MaterialQualityOption = DEFAULT_MATERIAL_QUALITY,
  payment: PaymentTermsOption = DEFAULT_PAYMENT_TERMS,
  holdingCostPerUnit: number = RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER
): SupplyEvolutionResult {
  const safeOrder = Math.max(0, order);
  const safeConsumption = Math.max(0, consumption);

  // 1. Ricevi ordini in transito che hanno superato il lead time
  let availableStock = state.stock;
  const stillPending: PendingOrder[] = [];

  for (const pending of state.pendingOrders) {
    if (pending.arrivalQuarter <= currentQuarter) {
      availableStock += pending.quantity;
    } else {
      stillPending.push(pending);
    }
  }

  // 2. Calcola prezzo unitario e scadenzario per il nuovo ordine
  const unitPrice = calculateMaterialUnitPrice(baseCost, delivery, quality, payment);
  const arrivalQuarter = currentQuarter + DELIVERY_TIME_OPTIONS.find(d => d.code === delivery)!.leadTimeQuarters;
  const cashOutQuarter = calculateCashOutQuarter(currentQuarter, delivery, payment);

  const newPending: PendingOrder[] = [];
  if (safeOrder > 0) {
    const ordine: PendingOrder = {
      quantity: safeOrder,
      arrivalQuarter,
      cashOutQuarter,
      unitPrice,
      delivery,
      quality,
      payment,
    };
    // Consegna "express" = lead time 0: la merce e' disponibile NELLO STESSO trimestre, come
    // promette l'interfaccia ("Express · subito"). Prima finiva comunque fra gli ordini in
    // transito e arrivava il trimestre dopo, rendendo l'opzione piu' cara e identica a standard.
    if (arrivalQuarter <= currentQuarter) {
      availableStock += safeOrder;
    } else {
      newPending.push(ordine);
    }
  }

  // 3. Consuma materie prime per la produzione
  const insufficient = availableStock < safeConsumption;
  const actualConsumption = insufficient ? availableStock : safeConsumption;
  const closingStock = availableStock - actualConsumption;

  // 4. Calcola costi
  const purchaseCost = safeOrder * unitPrice;
  const holdingCost = closingStock * holdingCostPerUnit;

  // 5. Raccogli i debiti fornitori generati in questo trimestre (pagamenti futuri)
  const accountsPayableDue: { quarter: number; amount: number }[] = [];
  if (safeOrder > 0) {
    accountsPayableDue.push({
      quarter: cashOutQuarter,
      amount: purchaseCost,
    });
  }

  // 6. Costruisci il nuovo stato
  const newState: RawMaterialInventoryState = {
    stock: closingStock,
    pendingOrders: [...stillPending, ...newPending],
  };

  return {
    newState,
    available: availableStock,
    ordered: safeOrder,
    consumed: actualConsumption,
    closingStock,
    purchaseCost,
    holdingCost,
    insufficient,
    accountsPayableDue,
  };
}

// ============================================================================
// 7. BACKWARD COMPATIBILITY (comportamento v0.1)
// ============================================================================

/**
 * Funzione legacy per evolvere lo stato del magazzino materie prime senza le tre dimensioni.
 * Utilizza le opzioni di default (std/std/on_delivery) per mantenere compatibilità.
 *
 * @deprecated Usare evolveSupplyStateWithOptions per maggiore controllo.
 */
export const evolveSupplyState = evolveSupplyStateWithOptions;

// ─────────────────────────────────────────────────────────────────────────────
// ORDINI MULTIPLI E MAGAZZINO A LOTTI (S17-8)
//
// Richiesta del giocatore: poter piazzare piu' ordini nello stesso trimestre, con consegne e
// pagamenti diversi, per organizzarsi in anticipo. Da qui il magazzino non e' piu' un contatore
// ma un elenco di LOTTI: ognuno porta con se' il prezzo pagato e la qualita' del materiale,
// perche' con acquisti diversi la qualita' di cio' che si consuma e' una media, non una scelta.
// ─────────────────────────────────────────────────────────────────────────────

/** Un lotto di materia prima in magazzino: quantita', prezzo pagato e qualita'. */
export interface RawMaterialLot {
  quantity: number;
  unitPrice: number;
  /** Qualita' del materiale del lotto (codice scelto all'acquisto). */
  quality: MaterialQualityOption;
}

/** Un ordine che il giocatore piazza in questo trimestre. */
export interface MaterialOrderRequest {
  quantity: number;
  delivery: DeliveryTimeOption;
  quality: MaterialQualityOption;
  payment: PaymentTermsOption;
}

/** Esito dell'evoluzione del magazzino con piu' ordini. */
export interface MultiSupplyResult {
  newState: RawMaterialInventoryState;
  /** Materiale disponibile prima del consumo. */
  available: number;
  /** Quanto si e' effettivamente consumato. */
  consumed: number;
  /** True se il materiale non bastava per la produzione richiesta. */
  insufficient: boolean;
  /** Costo totale degli ordini piazzati ora (competenza). */
  purchaseCost: number;
  /** Costo di giacenza sulle scorte finali. */
  holdingCost: number;
  /** Debiti generati ora, con la loro scadenza. */
  payables: { quarter: number; amount: number }[];
  /** Valore del materiale consumato, ai prezzi ai quali era stato comprato. */
  consumedCost: number;
  /**
   * Qualita' MEDIA PESATA del materiale consumato, su scala 0..100.
   * Se non si e' consumato nulla, e' la qualita' standard: nessun effetto.
   */
  consumedQualityIndex: number;
}

/** Indice di qualita' 0..100 per ciascun livello di materiale (allineato a `quality.ts`). */
export const MATERIAL_QUALITY_INDEX_BY_OPTION: Record<MaterialQualityOption, number> = {
  eco: 60, std: 75, prem: 85, ultra: 95,
};
const QUALITY_INDEX_BY_OPTION = MATERIAL_QUALITY_INDEX_BY_OPTION;

/** Qualita' standard: e' il riferimento, quindi non sposta nulla. */
export const STANDARD_MATERIAL_QUALITY_INDEX = QUALITY_INDEX_BY_OPTION.std;

/**
 * Evolve il magazzino con PIU' ordini nello stesso trimestre.
 *
 * Il consumo e' FIFO — si usa prima il materiale arrivato prima — mentre la qualita' risultante
 * e' la media pesata di cio' che si e' consumato: in produzione i lotti si mescolano, e un
 * criterio «vale il peggiore» renderebbe inutile comprare bene anche una sola volta.
 */
export function evolveSupplyMulti(
  state: RawMaterialInventoryState,
  orders: MaterialOrderRequest[],
  consumption: number,
  currentQuarter: number,
  baseCost: number = STANDARD_MATERIAL_COST_PER_UNIT,
  holdingCostPerUnit: number = RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER,
): MultiSupplyResult {
  // Compatibilita': un magazzino «piatto» (solo `stock`, come la scorta iniziale di partita)
  // diventa un unico lotto di qualita' standard. Senza questo, la scorta con cui si comincia la
  // partita risulterebbe invisibile e non si potrebbe produrre nulla.
  const lots: RawMaterialLot[] = state.lots
    ? [...state.lots]
    : state.stock > 0
      ? [{ quantity: state.stock, unitPrice: STANDARD_MATERIAL_COST_PER_UNIT, quality: DEFAULT_MATERIAL_QUALITY }]
      : [];
  const stillPending: PendingOrder[] = [];

  // 1. Arrivano gli ordini in viaggio che hanno raggiunto la loro scadenza di consegna.
  for (const pending of state.pendingOrders) {
    if (pending.arrivalQuarter <= currentQuarter) {
      lots.push({ quantity: pending.quantity, unitPrice: pending.unitPrice, quality: pending.quality });
    } else {
      stillPending.push(pending);
    }
  }

  // 2. Si piazzano i nuovi ordini: chi ha consegna immediata entra subito in magazzino.
  let purchaseCost = 0;
  const payables: { quarter: number; amount: number }[] = [];
  for (const o of orders) {
    const qta = Math.max(0, o.quantity);
    if (qta === 0) continue;
    const unitPrice = calculateMaterialUnitPrice(baseCost, o.delivery, o.quality, o.payment);
    const arrivalQuarter = currentQuarter + DELIVERY_TIME_OPTIONS.find((d) => d.code === o.delivery)!.leadTimeQuarters;
    const cashOutQuarter = calculateCashOutQuarter(currentQuarter, o.delivery, o.payment);
    const totale = unitPrice * qta;
    purchaseCost += totale;
    payables.push({ quarter: cashOutQuarter, amount: totale });
    if (arrivalQuarter <= currentQuarter) {
      lots.push({ quantity: qta, unitPrice, quality: o.quality });
    } else {
      stillPending.push({
        quantity: qta, arrivalQuarter, cashOutQuarter, unitPrice,
        delivery: o.delivery, quality: o.quality, payment: o.payment,
      });
    }
  }

  // 3. Consumo FIFO, tenendo conto di quanta qualita' si sta effettivamente usando.
  const available = lots.reduce((n, l) => n + l.quantity, 0);
  const richiesto = Math.max(0, consumption);
  const consumed = Math.min(available, richiesto);
  let daConsumare = consumed;
  let qualitaPesata = 0;
  let costoConsumato = 0;
  const rimanenti: RawMaterialLot[] = [];
  for (const lot of lots) {
    if (daConsumare <= 0) { rimanenti.push(lot); continue; }
    const preso = Math.min(lot.quantity, daConsumare);
    qualitaPesata += preso * QUALITY_INDEX_BY_OPTION[lot.quality];
    costoConsumato += preso * lot.unitPrice;
    daConsumare -= preso;
    if (lot.quantity > preso) rimanenti.push({ ...lot, quantity: lot.quantity - preso });
  }

  const closingStock = rimanenti.reduce((n, l) => n + l.quantity, 0);
  return {
    newState: { stock: closingStock, lots: rimanenti, pendingOrders: stillPending },
    available,
    consumed,
    insufficient: available < richiesto,
    purchaseCost,
    holdingCost: closingStock * holdingCostPerUnit,
    payables,
    consumedQualityIndex: consumed > 0 ? qualitaPesata / consumed : STANDARD_MATERIAL_QUALITY_INDEX,
    consumedCost: costoConsumato,
  };
}

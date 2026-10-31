/**
 * Tipi e configurazione del motore — il "contratto" condiviso.
 *
 * Sta in un modulo a parte perché è l'unico file che tutti gli altri importano: tenerlo
 * separato permette di lavorare in parallelo su leve diverse (KPI, cassa, rivali) senza
 * che due modifiche si scontrino sullo stesso file.
 */

/** Definizione di un evento di mercato discreto (boom/crisi) applicabile a un trimestre. */
export interface MarketEventDef {
  /** Identificatore stabile dell'evento (per UI/analytics). */
  id: string;
  /** Etichetta leggibile da mostrare al giocatore. */
  label: string;
  /** Probabilità che l'evento si verifichi in un dato trimestre [0..1]. La somma delle probabilità di tutti gli eventi deve essere <= 1 (il resto è "nessun evento"). */
  probability: number;
  /** Moltiplicatore applicato alla domanda totale se l'evento si verifica (es. 1.2 = +20%). */
  demandMultiplier: number;
}

/** Esito della risoluzione stocastica del mercato per un dato seed/trimestre. */
export interface MarketConditions {
  /** Moltiplicatore complessivo sulla domanda totale (rumore × evento, se presente). */
  demandMultiplier: number;
  /** Id dell'evento verificatosi, o null se nessun evento. */
  eventId: string | null;
  /** Etichetta dell'evento verificatosi, o null se nessun evento. */
  eventLabel: string | null;
}

export interface EngineConfig {
  /** Domanda totale di mercato per trimestre, in unità. */
  totalDemand: number;
  /** Prezzo di riferimento del mercato. */
  refPrice: number;
  /** Elasticità applicata quando price <= refPrice (sconto). Storicamente ~1.8. */
  priceElasticityBelow: number;
  /** Elasticità applicata quando price > refPrice (premium): più alta, così il premium perde quota più in fretta. */
  priceElasticityAbove: number;
  /** Costo di produzione per unità (turno standard). */
  unitCost: number;
  /** Costo delle materie prime per unità (parte di unitCost). */
  rawMaterialCost: number;
  /** Costo della manodopera per unità (parte di unitCost). */
  laborCost: number;
  /** Costo dell'energia per unità (parte di unitCost). */
  energyCost: number;
  /** Costi generali fissi per trimestre (a prescindere da vendite/stabilimenti). */
  overheadPerQuarter: number;
  /** Capacità produttiva per stabilimento a turno standard (unità/trimestre). */
  plantCapacity: number;
  /** Moltiplicatore di capacità con gli straordinari attivi (es. 1.4 = +40%). */
  overtimeCapacityMultiplier: number;
  /** Moltiplicatore di costo unitario sulle unità prodotte in straordinario (es. 1.4). */
  overtimeUnitCostMultiplier: number;
  /** Costo fisso per stabilimento per trimestre. */
  plantFixedCostPerQuarter: number;
  /** Costo una-tantum per acquistare un nuovo stabilimento. */
  plantCapex: number;
  /** Rumore casuale ±pct sulla domanda totale (es. 0.10 = ±10%). Attivo solo se si passa un seed a simulateQuarter. */
  demandNoisePct: number;
  /** Mazzo di eventi di mercato discreti (boom/crisi) applicabili stocasticamente. Attivi solo se si passa un seed a simulateQuarter. */
  marketEvents: MarketEventDef[];
  /** Tasso di crescita composto della domanda per trimestre (es. 0.025 = 2.5%). Default 0 → nessuna crescita. */
  demandGrowthRate?: number;
  /** Profilo di crescita: "constant", "s-curve", "custom". Default "constant". */
  demandGrowthProfile?: "constant" | "s-curve" | "custom";
  /** Massimo moltiplicatore di saturazione per S-curve (default 1.35). */
  demandSaturationCap?: number;
  /** Trimestre di flesso per S-curve (default 4). */
  demandInflectionQuarter?: number;
  /** Pendenza della S-curve (default 0.8). */
  demandSteepness?: number;
  /** Fattori di crescita personalizzati per trimestre (solo se profile === "custom"). */
  demandGrowthCustom?: number[];
  /** Abilita il calcolo dello scarto di qualità. Default false. */
  scrapEnabled?: boolean;
}

/**
 * Vita utile di uno stabilimento, in trimestri. 20 = 5 anni.
 *
 * Scelta di GIOCO, non industriale: una partita dura 8 trimestri, e con 40 trimestri (i 10 anni
 * proposti dal consolidamento S17-5) la quota sarebbe 6.250 €/trimestre, cioe' il 20% del costo
 * fisso di uno stabilimento — impercettibile. Con 20 trimestri sono 12.500 €, che si vedono nel
 * conto economico senza schiacciarlo. Il documento S17-1 proponeva 20 per la stessa ragione.
 */
export const PLANT_USEFUL_LIFE_QUARTERS = 20;

export const DEFAULT_CONFIG: EngineConfig = {
  totalDemand: 10_000,
  refPrice: 100,
  priceElasticityBelow: 1.8,
  priceElasticityAbove: 2.6,
  unitCost: 55,
  rawMaterialCost: 25,
  laborCost: 20,
  energyCost: 10,
  overheadPerQuarter: 20_000,
  plantCapacity: 3_000,
  overtimeCapacityMultiplier: 1.4,
  overtimeUnitCostMultiplier: 1.4,
  plantFixedCostPerQuarter: 30_000,
  plantCapex: 250_000,
  demandNoisePct: 0.09,
  marketEvents: [
    { id: "boom", label: "Boom di mercato", probability: 0.08, demandMultiplier: 1.2 },
    { id: "uptrend", label: "Tendenza positiva", probability: 0.12, demandMultiplier: 1.12 },
    { id: "slowdown", label: "Rallentamento", probability: 0.08, demandMultiplier: 0.8 },
    { id: "crunch", label: "Stretta di mercato", probability: 0.12, demandMultiplier: 0.88 },
  ],
  demandGrowthRate: 0,
  demandGrowthProfile: "constant",
  demandSaturationCap: 1.35,
  demandInflectionQuarter: 4,
  demandSteepness: 0.8,
  demandGrowthCustom: [],
  scrapEnabled: false,
};

export interface PlayerDecision {
  playerId: string;
  /** Prezzo di vendita scelto per il trimestre (> 0). */
  price: number;
  /** Stabilimenti posseduti in questo trimestre (>= 0). */
  plants: number;
  /** Straordinari attivi: aumenta capacità ma alza i costi. */
  overtime: boolean;
  /** Stabilimenti acquistati in questo trimestre (per applicare il capex). */
  plantsBought?: number;
  /** Unità da PRODURRE questo trimestre (opzionale per retrocompatibilità).
   *  Se omesso, la produzione è pari alla capacità disponibile (comportamento v0.1). */
  productionQty?: number;
  /** Budget marketing del trimestre (€). Assente ⇒ nessun effetto, comportamento precedente. */
  marketingBudget?: number;
  /** Quota del budget destinata al brand (0..1); il resto va alla campagna immediata. */
  campaignFocus?: number;
}

/**
 * Perché sono andate perse delle vendite, cioè quale vincolo ha tenuto le unità
 * vendibili sotto la domanda. Deciderlo è compito del motore: l'interfaccia non deve
 * dedurlo da sola, altrimenti finisce per dare consigli sbagliati (dire "compra
 * stabilimenti" quando la capacità era tripla della domanda).
 *
 * - `capacity`  — nemmeno producendo a pieno regime si copriva la domanda.
 * - `materials` — le materie prime disponibili hanno fermato la produzione prima.
 * - `production` — capacità e materiali bastavano: si è deciso di produrre troppo poco.
 * - `scrap`     — si è prodotto abbastanza, ma lo scarto ha ridotto i pezzi buoni.
 */
export type LostSalesCause = "capacity" | "materials" | "production" | "scrap";

export interface PlayerResult {
  playerId: string;
  price: number;
  /** Quota di mercato ottenuta [0..1] in base al prezzo relativo. */
  share: number;
  /** Domanda attratta dal prezzo, PRIMA del vincolo di capacità. */
  demandUnits: number;
  /** Capacità produttiva del trimestre (con eventuali straordinari). */
  capacity: number;
  /** Unità effettivamente vendute = min(domanda, capacità). */
  unitsSold: number;
  /** Vendite perse = domanda − vendute (per qualunque vincolo: vedi `lostSalesCause`). */
  lostSales: number;
  /** Quale vincolo ha causato le vendite perse. Assente se non se ne sono perse. */
  lostSalesCause?: LostSalesCause;
  /** Indice di qualità del prodotto (0..10) con cui si è giocato il trimestre. */
  qualityIndex: number;
  /** Qualità media (0..100) del materiale effettivamente consumato in produzione. */
  consumedMaterialQualityIndex?: number;
  /** Unità prodotte in questo trimestre (decisione del giocatore, default = capacità). */
  productionQty: number;
  /** Scorte iniziali del trimestre (riportate dal trimestre precedente). */
  openingInventory: number;
  /** Scorte finali del trimestre = openingInventory + productionQty - unitsSold. */
  closingInventory: number;
  /** Costo di giacenza = closingInventory * HOLDING_COST_PER_UNIT_PER_QUARTER. */
  holdingCost: number;
  /** Budget marketing speso nel trimestre (esce dalla cassa subito). */
  marketingCost: number;
  /** Brand equity a fine trimestre (0..1): va passata al trimestre successivo. */
  brandEquity: number;
  revenue: number;
  productionCost: number;
  /** Costi fissi del trimestre: stabilimenti + overhead. */
  fixedCost: number;
  /** Investimenti una-tantum (acquisto stabilimenti). ESCE DALLA CASSA, non dal conto economico. */
  capex: number;
  /** Quota di ammortamento degli stabilimenti: costo di competenza che NON muove la cassa. */
  depreciation: number;
  /** Costo del venduto: quanto sono costate le unità effettivamente VENDUTE nel trimestre. */
  costOfGoodsSold: number;
  /** Valore del magazzino prodotti finiti a fine trimestre: va riportato al prossimo. */
  finishedGoodsValue: number;
  /** Costo totale di competenza = costo del venduto + fissi + ammortamento + giacenza + marketing. */
  cost: number;
  profit: number;
  /** Moltiplicatore di domanda totale effettivamente applicato (rumore × evento). 1 se simulateQuarter è stato chiamato senza seed (v0.1). */
  appliedDemandMultiplier: number;
  /** Costo di acquisto materie prime (se fornito). */
  rawMaterialPurchaseCost?: number;
  /** Costo di giacenza materie prime (se fornito). */
  rawMaterialHoldingCost?: number;
  /** Quantità di materie prime consumate per la produzione (se fornito). */
  rawMaterialConsumed?: number;
  /** True se le scorte di materie prime erano insufficienti per la produzione desiderata (se fornito). */
  rawMaterialInsufficient?: boolean;
  /** Scorte finali di materie prime (se fornito). */
  rawMaterialStock?: number;
  /**
   * Stato completo del magazzino materie prime a fine trimestre, ORDINI IN TRANSITO INCLUSI.
   * Senza questo l'interfaccia non puo' riportare gli ordini da un trimestre all'altro e le
   * consegne differite si perdono per strada.
   */
  rawMaterialState?: import("./supply").RawMaterialInventoryState;
  /** Liquidità a fine trimestre (se fornito initialCashByPlayer). */
  cash?: number;
  /** Scoperto a fine trimestre (valore positivo o zero, se fornito initialCashByPlayer). */
  overdraft?: number;
  /** Stato della cassa a fine trimestre, DEBITI VERSO FORNITORI INCLUSI: va riportato al prossimo. */
  cashState?: import("./cash").CashState;
  /** Come si è mossa la cassa: incassi, pagamenti a fornitori, altre uscite, variazione netta. */
  cashFlow?: import("./cash").CashFlow;
}

/**
 * Simulazione del trimestre: il cuore del motore.
 *
 * Funzione PURA e DETERMINISTICA. Nessuna dipendenza da Supabase/DB: gira sia nel client
 * (demo) sia, in futuro, dentro una Edge Function server-side e nei test del QA.
 *
 * Leve v0.1:
 *  - PREZZO       → attrae domanda (quota di mercato relativa).
 *  - PRODUZIONE   → stabilimenti (capacità) + straordinari.
 *
 * Vincolo chiave: NON puoi vendere più di quanto la tua capacità ti permette di produrre.
 * Domanda attratta oltre la capacità = vendite perse. Modello in docs/01-game-design.md §0.
 *
 * Estensione magazzino (Sprint 5):
 *  - Le scorte si riportano tra trimestri via `startingInventories`.
 *  - La produzione (`productionQty`) è ora una decisione separata dalla vendita.
 *  - Il costo di giacenza (2.50 €/unità/trimestre) è definito in `inventory.ts`.
 */
import { resolveMarketConditions } from "./market";
import type { EngineConfig, LostSalesCause, PlayerDecision, PlayerResult } from "./types";
import { DEFAULT_CONFIG, PLANT_USEFUL_LIFE_QUARTERS } from "./types";
import { HOLDING_COST_PER_UNIT_PER_QUARTER } from "./inventory";
import type { RawMaterialInventoryState } from "./supply";
import { evolveSupplyMulti, RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER } from "./supply";
import type { MaterialOrderRequest } from "./supply";
import type { DeliveryTimeOption, MaterialQualityOption, PaymentTermsOption } from "./supply";
import { DEFAULT_DELIVERY_TIME, DEFAULT_MATERIAL_QUALITY, DEFAULT_PAYMENT_TERMS } from "./supply";
import { MATERIAL_QUALITY_INDEX_BY_OPTION } from "./supply";

/** Le tre dimensioni scelte per l'ordine di materie prime del trimestre. */
export interface MaterialOrderOptions {
  delivery: DeliveryTimeOption;
  quality: MaterialQualityOption;
  payment: PaymentTermsOption;
}
import type { BrandState } from "./marketing";
import { INITIAL_BRAND, evolveBrand, marketingMultiplier, splitBudget } from "./marketing";
import type { CashState } from "./cash";
import { calculateCash, calculateCashFlow } from "./cash";
import type { PayableDue, CashFlow } from "./cash";
import type { ScrapParams } from "./quality";
import { calculateScrapRate } from "./quality";
import type { PerceivedQualityState } from "./quality";
import { INITIAL_PERCEIVED_QUALITY, perceivedQualityMultiplier } from "./quality";
import type { WorkforceMix } from "./workforce";
import { calculateWorkforceCapacity, calculateWorkforceCost, calculateAverageDefectRate } from "./workforce";
import type { ProductQualityInputs } from "./product-quality";
import { productQualityIndex, qualityDemandMultiplier } from "./product-quality";

/**
 * Simula un trimestre dato l'insieme delle decisioni dei giocatori.
 * Ritorna un risultato per giocatore. Ordine di input preservato.
 *
 * `seed` è OPZIONALE: se omesso (undefined) il comportamento è bit-identico
 * alla v0.1 — nessun rumore, nessun evento, `appliedDemandMultiplier` = 1.
 * Se presente, attiva il branch con rumore/eventi risolto tramite
 * `resolveMarketConditions(seed, config)`.
 *
 * `startingInventories` è OPZIONALE: mappa playerId -> scorte iniziali.
 * Se omesso o assente per un giocatore, si assume 0 (comportamento v0.1).
 */
export function simulateQuarter(
  decisions: PlayerDecision[],
  config: EngineConfig = DEFAULT_CONFIG,
  seed?: number,
  startingInventories?: Record<string, number>,
  rawMaterialInventoryState?: Record<string, RawMaterialInventoryState>,
  /** Ordini di materie prime: una quantita' sola, oppure PIU' ordini con opzioni diverse. */
  rawMaterialOrders?: Record<string, number | MaterialOrderRequest[]>,
  /** Brand accumulato per giocatore. Assente ⇒ nessun effetto marketing (comportamento precedente). */
  brandStates?: Record<string, BrandState>,
  /** Cassa iniziale per giocatore. Assente ⇒ nessun calcolo di cassa (comportamento precedente). */
  initialCashByPlayer?: Record<string, CashState>,
  /** Indice del trimestre (1-based) per la crescita della domanda. Se omesso, si assume 0 (nessuna crescita). */
  quarterIndex?: number,
  /** Parametri di scarto per giocatore. Se omesso, lo scarto è disabilitato. */
  scrapParamsByPlayer?: Record<string, ScrapParams>,
  /** Mix di organico per giocatore. Se omesso, la capacità dipende solo dagli stabilimenti. */
  workforceMixByPlayer?: Record<string, WorkforceMix>,
  /** Qualità percepita dal mercato per giocatore. Assente ⇒ nessun effetto (comportamento precedente). */
  perceivedQualityByPlayer?: Record<string, PerceivedQualityState>,
  /** Opzioni dell'ordine di materie prime per giocatore (consegna, qualità, pagamento). */
  materialOrderOptionsByPlayer?: Record<string, MaterialOrderOptions>,
  /**
   * Ingredienti della qualità del prodotto per giocatore. Assente ⇒ configurazione di partenza,
   * che vale esattamente il riferimento: moltiplicatore 1, nessun effetto sulla domanda.
   */
  productQualityByPlayer?: Record<string, ProductQualityInputs>,
  /** Valore del magazzino prodotti finiti riportato dal trimestre precedente, per giocatore. */
  finishedGoodsValueByPlayer?: Record<string, number>,
): PlayerResult[] {
  if (decisions.length === 0) return [];

  const {
    totalDemand,
    refPrice,
    priceElasticityBelow,
    priceElasticityAbove,
    unitCost,
    rawMaterialCost,
    laborCost,
    energyCost,
    overheadPerQuarter,
    plantCapacity,
    overtimeCapacityMultiplier,
    overtimeUnitCostMultiplier,
    plantFixedCostPerQuarter,
    plantCapex,
  } = config;

  // 0) Condizioni di mercato: senza seed, nessuna variazione (v0.1 invariata).
  const marketConditions =
    seed !== undefined ? resolveMarketConditions(seed, config) : { demandMultiplier: 1, eventId: null, eventLabel: null };
  const appliedDemandMultiplier = marketConditions.demandMultiplier;

  // 0.1) Calcolo della domanda base con crescita (se abilitata)
  const growthRate = config.demandGrowthRate ?? 0;
  const growthProfile = config.demandGrowthProfile ?? "constant";
  const saturationCap = config.demandSaturationCap ?? 1.35;
  const inflectionQuarter = config.demandInflectionQuarter ?? 4;
  const steepness = config.demandSteepness ?? 0.8;
  const customFactors = config.demandGrowthCustom ?? [];

  function growthFactor(t: number): number {
    if (growthRate === 0) return 1;
    switch (growthProfile) {
      case "constant":
        return Math.pow(1 + growthRate, t);
      case "s-curve": {
        // t è 1-based (trimestre 1,2,...)
        const exponent = -steepness * (t - inflectionQuarter);
        return 1 + (saturationCap - 1) / (1 + Math.exp(exponent));
      }
      case "custom":
        // customFactors è un array di lunghezza totalQuarters, ma non abbiamo totalQuarters qui.
        // Assumiamo che l'array sia 0-indexed con il primo trimestre a indice 0.
        const idx = t - 1;
        return idx >= 0 && idx < customFactors.length ? customFactors[idx] : 1;
      default:
        return 1;
    }
  }

  const t = quarterIndex ?? 0; // se non fornito, assume trimestre 0 (nessuna crescita)
  const baseDemand = totalDemand * growthFactor(t);
  // Il rumore e gli eventi sono già inclusi in appliedDemandMultiplier (da marketConditions).
  // Ma secondo S11-1, l'ordine è: trend -> rumore -> eventi.
  // In resolveMarketConditions, il moltiplicatore è rumore * evento.
  // Quindi effectiveDemand = baseDemand * appliedDemandMultiplier.
  const effectiveDemand = baseDemand * appliedDemandMultiplier;

  // 1) Attrattività relativa: prezzo più basso => attrattività più alta.
  //    Elasticità asimmetrica: sotto il prezzo di riferimento si usa
  //    priceElasticityBelow, sopra priceElasticityAbove (più aggressiva).
  //    A price === refPrice, Math.pow(1, x) = 1 per qualsiasi esponente:
  //    nessuna discontinuità nel punto di riferimento.
    //    Il marketing moltiplica l'attrattività di prezzo, non la sostituisce: il prezzo resta
    //    la base. Senza brand e senza budget il moltiplicatore vale esattamente 1, quindi la
    //    formula torna identica a quella precedente (vedi test di non-regressione).
  // Indice di qualita' (0..10) di ciascun giocatore: entra nell'attrattivita' accanto al prezzo.
  // Qualita' del prodotto di ciascun giocatore, che entra nell'attrattivita' accanto al prezzo.
  //
  // Con il magazzino a lotti la qualita' del materiale e' la media pesata di cio' che c'e' in
  // magazzino a inizio trimestre. Si usa il DISPONIBILE e non il consumato perche' la domanda si
  // determina prima di sapere quanto si produrra': usare il consumo creerebbe una dipendenza
  // circolare (domanda -> produzione -> consumo -> qualita' -> domanda).
  const qualityIndexes: number[] = decisions.map((d) => {
    const inputs = { ...(productQualityByPlayer?.[d.playerId] ?? {}) };
    const lotti = rawMaterialInventoryState?.[d.playerId]?.lots;
    if (lotti && lotti.length > 0) {
      const totale = lotti.reduce((n, l) => n + l.quantity, 0);
      if (totale > 0) {
        inputs.materialQualityIndex =
          lotti.reduce((n, l) => n + l.quantity * MATERIAL_QUALITY_INDEX_BY_OPTION[l.quality], 0) / totale;
      }
    }
    return productQualityIndex(inputs);
  });

  const attractiveness = decisions.map((d, i) => {
    if (d.price <= 0) return 0;
    const exponent = d.price <= refPrice ? priceElasticityBelow : priceElasticityAbove;
    const base = Math.pow(refPrice / d.price, exponent);
    const brand = brandStates?.[d.playerId] ?? INITIAL_BRAND;
    const { performanceInvestment } = splitBudget(d.marketingBudget ?? 0, d.campaignFocus);
    // La qualità percepita moltiplica accanto a prezzo e marketing: senza la leva vale 1.
    const perceived = perceivedQualityByPlayer?.[d.playerId] ?? INITIAL_PERCEIVED_QUALITY;
    return (
      base *
      marketingMultiplier(brand, performanceInvestment) *
      perceivedQualityMultiplier(perceived) *
      qualityDemandMultiplier(qualityIndexes[i])
    );
  });
  const totalAttractiveness = attractiveness.reduce((s, a) => s + a, 0);

  return decisions.map((d, i) => {
    // 2) Domanda attratta dal prezzo (sulla domanda effettiva del trimestre).
    //    L'indice arriva da `map`: cercarlo con `decisions.indexOf(d)` sarebbe O(n²) e si
    //    romperebbe se due decisioni fossero lo stesso oggetto riusato.
    const share = totalAttractiveness > 0 ? attractiveness[i] / totalAttractiveness : 0;
    const demandUnits = Math.round(share * effectiveDemand);

    // 3) Capacità produttiva (stabilimenti, con eventuali straordinari).
    const standardCapacity = d.plants * plantCapacity;
    const plantBasedCapacity = d.overtime
      ? Math.round(standardCapacity * overtimeCapacityMultiplier)
      : standardCapacity;

    // 3.1) Capacità della forza lavoro (se fornita)
    const workforceMix = workforceMixByPlayer?.[d.playerId];
    let workforceCapacity = Infinity;
    let workforceCost = 0;
    let workforceDefectRate = 0;
    if (workforceMix) {
      workforceCapacity = calculateWorkforceCapacity(workforceMix);
      workforceCost = calculateWorkforceCost(workforceMix);
      workforceDefectRate = calculateAverageDefectRate(workforceMix);
    }

    // Capacità effettiva = min(capacità impianti, capacità forza lavoro)
    const capacity = Math.min(plantBasedCapacity, workforceCapacity);

    // 4) Disponibilità materie prime (se fornito)
    const rawState = rawMaterialInventoryState?.[d.playerId];
    const rawOrder: number | MaterialOrderRequest[] = rawMaterialOrders?.[d.playerId] ?? 0;
    let rawMaterialAvailable = Infinity;
    let rawMaterialPurchaseCost = 0;
    let rawMaterialHoldingCost = 0;
    let rawMaterialConsumed = 0;
    let rawMaterialInsufficient = false;
    let newRawState: RawMaterialInventoryState | undefined = undefined;
    let nuoviDebiti: PayableDue[] = [];
    // Con piu' ordini la qualita' del materiale non e' una scelta ma la media pesata di
    // cio' che si e' davvero consumato in produzione.
    let qualitaMaterialeConsumato: number | undefined = undefined;
    let costoMaterialeConsumato = 0;

    // 5) Produzione: decisione del giocatore se presente, altrimenti comportamento v0.1.
    //    ATTENZIONE al default. Deve essere "produci quel che riesci a vendere", NON "produci a
    //    capacità piena": con capacità superiore alla domanda quest'ultimo scelta produce scorte
    //    indesiderate e ribalta il conto economico (caso reale misurato: da +69.985 € a
    //    −83.367 €). Il contratto è che senza `productionQty` il risultato sia identico alla v0.1.
    const openingInventory = startingInventories?.[d.playerId] ?? 0;
    const legacyProduction = Math.max(0, Math.min(demandUnits, capacity) - openingInventory);
    const productionQty = d.productionQty ?? legacyProduction;
    // Validazione: non si può produrre più della capacità.
    let actualProduction = Math.min(productionQty, capacity);

    // 6) Vincolo materie prime: non si può produrre più delle materie prime disponibili.
    //    `currentQuarter` era cablato a 0: con un "adesso" fermo, ogni ordine scadeva sempre nel
    //    futuro e NON ARRIVAVA MAI (verificato: 3 trimestri, produzione sempre 0). Ora si usa il
    //    trimestre vero e si passano le tre dimensioni scelte, che prima venivano ignorate.
    if (rawState !== undefined) {
      const opts = materialOrderOptionsByPlayer?.[d.playerId];
      // Un ordine singolo e' semplicemente una lista di un elemento: un solo percorso di codice.
      const ordini: MaterialOrderRequest[] = Array.isArray(rawOrder)
        ? rawOrder
        : rawOrder > 0
          ? [{
              quantity: rawOrder,
              delivery: opts?.delivery ?? DEFAULT_DELIVERY_TIME,
              quality: opts?.quality ?? DEFAULT_MATERIAL_QUALITY,
              payment: opts?.payment ?? DEFAULT_PAYMENT_TERMS,
            }]
          : [];
      const supplyResult = evolveSupplyMulti(
        rawState,
        ordini,
        actualProduction, // consumo richiesto dalla produzione decisa
        t,                // trimestre corrente (1-based)
        config.rawMaterialCost,
      );
      // Le materie prime disponibili per la produzione sono le scorte disponibili dopo l'arrivo degli ordini
      rawMaterialAvailable = supplyResult.available;
      rawMaterialPurchaseCost = supplyResult.purchaseCost;
      rawMaterialHoldingCost = supplyResult.holdingCost;
      rawMaterialConsumed = supplyResult.consumed;
      costoMaterialeConsumato = supplyResult.consumedCost;
      rawMaterialInsufficient = supplyResult.insufficient;
      newRawState = supplyResult.newState;
      // Scadenzario del debito verso il fornitore: e' `supply.ts` a saperne la scadenza, in base
      // ai termini di pagamento scelti. Prima veniva calcolato e buttato via.
      nuoviDebiti = supplyResult.payables.map((x) => ({ quarter: x.quarter, amount: x.amount }));
      qualitaMaterialeConsumato = supplyResult.consumedQualityIndex;
      // Aggiorna actualProduction se le materie prime sono insufficienti
      actualProduction = Math.min(actualProduction, rawMaterialConsumed);
    }

    // 7) Applicazione scarto (se abilitato)
    let goodUnits = actualProduction;
    let scrapCost = 0;
    const scrapParams = scrapParamsByPlayer?.[d.playerId];
    if (scrapParams && (config.scrapEnabled ?? false)) {
      // Se abbiamo il mix della forza lavoro, usiamo il suo tasso di difetto come base.
      let effectiveScrapParams = scrapParams;
      if (workforceMix) {
        effectiveScrapParams = {
          ...scrapParams,
          personnelDefectOverridePp: workforceDefectRate,
        };
      }
      const scrapResult = calculateScrapRate(effectiveScrapParams);
      const scrapRate = scrapResult.scrapRate;
      const scrappedUnits = Math.floor(actualProduction * scrapRate);
      goodUnits = actualProduction - scrappedUnits;
      // Il costo dello scarto: le unità scartate hanno già sostenuto il costo di produzione (materie prime, lavoro, energia).
      // Quindi non c'è un costo aggiuntivo oltre a quello già incluso in productionCost.
      // Tuttavia, le unità scartate non generano ricavo, quindi il profitto si riduce naturalmente.
      // Per tracciare il costo esplicito, potremmo considerare il costo delle unità scartate come "costo di scarto",
      // ma è già incluso in productionCost. Quindi non aggiungiamo scrapCost.
      // Per semplicità, teniamo goodUnits.
    }
    // 8) Vincolo di disponibilità: non vendi ciò che non produci (né hai in scorta).
    const availableForSale = openingInventory + goodUnits;
    const unitsSold = Math.min(demandUnits, availableForSale);
    const lostSales = demandUnits - unitsSold;

    // 8.1) Perché sono andate perse: il vincolo che ha morso per primo, dal più duro al più
    //      rimediabile. Senza questo, l'interfaccia dava sempre la colpa alla capacità e
    //      consigliava di comprare stabilimenti anche quando era già tripla della domanda.
    let lostSalesCause: LostSalesCause | undefined;
    if (lostSales > 0) {
      const neededProduction = Math.max(0, demandUnits - openingInventory);
      if (openingInventory + capacity <= demandUnits) {
        // Nemmeno a pieno regime, con le scorte iniziali, si copriva la domanda.
        lostSalesCause = "capacity";
      } else if (rawState !== undefined && actualProduction < Math.min(productionQty, capacity)) {
        // Si voleva (e si poteva) produrre di più: sono mancate le materie prime.
        lostSalesCause = "materials";
      } else if (productionQty < neededProduction) {
        // Capacità e materiali bastavano: è stata decisa una produzione troppo bassa.
        lostSalesCause = "production";
      } else {
        // Prodotto abbastanza, ma lo scarto ha ridotto i pezzi buoni.
        lostSalesCause = "scrap";
      }
    }

    // 9) Scorte finali e costo di giacenza.
    const closingInventory = availableForSale - unitsSold;
    const holdingCost = closingInventory * HOLDING_COST_PER_UNIT_PER_QUARTER;

    // 10) Costi di produzione: le unità oltre la capacità standard costano di più (straordinari).
    const unitsStandard = Math.min(actualProduction, standardCapacity);
    const unitsOvertime = actualProduction - unitsStandard;
    // Calcolo del costo unitario dalle componenti.
    // Se il giocatore gestisce il magazzino materie prime, la materia prima la paga con gli ORDINI
    // (`rawMaterialPurchaseCost`): lasciarla anche qui la farebbe pagare due volte.
    const materialInUnitCost = rawState !== undefined ? 0 : rawMaterialCost;
    const unitCostFromComponents = materialInUnitCost + laborCost + energyCost;
    const productionCost =
      unitsStandard * unitCostFromComponents +
      unitsOvertime * unitCostFromComponents * overtimeUnitCostMultiplier;

    // 11) Costi fissi e investimenti.
    let fixedCost = d.plants * plantFixedCostPerQuarter + overheadPerQuarter;
    // Aggiungi costo del personale se presente
    if (workforceMix) {
      fixedCost += workforceCost;
    }
    const capex = (d.plantsBought ?? 0) * plantCapex;
    // L'investimento non e' un costo del trimestre: si spalma sulla vita utile dell'impianto.
    // Prima 250.000 € di capex abbattevano il profitto in un colpo solo, ed e' la ragione per cui
    // comprare uno stabilimento sembrava un disastro invece di un investimento.
    const depreciation = d.plants * (plantCapex / PLANT_USEFUL_LIFE_QUARTERS);

    // Marketing: il budget esce dal trimestre come costo, e la quota awareness costruisce
    // brand equity che sarà disponibile nei trimestri successivi.
    const { awarenessInvestment, performanceInvestment: perfInv } = splitBudget(
      d.marketingBudget ?? 0,
      d.campaignFocus,
    );
    const marketingCost = awarenessInvestment + perfInv;
    const brandBefore = brandStates?.[d.playerId] ?? INITIAL_BRAND;
    const brandAfter = evolveBrand(brandBefore, awarenessInvestment);

    const revenue = unitsSold * d.price;
    // COSTO DEL VENDUTO: la merce prodotta e non venduta NON pesa sul trimestre in cui la
    // produci, ma su quello in cui la vendi. Prima l'intero costo di produzione cadeva sul
    // trimestre di produzione, quindi chi costruiva scorte risultava in perdita senza motivo.
    const valoreMagazzinoIniziale = finishedGoodsValueByPlayer?.[d.playerId] ?? 0;
    const costoProduzioneDelTrimestre = productionCost + costoMaterialeConsumato;
    const valoreDisponibile = valoreMagazzinoIniziale + costoProduzioneDelTrimestre;
    const unitaDisponibili = openingInventory + goodUnits;
    const costoUnitarioMedio = unitaDisponibili > 0 ? valoreDisponibile / unitaDisponibili : 0;
    const costOfGoodsSold = unitsSold * costoUnitarioMedio;
    const finishedGoodsValue = valoreDisponibile - costOfGoodsSold;

    let cost = costOfGoodsSold + fixedCost + depreciation + holdingCost + marketingCost;
    if (rawState !== undefined) {
      // Il materiale e' gia' dentro il costo del venduto: qui resta solo la giacenza.
      cost += rawMaterialHoldingCost;
    }
    const profit = revenue - cost;

    const baseResult = {
      playerId: d.playerId,
      price: d.price,
      share,
      demandUnits,
      capacity,
      unitsSold,
      lostSales,
      lostSalesCause,
      qualityIndex: qualityIndexes[i],
      consumedMaterialQualityIndex: qualitaMaterialeConsumato,
      productionQty: actualProduction,
      openingInventory,
      closingInventory,
      holdingCost,
      marketingCost,
      brandEquity: brandAfter.brandEquity,
      revenue,
      productionCost,
      fixedCost,
      capex,
      depreciation,
      costOfGoodsSold,
      finishedGoodsValue,
      cost,
      profit,
      appliedDemandMultiplier,
    };

    // Calcolo cassa se fornito.
    // Con il magazzino materie prime attivo la cassa NON e' piu' «profitto sommato al saldo»: si
    // muove sui pagamenti effettivi, e i debiti verso fornitori escono alla loro scadenza. E'
    // questo che rende la dilazione una scelta vera invece di un sovrapprezzo buttato.
    let cashResult: { cash?: number; overdraft?: number; cashState?: CashState; cashFlow?: CashFlow } = {};
    if (initialCashByPlayer !== undefined) {
      const previousCash = initialCashByPlayer[d.playerId] ?? { cash: 0 };
      const risultatoPieno = {
        ...baseResult,
        rawMaterialPurchaseCost,
        rawMaterialHoldingCost,
        rawMaterialConsumed,
        rawMaterialInsufficient,
        rawMaterialStock: newRawState?.stock ?? 0,
        rawMaterialState: newRawState,
      };
      if (rawState !== undefined) {
        // Uscite del trimestre diverse dai fornitori di materie prime: quelle si pagano subito.
        // Uscite di cassa vere del trimestre, elencate una per una invece di dedurle dal costo:
        // l'ammortamento e il costo del venduto non muovono cassa, il capex si'.
        const cashOutOther =
          productionCost + fixedCost + marketingCost + holdingCost + rawMaterialHoldingCost + capex;
        const { newCash, overdraft, flow } = calculateCashFlow(
          previousCash, t, revenue, cashOutOther, nuoviDebiti,
        );
        cashResult = { cash: newCash.cash, overdraft, cashState: newCash, cashFlow: flow };
      } else {
        // Senza magazzino materie prime non ci sono debiti: cassa e profitto coincidono (v0.1).
        const { newCash, overdraft } = calculateCash(previousCash, risultatoPieno);
        cashResult = { cash: newCash.cash, overdraft, cashState: newCash };
      }
    }

    if (rawState !== undefined) {
      return {
        ...baseResult,
        rawMaterialPurchaseCost,
        rawMaterialHoldingCost,
        rawMaterialConsumed,
        rawMaterialInsufficient,
        rawMaterialStock: newRawState?.stock ?? 0,
        rawMaterialState: newRawState,
        ...cashResult,
      };
    } else {
      return {
        ...baseResult,
        ...cashResult,
      };
    }
  });
}

/** Classifica per profitto cumulato (decrescente). Input: profitto per giocatore. */
export function rankByProfit(
  cumulativeProfitByPlayer: Record<string, number>,
): { playerId: string; cumulativeProfit: number }[] {
  return Object.entries(cumulativeProfitByPlayer)
    .map(([playerId, cumulativeProfit]) => ({ playerId, cumulativeProfit }))
    .sort((a, b) => b.cumulativeProfit - a.cumulativeProfit);
}

"use client";

import { useState, useEffect, useMemo } from "react";
import {
  simulateQuarter,
  resolveMarketConditions,
  DEFAULT_CONFIG,
  calculateControllingKPI,
  generateRivalDecision,
  DEFAULT_DELIVERY_TIME,
  DEFAULT_MATERIAL_QUALITY,
  DEFAULT_PAYMENT_TERMS,
  type DeliveryTimeOption,
  type MaterialQualityOption,
  type PaymentTermsOption,
  type BrandState,
  type PlayerDecision,
  type PlayerResult,
  type MarketConditions,
  type ControllingKPI,
  type QuarterHistory,
  type CashState,
  type EngineConfig,
  type GameSetup,
  type RawMaterialInventoryState,
  type MaterialOrderOptions,
  type MaterialOrderRequest,
  DEFAULT_SETUP,
  deriveCosts,
  productQualityIndex,
  REFERENCE_QUALITY_INDEX,
  type ProductQualityInputs,
} from "@/lib/game-engine";
import { clamp } from "@/lib/ui/format";

export const TOTAL_QUARTERS = 8;
export const START_CAPITAL = 1_000_000;
/** Config di riferimento: chi salta la schermata di setup gioca ESATTAMENTE con questa. */
export const CFG = DEFAULT_CONFIG;
export const NOISE_PCT = Math.round(CFG.demandNoisePct * 100);

/** Ampiezza del cursore del prezzo attorno al prezzo di riferimento (60%..140%). */
const PRICE_MIN_RATIO = 0.6;
const PRICE_MAX_RATIO = 1.4;

/**
 * Costruisce la configurazione del motore a partire dai parametri scelti a inizio partita.
 * Senza setup si restituisce `DEFAULT_CONFIG` **intatta**: e' la garanzia che saltare la
 * schermata iniziale lasci il gioco identico a prima.
 */
export function configFromSetup(setup: GameSetup | null): EngineConfig {
  if (!setup) return DEFAULT_CONFIG;
  const d = deriveCosts(setup);
  return {
    ...DEFAULT_CONFIG,
    refPrice: setup.standardPrice,
    unitCost: d.unitCost,
    // `deriveCosts` divide il costo variabile in materiali e lavoro (senza energia): la SOMMA
    // resta il costo unitario, che e' cio' che il motore usa per il costo di produzione.
    rawMaterialCost: d.materialCostPerUnit,
    laborCost: d.laborCostPerUnit,
    energyCost: 0,
    plantCapacity: setup.plantCapacity,
    overheadPerQuarter: setup.overheadPerQuarter,
    plantFixedCostPerQuarter: setup.plantFixedCostPerQuarter,
  };
}

export const PLAYERS = [
  { id: "tu", name: "La tua azienda" },
  { id: "alfa", name: "Rivale Alfa" },
  { id: "beta", name: "Rivale Beta" },
];

export type TabId = "cruscotto" | "decisioni" | "risultati" | "classifica";
export type DecSection = "commerciale" | "operations" | "approvvigionamento" | "marketing";

const capacityOfWith = (cfg: EngineConfig, plants: number, overtime: boolean) =>
  overtime ? Math.round(plants * cfg.plantCapacity * cfg.overtimeCapacityMultiplier) : plants * cfg.plantCapacity;

const randomSeed = () => Math.floor(Math.random() * 1_000_000_000);

/** Genera decisioni dei rivali usando generateRivalDecision. */
function generateRivalDecisions(
  playerPrice: number,
  quarter: number,
  history: QuarterHistory[],
  seed: number,
  cfg: EngineConfig = DEFAULT_CONFIG,
): PlayerDecision[] {
  // Profili predefiniti
  const profiles: Record<string, "aggressive" | "premium"> = {
    alfa: "aggressive",
    beta: "premium",
  };
  return Object.entries(profiles).map(([rivalId, profile]) =>
    generateRivalDecision(history, profile, rivalId, seed, cfg)
  );
}

/**
 * Stato della partita locale a giocatore singolo: decisioni del trimestre, chiusura,
 * ripartenza e valori derivati (stima a mercato neutro, KPI, classifica).
 *
 * Estratto da `page.tsx` nel refactor S15-1. La logica è identica a prima: qui sta
 * insieme perché `page.tsx` possa limitarsi a comporre le schermate.
 */
export function useGioco() {
  // Parametri scelti a inizio partita. `null` = non scelti: si gioca con DEFAULT_CONFIG.
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const cfg = useMemo(() => configFromSetup(setup), [setup]);
  const capacityOf = (plants: number, overtime: boolean) => capacityOfWith(cfg, plants, overtime);
  // Il cursore del prezzo segue il prezzo di riferimento: con i default resta 60..140 come prima.
  const priceMin = Math.round(cfg.refPrice * PRICE_MIN_RATIO);
  const priceMax = Math.round(cfg.refPrice * PRICE_MAX_RATIO);

  const [tab, setTab] = useState<TabId>("cruscotto");
  const [decSection, setDecSection] = useState<DecSection>("commerciale");
  const [quarter, setQuarter] = useState(1);
  const [price, setPrice] = useState(DEFAULT_CONFIG.refPrice);
  const [plants, setPlants] = useState(1);
  const [overtime, setOvertime] = useState(false);
  const [plantsBought, setPlantsBought] = useState(0);
  const [productionQty, setProductionQty] = useState(capacityOf(1, false));
  const [startingInventories, setStartingInventories] = useState<Record<string, number>>({});
  // Valore del magazzino prodotti finiti: la merce invenduta e' un valore, non un costo bruciato.
  const [valoreMagazzino, setValoreMagazzino] = useState<Record<string, number>>({});
  const [marketingBudget, setMarketingBudget] = useState(0);
  const [campaignFocus, setCampaignFocus] = useState(0.5);
  const [brandStates, setBrandStates] = useState<Record<string, BrandState>>({});
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTimeOption>(DEFAULT_DELIVERY_TIME);
  const [materialQuality, setMaterialQuality] = useState<MaterialQualityOption>(DEFAULT_MATERIAL_QUALITY);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermsOption>(DEFAULT_PAYMENT_TERMS);
  const [orderQty, setOrderQty] = useState(0);
  // Ordini composti per QUESTO trimestre: si possono accodare piu' acquisti con consegne e
  // pagamenti diversi, che e' il modo di organizzarsi in anticipo.
  const [ordini, setOrdini] = useState<MaterialOrderRequest[]>([]);
  // Magazzino materie prime del solo giocatore. I rivali non ne hanno: si riapprovvigionano da
  // soli a condizioni standard e non si bloccano mai (scelta dell'utente, 2026-07-28).
  const [rawState, setRawState] = useState<RawMaterialInventoryState>(
    () => ({ stock: DEFAULT_SETUP.initialRawMaterialStock, pendingOrders: [] }),
  );
  const [rivalHistory, setRivalHistory] = useState<QuarterHistory[]>([]);
  const [cashState, setCashState] = useState<Record<string, CashState>>({
    tu: { cash: START_CAPITAL },
    alfa: { cash: START_CAPITAL },
    beta: { cash: START_CAPITAL },
  });

  useEffect(() => {
    setProductionQty((prev) => Math.min(prev, capacityOfWith(cfg, plants, overtime)));
  }, [cfg, plants, overtime]);

  const handleProductionChange = (val: number) => {
    setProductionQty(clamp(val, 0, capacityOf(plants, overtime)));
  };

  const [cumProfit, setCumProfit] = useState<Record<string, number>>({ tu: 0, alfa: 0, beta: 0 });
  const [lastResults, setLastResults] = useState<PlayerResult[] | null>(null);
  const [seedPartita, setSeedPartita] = useState<number>(randomSeed);
  const [marketConditions, setMarketConditions] = useState<MarketConditions | null>(null);

  const materialOptions: MaterialOrderOptions = { delivery: deliveryTime, quality: materialQuality, payment: paymentTerms };

  // Qualita' del prodotto del giocatore. I rivali non sono elencati: restano alla configurazione
  // di riferimento (moltiplicatore 1) finche' non si decide col playtest come devono giocarsela.
  const qualityInputs: ProductQualityInputs = {
    materialQuality,
    overtime,
    brandEquity: brandStates.tu?.brandEquity ?? 0,
  };
  const qualityIndex = productQualityIndex(qualityInputs);

  const gameOver = quarter > TOTAL_QUARTERS;
  const cash = cashState.tu.cash;
  const capacity = capacityOf(plants, overtime);
  const seedTrim = seedPartita + quarter;
  const bots = generateRivalDecisions(price, quarter, rivalHistory, seedTrim, cfg);

  const closeQuarter = () => {
    const decisions: PlayerDecision[] = [
      { playerId: "tu", price, plants, overtime, plantsBought,
        productionQty: Math.min(productionQty, capacity), marketingBudget, campaignFocus },
      ...bots,
    ];
    const seedTrim = seedPartita + quarter;
    const results = simulateQuarter(
      decisions, cfg, seedTrim, startingInventories,
      { tu: rawState }, { tu: ordini },
      brandStates, cashState, quarter, undefined, undefined, undefined,
      { tu: materialOptions }, { tu: qualityInputs }, valoreMagazzino,
    );
    setMarketConditions(resolveMarketConditions(seedTrim, cfg));
    setCumProfit((prev) => {
      const next = { ...prev };
      for (const r of results) next[r.playerId] = (next[r.playerId] ?? 0) + r.profit;
      return next;
    });
    // Aggiorna la cassa con i valori restituiti dal motore
    const nextCashState: Record<string, CashState> = {};
    for (const r of results) {
      if (r.cash !== undefined) {
        // Si riporta lo stato COMPLETO: dentro ci sono i debiti verso fornitori non ancora
        // scaduti. Tenendo solo il saldo, le dilazioni sparirebbero e non si pagherebbe mai.
        nextCashState[r.playerId] = r.cashState ?? { cash: r.cash };
      }
    }
    setCashState(nextCashState);
    setLastResults(results);
    setPlantsBought(0);
    // Il magazzino materie prime si riporta INTERO: senza gli ordini in transito le consegne
    // differite si perderebbero per strada.
    const mio = results.find((r) => r.playerId === "tu");
    if (mio?.rawMaterialState) setRawState(mio.rawMaterialState);
    setOrdini([]); setOrderQty(0); // gli ordini sono stati piazzati: si riparte puliti
    // Riporta le scorte finali per il prossimo trimestre
    const nextInventories: Record<string, number> = {};
    const nextValori: Record<string, number> = {};
    for (const r of results) {
      nextInventories[r.playerId] = r.closingInventory;
      nextValori[r.playerId] = r.finishedGoodsValue;
    }
    setStartingInventories(nextInventories);
    setValoreMagazzino(nextValori);
    // Il brand costruito quest'anno è il vantaggio del prossimo: va riportato.
    const nextBrands: Record<string, BrandState> = {};
    for (const r of results) nextBrands[r.playerId] = { brandEquity: r.brandEquity };
    setBrandStates(nextBrands);

    // Aggiorna lo storico dei rivali
    const totalDemand = cfg.totalDemand * (results[0]?.appliedDemandMultiplier ?? 1);
    const marketShare: Record<string, number> = {};
    const rivalPrices: Record<string, number> = {};
    for (const r of results) {
      marketShare[r.playerId] = r.unitsSold / totalDemand;
      rivalPrices[r.playerId] = r.price;
    }
    const newHistory: QuarterHistory = {
      quarter,
      playerPrice: price,
      rivalPrices,
      marketShare,
    };
    setRivalHistory((prev) => [...prev, newHistory]);

    setQuarter((q) => q + 1);
    setTab("risultati"); // dopo la chiusura si va al racconto di com'e' andata
  };

  const restart = () => {
    setQuarter(1); setPrice(cfg.refPrice); setPlants(1); setOvertime(false);
    setPlantsBought(0); setProductionQty(capacityOf(1, false));
    setCumProfit({ tu: 0, alfa: 0, beta: 0 }); setLastResults(null);
    setSeedPartita(randomSeed());
    setMarketConditions(null);
    setStartingInventories({}); setValoreMagazzino({});
    setMarketingBudget(0); setCampaignFocus(0.5); setBrandStates({});
    setDeliveryTime(DEFAULT_DELIVERY_TIME); setMaterialQuality(DEFAULT_MATERIAL_QUALITY);
    setPaymentTerms(DEFAULT_PAYMENT_TERMS); setOrderQty(0); setOrdini([]);
    setRawState({ stock: (setup ?? DEFAULT_SETUP).initialRawMaterialStock, pendingOrders: [] });
    setRivalHistory([]);
    setCashState({
      tu: { cash: START_CAPITAL },
      alfa: { cash: START_CAPITAL },
      beta: { cash: START_CAPITAL },
    });
    setDecSection("commerciale");
    setTab("cruscotto");
  };

  const ranking = [...PLAYERS]
    .map((p) => ({ ...p, profit: cumProfit[p.id] ?? 0 }))
    .sort((a, b) => b.profit - a.profit);
  const you = lastResults?.find((r) => r.playerId === "tu");
  const kpis: ControllingKPI | null = you ? calculateControllingKPI(you) : null;

  // Stima a mercato neutro: SENZA seed (per decisioni/simulazione, mai per l'esito reale).
  const simulateFor = (p: number): PlayerResult => {
    // Usa lo stesso seed del trimestre corrente per determinismo
    const seedTrim = seedPartita + quarter;
    const rivalDecisions = generateRivalDecisions(p, quarter, rivalHistory, seedTrim, cfg);
    const decisions: PlayerDecision[] = [
      { playerId: "tu", price: p, plants, overtime, plantsBought,
        productionQty: Math.min(productionQty, capacity), marketingBudget, campaignFocus },
      ...rivalDecisions,
    ];
    return simulateQuarter(
      decisions, cfg, undefined, startingInventories,
      { tu: rawState }, { tu: ordini },
      brandStates, cashState, quarter, undefined, undefined, undefined,
      { tu: materialOptions }, { tu: qualityInputs }, valoreMagazzino,
    ).find((r) => r.playerId === "tu")!;
  };
  const est = simulateFor(price);
  const margin = est.revenue > 0 ? (est.profit / est.revenue) * 100 : 0;
  const breakEven = price > cfg.unitCost ? Math.ceil((est.fixedCost + est.capex) / (price - cfg.unitCost)) : Infinity;
  const sensiPrices = Array.from(new Set([clamp(price - 10, priceMin, priceMax), price, clamp(price + 10, priceMin, priceMax)])).sort((a, b) => a - b);

  // Rischio capacità: lo dice il MOTORE, non un confronto rifatto qui. `demandUnits > capacity`
  // ignorava le scorte già in magazzino e consigliava di comprare stabilimenti anche quando
  // bastavano a coprire la domanda.
  const capacityShort = est.lostSalesCause === "capacity";
  const capacitySeverity = !capacityShort ? null : capacity < est.demandUnits * 0.7 ? "danger" : "gold";

  return {
    // navigazione
    tab, setTab, decSection, setDecSection,
    // decisioni del trimestre
    quarter, price, setPrice, plants, overtime, plantsBought, productionQty, handleProductionChange,
    marketingBudget, setMarketingBudget, campaignFocus, setCampaignFocus,
    deliveryTime, setDeliveryTime, materialQuality, setMaterialQuality,
    paymentTerms, setPaymentTerms, orderQty, setOrderQty,
    buyPlant: () => { setPlants((p) => p + 1); setPlantsBought((b) => b + 1); },
    toggleOvertime: () => setOvertime((o) => !o),
    // stato della partita
    gameOver, cash, capacity, cumProfit, startingInventories, brandStates,
    lastResults, marketConditions, bots, ranking, you, kpis,
    // stime
    simulateFor, est, margin, breakEven, sensiPrices, capacityShort, capacitySeverity,
    // ordini di materie prime in composizione
    ordini,
    aggiungiOrdine: () => {
      if (orderQty <= 0) return;
      setOrdini((prev) => [...prev, {
        quantity: orderQty, delivery: deliveryTime, quality: materialQuality, payment: paymentTerms,
      }]);
      setOrderQty(0);
    },
    rimuoviOrdine: (i: number) => setOrdini((prev) => prev.filter((_, k) => k !== i)),
    // contabilita' dell'ultimo trimestre
    cashFlow: you?.cashFlow,
    debitiFornitori: cashState.tu?.payables?.reduce((n, p) => n + p.amount, 0) ?? 0,
    scadenzario: cashState.tu?.payables ?? [],
    // qualita' del prodotto
    qualityIndex, qualityRef: REFERENCE_QUALITY_INDEX,
    // materie prime
    rawState,
    materieInTransito: rawState.pendingOrders.reduce((n, o) => n + o.quantity, 0),
    // setup di inizio partita
    setup, setupDone, cfg, priceMin, priceMax,
    avviaConSetup: (s: GameSetup) => {
      setSetup(s); setPrice(s.standardPrice);
      setRawState({ stock: s.initialRawMaterialStock, pendingOrders: [] });
      setSetupDone(true);
    },
    saltaSetup: () => { setSetup(null); setSetupDone(true); },
    // azioni
    closeQuarter, restart,
  };
}

export type Gioco = ReturnType<typeof useGioco>;

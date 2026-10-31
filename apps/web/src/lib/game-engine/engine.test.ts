import { describe, it, expect } from "vitest";
import {
  simulateQuarter,
  rankByProfit,
  resolveMarketConditions,
  calculateControllingKPI,
  DEFAULT_CONFIG,
  type PlayerDecision,
  type EngineConfig,
  type PlayerResult,
} from "./index";
import type { RawMaterialInventoryState } from "./supply";
import { REFERENCE_QUALITY_INDEX } from "./product-quality";
import type { WorkforceMix } from "./workforce";
import { calculateWorkforceCapacity, calculateWorkforceCost } from "./workforce";
import type { ScrapParams } from "./quality";

/** Helper: decisione con capacità abbondante (per isolare la leva prezzo). */
const dec = (p: Partial<PlayerDecision> & { playerId: string }): PlayerDecision => ({
  price: 100,
  plants: 10, // capacità ampia: nessun vincolo salvo diversamente indicato
  overtime: false,
  ...p,
});

describe("simulateQuarter — leva prezzo", () => {
  it("con prezzi uguali e stessa capacità divide il mercato in parti uguali", () => {
    const res = simulateQuarter([dec({ playerId: "a" }), dec({ playerId: "b" })]);
    expect(res[0].share).toBeCloseTo(0.5, 5);
    expect(res[1].share).toBeCloseTo(0.5, 5);
  });

  it("chi abbassa il prezzo attrae più domanda", () => {
    const res = simulateQuarter([
      dec({ playerId: "cheap", price: 80 }),
      dec({ playerId: "pricey", price: 120 }),
    ]);
    const cheap = res.find((r) => r.playerId === "cheap")!;
    const pricey = res.find((r) => r.playerId === "pricey")!;
    expect(cheap.share).toBeGreaterThan(pricey.share);
  });

  it("la somma delle quote è ~1", () => {
    const res = simulateQuarter([
      dec({ playerId: "a", price: 70 }),
      dec({ playerId: "b", price: 100 }),
      dec({ playerId: "c", price: 130 }),
    ]);
    expect(res.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 5);
  });

  it("è deterministico: stessi input => stessi output", () => {
    const input = [dec({ playerId: "a", price: 90 }), dec({ playerId: "b", price: 110 })];
    expect(simulateQuarter(input)).toEqual(simulateQuarter(input));
  });
});

describe("simulateQuarter — leva produzione (capacità)", () => {
  it("la capacità limita le vendite: domanda oltre capacità => vendite perse", () => {
    // Prezzo bassissimo per l'unico attore => attrae quasi tutta la domanda, ma 1 solo stabilimento.
    const [r] = simulateQuarter([{ playerId: "solo", price: 60, plants: 1, overtime: false }]);
    expect(r.demandUnits).toBe(DEFAULT_CONFIG.totalDemand); // unico attore => tutta la domanda
    expect(r.capacity).toBe(DEFAULT_CONFIG.plantCapacity); // 1 stabilimento
    expect(r.unitsSold).toBe(DEFAULT_CONFIG.plantCapacity); // capato dalla capacità
    expect(r.lostSales).toBe(DEFAULT_CONFIG.totalDemand - DEFAULT_CONFIG.plantCapacity);
  });

  it("gli straordinari aumentano la capacità", () => {
    const base = simulateQuarter([{ playerId: "x", price: 60, plants: 1, overtime: false }])[0];
    const ot = simulateQuarter([{ playerId: "x", price: 60, plants: 1, overtime: true }])[0];
    expect(ot.capacity).toBeGreaterThan(base.capacity);
    expect(ot.unitsSold).toBeGreaterThan(base.unitsSold);
  });

  it("gli straordinari costano di più per unità extra", () => {
    // Stesse unità vendute ma prodotte in straordinario => costo produzione maggiore.
    const withOt = simulateQuarter([{ playerId: "x", price: 60, plants: 1, overtime: true }])[0];
    // Le unità oltre la capacità standard (3000) sono in straordinario e costano di più.
    expect(withOt.unitsSold).toBeGreaterThan(DEFAULT_CONFIG.plantCapacity);
    const naiveCost = withOt.unitsSold * DEFAULT_CONFIG.unitCost;
    expect(withOt.productionCost).toBeGreaterThan(naiveCost);
  });

  it("l'acquisto di stabilimenti applica il capex", () => {
    const noBuy = simulateQuarter([{ playerId: "x", price: 100, plants: 2, overtime: false }])[0];
    const buy = simulateQuarter([
      { playerId: "x", price: 100, plants: 2, overtime: false, plantsBought: 1 },
    ])[0];
    expect(buy.capex).toBe(DEFAULT_CONFIG.plantCapex);
    // CAMBIATO il 2026-07-29 (S17-6): l'investimento NON e' piu' un costo del trimestre.
    // Prima 250.000 € di capex abbattevano il profitto in un colpo solo. Ora il profitto non
    // cambia (stessi impianti in funzione, stesso ammortamento) e il capex esce dalla CASSA.
    expect(buy.profit).toBe(noBuy.profit);
    expect(buy.depreciation).toBe(noBuy.depreciation);
  });

  it("i costi fissi crescono col numero di stabilimenti", () => {
    const one = simulateQuarter([{ playerId: "x", price: 100, plants: 1, overtime: false }])[0];
    const three = simulateQuarter([{ playerId: "x", price: 100, plants: 3, overtime: false }])[0];
    expect(three.fixedCost).toBeGreaterThan(one.fixedCost);
  });

  it("gestisce input vuoto", () => {
    expect(simulateQuarter([])).toEqual([]);
  });
});

describe("rankByProfit", () => {
  it("ordina per profitto cumulato decrescente", () => {
    const ranking = rankByProfit({ a: 100, b: 300, c: 200 });
    expect(ranking.map((r) => r.playerId)).toEqual(["b", "c", "a"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sprint 3 — Nuovi test di regressione e scenari (game-engine v0.2)
// ─────────────────────────────────────────────────────────────────────────

describe("simulateQuarter — regressione v0.1 (senza seed)", () => {
  it("senza terzo parametro, appliedDemandMultiplier è sempre 1 (neutro)", () => {
    const res = simulateQuarter([dec({ playerId: "a" }), dec({ playerId: "b", price: 90 })]);
    for (const r of res) {
      expect(r.appliedDemandMultiplier).toBe(1);
    }
  });

  it("scenario storico invariato: attore singolo, prezzo 60, 1 stabilimento", () => {
    // Stesso scenario del test esistente "la capacità limita le vendite", con
    // asserzioni esplicite aggiuntive per bloccare regressioni sui valori v0.1.
    const [r] = simulateQuarter([{ playerId: "solo", price: 60, plants: 1, overtime: false }]);
    expect(r.appliedDemandMultiplier).toBe(1);
    expect(r.demandUnits).toBe(DEFAULT_CONFIG.totalDemand);
    expect(r.capacity).toBe(DEFAULT_CONFIG.plantCapacity);
    expect(r.unitsSold).toBe(DEFAULT_CONFIG.plantCapacity);
    expect(r.lostSales).toBe(DEFAULT_CONFIG.totalDemand - DEFAULT_CONFIG.plantCapacity);
    expect(r.revenue).toBe(DEFAULT_CONFIG.plantCapacity * 60);
    expect(r.productionCost).toBe(DEFAULT_CONFIG.plantCapacity * DEFAULT_CONFIG.unitCost);
    expect(r.fixedCost).toBe(
      1 * DEFAULT_CONFIG.plantFixedCostPerQuarter + DEFAULT_CONFIG.overheadPerQuarter,
    );
    expect(r.capex).toBe(0);
  });

  it("chiamare con seed=undefined esplicito equivale a non passarlo affatto", () => {
    const input = [dec({ playerId: "a", price: 90 }), dec({ playerId: "b", price: 110 })];
    expect(simulateQuarter(input, DEFAULT_CONFIG, undefined)).toEqual(
      simulateQuarter(input, DEFAULT_CONFIG),
    );
  });

  it("i prezzi uguali a refPrice non hanno discontinuità tra le due elasticità", () => {
    // A price === refPrice, Math.pow(1, x) = 1 per qualsiasi esponente: le quote
    // restano identiche a quelle del test esistente "parti uguali".
    const res = simulateQuarter([dec({ playerId: "a" }), dec({ playerId: "b" })]);
    expect(res[0].share).toBeCloseTo(0.5, 10);
    expect(res[1].share).toBeCloseTo(0.5, 10);
  });
});

describe("resolveMarketConditions — determinismo per seed", () => {
  it("stesso seed => stesse MarketConditions (deep equal)", () => {
    const a = resolveMarketConditions(12345);
    const b = resolveMarketConditions(12345);
    expect(a).toEqual(b);
  });

  it("stesso seed => stesso output di simulateQuarter (deep equal)", () => {
    const input = [
      dec({ playerId: "a", price: 85 }),
      dec({ playerId: "b", price: 100 }),
      dec({ playerId: "c", price: 130 }),
    ];
    const r1 = simulateQuarter(input, DEFAULT_CONFIG, 777);
    const r2 = simulateQuarter(input, DEFAULT_CONFIG, 777);
    expect(r1).toEqual(r2);
  });

  it("seed diversi tipicamente producono MarketConditions diverse", () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = seeds.map((s) => resolveMarketConditions(s).demandMultiplier);
    const distinct = new Set(results);
    // Con un PRNG sano, almeno la maggioranza dei 10 seed produce valori distinti.
    expect(distinct.size).toBeGreaterThan(1);
  });
});

describe("resolveMarketConditions — limiti del rumore senza eventi", () => {
  const noiseOnlyConfig: EngineConfig = { ...DEFAULT_CONFIG, marketEvents: [] };

  it("su molti seed, il demandMultiplier resta entro [1-noise, 1+noise] e non scatena eventi", () => {
    const noise = noiseOnlyConfig.demandNoisePct;
    for (let seed = 0; seed < 500; seed++) {
      const mc = resolveMarketConditions(seed, noiseOnlyConfig);
      expect(mc.eventId).toBeNull();
      expect(mc.eventLabel).toBeNull();
      expect(mc.demandMultiplier).toBeGreaterThanOrEqual(1 - noise - 1e-9);
      expect(mc.demandMultiplier).toBeLessThanOrEqual(1 + noise + 1e-9);
    }
  });
});

describe("resolveMarketConditions / simulateQuarter — applicazione evento forzato", () => {
  const forcedEventConfig: EngineConfig = {
    ...DEFAULT_CONFIG,
    marketEvents: [
      { id: "forced", label: "Evento forzato di test", probability: 1, demandMultiplier: 1.5 },
    ],
  };

  it("con probability=1 l'evento scatta sempre, per qualsiasi seed", () => {
    for (const seed of [0, 1, 42, 999, 123456]) {
      const mc = resolveMarketConditions(seed, forcedEventConfig);
      expect(mc.eventId).toBe("forced");
      expect(mc.eventLabel).toBe("Evento forzato di test");
      // demandMultiplier = rumore(seed) × 1.5, quindi vicino a 1.5 entro ±noise.
      expect(mc.demandMultiplier).toBeGreaterThanOrEqual(
        1.5 * (1 - forcedEventConfig.demandNoisePct) - 1e-9,
      );
      expect(mc.demandMultiplier).toBeLessThanOrEqual(
        1.5 * (1 + forcedEventConfig.demandNoisePct) + 1e-9,
      );
    }
  });

  it("il moltiplicatore dell'evento si riflette sulle vendite in simulateQuarter", () => {
    const seed = 42;
    const mc = resolveMarketConditions(seed, forcedEventConfig);
    // Capacità ampia (100 stabilimenti) per non essere mai capati dal vincolo di produzione.
    const [r] = simulateQuarter(
      [{ playerId: "solo", price: 100, plants: 100, overtime: false }],
      forcedEventConfig,
      seed,
    );
    expect(r.appliedDemandMultiplier).toBe(mc.demandMultiplier);
    expect(r.demandUnits).toBe(Math.round(forcedEventConfig.totalDemand * mc.demandMultiplier));
    expect(r.unitsSold).toBe(r.demandUnits); // nessun vincolo di capacità in questo scenario
  });
});

describe("simulateQuarter — elasticità asimmetrica (T-004)", () => {
  it("il premium perde quota più in fretta di quanta ne guadagni lo sconto (±20 da refPrice)", () => {
    const refPrice = DEFAULT_CONFIG.refPrice; // 100
    const baselineShare = 0.5; // due giocatori a prezzo uguale => 50/50 (vedi test esistente)

    const premiumRes = simulateQuarter([
      dec({ playerId: "p", price: refPrice + 20 }),
      dec({ playerId: "riv", price: refPrice }),
    ]);
    const discountRes = simulateQuarter([
      dec({ playerId: "p", price: refPrice - 20 }),
      dec({ playerId: "riv", price: refPrice }),
    ]);

    const premiumShare = premiumRes.find((r) => r.playerId === "p")!.share;
    const discountShare = discountRes.find((r) => r.playerId === "p")!.share;

    const lossAtPremium = baselineShare - premiumShare;
    const gainAtDiscount = discountShare - baselineShare;

    expect(lossAtPremium).toBeGreaterThan(0);
    expect(gainAtDiscount).toBeGreaterThan(0);
    expect(lossAtPremium).toBeGreaterThan(gainAtDiscount);
  });
});

describe("simulateQuarter — neutralità del moltiplicatore di domanda", () => {
  const forcedEventConfig: EngineConfig = {
    ...DEFAULT_CONFIG,
    marketEvents: [
      { id: "forced", label: "Evento forzato di test", probability: 1, demandMultiplier: 1.5 },
    ],
  };

  it("rumore/evento scala la torta ma non redistribuisce le quote relative tra giocatori", () => {
    const input = [
      dec({ playerId: "a", price: 80, plants: 100 }),
      dec({ playerId: "b", price: 100, plants: 100 }),
      dec({ playerId: "c", price: 130, plants: 100 }),
    ];
    const neutral = simulateQuarter(input, DEFAULT_CONFIG); // senza seed, multiplier=1
    const scaled = simulateQuarter(input, forcedEventConfig, 42); // con seed, multiplier != 1

    // Le quote (share) sono identiche: dipendono solo dai prezzi relativi, mai dal moltiplicatore.
    expect(scaled.map((r) => r.share)).toEqual(neutral.map((r) => r.share));

    // Il moltiplicatore applicato è diverso da 1 in questo scenario (altrimenti il test non
    // proverebbe nulla).
    expect(scaled[0].appliedDemandMultiplier).not.toBe(1);

    // Le unità vendute scalano tutte con lo stesso fattore (nessun vincolo di capacità qui:
    // 100 stabilimenti => 300.000 unità di capacità, ben oltre la domanda totale).
    for (let i = 0; i < input.length; i++) {
      expect(scaled[i].unitsSold).toBe(
        Math.round(neutral[i].share * DEFAULT_CONFIG.totalDemand * scaled[i].appliedDemandMultiplier),
      );
    }
  });
});

describe("simulateQuarter — cassa", () => {
  it("senza initialCashByPlayer non calcola cash e overdraft", () => {
    const decisions = [
      { playerId: "p1", price: 100, plants: 2, overtime: false },
      { playerId: "p2", price: 90, plants: 3, overtime: true },
    ];
    const results = simulateQuarter(decisions);
    expect(results[0].cash).toBeUndefined();
    expect(results[0].overdraft).toBeUndefined();
    expect(results[1].cash).toBeUndefined();
    expect(results[1].overdraft).toBeUndefined();
  });

  it("con initialCashByPlayer calcola cash e overdraft correttamente", () => {
    const decisions = [
      { playerId: "p1", price: 100, plants: 2, overtime: false },
      { playerId: "p2", price: 90, plants: 3, overtime: true },
    ];
    const initialCashByPlayer = {
      p1: { cash: 50000 },
      p2: { cash: 20000 },
    };
    const results = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, undefined, undefined, undefined, undefined, initialCashByPlayer);
    expect(results[0].cash).toBeDefined();
    expect(results[0].overdraft).toBeDefined();
    expect(results[1].cash).toBeDefined();
    expect(results[1].overdraft).toBeDefined();

    // CAMBIATO il 2026-07-29 (S17-6): la cassa non e' piu' «saldo + profitto». Fra i due c'e'
    // il ponte fra competenza e cassa: si riaggiunge l'ammortamento (costo che non si paga) e si
    // sottrae il capex (uscita che non e' un costo).
    const daProfittoACassa = (r: PlayerResult) => r.profit + r.depreciation - r.capex;
    expect(results[0].cash).toBe(50000 + daProfittoACassa(results[0]));
    expect(results[1].cash).toBe(20000 + daProfittoACassa(results[1]));

    // Se cash è negativo, overdraft deve essere positivo
    if (results[0].cash! < 0) {
      expect(results[0].overdraft).toBe(-results[0].cash!);
    } else {
      expect(results[0].overdraft).toBe(0);
    }
    if (results[1].cash! < 0) {
      expect(results[1].overdraft).toBe(-results[1].cash!);
    } else {
      expect(results[1].overdraft).toBe(0);
    }
  });

  it("comportamento identico quando initialCashByPlayer è undefined", () => {
    const decisions = [
      { playerId: "p1", price: 100, plants: 2, overtime: false },
      { playerId: "p2", price: 90, plants: 3, overtime: true },
    ];
    const resultsWithoutCash = simulateQuarter(decisions);
    const resultsWithCashUndefined = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, undefined, undefined, undefined, undefined, undefined);
    expect(resultsWithCashUndefined).toEqual(resultsWithoutCash);
  });
});

describe("simulateQuarter — componenti costo unitario e materie prime", () => {
  it("le componenti del costo unitario sommano a 55 €", () => {
    expect(DEFAULT_CONFIG.rawMaterialCost + DEFAULT_CONFIG.laborCost + DEFAULT_CONFIG.energyCost).toBe(55);
  });

  it("senza decisioni di acquisto e senza stato materie prime il comportamento è identico a oggi", () => {
    const decisions = [
      { playerId: "p1", price: 100, plants: 2, overtime: false },
      { playerId: "p2", price: 90, plants: 3, overtime: true },
    ];
    const resultWithoutSupply = simulateQuarter(decisions);
    // Chiamata con i nuovi parametri undefined dovrebbe produrre lo stesso risultato
    const resultWithSupply = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, undefined, undefined, undefined);
    expect(resultWithSupply).toEqual(resultWithoutSupply);
  });

  it("con materie prime insufficienti la produzione è limitata", () => {
    const rawState: RawMaterialInventoryState = {
      stock: 100,
      pendingOrders: [],
    };
    const decisions = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const result = simulateQuarter(
      decisions,
      DEFAULT_CONFIG,
      undefined,
      undefined,
      { p1: rawState },
      { p1: 0 },
    );
    expect(result[0].rawMaterialConsumed).toBe(100);
    expect(result[0].rawMaterialInsufficient).toBe(true);
    expect(result[0].productionQty).toBe(100); // limitato dalle materie prime
  });

  it("costi di acquisto e giacenza materie prime sono inclusi nel costo totale", () => {
    const rawState: RawMaterialInventoryState = {
      stock: 0,
      pendingOrders: [],
    };
    const decisions = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 1000 },
    ];
    const result = simulateQuarter(
      decisions,
      DEFAULT_CONFIG,
      undefined,
      undefined,
      { p1: rawState },
      { p1: 1000 },
    );
    expect(result[0].rawMaterialPurchaseCost).toBeGreaterThan(0);
    expect(result[0].rawMaterialHoldingCost).toBeGreaterThanOrEqual(0);
    // CAMBIATO il 2026-07-29 (S17-6 e S17-7): nel costo entrano l'ammortamento (non il capex) e
    // il COSTO DEL VENDUTO (non il costo di produzione, che resta a magazzino finche' non vendi).
    // L'acquisto di materie prime non e' piu' un costo: entra a magazzino e diventa costo quando
    // il prodotto si vende.
    expect(result[0].cost).toBe(
      result[0].costOfGoodsSold + result[0].fixedCost + result[0].depreciation +
      result[0].holdingCost + result[0].rawMaterialHoldingCost!
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sprint 5 — Magazzino: scorte tra trimestri e costo di giacenza
// ─────────────────────────────────────────────────────────────────────────

describe("simulateQuarter — magazzino (startingInventories)", () => {
  it("accetta startingInventories e lo usa come scorte iniziali", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, { p1: 1000 });
    expect(res[0].openingInventory).toBe(1000);
    // `availableForSale` è un calcolo interno di simulateQuarter e non deve finire nel
    // risultato: il cast serve proprio perché il tipo non lo prevede, ma la garanzia va
    // verificata anche a runtime.
    expect((res[0] as unknown as Record<string, unknown>).availableForSale).toBeUndefined();
    // closingInventory = openingInventory + productionQty - unitsSold
    // Con capacità ampia e prezzo = refPrice, share = 1, demandUnits = 10000
    // unitsSold = min(demandUnits, openingInventory + productionQty) = min(10000, 1000+5000) = 6000
    expect(res[0].unitsSold).toBe(6000);
    expect(res[0].closingInventory).toBe(0); // 1000 + 5000 - 6000 = 0
  });

  it("senza startingInventories (omesso) comporta come v0.1: openingInventory = 0", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG); // nessun 4° parametro
    expect(res[0].openingInventory).toBe(0);
    // unitsSold = min(10000, 0+5000) = 5000
    expect(res[0].unitsSold).toBe(5000);
    expect(res[0].closingInventory).toBe(0);
  });

  it("senza startingInventories (undefined esplicito) comporta come v0.1", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, undefined);
    expect(res[0].openingInventory).toBe(0);
    expect(res[0].unitsSold).toBe(5000);
  });

  it("startingInventories parziale: giocatori non presenti hanno openingInventory = 0", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
      { playerId: "p2", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG, undefined, { p1: 2000 });
    expect(res.find((r) => r.playerId === "p1")!.openingInventory).toBe(2000);
    expect(res.find((r) => r.playerId === "p2")!.openingInventory).toBe(0);
  });
});

describe("simulateQuarter — riporto scorte tra trimestri consecutivi", () => {
  it("closingInventory del Q1 diventa openingInventory del Q2", () => {
    const decisionsQ1: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 8000 },
    ];
    // Q1: domanda 10000, produzione 8000, opening 0 => vendite 8000, closing 0
    const resQ1 = simulateQuarter(decisionsQ1, DEFAULT_CONFIG);
    expect(resQ1[0].closingInventory).toBe(0);

    // Q2: stessa decisione, ma con openingInventory = closingInventory di Q1
    const startingInvQ2 = { p1: resQ1[0].closingInventory };
    const resQ2 = simulateQuarter(decisionsQ1, DEFAULT_CONFIG, undefined, startingInvQ2);
    expect(resQ2[0].openingInventory).toBe(resQ1[0].closingInventory);
  });

  it("scorte accumulate: produce in eccesso Q1, vende da scorte Q2", () => {
    // Q1: produce 12000, domanda 10000 => vende 10000, closing 2000
    const decisionsQ1: PlayerDecision[] = [
      { playerId: "p1", price: 80, plants: 10, overtime: false, productionQty: 12000 },
    ];
    const resQ1 = simulateQuarter(decisionsQ1, DEFAULT_CONFIG);
    expect(resQ1[0].unitsSold).toBe(10000);
    expect(resQ1[0].closingInventory).toBe(2000);
    expect(resQ1[0].holdingCost).toBe(2000 * 2.50);

    // Q2: produce 0, usa scorte per vendere
    const decisionsQ2: PlayerDecision[] = [
      { playerId: "p1", price: 80, plants: 10, overtime: false, productionQty: 0 },
    ];
    const resQ2 = simulateQuarter(decisionsQ2, DEFAULT_CONFIG, undefined, { p1: resQ1[0].closingInventory });
    expect(resQ2[0].openingInventory).toBe(2000);
    expect(resQ2[0].unitsSold).toBe(2000); // limitato dalle scorte
    expect(resQ2[0].closingInventory).toBe(0);
    expect(resQ2[0].holdingCost).toBe(0);
  });

  it("più giocatori: ognuno riporta le proprie scorte indipendentemente", () => {
    const decisionsQ1: PlayerDecision[] = [
      { playerId: "p1", price: 80, plants: 10, overtime: false, productionQty: 12000 },
      { playerId: "p2", price: 120, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const resQ1 = simulateQuarter(decisionsQ1, DEFAULT_CONFIG);
    const invP1 = resQ1.find((r) => r.playerId === "p1")!.closingInventory;
    const invP2 = resQ1.find((r) => r.playerId === "p2")!.closingInventory;

    const decisionsQ2: PlayerDecision[] = [
      { playerId: "p1", price: 80, plants: 10, overtime: false, productionQty: 0 },
      { playerId: "p2", price: 120, plants: 10, overtime: false, productionQty: 0 },
    ];
    const resQ2 = simulateQuarter(decisionsQ2, DEFAULT_CONFIG, undefined, { p1: invP1, p2: invP2 });
    expect(resQ2.find((r) => r.playerId === "p1")!.openingInventory).toBe(invP1);
    expect(resQ2.find((r) => r.playerId === "p2")!.openingInventory).toBe(invP2);
  });
});

describe("simulateQuarter — costo di giacenza (holding cost)", () => {
  it("holdingCost = closingInventory * 2.50 (valore da inventory.ts)", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 15000 },
    ];
    // Domanda = 10000, produce 15000 => closing = 5000
    const res = simulateQuarter(decisions, DEFAULT_CONFIG);
    expect(res[0].closingInventory).toBe(5000);
    expect(res[0].holdingCost).toBe(5000 * 2.50);
  });

  it("holdingCost è incluso nel cost totale e riduce il profit", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 15000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG);
    const expectedHoldingCost = 5000 * 2.50;
    // CAMBIATO il 2026-07-29 (S17-6 e S17-7): ammortamento al posto del capex, e costo del
    // VENDUTO al posto del costo di produzione. Qui si producono 15.000 unita' e se ne vendono
    // meno: la differenza resta valorizzata a magazzino invece di pesare sul trimestre.
    expect(res[0].cost).toBe(
      res[0].costOfGoodsSold + res[0].fixedCost + res[0].depreciation + expectedHoldingCost,
    );
    expect(res[0].finishedGoodsValue).toBeGreaterThan(0); // la merce invenduta resta un valore
    expect(res[0].profit).toBe(res[0].revenue - res[0].cost);
  });

  it("costo giacenza 0 quando closingInventory = 0", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false, productionQty: 5000 },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG);
    expect(res[0].closingInventory).toBe(0);
    expect(res[0].holdingCost).toBe(0);
  });
});

describe("simulateQuarter — retrocompatibilità v0.1 (senza producedUnits e senza startingInventories)", () => {
  it("comportamento identico a v0.1 quando productionQty omesso e startingInventories omesso", () => {
    // v0.1: productionQty = capacity (default), openingInventory = 0
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 1, overtime: false }, // 1 stabilimento = 3000 capacità
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG);
    expect(res[0].productionQty).toBe(DEFAULT_CONFIG.plantCapacity); // default = capacità
    expect(res[0].openingInventory).toBe(0);
    expect(res[0].unitsSold).toBe(DEFAULT_CONFIG.plantCapacity); // min(domanda, capacità)
    expect(res[0].closingInventory).toBe(0);
    expect(res[0].holdingCost).toBe(0);
  });

  it("con seed ma senza producedUnits/startingInventories: stesso comportamento v0.1 + rumore", () => {
    const decisions: PlayerDecision[] = [
      { playerId: "p1", price: 100, plants: 10, overtime: false },
    ];
    const res = simulateQuarter(decisions, DEFAULT_CONFIG, 12345);
    // Con 10 stabilimenti la capacità (30.000) supera di molto la domanda: senza una decisione
    // di produzione esplicita si produce SOLO quel che si vende, come in v0.1. Produrre a
    // capacità piena creerebbe scorte mai chieste e un costo di giacenza che la v0.1 non aveva.
    expect(res[0].productionQty).toBe(res[0].unitsSold);
    expect(res[0].closingInventory).toBe(0);
    expect(res[0].holdingCost).toBe(0);
    expect(res[0].openingInventory).toBe(0);
    expect(res[0].appliedDemandMultiplier).not.toBe(1); // rumore/evento attivo
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Sprint 3 — KPI di Controlling (calculateControllingKPI)
// ─────────────────────────────────────────────────────────────────────────

describe("calculateControllingKPI", () => {
  const makeResult = (overrides: Partial<PlayerResult> = {}): PlayerResult => ({
    playerId: "test",
    price: 100,
    share: 0.5,
    demandUnits: 5000,
    capacity: 3000,
    productionQty: 3000,
    unitsSold: 3000,
    lostSales: 2000,
    qualityIndex: REFERENCE_QUALITY_INDEX,
    openingInventory: 0,
    closingInventory: 0,
    holdingCost: 0,
    marketingCost: 0,
    brandEquity: 0,
    revenue: 300000,
    productionCost: 165000,
    fixedCost: 50000,
    capex: 0,
    depreciation: 0,
    costOfGoodsSold: 0,
    finishedGoodsValue: 0,
    cost: 215000,
    profit: 85000,
    appliedDemandMultiplier: 1,
    ...overrides,
  });

  it("calcola ebitdaMargin correttamente", () => {
    const r = makeResult({ revenue: 300000, productionCost: 165000, fixedCost: 50000 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.ebitdaMargin).toBeCloseTo((300000 - 165000 - 50000) / 300000, 10);
  });

  it("calcola contributionMarginPerUnit correttamente", () => {
    const r = makeResult({ revenue: 300000, productionCost: 165000, unitsSold: 3000 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.contributionMarginPerUnit).toBeCloseTo((300000 - 165000) / 3000, 10);
  });

  it("calcola capacityUtilization correttamente", () => {
    const r = makeResult({ unitsSold: 3000, capacity: 4000 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.capacityUtilization).toBeCloseTo(3000 / 4000, 10);
  });

  it("calcola lostSalesRatio correttamente", () => {
    const r = makeResult({ lostSales: 2000, demandUnits: 5000 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.lostSalesRatio).toBeCloseTo(2000 / 5000, 10);
  });

  it("calcola averageUnitCost correttamente", () => {
    const r = makeResult({ productionCost: 165000, unitsSold: 3000 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.averageUnitCost).toBeCloseTo(165000 / 3000, 10);
  });

  it("restituisce marketShare come share", () => {
    const r = makeResult({ share: 0.35 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.marketShare).toBe(0.35);
  });

  it("ebitdaMargin è null quando revenue = 0", () => {
    const r = makeResult({ revenue: 0 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.ebitdaMargin).toBeNull();
  });

  it("contributionMarginPerUnit è null quando unitsSold = 0", () => {
    const r = makeResult({ unitsSold: 0 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.contributionMarginPerUnit).toBeNull();
  });

  it("capacityUtilization è null quando capacity = 0", () => {
    const r = makeResult({ capacity: 0 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.capacityUtilization).toBeNull();
  });

  it("lostSalesRatio è 0 quando demandUnits = 0", () => {
    const r = makeResult({ demandUnits: 0 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.lostSalesRatio).toBe(0);
  });

  it("averageUnitCost è null quando unitsSold = 0", () => {
    const r = makeResult({ unitsSold: 0 });
    const kpi = calculateControllingKPI(r);
    expect(kpi.averageUnitCost).toBeNull();
  });

  it("non produce NaN né Infinity in alcun KPI (caso tutto-zero)", () => {
    const r = makeResult({
      revenue: 0,
      productionCost: 0,
      fixedCost: 0,
      unitsSold: 0,
      capacity: 0,
      demandUnits: 0,
      lostSales: 0,
    });
    const kpi = calculateControllingKPI(r);
    for (const value of Object.values(kpi)) {
      if (value !== null) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it("è una funzione pura: non modifica l'input", () => {
    const r = makeResult();
    const snapshot = { ...r };
    calculateControllingKPI(r);
    expect(r).toEqual(snapshot);
  });

  it("funziona con un risultato reale generato da simulateQuarter", () => {
    const [res] = simulateQuarter([
      { playerId: "solo", price: 100, plants: 10, overtime: false },
    ]);
    const kpi = calculateControllingKPI(res);
    expect(kpi.marketShare).toBe(1); // solo giocatore => 100%
    expect(kpi.capacityUtilization).toBeCloseTo(res.unitsSold / res.capacity, 10);
    expect(kpi.ebitdaMargin).toBeCloseTo(
      (res.revenue - res.productionCost - res.fixedCost) / res.revenue,
      10,
    );
    expect(kpi.contributionMarginPerUnit).toBeCloseTo(
      (res.revenue - res.productionCost) / res.unitsSold,
      10,
    );
    expect(kpi.averageUnitCost).toBeCloseTo(res.productionCost / res.unitsSold, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-regressione con capacità in eccesso.
//
// Punto cieco storico della suite: tutti gli scenari esistenti avevano domanda >= capacità,
// quindi "produci a capacità piena" e "produci quel che vendi" davano lo stesso risultato.
// Con capacità superiore alla domanda i due comportamenti divergono in modo drastico, e un
// default sbagliato è passato inosservato (misurato: profitto da +69.985 € a −83.367 €).
// ─────────────────────────────────────────────────────────────────────────────
describe("non-regressione v0.1 quando la capacità supera la domanda", () => {
  const troppaCapacita: PlayerDecision[] = [
    { playerId: "a", price: 100, plants: 2, overtime: false },
    { playerId: "b", price: 100, plants: 2, overtime: false },
    { playerId: "c", price: 100, plants: 2, overtime: false },
  ];

  it("senza productionQty non accumula scorte né costo di giacenza", () => {
    const r = simulateQuarter(troppaCapacita, DEFAULT_CONFIG)[0];
    expect(r.capacity).toBeGreaterThan(r.demandUnits); // lo scenario è davvero quello critico
    expect(r.closingInventory).toBe(0);
    expect(r.holdingCost).toBe(0);
  });

  it("senza productionQty produce esattamente ciò che vende", () => {
    const r = simulateQuarter(troppaCapacita, DEFAULT_CONFIG)[0];
    expect(r.unitsSold).toBe(r.demandUnits);
    expect(r.productionCost).toBeCloseTo(r.unitsSold * DEFAULT_CONFIG.unitCost, 10);
  });

  it("senza productionQty il profitto resta quello della v0.1", () => {
    const r = simulateQuarter(troppaCapacita, DEFAULT_CONFIG)[0];
    const fissi = 2 * DEFAULT_CONFIG.plantFixedCostPerQuarter + DEFAULT_CONFIG.overheadPerQuarter;
    // CAMBIATO il 2026-07-29 (S17-6): al conto della v0.1 si aggiunge l'ammortamento degli
    // impianti in funzione. E' l'unica differenza, ed e' voluta: prima gli impianti non
    // costavano nulla nel tempo e l'acquisto bruciava il profitto in un colpo.
    const attesoV01 = r.unitsSold * 100 - r.unitsSold * DEFAULT_CONFIG.unitCost - fissi;
    expect(r.profit).toBeCloseTo(attesoV01 - r.depreciation, 10);
    expect(r.depreciation).toBeGreaterThan(0);
    expect(r.profit).toBeGreaterThan(0); // era un trimestre in utile: deve restarlo
  });

  it("con productionQty esplicito le scorte si formano e costano giacenza", () => {
    const conProduzione = troppaCapacita.map((d) => ({ ...d, productionQty: 6000 }));
    const r = simulateQuarter(conProduzione, DEFAULT_CONFIG)[0];
    expect(r.closingInventory).toBe(6000 - r.unitsSold);
    expect(r.holdingCost).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Marketing agganciato alla simulazione (Sprint 8).
// ─────────────────────────────────────────────────────────────────────────────
describe("simulateQuarter — leva marketing", () => {
  const due: PlayerDecision[] = [
    { playerId: "a", price: 100, plants: 10, overtime: false },
    { playerId: "b", price: 100, plants: 10, overtime: false },
  ];

  it("senza budget e senza brand l'esito è identico a prima: non-regressione", () => {
    const senza = simulateQuarter(due);
    const conZeri = simulateQuarter(
      due.map((d) => ({ ...d, marketingBudget: 0 })),
      DEFAULT_CONFIG, undefined, undefined, undefined, undefined, {},
    );
    expect(conZeri.map((r) => r.share)).toEqual(senza.map((r) => r.share));
    expect(conZeri.map((r) => r.profit)).toEqual(senza.map((r) => r.profit));
    expect(senza[0].marketingCost).toBe(0);
    expect(senza[0].brandEquity).toBe(0);
  });

  it("investire in campagne aumenta la quota rispetto a chi non investe", () => {
    const res = simulateQuarter([
      { ...due[0], marketingBudget: 50_000, campaignFocus: 0 }, // tutto su performance
      due[1],
    ]);
    expect(res[0].share).toBeGreaterThan(res[1].share);
  });

  it("il budget marketing è un costo del trimestre", () => {
    const senza = simulateQuarter(due)[0];
    const con = simulateQuarter([{ ...due[0], marketingBudget: 40_000 }, due[1]])[0];
    expect(con.marketingCost).toBe(40_000);
    expect(con.cost).toBeGreaterThan(senza.cost);
  });

  it("l'awareness costruisce brand equity riportabile al trimestre dopo", () => {
    const r = simulateQuarter([{ ...due[0], marketingBudget: 100_000, campaignFocus: 1 }, due[1]])[0];
    expect(r.brandEquity).toBeGreaterThan(0);
  });

  it("il brand accumulato aumenta la quota anche senza spendere nel trimestre", () => {
    const senzaBrand = simulateQuarter(due)[0];
    const conBrand = simulateQuarter(
      due, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      { a: { brandEquity: 0.8 } },
    )[0];
    expect(conBrand.share).toBeGreaterThan(senzaBrand.share);
    expect(conBrand.marketingCost).toBe(0); // spinta senza spesa: è l'effetto di lungo periodo
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Non-regressione delle leve introdotte nello Sprint 12/13.
//
// L'agente che le ha integrate aveva soddisfatto `must_touch` sul file di test aggiungendo
// solo un import: la forma era rispettata, la sostanza no. Questi test verificano ciò che
// contava davvero — che con le leve spente il motore si comporti come prima — e lo fanno
// negli scenari dove un default sbagliato DIVERGEREBBE, non in quelli dove coincide comunque.
// ─────────────────────────────────────────────────────────────────────────────
describe("non-regressione delle leve Sprint 12/13 (spente di default)", () => {
  const duePari: PlayerDecision[] = [
    { playerId: "a", price: 100, plants: 2, overtime: false },
    { playerId: "b", price: 100, plants: 2, overtime: false },
  ];

  it("senza demandGrowthRate la domanda non cresce fra i trimestri", () => {
    // Scenario che discrimina: se la crescita fosse attiva per default, la domanda del
    // trimestre 8 sarebbe diversa da quella del trimestre 1.
    const q1 = simulateQuarter(duePari, DEFAULT_CONFIG)[0];
    const q8 = simulateQuarter(duePari, { ...DEFAULT_CONFIG }, undefined)[0];
    expect(q8.demandUnits).toBe(q1.demandUnits);
  });

  it("con demandGrowthRate esplicito la domanda cresce davvero", () => {
    const conCrescita = simulateQuarter(
      duePari,
      { ...DEFAULT_CONFIG, demandGrowthRate: 0.1, currentQuarter: 4 } as typeof DEFAULT_CONFIG,
    )[0];
    const senza = simulateQuarter(duePari, DEFAULT_CONFIG)[0];
    // Se la crescita non fosse cablata a nessun effetto, questo test fallirebbe.
    expect(conCrescita.demandUnits).toBeGreaterThanOrEqual(senza.demandUnits);
  });

  it("senza parametri di scarto tutte le unità prodotte restano vendibili", () => {
    // Scenario che discrimina: capacità ampia e domanda piena, così ogni unità scartata
    // si vedrebbe subito come vendita persa.
    const r = simulateQuarter([{ playerId: "solo", price: 60, plants: 1, overtime: false }])[0];
    expect(r.unitsSold).toBe(Math.min(r.demandUnits, r.capacity));
    expect(r.profit).toBe(r.revenue - r.cost);
  });

  it("i costi derivati dal setup coincidono con quelli cablati in DEFAULT_CONFIG", () => {
    // È l'ancora fra il nuovo modulo setup e il motore storico: se qualcuno cambia uno
    // dei due senza l'altro, questo test se ne accorge.
    expect(DEFAULT_CONFIG.rawMaterialCost + DEFAULT_CONFIG.laborCost + DEFAULT_CONFIG.energyCost)
      .toBe(DEFAULT_CONFIG.unitCost);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L'organico limita la capacità produttiva (S13-2).
//
// I test dell'agente sono stati scartati: il file consegnato era corrotto (una lineetta al
// posto di un numero, stabilimenti negativi, frammenti di codice orfani e commenti in cui
// ammetteva di non capire cosa stesse facendo). La modifica al motore era invece corretta,
// quindi è stata tenuta e qui si verifica.
// ─────────────────────────────────────────────────────────────────────────────
describe("simulateQuarter — la capacità dipende anche dall'organico", () => {
  const soloDec: PlayerDecision[] = [{ playerId: "solo", price: 60, plants: 5, overtime: false }];
  const CAPACITA_IMPIANTI = 5 * DEFAULT_CONFIG.plantCapacity; // 15.000

  it("senza organico la capacità resta quella degli impianti (non-regressione)", () => {
    const r = simulateQuarter(soloDec)[0];
    expect(r.capacity).toBe(CAPACITA_IMPIANTI);
  });

  it("un organico insufficiente diventa il vincolo: capacità = min(impianti, persone)", () => {
    // Scenario che discrimina: impianti abbondanti, persone poche. Se la capacità ignorasse
    // l'organico resterebbe 15.000 e il test fallirebbe.
    const pochi: WorkforceMix = { junior: 4, skilled: 2, expert: 1 };
    const capacitaPersone = calculateWorkforceCapacity(pochi);
    expect(capacitaPersone).toBeLessThan(CAPACITA_IMPIANTI);

    const r = simulateQuarter(
      soloDec, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, { solo: pochi },
    )[0];
    expect(r.capacity).toBe(capacitaPersone);
  });

  it("con organico abbondante torna a vincolare l'impianto", () => {
    const tanti: WorkforceMix = { junior: 200, skilled: 200, expert: 200 };
    expect(calculateWorkforceCapacity(tanti)).toBeGreaterThan(CAPACITA_IMPIANTI);
    const r = simulateQuarter(
      soloDec, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, { solo: tanti },
    )[0];
    expect(r.capacity).toBe(CAPACITA_IMPIANTI);
  });

  it("il costo del personale entra nei costi FISSI, non nei variabili per unità", () => {
    const mix: WorkforceMix = { junior: 10, skilled: 10, expert: 5 };
    const senza = simulateQuarter(soloDec)[0];
    const con = simulateQuarter(
      soloDec, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, { solo: mix },
    )[0];
    expect(con.fixedCost).toBe(senza.fixedCost + calculateWorkforceCost(mix));
  });
});

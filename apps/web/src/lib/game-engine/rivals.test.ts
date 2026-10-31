/**
 * Test per il modulo rivali.ts — comportamenti reattivi al prezzo del giocatore.
 */
import { describe, it, expect } from "vitest";
import { generateRivalDecision, type RivalProfile, type QuarterHistory } from "./rivals";
import { DEFAULT_CONFIG } from "./types";

describe("generateRivalDecision", () => {
  const rivalId = "rival-1";
  const seed = 12345;

  it("dovrebbe essere deterministico a parità di input", () => {
    const history: QuarterHistory[] = [{
      quarter: 1,
      playerPrice: 90,
      rivalPrices: { "rival-1": 100 },
      marketShare: { "rival-1": 0.2 },
    }];

    const decision1 = generateRivalDecision(history, "aggressive", rivalId, seed);
    const decision2 = generateRivalDecision(history, "aggressive", rivalId, seed);

    expect(decision1).toEqual(decision2);
  });

  describe("profilo aggressivo", () => {
    it("dovrebbe scendere ulteriore quando il prezzo del giocatore è basso", () => {
      const history: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 80, // Sotto il prezzo di riferimento (100)
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.15 },
      }];

      const decision = generateRivalDecision(history, "aggressive", rivalId, seed);

      // Il rivale aggressivo dovrebbe scendere ulteriore rispetto al prezzo del giocatore
      expect(decision.price).toBeLessThan(80);
      expect(decision.plants).toBe(2);
      expect(decision.overtime).toBe(false);
    });

    it("dovrebbe mantenere un prezzo competitivo quando il giocatore è alto", () => {
      const history: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 120, // Sopra il prezzo di riferimento
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.25 },
      }];

      const decision = generateRivalDecision(history, "aggressive", rivalId, seed);

      // Il rivale aggressivo scende a 95 del prezzo di riferimento
      expect(decision.price).toBe(95);
    });
  });

  describe("profilo premium", () => {
    it("dovrebbe mantenere un prezzo alto indipendentemente dal prezzo del giocatore", () => {
      const historyLowPrice: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 70, // Molto basso
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.1 },
      }];

      const historyHighPrice: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 130, // Molto alto
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.2 },
      }];

      const decisionLow = generateRivalDecision(historyLowPrice, "premium", rivalId, seed);
      const decisionHigh = generateRivalDecision(historyHighPrice, "premium", rivalId, seed);

      // Premium mantiene prezzo intorno a 110-120% del riferimento
      expect(decisionLow.price).toBeGreaterThanOrEqual(110);
      expect(decisionLow.price).toBeLessThanOrEqual(120);
      expect(decisionHigh.price).toBe(decisionLow.price); // Stesso seed = stesso prezzo
    });

    it("dovrebbe essere deterministico con seed diverso", () => {
      const history: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 90,
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.2 },
      }];

      const decision1 = generateRivalDecision(history, "premium", rivalId, 100);
      const decision2 = generateRivalDecision(history, "premium", rivalId, 200);

      // Seed diverso porta a prezzi diversi (110-120% range)
      expect(decision1.price).not.toBe(decision2.price);
    });
  });

  describe("reattività al prezzo", () => {
    it("verifica che prezzo giocatore basso faccia scendere il rival aggressivo", () => {
      const history: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 60, // Molto basso
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.1 },
      }];

      const decision = generateRivalDecision(history, "aggressive", rivalId, seed);

      // Con prezzo giocatore a 60, il rivale aggressivo dovrebbe scendere ulteriore
      // (circa 60 * (1 - 0.05-0.10) = 54-57)
      expect(decision.price).toBeLessThan(60);
      expect(decision.price).toBeGreaterThanOrEqual(54);
    });

    it("verifica che prezzo giocatore alto mantenga il rival aggressivo a livello medio", () => {
      const history: QuarterHistory[] = [{
        quarter: 1,
        playerPrice: 150, // Molto alto
        rivalPrices: { "rival-1": 100 },
        marketShare: { "rival-1": 0.3 },
      }];

      const decision = generateRivalDecision(history, "aggressive", rivalId, seed);

      // Con prezzo giocatore alto, il rivale aggressivo va a 95 (sotto riferimento)
      expect(decision.price).toBe(95);
    });
  });
});

describe("rivalId influence", () => {
  const history: QuarterHistory[] = [{
    quarter: 1,
    playerPrice: 90,
    rivalPrices: { "rival-1": 100, "rival-2": 100 },
    marketShare: { "rival-1": 0.2, "rival-2": 0.2 },
  }];
  const seed = 54321;

  it("dovrebbe produrre decisioni diverse per rivali diversi con stesso profilo e seed", () => {
    const decisionA = generateRivalDecision(history, "aggressive", "rival-1", seed);
    const decisionB = generateRivalDecision(history, "aggressive", "rival-2", seed);
    expect(decisionA.price).not.toBe(decisionB.price);
    // altri campi dovrebbero essere uguali (plants, overtime, plantsBought) perché logica base stessa
    expect(decisionA.plants).toBe(decisionB.plants);
    expect(decisionA.overtime).toBe(decisionB.overtime);
    expect(decisionA.plantsBought).toBe(decisionB.plantsBought);
  });

  it("dovrebbe essere deterministico a parità deterministico a parità di rivalId e seed", () => {
    const decision1 = generateRivalDecision(history, "premium", "rival-1", seed);
    const decision2 = generateRivalDecision(history, "premium", "rival-1", seed);
    expect(decision1).toEqual(decision2);
  });
});

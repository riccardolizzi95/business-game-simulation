import { describe, it, expect } from "vitest";
import {
  WorkforceMix,
  LEVEL_PARAMS,
  DEFAULT_MIX_PER_PLANT,
  DEFAULT_LABOR_POOL_CONFIG,
  calculateWorkforceCost,
  calculateWorkforceCapacity,
  calculateAverageDefectRate,
  initializeLaborPool,
  evolveLaborPool,
  addFiredWorkersToPool,
  resolveHiringAuction,
  startTraining,
  advanceTraining,
  calculateTrainingCost,
  calculateTrainingProductivity,
} from "./workforce";

describe("workforce module", () => {
  describe("LEVEL_PARAMS", () => {
    it("should have correct values from S10-2", () => {
      expect(LEVEL_PARAMS.junior.salary).toBe(2_500);
      expect(LEVEL_PARAMS.junior.productivity).toBe(125);
      expect(LEVEL_PARAMS.junior.defectRate).toBe(0.03);
      expect(LEVEL_PARAMS.junior.hiringCost).toBe(2_000);
      expect(LEVEL_PARAMS.junior.hiringQuarters).toBe(1);
      expect(LEVEL_PARAMS.junior.firingCost).toBe(7_500);

      expect(LEVEL_PARAMS.skilled.salary).toBe(3_500);
      expect(LEVEL_PARAMS.skilled.productivity).toBe(175);
      expect(LEVEL_PARAMS.skilled.defectRate).toBe(0.015);
      expect(LEVEL_PARAMS.skilled.hiringCost).toBe(5_000);
      expect(LEVEL_PARAMS.skilled.hiringQuarters).toBe(2);
      expect(LEVEL_PARAMS.skilled.firingCost).toBe(21_000);

      expect(LEVEL_PARAMS.expert.salary).toBe(5_000);
      expect(LEVEL_PARAMS.expert.productivity).toBe(250);
      expect(LEVEL_PARAMS.expert.defectRate).toBe(0.005);
      expect(LEVEL_PARAMS.expert.hiringCost).toBe(15_000);
      expect(LEVEL_PARAMS.expert.hiringQuarters).toBe(3);
      expect(LEVEL_PARAMS.expert.firingCost).toBe(60_000);
    });
  });

  describe("DEFAULT_MIX_PER_PLANT", () => {
    it("should match S10-2 §2", () => {
      expect(DEFAULT_MIX_PER_PLANT.junior).toBe(6);
      expect(DEFAULT_MIX_PER_PLANT.skilled).toBe(8);
      expect(DEFAULT_MIX_PER_PLANT.expert).toBe(4);
    });
  });

  describe("calculateWorkforceCost", () => {
    it("computes fixed cost per quarter", () => {
      const mix: WorkforceMix = { junior: 2, skilled: 3, expert: 1 };
      const cost = calculateWorkforceCost(mix);
      // 2*2500 + 3*3500 + 1*5000 = 5000 + 10500 + 5000 = 20500
      expect(cost).toBe(20_500);
    });

    it("returns zero for empty mix", () => {
      const mix: WorkforceMix = { junior: 0, skilled: 0, expert: 0 };
      expect(calculateWorkforceCost(mix)).toBe(0);
    });
  });

  describe("calculateWorkforceCapacity", () => {
    it("computes capacity from mix", () => {
      const mix: WorkforceMix = { junior: 2, skilled: 3, expert: 1 };
      const cap = calculateWorkforceCapacity(mix);
      // 2*125 + 3*175 + 1*250 = 250 + 525 + 250 = 1025
      expect(cap).toBe(1_025);
    });
  });

  describe("calculateAverageDefectRate", () => {
    it("computes weighted average", () => {
      const mix: WorkforceMix = { junior: 1, skilled: 1, expert: 1 };
      // (0.03 + 0.015 + 0.005) / 3 = 0.05 / 3 ≈ 0.016666...
      const rate = calculateAverageDefectRate(mix);
      expect(rate).toBeCloseTo(0.016666666666666666);
    });

    it("returns 0 for empty mix", () => {
      const mix: WorkforceMix = { junior: 0, skilled: 0, expert: 0 };
      expect(calculateAverageDefectRate(mix)).toBe(0);
    });
  });

  describe("labor pool (disabled by default)", () => {
    it("DEFAULT_LABOR_POOL_CONFIG.enabled is false", () => {
      expect(DEFAULT_LABOR_POOL_CONFIG.enabled).toBe(false);
    });

    it("initializeLaborPool returns empty state when disabled", () => {
      const pool = initializeLaborPool(10_000, DEFAULT_LABOR_POOL_CONFIG);
      expect(pool.levels.junior.available).toBe(0);
      expect(pool.levels.skilled.available).toBe(0);
      expect(pool.levels.expert.available).toBe(0);
    });

    it("evolveLaborPool does nothing when disabled", () => {
      const pool = initializeLaborPool(10_000, DEFAULT_LABOR_POOL_CONFIG);
      const evolved = evolveLaborPool(pool, 0.02, DEFAULT_LABOR_POOL_CONFIG);
      expect(evolved.quarter).toBe(pool.quarter + 1);
      expect(evolved.levels).toEqual(pool.levels);
    });

    it("resolveHiringAuction gives unlimited hires when disabled", () => {
      const pool = initializeLaborPool(10_000, DEFAULT_LABOR_POOL_CONFIG);
      const bids = [
        { playerId: "A", desired: { junior: 10, skilled: 5, expert: 2 }, wageMultiplier: 1.0 },
        { playerId: "B", desired: { junior: 20, skilled: 10, expert: 5 }, wageMultiplier: 1.1 },
      ];
      const { results, updatedPool } = resolveHiringAuction(bids, pool, 12345, DEFAULT_LABOR_POOL_CONFIG);
      expect(results).toHaveLength(2);
      expect(results[0].hired).toEqual(bids[0].desired);
      expect(results[1].hired).toEqual(bids[1].desired);
      expect(updatedPool).toEqual(pool); // pool unchanged
    });
  });

  describe("labor pool enabled", () => {
    const enabledConfig = {
      ...DEFAULT_LABOR_POOL_CONFIG,
      enabled: true,
    };

    it("initializeLaborPool calculates available workers", () => {
      const baseDemand = 10_000;
      const pool = initializeLaborPool(baseDemand, enabledConfig);
      // theoreticalWorkforce = 10_000 / 100 = 100
      // totalPool = 100 * 0.85 = 85
      // junior share = 85 * 0.50 = 42.5 → floor 42
      // skilled = 85 * 0.35 = 29.75 → floor 29
      // expert = 85 * 0.15 = 12.75 → floor 12
      expect(pool.levels.junior.available).toBe(42);
      expect(pool.levels.skilled.available).toBe(29);
      expect(pool.levels.expert.available).toBe(12);
    });

    it("evolveLaborPool applies attrition and new entrants", () => {
      let pool = initializeLaborPool(10_000, enabledConfig);
      // Prendiamo i valori iniziali.
      const initialJunior = pool.levels.junior.available;
      // Evolve con crescita zero.
      pool = evolveLaborPool(pool, 0, enabledConfig);
      // Attrition: perdi 2.5% (arrotondato per diffloor).
      const expectedLost = Math.floor(initialJunior * 0.025);
      // New entrants: aggiungi 3% di quelli rimanenti.
      const afterAttrition = initialJunior - expectedLost;
      const expectedEntrants = Math.floor(afterAttrition * 0.03);
      const expectedJunior = afterAttrition + expectedEntrants;
      expect(pool.levels.junior.available).toBe(expectedJunior);
    });

    it("addFiredWorkersToPool schedules return", () => {
      let pool = initializeLaborPool(10_000, enabledConfig);
      const fired: WorkforceMix = { junior: 5, skilled: 3, expert: 1 };
      pool = addFiredWorkersToPool(pool, fired, enabledConfig);
      // Delay = 1 trimestre, quindi vengono messi in returning[0].
      expect(pool.levels.junior.returning[0]).toBe(5);
      expect(pool.levels.skilled.returning[0]).toBe(3);
      expect(pool.levels.expert.returning[0]).toBe(1);
    });
  });

  describe("resolveHiringAuction (enabled)", () => {
    const enabledConfig = {
      ...DEFAULT_LABOR_POOL_CONFIG,
      enabled: true,
    };

    it("allocates scarce experts deterministically", () => {
      // Bacino con solo 2 expert.
      const pool = initializeLaborPool(10_000, enabledConfig);
      // Modifichiamo il bacino per avere 2 expert.
      pool.levels.expert.available = 2;
      pool.levels.junior.available = 100;
      pool.levels.skilled.available = 100;

      const bids = [
        { playerId: "A", desired: { junior: 0, skilled: 0, expert: 5 }, wageMultiplier: 1.05 },
        { playerId: "B", desired: { junior: 0, skilled: 0, expert: 3 }, wageMultiplier: 1.10 },
      ];
      const seed = 42;
      const { results } = resolveHiringAuction(bids, pool, seed, enabledConfig);
      // B ha offerta più alta, quindi prende prima (fino a 2 expert).
      expect(results[0].playerId).toBe("B");
      expect(results[0].hired.expert).toBe(2);
      expect(results[1].playerId).toBe("A");
      expect(results[1].hired.expert).toBe(0); // esauriti
    });

    it("tie‑break uses playerId hash", () => {
      const pool = initializeLaborPool(10_000, enabledConfig);
      pool.levels.junior.available = 10;
      const bids = [
        { playerId: "player1", desired: { junior: 5, skilled: 0, expert: 0 }, wageMultiplier: 1.0 },
        { playerId: "player2", desired: { junior: 5, skilled: 0, expert: 0 }, wageMultiplier: 1.0 },
      ];
      const seed = 999;
      const { results } = resolveHiringAuction(bids, pool, seed, enabledConfig);
      // L'ordine deterministico dovrebbe essere basato sull'hash.
      // Verifichiamo che entrambi abbiano ottenuto qualcosa (ma non entrambi 5 perché solo 10 disponibili).
      // Il primo prende 5, il secondo prende i restanti 5.
      expect(results[0].hired.junior + results[1].hired.junior).toBe(10);
    });
  });

  describe("training", () => {
    const enabledConfig = {
      ...DEFAULT_LABOR_POOL_CONFIG,
      enabled: true,
      trainingEnabled: true,
    };

    it("startTraining adds workers with full duration", () => {
      const initial = { juniorToSkilled: [2, 1], skilledToExpert: [] };
      const newTraining = startTraining(initial, 3, 2, enabledConfig);
      // Durata JS = 2, SE = 2.
      expect(newTraining.juniorToSkilled).toEqual([2, 1, 2, 2, 2]);
      expect(newTraining.skilledToExpert).toEqual([2, 2]);
    });

    it("advanceTraining reduces remaining quarters and counts completions", () => {
      const training = {
        juniorToSkilled: [1, 3, 1], // due completano (1), uno rimane con 2
        skilledToExpert: [2, 1], // uno completa (1), uno rimane con 1
      };
      const { newTraining, completedJuniorToSkilled, completedSkilledToExpert } =
        advanceTraining(training, enabledConfig);
      expect(completedJuniorToSkilled).toBe(2);
      expect(completedSkilledToExpert).toBe(1);
      expect(newTraining.juniorToSkilled).toEqual([2]); // 3 -> 2
      expect(newTraining.skilledToExpert).toEqual([1]); // 2 -> 1
    });

    it("calculateTrainingCost sums per‑quarter costs", () => {
      const training = {
        juniorToSkilled: [2, 2], // 2 workers
        skilledToExpert: [1], // 1 worker
      };
      const cost = calculateTrainingCost(training, enabledConfig);
      // 2 * 2000 + 1 * 3500 = 4000 + 3500 = 7500
      expect(cost).toBe(7_500);
    });

    it("calculateTrainingProductivity computes reduced output", () => {
      const training = {
        juniorToSkilled: [2], // 1 worker (ma array length 1)
        skilledToExpert: [1], // 1 worker
      };
      const prod = calculateTrainingProductivity(training, enabledConfig);
      // Junior prod = 125 * 0.5 = 62.5
      // Skilled prod = 175 * 0.7 = 122.5
      // Totale = 62.5 + 122.5 = 185
      expect(prod).toBe(185);
    });
  });
});

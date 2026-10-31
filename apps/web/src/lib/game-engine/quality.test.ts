import { describe, it, expect } from "vitest";
import {
  MATERIAL_SCRAP_CONTRIBUTION,
  PERSONNEL_SCRAP_OFFSET,
  OVERTIME_SCRAP_PENALTY,
  calculateScrapRate,
  applyScrap,
  defaultScrapIsZero,
  type ScrapParams,
  type ApplyScrapParams,
} from "./quality";
import { DEFAULT_CONFIG } from "./types";

describe("quality module", () => {
  describe("constants", () => {
    it("should have exact material scrap contributions from S9-4", () => {
      expect(MATERIAL_SCRAP_CONTRIBUTION.economy).toBe(3.5);
      expect(MATERIAL_SCRAP_CONTRIBUTION.standard).toBe(1.5);
      expect(MATERIAL_SCRAP_CONTRIBUTION.premium).toBe(0.5);
      expect(MATERIAL_SCRAP_CONTRIBUTION.ultra).toBe(0.0);
    });

    it("should have exact personnel scrap offsets from S9-4", () => {
      expect(PERSONNEL_SCRAP_OFFSET.base).toBe(-1.5);
      expect(PERSONNEL_SCRAP_OFFSET.skilled).toBe(-2.5);
      expect(PERSONNEL_SCRAP_OFFSET.expert).toBe(-3.5);
      expect(PERSONNEL_SCRAP_OFFSET.master).toBe(-4.5);
    });

    it("should have exact overtime scrap penalty from S9-4", () => {
      expect(OVERTIME_SCRAP_PENALTY).toBe(1.0);
    });
  });

  describe("calculateScrapRate", () => {
    it("should return zero for default (standard, base, no overtime)", () => {
      const params: ScrapParams = {
        materialQuality: "standard",
        personnelLevel: "base",
        overtime: false,
      };
      const result = calculateScrapRate(params);
      expect(result.scrapRate).toBe(0);
      expect(result.materialContribution).toBe(1.5);
      expect(result.personnelOffset).toBe(-1.5);
      expect(result.overtimePenalty).toBe(0);
    });

    it("should floor at zero (negative net scrap)", () => {
      const params: ScrapParams = {
        materialQuality: "premium", // +0.5
        personnelLevel: "master",   // -4.5
        overtime: false,
      };
      const result = calculateScrapRate(params);
      expect(result.scrapRate).toBe(0); // 0.5 - 4.5 = -4.0 => max(0, -4.0) = 0
    });

    it("should include overtime penalty", () => {
      const params: ScrapParams = {
        materialQuality: "standard", // +1.5
        personnelLevel: "base",      // -1.5
        overtime: true,              // +1.0
      };
      const result = calculateScrapRate(params);
      expect(result.scrapRate).toBe(0.01); // (1.5 -1.5 +1.0) / 100 = 0.01
    });

    it("should compute high scrap for worst case", () => {
      const params: ScrapParams = {
        materialQuality: "economy", // +3.5
        personnelLevel: "base",     // -1.5
        overtime: true,             // +1.0
      };
      const result = calculateScrapRate(params);
      expect(result.scrapRate).toBe(0.03); // (3.5 -1.5 +1.0) / 100 = 0.03
    });
  });

  describe("applyScrap", () => {
    const baseParams: Omit<ApplyScrapParams, "disposition"> = {
      materialQuality: "standard",
      personnelLevel: "base",
      overtime: false,
      producedQty: 1000,
      sellingPrice: 100,
      config: DEFAULT_CONFIG,
    };

    it("should produce zero scrap with default params (disposition discard)", () => {
      const params: ApplyScrapParams = {
        ...baseParams,
        disposition: "discard",
      };
      const result = applyScrap(params);
      expect(result.scrapRate).toBe(0);
      expect(result.scrappedUnits).toBe(0);
      expect(result.goodUnits).toBe(1000);
      expect(result.recoveredUnits).toBe(0);
      expect(result.reworkCost).toBe(0);
      expect(result.discountRevenue).toBe(0);
    });

    it("should discard scrapped units (no recovery)", () => {
      const params: ApplyScrapParams = {
        ...baseParams,
        materialQuality: "economy", // +3.5
        personnelLevel: "base",     // -1.5
        overtime: false,
        disposition: "discard",
      };
      // scrap rate = (3.5 -1.5) / 100 = 0.02
      const result = applyScrap(params);
      expect(result.scrapRate).toBe(0.02);
      expect(result.scrappedUnits).toBe(20); // 1000 * 0.02 = 20
      expect(result.goodUnits).toBe(980); // 1000 - 20
      expect(result.recoveredUnits).toBe(0);
      expect(result.reworkCost).toBe(0);
      expect(result.discountRevenue).toBe(0);
    });

    it("should rework scrapped units (90% recovery, extra cost)", () => {
      const params: ApplyScrapParams = {
        ...baseParams,
        materialQuality: "economy",
        personnelLevel: "base",
        overtime: false,
        disposition: "rework",
      };
      // scrap rate = 0.02, scrapped = 20
      const result = applyScrap(params);
      expect(result.scrappedUnits).toBe(20);
      expect(result.recoveredUnits).toBe(18); // 20 * 0.9 = 18
      expect(result.goodUnits).toBe(998); // 1000 - 20 + 18 = 998
      // rework cost = 20 * 27.5 * 0.5 = 275
      expect(result.reworkCost).toBe(275);
      expect(result.discountRevenue).toBe(0);
    });

    it("should sell scrapped units at discount (40% revenue)", () => {
      const params: ApplyScrapParams = {
        ...baseParams,
        materialQuality: "economy",
        personnelLevel: "base",
        overtime: false,
        disposition: "discount",
      };
      const result = applyScrap(params);
      expect(result.scrappedUnits).toBe(20);
      expect(result.recoveredUnits).toBe(20); // tutti venduti
      expect(result.goodUnits).toBe(1000); // tutte le unità sono buone (vendute a sconto)
      expect(result.reworkCost).toBe(0);
      // discount revenue = 20 * 100 * 0.4 = 800
      expect(result.discountRevenue).toBe(800);
    });

    it("should handle fractional scrap with floor", () => {
      const params: ApplyScrapParams = {
        ...baseParams,
        producedQty: 123, // non multiplo di 100
        materialQuality: "standard", // +1.5
        personnelLevel: "skilled",   // -2.5
        overtime: false,
        disposition: "discard",
      };
      // scrap rate = max(0, 1.5 -2.5) / 100 = 0
      const result = applyScrap(params);
      expect(result.scrapRate).toBe(0);
      expect(result.scrappedUnits).toBe(0);
      expect(result.goodUnits).toBe(123);
    });
  });

  describe("defaultScrapIsZero", () => {
    it("should return true for default parameters", () => {
      expect(defaultScrapIsZero()).toBe(true);
    });
  });
});

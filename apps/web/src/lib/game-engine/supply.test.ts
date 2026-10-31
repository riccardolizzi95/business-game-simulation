import { describe, it, expect } from "vitest";
import {
  STANDARD_MATERIAL_COST_PER_UNIT,
  DELIVERY_TIME_OPTIONS,
  MATERIAL_QUALITY_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  DEFAULT_DELIVERY_TIME,
  DEFAULT_MATERIAL_QUALITY,
  DEFAULT_PAYMENT_TERMS,
  calculateMaterialUnitPrice,
  calculateCashOutQuarter,
  scrapRateForMaterialQuality,
  calculateBrandEffectMultiplier,
  evolveSupplyStateWithOptions,
  evolveSupplyState,
  RawMaterialInventoryState,
} from "./supply";

describe("supply module", () => {
  describe("constants", () => {
    it("should have standard material cost from config", () => {
      expect(STANDARD_MATERIAL_COST_PER_UNIT).toBe(25);
    });

    it("should have correct delivery time options", () => {
      expect(DELIVERY_TIME_OPTIONS).toHaveLength(4);
      const express = DELIVERY_TIME_OPTIONS.find(d => d.code === "express");
      expect(express).toBeDefined();
      expect(express!.leadTimeQuarters).toBe(0);
      expect(express!.priceMultiplier).toBe(1.18);
    });

    it("should have correct material quality options", () => {
      expect(MATERIAL_QUALITY_OPTIONS).toHaveLength(4);
      const eco = MATERIAL_QUALITY_OPTIONS.find(q => q.code === "eco");
      expect(eco).toBeDefined();
      expect(eco!.priceMultiplier).toBe(0.88);
      expect(eco!.scrapRateDelta).toBe(2.5);
      expect(eco!.brandEffect).toBe(-0.03);
    });

    it("should have correct payment terms options", () => {
      expect(PAYMENT_TERMS_OPTIONS).toHaveLength(5);
      const net90 = PAYMENT_TERMS_OPTIONS.find(p => p.code === "net_90");
      expect(net90).toBeDefined();
      expect(net90!.priceMultiplier).toBe(1.09);
      expect(net90!.cashOutQuarterOffset).toBe(1);
    });
  });

  describe("calculateMaterialUnitPrice", () => {
    const base = STANDARD_MATERIAL_COST_PER_UNIT; // 25

    it("should return base cost for default options", () => {
      const price = calculateMaterialUnitPrice(base);
      expect(price).toBe(25);
    });

    it("should apply express premium", () => {
      const price = calculateMaterialUnitPrice(base, "express", "std", "on_delivery");
      // 25 * 1.18 = 29.5
      expect(price).toBe(29.5);
    });

    it("should apply economy discount", () => {
      const price = calculateMaterialUnitPrice(base, "std", "eco", "on_delivery");
      // 25 * 0.88 = 22
      expect(price).toBe(22);
    });

    it("should apply prepay discount", () => {
      const price = calculateMaterialUnitPrice(base, "std", "std", "prepay");
      // 25 * 0.95 = 23.75
      expect(price).toBe(23.75);
    });

    it("should combine all three dimensions", () => {
      const price = calculateMaterialUnitPrice(base, "express", "prem", "net_60");
      // 25 * 1.18 (express) * 1.18 (premium) * 1.05 (net_60) = 36.5505
      expect(price).toBeCloseTo(36.5505, 10);
    });
  });

  describe("calculateCashOutQuarter", () => {
    it("prepay: cash out at order quarter regardless of lead time", () => {
      expect(calculateCashOutQuarter(5, "express", "prepay")).toBe(5);
      expect(calculateCashOutQuarter(5, "plan_3q", "prepay")).toBe(5);
    });

    it("on_delivery: cash out at delivery quarter", () => {
      // express lead 0
      expect(calculateCashOutQuarter(5, "express", "on_delivery")).toBe(5);
      // std lead 1
      expect(calculateCashOutQuarter(5, "std", "on_delivery")).toBe(6);
      // plan_3q lead 3
      expect(calculateCashOutQuarter(5, "plan_3q", "on_delivery")).toBe(8);
    });

    it("net_30: cash out at delivery quarter (offset 0)", () => {
      expect(calculateCashOutQuarter(5, "std", "net_30")).toBe(6);
    });

    it("net_60/90: cash out one quarter after delivery", () => {
      // std lead 1, delivery at 6, offset 1 => 7
      expect(calculateCashOutQuarter(5, "std", "net_60")).toBe(7);
      expect(calculateCashOutQuarter(5, "std", "net_90")).toBe(7);
      // express lead 0, delivery at 5, offset 1 => 6
      expect(calculateCashOutQuarter(5, "express", "net_60")).toBe(6);
    });
  });

  describe("scrapRateForMaterialQuality", () => {
    const base = 0.015;

    it("should return base for standard", () => {
      expect(scrapRateForMaterialQuality(base, "std")).toBe(0.015);
    });

    it("should increase for economy", () => {
      // +2.5% points => 0.015 + 0.025 = 0.04
      expect(scrapRateForMaterialQuality(base, "eco")).toBe(0.04);
    });

    it("should decrease for premium", () => {
      // -0.5% points => 0.015 - 0.005 = 0.01
      expect(scrapRateForMaterialQuality(base, "prem")).toBeCloseTo(0.01, 10);
    });

    it("should decrease more for ultra", () => {
      // -1.0% points => 0.015 - 0.01 = 0.005
      expect(scrapRateForMaterialQuality(base, "ultra")).toBeCloseTo(0.005, 10);
    });

    it("should not go below zero", () => {
      // if base were 0 and delta negative, still zero
      expect(scrapRateForMaterialQuality(0, "ultra")).toBe(0);
    });
  });

  describe("calculateBrandEffectMultiplier", () => {
    it("should be 1 for standard", () => {
      expect(calculateBrandEffectMultiplier("std")).toBe(1);
    });

    it("should be 0.97 for economy", () => {
      expect(calculateBrandEffectMultiplier("eco")).toBe(0.97);
    });

    it("should be 1.02 for premium", () => {
      expect(calculateBrandEffectMultiplier("prem")).toBe(1.02);
    });

    it("should be 1.04 for ultra", () => {
      expect(calculateBrandEffectMultiplier("ultra")).toBe(1.04);
    });
  });

  describe("evolveSupplyStateWithOptions", () => {
    const initialState: RawMaterialInventoryState = {
      stock: 100,
      pendingOrders: [],
    };

    it("should consume from stock", () => {
      const result = evolveSupplyStateWithOptions(
        initialState,
        0,
        50,
        0,
        STANDARD_MATERIAL_COST_PER_UNIT,
        "std",
        "std",
        "on_delivery"
      );
      expect(result.available).toBe(100);
      expect(result.consumed).toBe(50);
      expect(result.closingStock).toBe(50);
      expect(result.insufficient).toBe(false);
      expect(result.purchaseCost).toBe(0);
      expect(result.holdingCost).toBe(50 * 1.80);
    });

    it("should order and add pending order", () => {
      const result = evolveSupplyStateWithOptions(
        initialState,
        200,
        0,
        0,
        STANDARD_MATERIAL_COST_PER_UNIT,
        "std",
        "std",
        "on_delivery"
      );
      expect(result.ordered).toBe(200);
      expect(result.newState.pendingOrders).toHaveLength(1);
      const order = result.newState.pendingOrders[0];
      expect(order.quantity).toBe(200);
      expect(order.arrivalQuarter).toBe(1); // std lead 1
      expect(order.cashOutQuarter).toBe(1); // on_delivery
      expect(order.unitPrice).toBe(25);
      expect(result.purchaseCost).toBe(200 * 25);
    });

    it("should receive pending orders when arrival quarter <= current", () => {
      const state: RawMaterialInventoryState = {
        stock: 50,
        pendingOrders: [
          {
            quantity: 80,
            arrivalQuarter: 1,
            cashOutQuarter: 1,
            unitPrice: 25,
            delivery: "std",
            quality: "std",
            payment: "on_delivery",
          },
        ],
      };
      const result = evolveSupplyStateWithOptions(state, 0, 0, 1);
      // pending order arrives
      expect(result.available).toBe(50 + 80);
      expect(result.newState.pendingOrders).toHaveLength(0);
    });

    it("should handle insufficient stock", () => {
      const result = evolveSupplyStateWithOptions(initialState, 0, 150, 0);
      expect(result.available).toBe(100);
      expect(result.consumed).toBe(100);
      expect(result.closingStock).toBe(0);
      expect(result.insufficient).toBe(true);
    });

    it("should generate accounts payable for future payment", () => {
      const result = evolveSupplyStateWithOptions(
        initialState,
        100,
        0,
        5,
        STANDARD_MATERIAL_COST_PER_UNIT,
        "express",
        "std",
        "net_60"
      );
      // express lead 0, delivery at 5, net_60 offset 1 => cash out at 6
      expect(result.accountsPayableDue).toEqual([
        { quarter: 6, amount: 100 * 25 * 1.18 * 1.05 },
      ]);
    });
  });

  describe("evolveSupplyState (backward compatibility)", () => {
    it("should behave identically to default options", () => {
      const initialState: RawMaterialInventoryState = {
        stock: 100,
        pendingOrders: [],
      };
      const resultLegacy = evolveSupplyState(initialState, 50, 30, 0);
      const resultNew = evolveSupplyStateWithOptions(
        initialState,
        50,
        30,
        0,
        STANDARD_MATERIAL_COST_PER_UNIT,
        DEFAULT_DELIVERY_TIME,
        DEFAULT_MATERIAL_QUALITY,
        DEFAULT_PAYMENT_TERMS
      );
      expect(resultLegacy.available).toBe(resultNew.available);
      expect(resultLegacy.consumed).toBe(resultNew.consumed);
      expect(resultLegacy.closingStock).toBe(resultNew.closingStock);
      expect(resultLegacy.purchaseCost).toBe(resultNew.purchaseCost);
      expect(resultLegacy.holdingCost).toBe(resultNew.holdingCost);
      expect(resultLegacy.insufficient).toBe(resultNew.insufficient);
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  ACCUMULATION_RATE,
  BRAND_DECAY_RATE,
  CAMPAIGN_EFFECTIVENESS,
  INITIAL_BRAND,
  MAX_BRAND_BOOST,
  MAX_MARKETING_BUDGET,
  REF_BUDGET,
  brandMultiplier,
  campaignMultiplier,
  evolveBrand,
  marketingMultiplier,
  splitBudget,
} from "./marketing";

describe("marketing — ripartizione del budget", () => {
  it("divide il budget fra awareness e performance secondo il focus", () => {
    const { awarenessInvestment, performanceInvestment } = splitBudget(100_000, 0.7);
    // toBeCloseTo e non toBe: 100_000 × (1 − 0.7) in virgola mobile dà 30000,000000000004.
    expect(awarenessInvestment).toBeCloseTo(70_000, 6);
    expect(performanceInvestment).toBeCloseTo(30_000, 6);
  });

  it("rispetta il tetto massimo di spesa", () => {
    const { awarenessInvestment, performanceInvestment } = splitBudget(999_999, 0.5);
    expect(awarenessInvestment + performanceInvestment).toBe(MAX_MARKETING_BUDGET);
  });

  it("un budget negativo vale zero", () => {
    const s = splitBudget(-5000, 0.5);
    expect(s.awarenessInvestment).toBe(0);
    expect(s.performanceInvestment).toBe(0);
  });
});

describe("marketing — campagne con rendimenti decrescenti", () => {
  it("al budget di riferimento l'effetto è quello calibrato", () => {
    expect(campaignMultiplier(REF_BUDGET)).toBeCloseTo(1 + CAMPAIGN_EFFECTIVENESS, 10);
  });

  it("raddoppiare il budget NON raddoppia l'effetto (radice quadrata)", () => {
    const singolo = campaignMultiplier(REF_BUDGET) - 1;
    const doppio = campaignMultiplier(REF_BUDGET * 2) - 1;
    expect(doppio).toBeLessThan(singolo * 2);
    expect(doppio).toBeCloseTo(singolo * Math.SQRT2, 10);
  });

  it("quadruplicare il budget raddoppia l'effetto", () => {
    const singolo = campaignMultiplier(REF_BUDGET) - 1;
    expect(campaignMultiplier(REF_BUDGET * 4) - 1).toBeCloseTo(singolo * 2, 10);
  });

  it("budget nullo o negativo lascia il moltiplicatore a 1 (neutro)", () => {
    expect(campaignMultiplier(0)).toBe(1);
    expect(campaignMultiplier(-100)).toBe(1);
  });
});

describe("marketing — brand equity", () => {
  it("l'investimento in awareness accumula equity al tasso definito", () => {
    const dopo = evolveBrand(INITIAL_BRAND, 100_000);
    expect(dopo.brandEquity).toBeCloseTo(100_000 * ACCUMULATION_RATE, 10);
  });

  it("senza investimento l'equity decade al tasso definito", () => {
    const dopo = evolveBrand({ brandEquity: 0.8 }, 0);
    expect(dopo.brandEquity).toBeCloseTo(0.8 * (1 - BRAND_DECAY_RATE), 10);
  });

  it("l'equity non supera mai 1", () => {
    let s = { brandEquity: 0.95 };
    for (let i = 0; i < 10; i++) s = evolveBrand(s, MAX_MARKETING_BUDGET);
    expect(s.brandEquity).toBeLessThanOrEqual(1);
  });

  it("smettere di investire erode il brand nel tempo", () => {
    let s = evolveBrand(INITIAL_BRAND, 100_000);
    const picco = s.brandEquity;
    for (let i = 0; i < 8; i++) s = evolveBrand(s, 0);
    expect(s.brandEquity).toBeLessThan(picco / 2);
  });

  it("è puro: non modifica lo stato in ingresso", () => {
    const originale = { brandEquity: 0.4 };
    evolveBrand(originale, 50_000);
    expect(originale.brandEquity).toBe(0.4);
  });
});

describe("marketing — moltiplicatore complessivo", () => {
  it("vale ESATTAMENTE 1 senza brand e senza budget: garanzia di non-regressione", () => {
    expect(marketingMultiplier(INITIAL_BRAND, 0)).toBe(1);
  });

  it("a brand pieno la spinta è quella massima definita", () => {
    expect(brandMultiplier({ brandEquity: 1 })).toBeCloseTo(1 + MAX_BRAND_BOOST, 10);
  });

  it("brand e campagna si compongono moltiplicativamente", () => {
    const stato = { brandEquity: 0.5 };
    expect(marketingMultiplier(stato, REF_BUDGET)).toBeCloseTo(
      brandMultiplier(stato) * campaignMultiplier(REF_BUDGET),
      10,
    );
  });

  it("è deterministico: stessi input, stesso output", () => {
    const stato = { brandEquity: 0.3 };
    expect(marketingMultiplier(stato, 75_000)).toBe(marketingMultiplier(stato, 75_000));
  });
});

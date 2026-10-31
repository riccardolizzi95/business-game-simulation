import { describe, test, expect } from 'vitest';
import type { PlayerResult } from './types';
import { REFERENCE_QUALITY_INDEX } from './product-quality';
import type { CashState } from './cash';
import { calculateCash } from './cash';

/**
 * Risultato di trimestre completo, con i campi che a `calculateCash` non servono già
 * riempiti a valori neutri. Prima ogni test costruiva l'oggetto a mano e ne ometteva
 * sei campi obbligatori: compilava solo perché nessuno lanciava mai `tsc` sui test.
 * Si sovrascrive solo ciò che il singolo caso vuole davvero mettere alla prova.
 */
const makeResult = (overrides: Partial<PlayerResult> = {}): PlayerResult => ({
  playerId: 'p1',
  price: 100,
  share: 0.5,
  demandUnits: 1000,
  capacity: 1000,
  unitsSold: 1000,
  lostSales: 0,
  qualityIndex: REFERENCE_QUALITY_INDEX,
  productionQty: 1000,
  openingInventory: 0,
  closingInventory: 0,
  holdingCost: 0,
  marketingCost: 0,
  brandEquity: 0,
  revenue: 100000,
  productionCost: 50000,
  fixedCost: 20000,
  capex: 0,
  depreciation: 0,
  costOfGoodsSold: 0,
  finishedGoodsValue: 0,
  cost: 70000,
  profit: 30000,
  appliedDemandMultiplier: 1,
  ...overrides,
});

describe('cash module', () => {
  test('starting cash zero, positive profit -> new cash positive, no overdraft', () => {
    const previousCash: CashState = { cash: 0 };
    const playerResult = makeResult({
      revenue: 100000, productionCost: 50000, fixedCost: 20000, cost: 70000, profit: 30000,
    });

    const { newCash, overdraft } = calculateCash(previousCash, playerResult);
    expect(newCash.cash).toBe(30000);
    expect(overdraft).toBe(0);
  });

  test('starting cash zero, negative profit -> new cash negative, overdraft equals absolute value', () => {
    const previousCash: CashState = { cash: 0 };
    const playerResult = makeResult({
      revenue: 50000, productionCost: 60000, fixedCost: 20000, cost: 80000, profit: -30000,
    });

    const { newCash, overdraft } = calculateCash(previousCash, playerResult);
    expect(newCash.cash).toBe(-30000);
    expect(overdraft).toBe(30000);
  });

  test('starting cash negative, positive profit that covers overdraft -> new cash positive, no overdraft', () => {
    const previousCash: CashState = { cash: -10000 };
    const playerResult = makeResult({
      revenue: 100000, productionCost: 50000, fixedCost: 20000, cost: 70000, profit: 30000,
    });

    const { newCash, overdraft } = calculateCash(previousCash, playerResult);
    expect(newCash.cash).toBe(20000); // -10000 + 30000
    expect(overdraft).toBe(0);
  });

  test('starting cash negative, positive profit that does not cover overdraft -> new cash still negative, overdraft reduced', () => {
    const previousCash: CashState = { cash: -10000 };
    const playerResult = makeResult({
      revenue: 50000, productionCost: 60000, fixedCost: 20000, cost: 80000, profit: -30000,
    });

    const { newCash, overdraft } = calculateCash(previousCash, playerResult);
    expect(newCash.cash).toBe(-40000); // -10000 + (-30000)
    expect(overdraft).toBe(40000);
  });

  test('first quarter: starting cash zero, zero profit -> new cash zero, no overdraft', () => {
    const previousCash: CashState = { cash: 0 };
    const playerResult = makeResult({
      revenue: 50000, productionCost: 50000, fixedCost: 0, cost: 50000, profit: 0,
    });

    const { newCash, overdraft } = calculateCash(previousCash, playerResult);
    expect(newCash.cash).toBe(0);
    expect(overdraft).toBe(0);
  });
});

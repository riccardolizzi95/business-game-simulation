/**
 * Ordini multipli e magazzino a lotti (S17-8).
 *
 * Richiesta del giocatore: «vorrei poter fare più ordini in modo che magari mi organizzo subito
 * acquistando a periodi diversi». Da qui il magazzino a lotti: ogni lotto porta prezzo e qualità,
 * e la qualità di ciò che si produce è la media pesata di ciò che si consuma.
 */
import { describe, test, expect } from 'vitest';
import { evolveSupplyMulti, MATERIAL_QUALITY_INDEX_BY_OPTION } from './supply';
import type { RawMaterialInventoryState, MaterialOrderRequest } from './supply';
import { simulateQuarter } from './simulate';
import { DEFAULT_CONFIG } from './types';

const vuoto: RawMaterialInventoryState = { stock: 0, lots: [], pendingOrders: [] };
const ordine = (o: Partial<MaterialOrderRequest>): MaterialOrderRequest => ({
  quantity: 1000, delivery: 'express', quality: 'std', payment: 'on_delivery', ...o,
});

describe('più ordini nello stesso trimestre', () => {
  test('si possono piazzare più ordini con consegne diverse', () => {
    const r = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 1000, delivery: 'express' }),   // arriva subito
      ordine({ quantity: 2000, delivery: 'std' }),       // fra un trimestre
      ordine({ quantity: 3000, delivery: 'plan_3q' }),   // fra tre
    ], 0, 1);
    expect(r.available).toBe(1000);                       // solo l'express è disponibile ora
    expect(r.newState.pendingOrders).toHaveLength(2);     // gli altri due sono in viaggio
    expect(r.newState.pendingOrders.map((o) => o.arrivalQuarter).sort()).toEqual([2, 4]);
  });

  test('ogni ordine genera il suo debito, con la sua scadenza', () => {
    const r = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 1000, payment: 'prepay' }),
      ordine({ quantity: 1000, payment: 'net_90' }),
    ], 0, 1);
    expect(r.payables).toHaveLength(2);
    const scadenze = r.payables.map((p) => p.quarter).sort();
    expect(scadenze[0]).toBeLessThan(scadenze[1]); // il pagamento a 90 giorni scade dopo
  });

  test('le consegne che si accavallano si sommano in magazzino', () => {
    // Due ordini che arrivano nello stesso trimestre: il magazzino li accoglie entrambi.
    let stato = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 1000, delivery: 'std' }),
      ordine({ quantity: 1500, delivery: 'std' }),
    ], 0, 1).newState;
    const t2 = evolveSupplyMulti(stato, [], 0, 2);
    expect(t2.available).toBe(2500);
  });
});

describe('qualità del materiale con lotti misti', () => {
  test('consumando due lotti uguali, la qualità è la media dei due', () => {
    const r = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 1000, quality: 'eco' }),    // indice 60
      ordine({ quantity: 1000, quality: 'ultra' }),  // indice 95
    ], 2000, 1);
    expect(r.consumed).toBe(2000);
    expect(r.consumedQualityIndex).toBeCloseTo((60 + 95) / 2, 10);
  });

  test('la media è PESATA sulle quantità, non sul numero di lotti', () => {
    const r = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 3000, quality: 'eco' }),    // 3.000 × 60
      ordine({ quantity: 1000, quality: 'ultra' }),  // 1.000 × 95
    ], 4000, 1);
    expect(r.consumedQualityIndex).toBeCloseTo((3000 * 60 + 1000 * 95) / 4000, 10);
  });

  test('si consuma FIFO: prima il materiale arrivato prima', () => {
    // Primo lotto economy, poi ultra. Consumandone solo la metà si usa solo l'economy.
    const r = evolveSupplyMulti(vuoto, [
      ordine({ quantity: 1000, quality: 'eco' }),
      ordine({ quantity: 1000, quality: 'ultra' }),
    ], 1000, 1);
    expect(r.consumedQualityIndex).toBeCloseTo(MATERIAL_QUALITY_INDEX_BY_OPTION.eco, 10);
    // e in magazzino resta l'ultra
    expect(r.newState.lots).toHaveLength(1);
    expect(r.newState.lots![0].quality).toBe('ultra');
  });

  test('senza consumo la qualità è quella standard: nessun effetto', () => {
    const r = evolveSupplyMulti(vuoto, [ordine({ quantity: 1000, quality: 'ultra' })], 0, 1);
    expect(r.consumedQualityIndex).toBe(MATERIAL_QUALITY_INDEX_BY_OPTION.std);
  });
});

describe('effetto in partita', () => {
  test('comprare metà ultra e metà economy dà una qualità intermedia', () => {
    const dec = [{ playerId: 'tu', price: 100, plants: 4, overtime: false, productionQty: 2000 }];
    const conMix = simulateQuarter(
      dec, DEFAULT_CONFIG, undefined, { tu: 0 },
      { tu: { stock: 0, lots: [
        { quantity: 1000, unitPrice: 25, quality: 'eco' },
        { quantity: 1000, unitPrice: 25, quality: 'ultra' },
      ], pendingOrders: [] } },
      { tu: [] }, undefined, undefined, 1,
    )[0];
    const soloStandard = simulateQuarter(
      dec, DEFAULT_CONFIG, undefined, { tu: 0 },
      { tu: { stock: 2000, pendingOrders: [] } }, { tu: [] }, undefined, undefined, 1,
    )[0];
    // eco 60 + ultra 95 → media 77,5: appena sopra lo standard 75.
    expect(conMix.qualityIndex).toBeGreaterThan(soloStandard.qualityIndex);
  });
});

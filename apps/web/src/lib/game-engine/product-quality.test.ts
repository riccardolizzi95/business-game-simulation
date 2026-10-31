/**
 * Indice di qualità del prodotto (S16-5).
 *
 * I numeri attesi sono ricalcolati qui, NON copiati dai documenti di design: durante la revisione
 * sono emersi due errori nelle loro tabelle (un punto fisso sbagliato e il coefficiente di
 * bilanciamento applicato senza quadrato). Copiarli avrebbe cristallizzato gli errori.
 */
import { describe, test, expect } from 'vitest';
import {
  balanceScore,
  realQualityIndex,
  productQualityIndex,
  adHalo,
  qualityDemandMultiplier,
  REFERENCE_QUALITY_INDEX,
  IDEAL_MIX_SHARES,
} from './product-quality';
import { DEFAULT_MIX_PER_PLANT } from './workforce';

describe('bilanciamento dell organico', () => {
  test('il mix ideale 1:3:2 vale esattamente 1', () => {
    expect(balanceScore({ junior: 1, skilled: 3, expert: 2 })).toBeCloseTo(1, 10);
  });

  test('«tutti esperti» NON è il massimo: vale un terzo', () => {
    // È il punto chiesto dal committente: la qualità massima non si compra assumendo solo expert.
    const tuttiExpert = balanceScore({ junior: 0, skilled: 0, expert: 10 });
    expect(tuttiExpert).toBeCloseTo(IDEAL_MIX_SHARES.expert, 6);
    expect(tuttiExpert).toBeLessThan(balanceScore({ junior: 1, skilled: 3, expert: 2 }));
  });

  test('aggiungere esperti oltre la quota ideale PEGGIORA il punteggio (non monotonia)', () => {
    const ideale = balanceScore({ junior: 1, skilled: 3, expert: 2 });
    const troppi = balanceScore({ junior: 1, skilled: 3, expert: 6 });
    const troppissimi = balanceScore({ junior: 1, skilled: 3, expert: 20 });
    expect(troppi).toBeLessThan(ideale);
    expect(troppissimi).toBeLessThan(troppi);
  });

  test('«tutti junior» è il caso peggiore fra i tre estremi', () => {
    const j = balanceScore({ junior: 10, skilled: 0, expert: 0 });
    const s = balanceScore({ junior: 0, skilled: 10, expert: 0 });
    const e = balanceScore({ junior: 0, skilled: 0, expert: 10 });
    expect(j).toBeLessThan(e);
    expect(e).toBeLessThan(s);
  });

  test('organico vuoto: punteggio zero, nessuna divisione per zero', () => {
    expect(balanceScore({ junior: 0, skilled: 0, expert: 0 })).toBe(0);
  });

  test('il mix di default del gioco è già quasi bilanciato', () => {
    expect(balanceScore(DEFAULT_MIX_PER_PLANT)).toBeGreaterThan(0.95);
  });
});

describe('indice di qualità 0..10', () => {
  test('la configurazione di partenza è il riferimento, e il moltiplicatore vale 1', () => {
    expect(productQualityIndex()).toBeCloseTo(REFERENCE_QUALITY_INDEX, 10);
    expect(qualityDemandMultiplier(REFERENCE_QUALITY_INDEX)).toBe(1);
  });

  test('materiale migliore alza la qualità, materiale scadente la abbassa', () => {
    const eco = productQualityIndex({ materialQuality: 'eco' });
    const std = productQualityIndex({ materialQuality: 'std' });
    const ultra = productQualityIndex({ materialQuality: 'ultra' });
    expect(eco).toBeLessThan(std);
    expect(std).toBeLessThan(ultra);
  });

  test('gli straordinari peggiorano la qualità del 10%', () => {
    const normale = realQualityIndex({ materialQuality: 'std' });
    const conStraordinari = realQualityIndex({ materialQuality: 'std', overtime: true });
    expect(conStraordinari).toBeCloseTo(normale * 0.9, 10);
  });

  test('l indice resta dentro 0..10 anche al massimo delle condizioni', () => {
    const massimo = productQualityIndex({
      materialQuality: 'ultra',
      workforceMix: { junior: 1, skilled: 3, expert: 2 },
      brandEquity: 1,
    });
    expect(massimo).toBeLessThanOrEqual(10);
    expect(massimo).toBeGreaterThan(REFERENCE_QUALITY_INDEX);
  });
});

describe('alone della pubblicità', () => {
  test('senza brand non c è alcun alone', () => {
    expect(adHalo(0, 8)).toBe(0);
  });

  test('è proporzionale alla qualità reale: chi ha un prodotto scadente guadagna poco', () => {
    // La correzione al difetto di S16-4: prima la percezione saliva uguale per tutti.
    const suProdottoScadente = adHalo(1, 3);
    const suProdottoOttimo = adHalo(1, 9);
    expect(suProdottoScadente).toBeLessThan(suProdottoOttimo);
    expect(suProdottoScadente).toBeCloseTo(0.15, 10);
    expect(suProdottoOttimo).toBeCloseTo(0.45, 10);
  });

  test('non supera mai il tetto di mezzo punto', () => {
    expect(adHalo(1, 10)).toBeLessThanOrEqual(0.5);
    expect(adHalo(5, 10)).toBeLessThanOrEqual(0.5); // brand fuori scala: comunque limitato
  });
});

describe('effetto sulla domanda', () => {
  test('qualità sopra il riferimento attrae di più, sotto attrae di meno', () => {
    expect(qualityDemandMultiplier(REFERENCE_QUALITY_INDEX * 1.2)).toBeGreaterThan(1);
    expect(qualityDemandMultiplier(REFERENCE_QUALITY_INDEX * 0.8)).toBeLessThan(1);
  });

  test('con elasticità 1 l effetto è proporzionale', () => {
    expect(qualityDemandMultiplier(REFERENCE_QUALITY_INDEX * 1.1)).toBeCloseTo(1.1, 10);
  });
});

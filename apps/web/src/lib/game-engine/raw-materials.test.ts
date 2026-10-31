/**
 * Consumo reale delle materie prime (S16-6).
 *
 * Nasce da due difetti trovati sondando il motore il 2026-07-28:
 *  1. `currentQuarter` era cablato a 0 nella chiamata al magazzino materie prime: ogni ordine
 *     scadeva sempre nel futuro rispetto a un "adesso" fermo, quindi NON ARRIVAVA MAI e la
 *     produzione restava a zero per sempre;
 *  2. la materia prima veniva contata due volte, dentro il costo unitario di produzione E come
 *     costo d'acquisto dell'ordine.
 */
import { describe, test, expect } from 'vitest';
import { simulateQuarter } from './simulate';
import type { MaterialOrderOptions } from './simulate';
import { DEFAULT_CONFIG } from './types';
import type { PlayerDecision } from './types';
import type { RawMaterialInventoryState } from './supply';

const decisione = (productionQty: number): PlayerDecision[] => [
  { playerId: 'tu', price: 100, plants: 4, overtime: false, productionQty },
];

/** Gioca `n` trimestri riportando lo stato del magazzino, come fa la partita vera. */
function partita(
  quarters: number,
  ordinePerTrimestre: (q: number) => number,
  stockIniziale: number,
  opzioni?: MaterialOrderOptions,
) {
  let stato: RawMaterialInventoryState = { stock: stockIniziale, pendingOrders: [] };
  const storia = [];
  for (let q = 1; q <= quarters; q++) {
    const r = simulateQuarter(
      decisione(3000), DEFAULT_CONFIG, undefined, { tu: 0 },
      { tu: stato }, { tu: ordinePerTrimestre(q) },
      undefined, undefined, q, undefined, undefined, undefined,
      opzioni ? { tu: opzioni } : undefined,
    )[0];
    storia.push({ q, prodotto: r.productionQty, consumate: r.rawMaterialConsumed, scorte: r.rawMaterialStock });
    stato = r.rawMaterialState ?? { stock: 0, pendingOrders: [] };
  }
  return storia;
}

describe('materie prime: consumo e riapprovvigionamento', () => {
  test('senza scorte non si produce nulla', () => {
    const r = simulateQuarter(
      decisione(3000), DEFAULT_CONFIG, undefined, { tu: 0 },
      { tu: { stock: 0, pendingOrders: [] } }, { tu: 0 },
      undefined, undefined, 1,
    )[0];
    expect(r.productionQty).toBe(0);
    expect(r.unitsSold).toBe(0);
  });

  test('la scorta iniziale permette di produrre fino a esaurimento', () => {
    // 5.000 kit in magazzino, si vogliono produrre 3.000 a trimestre e non si riordina:
    // primo trimestre pieno, secondo a metà, poi fermi.
    const storia = partita(3, () => 0, 5000);
    expect(storia[0].prodotto).toBe(3000);
    expect(storia[1].prodotto).toBe(2000);
    expect(storia[2].prodotto).toBe(0);
  });

  test('un ordine con consegna standard arriva DOPO un trimestre, e si produce di nuovo', () => {
    // Il difetto storico: l'ordine non arrivava mai. Qui deve arrivare al T2.
    const storia = partita(3, (q) => (q === 1 ? 6000 : 0), 3000);
    expect(storia[0].prodotto).toBe(3000);  // consuma la scorta iniziale
    expect(storia[0].scorte).toBe(0);
    expect(storia[1].prodotto).toBe(3000);  // arrivato l'ordine: si riparte
    expect(storia[2].prodotto).toBe(3000);
  });

  test('con consegna express la merce è disponibile SUBITO', () => {
    const storia = partita(1, () => 3000, 0, { delivery: 'express', quality: 'std', payment: 'on_delivery' });
    expect(storia[0].prodotto).toBe(3000);
  });

  test('con consegna pianificata a 3 trimestri la merce NON arriva prima', () => {
    const storia = partita(3, (q) => (q === 1 ? 9000 : 0), 0, { delivery: 'plan_3q', quality: 'std', payment: 'on_delivery' });
    expect(storia[0].prodotto).toBe(0);
    expect(storia[1].prodotto).toBe(0);
    expect(storia[2].prodotto).toBe(0); // arriva al T4
  });

  test('la materia prima non è contata due volte', () => {
    const senzaMagazzino = simulateQuarter(decisione(1000), DEFAULT_CONFIG, undefined, { tu: 0 })[0];
    const conMagazzino = simulateQuarter(
      decisione(1000), DEFAULT_CONFIG, undefined, { tu: 0 },
      { tu: { stock: 1000, pendingOrders: [] } }, { tu: 0 },
      undefined, undefined, 1,
    )[0];
    // Senza magazzino: 55 €/unità (materia prima inclusa). Con magazzino: la materia prima
    // esce dagli ordini, quindi nel costo di produzione restano lavoro + energia.
    expect(senzaMagazzino.productionCost).toBe(1000 * DEFAULT_CONFIG.unitCost);
    expect(conMagazzino.productionCost).toBe(
      1000 * (DEFAULT_CONFIG.laborCost + DEFAULT_CONFIG.energyCost),
    );
  });

  test('chi non usa il magazzino materie prime gioca esattamente come prima', () => {
    const dec = decisione(3000);
    const prima = simulateQuarter(dec, DEFAULT_CONFIG, 12345, { tu: 0 })[0];
    const dopo = simulateQuarter(dec, DEFAULT_CONFIG, 12345, { tu: 0 }, undefined, undefined,
      undefined, undefined, 1)[0];
    expect(dopo.productionCost).toBe(prima.productionCost);
    expect(dopo.profit).toBe(prima.profit);
    expect(dopo.unitsSold).toBe(prima.unitsSold);
  });
});

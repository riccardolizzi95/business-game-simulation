/**
 * Causa delle vendite perse.
 *
 * Nasce da un difetto trovato giocando: l'interfaccia dava SEMPRE la colpa alla capacità
 * ("la domanda ha superato la tua capacità") anche quando la capacità era quasi tripla
 * della domanda e il vero limite era la produzione decisa dal giocatore — consigliando di
 * comprare stabilimenti da 250.000 € che non servivano a niente.
 */
import { describe, test, expect } from 'vitest';
import { simulateQuarter } from './simulate';
import { DEFAULT_CONFIG } from './types';
import type { PlayerDecision } from './types';

/** Un solo giocatore: così la domanda attratta è tutta la domanda di mercato. */
function soloRun(decision: Partial<PlayerDecision>, startingInventory = 0) {
  const decisions: PlayerDecision[] = [
    { playerId: 'tu', price: 100, plants: 1, overtime: false, ...decision },
  ];
  return simulateQuarter(
    decisions,
    DEFAULT_CONFIG,
    undefined,
    { tu: startingInventory },
  )[0];
}

describe('causa delle vendite perse', () => {
  test('senza vendite perse la causa non è valorizzata', () => {
    // 4 stabilimenti = 12.000 di capacità, produzione pari alla domanda di 10.000.
    const r = soloRun({ plants: 4, productionQty: 10_000 });
    expect(r.lostSales).toBe(0);
    expect(r.lostSalesCause).toBeUndefined();
  });

  test('capacità abbondante ma produzione bassa: la colpa è della PRODUZIONE', () => {
    // È il caso osservato giocando: capacità molto superiore alla domanda, ma si è
    // deciso di produrre poco. Comprare stabilimenti non risolverebbe nulla.
    const r = soloRun({ plants: 4, productionQty: 3_000 });
    expect(r.capacity).toBe(12_000);
    expect(r.demandUnits).toBe(10_000);
    expect(r.capacity).toBeGreaterThan(r.demandUnits); // capacità NON è il vincolo
    expect(r.lostSales).toBe(7_000);
    expect(r.lostSalesCause).toBe('production');
  });

  test('capacità insufficiente: la colpa è della CAPACITÀ', () => {
    // Un solo stabilimento (3.000) contro una domanda di 10.000: neanche a pieno regime basta.
    const r = soloRun({ plants: 1, productionQty: 3_000 });
    expect(r.lostSales).toBe(7_000);
    expect(r.lostSalesCause).toBe('capacity');
  });

  test('capacità insufficiente anche contando le scorte iniziali: resta CAPACITÀ', () => {
    // 500 in magazzino + 3.000 di capacità = 3.500, sotto una domanda di 10.000.
    const r = soloRun({ plants: 1, productionQty: 3_000 }, 500);
    expect(r.lostSalesCause).toBe('capacity');
  });

  test('le scorte iniziali possono spostare la causa da capacità a produzione', () => {
    // 9.000 in magazzino + 3.000 di capacità = 12.000 > domanda 10.000: la capacità
    // basterebbe, ma si produce 0 e mancano 1.000 unità.
    const r = soloRun({ plants: 1, productionQty: 0 }, 9_000);
    expect(r.lostSales).toBe(1_000);
    expect(r.lostSalesCause).toBe('production');
  });

  test('il comportamento v0.1 (senza productionQty) resta attribuito alla CAPACITÀ', () => {
    // Senza decisione di produzione il motore produce quel che riesce a vendere:
    // se restano vendite perse è perché la capacità non arriva.
    const r = soloRun({ plants: 1 });
    expect(r.lostSales).toBeGreaterThan(0);
    expect(r.lostSalesCause).toBe('capacity');
  });

  test('materie prime insufficienti: la colpa è dei MATERIALI, non della capacità', () => {
    const decisions: PlayerDecision[] = [
      { playerId: 'tu', price: 100, plants: 4, overtime: false, productionQty: 10_000 },
    ];
    const r = simulateQuarter(
      decisions,
      DEFAULT_CONFIG,
      undefined,
      { tu: 0 },
      { tu: { stock: 2_000, pendingOrders: [] } }, // materie prime per sole 2.000 unità
      { tu: 0 },                                    // nessun ordine nuovo
    )[0];
    expect(r.capacity).toBeGreaterThan(r.demandUnits); // capacità NON è il vincolo
    expect(r.lostSales).toBeGreaterThan(0);
    expect(r.lostSalesCause).toBe('materials');
  });

  test('scarto: prodotto abbastanza, ma i pezzi buoni non bastano', () => {
    const decisions: PlayerDecision[] = [
      { playerId: 'tu', price: 100, plants: 4, overtime: false, productionQty: 10_000 },
    ];
    const r = simulateQuarter(
      decisions,
      { ...DEFAULT_CONFIG, scrapEnabled: true },
      undefined,
      { tu: 0 },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { tu: { materialQuality: 'economy', personnelLevel: 'base', overtime: false } },
    )[0];
    expect(r.productionQty).toBe(10_000); // si è prodotto quanto serviva
    expect(r.lostSales).toBeGreaterThan(0);
    expect(r.lostSalesCause).toBe('scrap');
  });
});

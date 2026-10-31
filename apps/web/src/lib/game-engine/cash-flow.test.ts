/**
 * La cassa segue i PAGAMENTI, non il profitto (S17-5, passo P1).
 *
 * Difetto segnalato dal giocatore e misurato il 2026-07-29: scegliendo «paga a 60 giorni» si
 * pagava un sovrapprezzo (105.000 € invece di 95.000) ma la cassa usciva comunque subito, quindi
 * la dilazione era STRETTAMENTE peggiore invece di essere un compromesso.
 */
import { describe, test, expect } from 'vitest';
import { simulateQuarter } from './simulate';
import { DEFAULT_CONFIG } from './types';
import type { PlayerDecision } from './types';
import type { CashState } from './cash';
import type { MaterialOrderOptions } from './simulate';

const CAPITALE = 1_000_000;
const dec: PlayerDecision[] = [
  { playerId: 'tu', price: 100, plants: 4, overtime: false, productionQty: 1000 },
];

/** Un trimestre con magazzino materie prime, ordine e termini di pagamento scelti. */
function trimestre(
  quarter: number,
  cash: CashState,
  ordine: number,
  payment: MaterialOrderOptions['payment'],
) {
  return simulateQuarter(
    dec, DEFAULT_CONFIG, undefined, { tu: 0 },
    { tu: { stock: 5000, pendingOrders: [] } }, { tu: ordine },
    undefined, { tu: cash }, quarter, undefined, undefined, undefined,
    { tu: { delivery: 'std', quality: 'std', payment } },
  )[0];
}

describe('la cassa segue i pagamenti', () => {
  test('pagando ANTICIPATO la cassa esce subito', () => {
    const r = trimestre(1, { cash: CAPITALE }, 4000, 'prepay');
    expect(r.cashFlow!.cashOutSuppliers).toBeGreaterThan(0);
    expect(r.cashFlow!.payablesOutstanding).toBe(0);
  });

  test('pagando a 60 GIORNI la cassa NON esce nel trimestre dell ordine', () => {
    const r = trimestre(1, { cash: CAPITALE }, 4000, 'net_60');
    expect(r.cashFlow!.cashOutSuppliers).toBe(0);
    expect(r.cashFlow!.payablesOutstanding).toBeGreaterThan(0);
  });

  test('la dilazione lascia PIÙ soldi in cassa oggi: è il senso della scelta', () => {
    const anticipato = trimestre(1, { cash: CAPITALE }, 4000, 'prepay');
    const dilazionato = trimestre(1, { cash: CAPITALE }, 4000, 'net_60');
    // Il difetto storico: la dilazione costava di piu' E lasciava meno cassa.
    expect(dilazionato.cash!).toBeGreaterThan(anticipato.cash!);
  });

  test('il debito viene poi pagato davvero, alla scadenza', () => {
    // T1: ordino a 60 giorni. Il debito scade due trimestri dopo.
    const t1 = trimestre(1, { cash: CAPITALE }, 4000, 'net_60');
    const debito = t1.cashFlow!.payablesOutstanding;
    expect(debito).toBeGreaterThan(0);

    // T2 e T3: non ordino piu' nulla e guardo quando esce la cassa.
    const t2 = trimestre(2, t1.cashState!, 0, 'net_60');
    const t3 = trimestre(3, t2.cashState!, 0, 'net_60');
    const uscito = t2.cashFlow!.cashOutSuppliers + t3.cashFlow!.cashOutSuppliers;
    expect(uscito).toBeCloseTo(debito, 6);
    // e alla fine non resta nulla di sospeso
    expect(t3.cashFlow!.payablesOutstanding).toBe(0);
  });

  test('profitto e cassa NON coincidono più quando si dilaziona', () => {
    // È la lezione che il gioco deve trasmettere: «ho fatto utile ma non ho i soldi», e viceversa.
    const r = trimestre(1, { cash: CAPITALE }, 4000, 'net_60');
    const variazioneCassa = r.cash! - CAPITALE;
    expect(variazioneCassa).not.toBeCloseTo(r.profit, 2);
    expect(variazioneCassa).toBeCloseTo(r.cashFlow!.netCashFlow, 6);
  });

  test('senza magazzino materie prime non ci sono debiti: cassa = profitto + ammortamento − capex', () => {
    // Senza fornitori dilazionati l'unico scarto fra utile e cassa e' il ponte contabile:
    // l'ammortamento e' un costo che non si paga, il capex un'uscita che non e' un costo.
    const r = simulateQuarter(
      dec, DEFAULT_CONFIG, undefined, { tu: 0 }, undefined, undefined,
      undefined, { tu: { cash: CAPITALE } },
    )[0];
    expect(r.cash).toBeCloseTo(CAPITALE + r.profit + r.depreciation - r.capex, 6);
    expect(r.cashFlow).toBeUndefined(); // niente prospetto flussi senza magazzino MP
  });
});

describe('costo del venduto: la merce a magazzino non brucia il trimestre', () => {
  const produci = (productionQty: number): PlayerDecision[] => [
    { playerId: 'tu', price: 100, plants: 10, overtime: false, productionQty },
  ];

  test('produrre per il magazzino non peggiora il risultato oltre il costo di giacenza', () => {
    // È l'invariante che conta: prima, produrre 15.000 invece di 10.000 faceva crollare il
    // profitto di tutto il costo delle 5.000 unità invendute. Ora l'unica differenza legittima
    // è quanto costa tenerle in magazzino.
    const giusto = simulateQuarter(produci(10_000), DEFAULT_CONFIG)[0];
    const inEccesso = simulateQuarter(produci(15_000), DEFAULT_CONFIG)[0];
    expect(inEccesso.closingInventory).toBeGreaterThan(0);
    expect(inEccesso.finishedGoodsValue).toBeGreaterThan(0);
    expect(inEccesso.costOfGoodsSold).toBeLessThan(inEccesso.productionCost);
    expect(inEccesso.profit).toBeCloseTo(giusto.profit - inEccesso.holdingCost, 6);
  });

  test('il valore del magazzino diventa costo quando la merce si vende', () => {
    // T1: produco 15.000 e ne restano a magazzino.
    const t1 = simulateQuarter(produci(15_000), DEFAULT_CONFIG)[0];
    // T2: non produco nulla e vendo dal magazzino: ora quel costo emerge.
    const t2 = simulateQuarter(
      produci(0), DEFAULT_CONFIG, undefined, { tu: t1.closingInventory },
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, { tu: t1.finishedGoodsValue },
    )[0];
    expect(t2.productionCost).toBe(0);        // non si è prodotto niente
    expect(t2.costOfGoodsSold).toBeGreaterThan(0); // ma un costo del venduto c'è: viene dal magazzino
    expect(t2.finishedGoodsValue).toBeLessThan(t1.finishedGoodsValue);
  });

  test('nulla si perde: il valore del magazzino quadra con quanto è entrato e uscito', () => {
    const t1 = simulateQuarter(produci(15_000), DEFAULT_CONFIG)[0];
    // valore finale = costo di produzione del trimestre − costo del venduto (magazzino iniziale 0)
    expect(t1.finishedGoodsValue).toBeCloseTo(t1.productionCost - t1.costOfGoodsSold, 6);
  });
});

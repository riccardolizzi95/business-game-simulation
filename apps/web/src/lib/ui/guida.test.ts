/**
 * Avvisi pre-chiusura e racconto dell'esito (S18-1 / S18-2).
 *
 * Nascono da una prova concreta: giocando si poteva chiudere un trimestre senza decidere nulla,
 * perdere 1.370 vendite, e scoprirlo soltanto dopo.
 */
import { describe, test, expect } from 'vitest';
import { avvisiPreChiusura, livelloPiuGrave, type StatoPerAvvisi } from './avvisi';
import { raccontaTrimestre, consiglioProssimoTrimestre, type ContestoRacconto } from './racconto';
import type { PlayerResult } from '@/lib/game-engine';

const risultato = (o: Partial<PlayerResult> = {}): PlayerResult => ({
  playerId: 'tu', price: 100, share: 0.33, demandUnits: 3500, capacity: 3000,
  unitsSold: 3000, lostSales: 0, productionQty: 3000, openingInventory: 0,
  closingInventory: 0, holdingCost: 0, marketingCost: 0, brandEquity: 0,
  revenue: 300_000, productionCost: 165_000, fixedCost: 50_000, capex: 0,
  depreciation: 12_500, costOfGoodsSold: 165_000, finishedGoodsValue: 0,
  cost: 227_500, profit: 72_500, appliedDemandMultiplier: 1, qualityIndex: 8.4, ...o,
});

const stato = (o: Partial<StatoPerAvvisi> = {}): StatoPerAvvisi => ({
  est: risultato(), productionQty: 3000, capacity: 3000, rawStock: 6000, ordinato: 0,
  scorteIniziali: 0, cash: 1_000_000, marketingBudget: 0, price: 100, unitCost: 55,
  qualityIndex: 8.4, qualityRef: 8.4, ...o,
});

describe('avvisi prima di chiudere il trimestre', () => {
  test('una giocata sensata non produce avvisi inutili', () => {
    const a = avvisiPreChiusura(stato({ est: risultato({ demandUnits: 3000 }) }));
    expect(a).toHaveLength(0);
  });

  test('avverte se il materiale non basta per la produzione decisa', () => {
    const a = avvisiPreChiusura(stato({ productionQty: 3000, rawStock: 1000 }));
    const m = a.find((x) => x.id === 'materie-prime');
    expect(m).toBeDefined();
    expect(m!.livello).toBe('avviso');
    expect(m!.testo).toContain('2000'); // le unità mancanti
  });

  test('se un ordine è già stato piazzato l avviso si ammorbidisce', () => {
    const a = avvisiPreChiusura(stato({ productionQty: 3000, rawStock: 1000, ordinato: 5000 }));
    expect(a.find((x) => x.id === 'materie-prime')!.livello).toBe('nota');
  });

  test('avverte se si produce meno della domanda stimata', () => {
    // È il caso trovato giocando: trimestre chiuso senza decidere, 1.370 vendite perse.
    const a = avvisiPreChiusura(stato({ productionQty: 2000, est: risultato({ demandUnits: 4370 }) }));
    expect(a.some((x) => x.id === 'produzione-bassa')).toBe(true);
  });

  test('la cassa che va sotto zero chiede conferma, non blocca', () => {
    const a = avvisiPreChiusura(stato({ cash: 10_000, est: risultato({ profit: -50_000 }) }));
    const c = a.find((x) => x.id === 'cassa-negativa');
    expect(c!.livello).toBe('conferma');
    expect(c!.testo).toContain('Puoi farlo');
  });

  test('vendere sottocosto chiede conferma', () => {
    const a = avvisiPreChiusura(stato({ price: 40, unitCost: 55 }));
    expect(a.find((x) => x.id === 'prezzo-sottocosto')!.livello).toBe('conferma');
  });

  test('prezzo alto senza qualità superiore è solo una nota', () => {
    const a = avvisiPreChiusura(stato({ price: 140, qualityIndex: 8.0, qualityRef: 8.4 }));
    expect(a.find((x) => x.id === 'premium-senza-qualita')!.livello).toBe('nota');
  });

  test('il livello più grave guida la richiesta di conferma', () => {
    expect(livelloPiuGrave([])).toBeNull();
    expect(livelloPiuGrave([{ id: 'a', livello: 'nota', testo: '' }])).toBe('nota');
    expect(livelloPiuGrave([
      { id: 'a', livello: 'nota', testo: '' },
      { id: 'b', livello: 'conferma', testo: '' },
    ])).toBe('conferma');
  });
});

describe('racconto dell esito', () => {
  const contesto = (o: Partial<ContestoRacconto> = {}): ContestoRacconto => ({
    you: risultato(),
    tutti: [risultato(), risultato({ playerId: 'alfa', profit: 50_000, unitsSold: 2500, price: 95 })],
    nomi: { tu: 'La tua azienda', alfa: 'Rivale Alfa', beta: 'Rivale Beta' },
    ...o,
  });

  test('dice com è andata e se sei il migliore', () => {
    const f = raccontaTrimestre(contesto());
    expect(f[0].testo).toContain('utile');
    expect(f[0].testo).toContain('il migliore del mercato');
    expect(f[0].tono).toBe('bene');
  });

  test('spiega le vendite perse con la loro CAUSA, non genericamente', () => {
    const f = raccontaTrimestre(contesto({
      you: risultato({ lostSales: 1370, lostSalesCause: 'production' }),
    }));
    const frase = f.find((x) => x.testo.includes('1370'));
    expect(frase!.testo).toContain('produrre troppo poco');
  });

  test('segnala quando utile e cassa divergono, e ne elenca i motivi veri', () => {
    const f = raccontaTrimestre(contesto({ variazioneCassa: 150_000 }));
    const frase = f.find((x) => /Utile e soldi non coincidono/.test(x.testo));
    expect(frase).toBeDefined();
    // I motivi si dichiarano, non si indovinano: l'ammortamento c'e' nel risultato di prova.
    expect(frase!.testo).toContain('ammortamento');
    expect(frase!.testo).toContain('in meglio');
  });

  test('non inventa la divergenza se utile e cassa coincidono', () => {
    const f = raccontaTrimestre(contesto({ variazioneCassa: 72_500 }));
    expect(f.some((x) => /Utile e soldi non coincidono/.test(x.testo))).toBe(false);
  });

  test('al massimo quattro frasi: non è un muro di testo', () => {
    const f = raccontaTrimestre(contesto({
      you: risultato({ lostSales: 500, lostSalesCause: 'materials', profit: -10_000 }),
      variazioneCassa: 90_000,
      eventoMercato: 'Boom di mercato',
      scostamentoDomanda: 0.2,
    }));
    expect(f.length).toBeLessThanOrEqual(4);
  });

  test('il consiglio segue la causa delle vendite perse', () => {
    expect(consiglioProssimoTrimestre(contesto({
      you: risultato({ lostSales: 100, lostSalesCause: 'materials' }),
    }))).toContain('anticipo');
    expect(consiglioProssimoTrimestre(contesto({
      you: risultato({ lostSales: 100, lostSalesCause: 'capacity' }),
    }))).toContain('capacità');
  });

  test('senza problemi non si inventa un consiglio', () => {
    expect(consiglioProssimoTrimestre(contesto())).toBeNull();
  });
});

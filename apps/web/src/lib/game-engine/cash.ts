import type { PlayerResult } from './types';

/** Un debito verso fornitori: quanto, e in quale trimestre esce dalla cassa. */
export interface PayableDue {
  /** Trimestre in cui il pagamento esce dalla cassa. */
  quarter: number;
  /** Importo da pagare. */
  amount: number;
}

/** Stato della cassa di un giocatore. */
export interface CashState {
  /** Liquidità disponibile (può essere negativa, indicando scoperto). */
  cash: number;
  /**
   * Debiti verso fornitori ancora da pagare, con la loro scadenza.
   *
   * Senza questo elenco i termini di pagamento erano puramente decorativi: si pagava un
   * sovrapprezzo per la dilazione e la cassa usciva comunque subito, quindi «paga a 60 giorni»
   * era una scelta STRETTAMENTE peggiore invece di un compromesso (misurato il 2026-07-29:
   * 817.800 € contro 827.800 € a parità di tutto il resto).
   */
  payables?: PayableDue[];
}

/** Come si è mossa la cassa nel trimestre: le voci che il giocatore deve poter leggere. */
export interface CashFlow {
  /** Incassi dalle vendite del trimestre (oggi si incassa subito). */
  cashInSales: number;
  /** Pagamenti a fornitori di materie prime SCADUTI in questo trimestre. */
  cashOutSuppliers: number;
  /** Tutte le altre uscite del trimestre (produzione, fissi, marketing, giacenza, investimenti). */
  cashOutOther: number;
  /** Variazione netta della cassa. */
  netCashFlow: number;
  /** Debito verso fornitori ancora aperto a fine trimestre. */
  payablesOutstanding: number;
}

/**
 * Calcola la nuova cassa a partire dai FLUSSI, non dal profitto.
 *
 * La differenza è il punto: il profitto segue la competenza economica, la cassa segue i
 * pagamenti effettivi. Un ordine dilazionato pesa sul profitto oggi ma sulla cassa fra due
 * trimestri, ed è così che «ho fatto utile ma non ho i soldi» diventa una cosa che si vede.
 *
 * @param previousCash Stato della cassa a inizio trimestre, con i debiti già in scadenzario.
 * @param quarter Trimestre corrente (1-based): determina quali debiti scadono ora.
 * @param cashInSales Incassi del trimestre.
 * @param cashOutOther Uscite del trimestre diverse dai fornitori di materie prime.
 * @param newPayables Nuovi debiti generati in questo trimestre (dagli ordini appena piazzati).
 */
export function calculateCashFlow(
  previousCash: CashState,
  quarter: number,
  cashInSales: number,
  cashOutOther: number,
  newPayables: PayableDue[] = [],
): { newCash: CashState; overdraft: number; flow: CashFlow } {
  const aperti = [...(previousCash.payables ?? []), ...newPayables];
  // Scadono ora tutti i debiti con scadenza <= trimestre corrente: se qualcosa è rimasto
  // indietro (scadenza passata) va pagato comunque, non dimenticato.
  const scaduti = aperti.filter((p) => p.quarter <= quarter);
  const residui = aperti.filter((p) => p.quarter > quarter);

  const cashOutSuppliers = scaduti.reduce((s, p) => s + p.amount, 0);
  const netCashFlow = cashInSales - cashOutOther - cashOutSuppliers;
  const newCash: CashState = { cash: previousCash.cash + netCashFlow, payables: residui };
  const overdraft = newCash.cash < 0 ? -newCash.cash : 0;

  return {
    newCash,
    overdraft,
    flow: {
      cashInSales,
      cashOutSuppliers,
      cashOutOther,
      netCashFlow,
      payablesOutstanding: residui.reduce((s, p) => s + p.amount, 0),
    },
  };
}

/**
 * Vecchio calcolo: cassa = cassa precedente + profitto.
 *
 * Resta per i giocatori che non usano il magazzino materie prime (i rivali, e le partite dove
 * la leva è spenta): lì non ci sono debiti verso fornitori e le due grandezze coincidono.
 */
export function calculateCash(
  previousCash: CashState,
  playerResult: PlayerResult
): {
  newCash: CashState;
  /** Scoperto alla fine del trimestre (valore positivo o zero). */
  overdraft: number;
} {
  // Dal profitto alla cassa: si toglie l'ammortamento (costo che non paga nessuno) e si aggiunge
  // il capex (uscita vera che non e' un costo).
  const variazione = playerResult.profit + playerResult.depreciation - playerResult.capex;
  const newCash = { cash: previousCash.cash + variazione, payables: previousCash.payables };
  const overdraft = newCash.cash < 0 ? -newCash.cash : 0;
  return { newCash, overdraft };
}

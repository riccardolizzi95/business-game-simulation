/**
 * Formattazione condivisa dell'interfaccia (italiano).
 *
 * Estratto da `page.tsx` nel refactor S15-1: le funzioni sono identiche a prima,
 * qui stanno in un solo posto perché le usano tutte le sezioni.
 */

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/** Importi piccoli dove i centesimi contano (es. costo di giacenza per unità: 2,50 €). */
export const eurPrecise = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(n);

export const num = (n: number) => n.toLocaleString("it-IT");

export const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

export const eurN = (n: number | null) => (n === null ? "—" : eur(n));

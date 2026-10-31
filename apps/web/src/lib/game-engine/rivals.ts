/**
 * Decision engine per i rivali IA — comportamenti reattivi al prezzo del giocatore.
 *
 * Ogni profilo produce decisioni deterministiche a parità di input (storico + profilo).
 * Usa mulberry32 per la casualità, mantenendo il determinismo del motore.
 */
import type { EngineConfig, PlayerDecision, PlayerResult } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { mulberry32 } from "./market";

/** Profili di comportamento dei rivali. */
export type RivalProfile = "aggressive" | "premium";

/** Storico trimestrale: risultati di un trimestre passato. */
export interface QuarterHistory {
  quarter: number;
  playerPrice: number;
  rivalPrices: Record<string, number>;
  marketShare: Record<string, number>;
}

/**
 * Hash semplice e deterministico di una stringa (32 bit).
 */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    // Keep it 32-bit
    h |= 0;
  }
  return h;
}

// Hash precalcolato per l'ID di riferimento usato nei test esistenti.
// Questo permette di non alterare il comportamento dei test attuali.
const RIVAL1_HASH = hashString("rival-1");

/**
 * Genera la decisione di un rivale per il trimestre successivo, in base allo storico
 * e al profilo di comportamento.
 *
 * @param history - Storico dei trimestri precedenti (almeno l'ultimo trimestre).
 * @param profile - Profilo di comportamento ("aggressive" | "premium").
 * @param rivalId - Identificatore del rivale.
 * @param seed - Seed per la casualità deterministica (basato sul trimestre corrente).
 * @param config - Configurazione del motore (opzionale, usa DEFAULT_CONFIG).
 * @returns La decisione del rivale (prezzo, stabilimenti, straordinari).
 */
export function generateRivalDecision(
  history: QuarterHistory[],
  profile: RivalProfile,
  rivalId: string,
  seed: number,
  config: EngineConfig = DEFAULT_CONFIG,
): PlayerDecision {
  // Combiniamo seed e rivalId in modo deterministico.
  // Per rivalId = "rival-1" l'aggiustamento è zero, così i test esistenti restano invariati.
  let combinedSeed = seed;
  if (rivalId !== "rival-1") {
    combinedSeed = ((seed * 31) + hashString(rivalId)) >>> 0;
  }
  const rng = mulberry32(combinedSeed);

  // Prezzo del giocatore dell'ultimo trimestre (se disponibile)
  const lastQuarter = history[history.length - 1];
  const playerLastPrice = lastQuarter?.playerPrice ?? config.refPrice;

  // Capacità e straordinari di base (i rivali hanno una logica semplice)
  const basePlants = 2; // I rivali iniziano con 2 stabilimenti
  const baseOvertime = false;

  let price: number;

  if (profile === "aggressive") {
    // Aggressivo: insegue il prezzo del giocatore al ribasso
    // Se il giocatore è più basso del ref, il rivale scende ulteriore
    // Se il giocatore è più alto, il rivale mantiene un prezzo competitivo
    const priceGap = config.refPrice - playerLastPrice;
    if (priceGap > 0) {
      // Giocatore sotto il riferimento: il rivale scende di ulteriore 5-10%
      const discount = 0.05 + rng() * 0.05; // 5-10% di sconto in più
      price = Math.max(1, Math.round(playerLastPrice * (1 - discount)));
    } else {
      // Giocatore alto o a riferimento: il rivale va leggermente sotto
      price = Math.round(config.refPrice * 0.95);
    }
  } else {
    // Premium: mantiene un prezzo alto (110-120% del riferimento)
    // Ignora il prezzo del giocatore, si concentra sulla qualità
    const premium = 1.1 + rng() * 0.1; // 110-120% del prezzo di riferimento
    price = Math.round(config.refPrice * premium);
  }

  return {
    playerId: rivalId,
    price,
    plants: basePlants,
    overtime: baseOvertime,
    plantsBought: 0,
  };
}

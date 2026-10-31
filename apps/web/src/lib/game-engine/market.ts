/**
 * Condizioni di mercato: rumore ed eventi discreti, riproducibili tramite seed.
 *
 * Contratto congelato in docs/05-decisioni/ADR-0006-*.md: senza seed il motore si comporta
 * bit-per-bit come la v0.1.
 */
import type { EngineConfig, MarketConditions, MarketEventDef } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * PRNG deterministico seedato (mulberry32). Stesso seed ⇒ stessa sequenza,
 * indipendente dalla piattaforma. Usato SOLO nei branch con seed esplicito.
 *
 * Esportato perché serve anche ad altri moduli che devono essere casuali ma riproducibili
 * (es. comportamento dei rivali): due sorgenti di casualità diverse renderebbero il gioco
 * non più replicabile a parità di seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Risolve le condizioni di mercato (rumore + eventuale evento discreto) per un
 * dato seed, in modo deterministico e riproducibile. Esposta separatamente da
 * `simulateQuarter` così il frontend può richiamarla autonomamente (stesso
 * seed del turno) per mostrare a posteriori quale evento si è verificato,
 * senza dover rieseguire l'intera simulazione.
 */
export function resolveMarketConditions(
  seed: number,
  config: EngineConfig = DEFAULT_CONFIG,
): MarketConditions {
  const rng = mulberry32(seed);

  // 1) Rumore ±demandNoisePct sulla domanda totale.
  const noiseRoll = rng(); // [0, 1)
  const noise = 1 + (noiseRoll * 2 - 1) * config.demandNoisePct;

  // 2) Evento discreto: si estrae un secondo numero e si percorre il mazzo
  //    per probabilità cumulata; se non si rientra in nessun bucket, nessun evento.
  const eventRoll = rng();
  let cumulative = 0;
  let chosen: MarketEventDef | null = null;
  for (const ev of config.marketEvents) {
    cumulative += ev.probability;
    if (eventRoll < cumulative) {
      chosen = ev;
      break;
    }
  }

  const eventMultiplier = chosen ? chosen.demandMultiplier : 1;

  return {
    demandMultiplier: noise * eventMultiplier,
    eventId: chosen ? chosen.id : null,
    eventLabel: chosen ? chosen.label : null,
  };
}

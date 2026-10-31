/**
 * Game Engine v0.2 — Business Game · punto d'ingresso unico.
 *
 * Il motore è diviso in moduli a responsabilità singola. Questo file NON contiene logica:
 * ri-esporta soltanto, così `import { simulateQuarter } from "@/lib/game-engine"` continua
 * a funzionare esattamente come prima della suddivisione.
 *
 *   types.ts     tipi e configurazione condivisi (il contratto)
 *   market.ts    rumore ed eventi di mercato riproducibili via seed
 *   simulate.ts  simulazione del trimestre + classifica
 *   kpis.ts      indicatori di controllo di gestione
 *
 * Perché diviso: una sola leva per file permette a più agenti di lavorare in parallelo su
 * leve diverse senza scontrarsi sullo stesso file. Aggiungendo una leva nuova (cassa,
 * rivali, distribuzione…) si crea un modulo nuovo e lo si ri-esporta qui.
 *
 * Storia delle versioni:
 *  - v0.1  leve prezzo e produzione.
 *  - v0.2  (Sprint 3) elasticità asimmetrica (fix T-004) + rumore/eventi con seed. Senza
 *          seed il comportamento resta identico bit-per-bit alla v0.1 — vedi ADR-0006.
 */

export type {
  EngineConfig,
  LostSalesCause,
  MarketConditions,
  MarketEventDef,
  PlayerDecision,
  PlayerResult,
} from "./types";
export { DEFAULT_CONFIG } from "./types";

export { mulberry32, resolveMarketConditions } from "./market";

export { rankByProfit, simulateQuarter } from "./simulate";
export type { MaterialOrderOptions } from "./simulate";

export type { ControllingKPI } from "./kpis";
export { calculateControllingKPI } from "./kpis";

export * from "./rivals";

export * from "./cash";

export { HOLDING_COST_PER_UNIT_PER_QUARTER } from "./inventory";

export * from "./supply";

export * from "./marketing";

export * from "./setup";
export * from "./product-quality";
export * from "./quality";
export * from "./workforce";

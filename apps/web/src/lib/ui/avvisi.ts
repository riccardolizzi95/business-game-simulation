/**
 * Avvisi PRIMA di chiudere il trimestre (S18-2).
 *
 * Nasce da una prova: giocando si può chiudere un trimestre senza decidere nulla, perdere 1.370
 * vendite, e scoprirlo solo dopo. Questi controlli lo dicono prima.
 *
 * Principio: **si avverte, non si impedisce**. Il gioco deve poter essere giocato male — è così
 * che si impara. Il livello `conferma` chiede solo un secondo tocco, non blocca.
 *
 * I numeri vengono tutti dal motore (`est` è una simulazione a mercato neutro): qui non si
 * ricalcola nessuna formula di dominio.
 */
import type { PlayerResult } from "@/lib/game-engine";
import { eur, num } from "./format";

/** Quanto è insistente un avviso. */
export type LivelloAvviso = "nota" | "avviso" | "conferma";

export interface Avviso {
  id: string;
  livello: LivelloAvviso;
  testo: string;
}

export interface StatoPerAvvisi {
  /** Stima del trimestre a mercato neutro, calcolata dal motore. */
  est: PlayerResult;
  /** Unità che si è deciso di produrre. */
  productionQty: number;
  /** Capacità produttiva del trimestre. */
  capacity: number;
  /** Materie prime disponibili subito in magazzino. */
  rawStock: number;
  /** Materie prime già ordinate per questo trimestre (in qualunque momento arrivino). */
  ordinato: number;
  /** Scorte di prodotto finito con cui si parte. */
  scorteIniziali: number;
  /** Cassa attuale. */
  cash: number;
  /** Budget marketing deciso. */
  marketingBudget: number;
  /** Prezzo deciso e costo unitario, per il controllo sul margine. */
  price: number;
  unitCost: number;
  /** Qualità del prodotto e riferimento di mercato. */
  qualityIndex: number;
  qualityRef: number;
}

/**
 * Controlli sul trimestre che sta per essere chiuso, dal più grave al meno.
 * Restituisce una lista vuota se non c'è niente da segnalare.
 */
export function avvisiPreChiusura(s: StatoPerAvvisi): Avviso[] {
  const out: Avviso[] = [];
  const disponibiliAllaVendita = s.scorteIniziali + Math.min(s.productionQty, s.capacity);

  // 1. Materie prime: il vincolo più insidioso, perché blocca la produzione in silenzio.
  if (s.productionQty > s.rawStock) {
    const mancanti = s.productionQty - s.rawStock;
    out.push({
      id: "materie-prime",
      livello: s.ordinato > 0 ? "nota" : "avviso",
      testo:
        `Vuoi produrre ${num(s.productionQty)} unità ma in magazzino hai materiale per ` +
        `${num(s.rawStock)}: ne mancano ${num(mancanti)}.` +
        (s.ordinato > 0
          ? ` Hai ordinato ${num(s.ordinato)} unità: se non arrivano in tempo, non si produrranno.`
          : ` Senza un ordine che arrivi subito, quelle unità non si faranno.`),
    });
  }

  // 2. Produzione sotto la domanda: vendite perse che si potevano evitare.
  if (disponibiliAllaVendita < s.est.demandUnits * 0.95) {
    const perse = Math.round(s.est.demandUnits - disponibiliAllaVendita);
    out.push({
      id: "produzione-bassa",
      livello: "avviso",
      testo:
        `La domanda stimata è ${num(Math.round(s.est.demandUnits))} unità ma ne avrai ` +
        `${num(disponibiliAllaVendita)} da vendere: circa ${num(perse)} vendite perse.`,
    });
  }

  // 3. Cassa sotto zero: si può fare, ma bisogna saperlo.
  const cassaPrevista = s.cash + s.est.profit;
  if (cassaPrevista < 0) {
    out.push({
      id: "cassa-negativa",
      livello: "conferma",
      testo:
        `Chiudendo così la cassa andrebbe a ${eur(cassaPrevista)}, cioè in scoperto. ` +
        `Puoi farlo, ma conviene rivedere prezzo, produzione o ordini.`,
    });
  } else if (cassaPrevista < s.cash * 0.15) {
    out.push({
      id: "cassa-sottile",
      livello: "nota",
      testo: `Resteresti con ${eur(cassaPrevista)} in cassa: poco margine per un imprevisto.`,
    });
  }

  // 4. Prezzo sotto il costo: si vende in perdita.
  if (s.price < s.unitCost) {
    out.push({
      id: "prezzo-sottocosto",
      livello: "conferma",
      testo:
        `Vendi a ${eur(s.price)} ma ogni unità te ne costa ${eur(s.unitCost)}: ` +
        `più vendi, più perdi.`,
    });
  } else if (s.price < s.unitCost * 1.1) {
    out.push({
      id: "margine-sottile",
      livello: "nota",
      testo: `A ${eur(s.price)} il margine unitario è di appena ${eur(s.price - s.unitCost)}.`,
    });
  }

  // 5. Prezzo alto senza qualità che lo giustifichi.
  if (s.price > s.unitCost * 2.2 && s.qualityIndex <= s.qualityRef) {
    out.push({
      id: "premium-senza-qualita",
      livello: "nota",
      testo:
        `Chiedi ${eur(s.price)} con una qualità di ${s.qualityIndex.toFixed(1)}, non superiore ` +
        `alla media di mercato (${s.qualityRef.toFixed(1)}): il mercato potrebbe non seguirti.`,
    });
  }

  // 6. Capacità inutilizzata: stabilimenti pagati e fermi.
  if (s.capacity > 0 && s.productionQty < s.capacity * 0.4 && s.est.demandUnits > s.productionQty) {
    out.push({
      id: "capacita-ferma",
      livello: "nota",
      testo:
        `Usi ${Math.round((s.productionQty / s.capacity) * 100)}% della capacità, ma i costi ` +
        `fissi degli stabilimenti li paghi tutti.`,
    });
  }

  return out;
}

/** Il livello più grave fra gli avvisi: serve a decidere se chiedere conferma. */
export function livelloPiuGrave(avvisi: Avviso[]): LivelloAvviso | null {
  if (avvisi.some((a) => a.livello === "conferma")) return "conferma";
  if (avvisi.some((a) => a.livello === "avviso")) return "avviso";
  if (avvisi.length > 0) return "nota";
  return null;
}

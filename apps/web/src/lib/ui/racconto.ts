/**
 * Il racconto dell'esito del trimestre (S18-2).
 *
 * Oggi dopo la chiusura si vede una tabella a quattro colonne: dice COSA è successo, mai PERCHÉ.
 * Qui si generano tre o quattro frasi che spiegano il trimestre, tutte ricavate da dati che il
 * motore già espone — in particolare `lostSalesCause`, che sa perché non hai venduto.
 */
import type { PlayerResult } from "@/lib/game-engine";
import { eur, num } from "./format";

export interface Frase {
  /** Tono della frase, per decidere il colore. */
  tono: "bene" | "male" | "neutro";
  testo: string;
}

export interface ContestoRacconto {
  /** Il tuo risultato del trimestre appena chiuso. */
  you: PlayerResult;
  /** I risultati di tutti, per il confronto. */
  tutti: PlayerResult[];
  /** Variazione di cassa del trimestre, se disponibile. */
  variazioneCassa?: number;
  /** Nome dei giocatori, per citare i rivali. */
  nomi: Record<string, string>;
  /** Etichetta dell'evento di mercato, se c'è stato. */
  eventoMercato?: string | null;
  /** Scostamento della domanda dovuto all'evento (es. +0,19 per +19%). */
  scostamentoDomanda?: number;
}

/** Genera il racconto del trimestre: dalla cosa più importante alla meno. */
export function raccontaTrimestre(c: ContestoRacconto): Frase[] {
  const { you, tutti } = c;
  const frasi: Frase[] = [];
  const rivali = tutti.filter((r) => r.playerId !== you.playerId);

  // 1. Come è andata in assoluto: il risultato.
  const migliore = [...tutti].sort((a, b) => b.profit - a.profit)[0];
  const seiPrimo = migliore.playerId === you.playerId;
  frasi.push({
    tono: you.profit >= 0 ? "bene" : "male",
    testo:
      you.profit >= 0
        ? `Hai chiuso il trimestre con ${eur(you.profit)} di utile` +
          (seiPrimo
            ? `, il migliore del mercato.`
            : `, dietro a ${c.nomi[migliore.playerId] ?? migliore.playerId} che ha fatto ${eur(migliore.profit)}.`)
        : `Il trimestre chiude in perdita di ${eur(Math.abs(you.profit))}.`,
  });

  // 2. Le vendite perse, con la CAUSA: è l'informazione che cambia la prossima decisione.
  if (you.lostSales > 0) {
    const spiegazione: Record<string, string> = {
      capacity: `la capacità produttiva non bastava`,
      materials: `sono finite le materie prime`,
      production: `avevi deciso di produrre troppo poco`,
      scrap: `troppi pezzi sono usciti difettosi`,
    };
    const causa = spiegazione[you.lostSalesCause ?? "capacity"];
    frasi.push({
      tono: "male",
      testo: `Hai perso ${num(you.lostSales)} vendite perché ${causa}: erano ${eur(you.lostSales * you.price)} di ricavi mancati.`,
    });
  } else if (you.closingInventory > 0) {
    frasi.push({
      tono: "neutro",
      testo:
        `Hai venduto tutto quello che il mercato ti chiedeva e ti restano ` +
        `${num(you.closingInventory)} unità a magazzino, pronte per il prossimo trimestre.`,
    });
  }

  // 3. Utile contro cassa: la lezione che il gioco vuole trasmettere.
  //    Le ragioni si elencano per quello che sono, senza indovinare: l'ammortamento non si paga,
  //    gli investimenti si pagano ma non sono costi, e i fornitori si pagano alla loro scadenza.
  if (c.variazioneCassa !== undefined && Math.abs(c.variazioneCassa - you.profit) > 1) {
    const piuCassa = c.variazioneCassa > you.profit;
    const motivi: string[] = [];
    if (you.depreciation > 0) motivi.push(`l'ammortamento (${eur(you.depreciation)}) è un costo che non paghi`);
    if (you.capex > 0) motivi.push(`l'acquisto di stabilimenti (${eur(you.capex)}) è un'uscita che non è un costo`);
    motivi.push("e il materiale si paga quando scade la fattura, non quando lo consumi");
    frasi.push({
      tono: "neutro",
      testo:
        `Utile e soldi non coincidono: il risultato è ${eur(you.profit)} ma la cassa è cambiata di ` +
        `${eur(c.variazioneCassa)}, ${piuCassa ? "in meglio" : "in peggio"}. ` +
        `Succede perché ${motivi.join(", ")}.`,
    });
  }

  // 4. Il confronto che spiega la quota: prezzo e qualità contro i rivali.
  if (rivali.length > 0) {
    const piuEconomico = [...tutti].sort((a, b) => a.price - b.price)[0];
    const miglioreQualita = [...tutti].sort((a, b) => b.qualityIndex - a.qualityIndex)[0];
    if (miglioreQualita.playerId === you.playerId && you.qualityIndex > rivali[0].qualityIndex) {
      frasi.push({
        tono: "bene",
        testo: `Il tuo prodotto è il migliore sul mercato (qualità ${you.qualityIndex.toFixed(1)}): è un vantaggio che attira domanda a parità di prezzo.`,
      });
    } else if (piuEconomico.playerId !== you.playerId && you.unitsSold < Math.max(...rivali.map((r) => r.unitsSold))) {
      const piuVenduto = [...tutti].sort((a, b) => b.unitsSold - a.unitsSold)[0];
      frasi.push({
        tono: "neutro",
        testo:
          `${c.nomi[piuVenduto.playerId] ?? piuVenduto.playerId} ha venduto più di te ` +
          `(${num(piuVenduto.unitsSold)} contro ${num(you.unitsSold)}) a ${eur(piuVenduto.price)}: ` +
          `sul prezzo o sulla qualità ti sta battendo.`,
      });
    }
  }

  // 5. L'evento di mercato, se ha spostato qualcosa: va detto perché non è colpa tua.
  if (c.eventoMercato && c.scostamentoDomanda !== undefined && Math.abs(c.scostamentoDomanda) >= 0.05) {
    const pct = Math.round(c.scostamentoDomanda * 100);
    frasi.push({
      tono: pct > 0 ? "bene" : "male",
      testo: `Sul trimestre ha pesato un evento di mercato — ${c.eventoMercato} — con la domanda ${pct > 0 ? "più alta" : "più bassa"} del ${Math.abs(pct)}%.`,
    });
  }

  return frasi.slice(0, 4);
}

/** Il consiglio per il prossimo trimestre: una cosa sola, quella che pesa di più. */
export function consiglioProssimoTrimestre(c: ContestoRacconto): string | null {
  const { you } = c;
  if (you.lostSales > 0) {
    const consigli: Record<string, string> = {
      capacity: "Con la domanda che hai, la capacità è il collo di bottiglia: valuta uno stabilimento in più o gli straordinari.",
      materials: "Ordina le materie prime con anticipo: se arrivano tardi la produzione si ferma anche con gli impianti liberi.",
      production: "Alza la produzione: capacità e materiali te lo permettevano, hai solo deciso troppo poco.",
      scrap: "Materiali migliori o meno straordinari ridurrebbero i pezzi difettosi.",
    };
    return consigli[you.lostSalesCause ?? "capacity"] ?? null;
  }
  if (you.profit < 0) {
    return "Con questi costi il prezzo non regge: o alzi il prezzo, o vendi di più per spalmare i costi fissi.";
  }
  if (you.closingInventory > you.unitsSold * 0.3) {
    return "Hai molto invenduto a magazzino: costa giacenza ogni trimestre. Valuta di produrre meno o di abbassare il prezzo.";
  }
  return null;
}

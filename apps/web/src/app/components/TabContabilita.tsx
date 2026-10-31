"use client";

import { type PlayerResult } from "@/lib/game-engine";
import type { CashFlow, PayableDue } from "@/lib/game-engine/cash";
import { eur, num } from "@/lib/ui/format";

type Props = {
  /** Risultato dell'ultimo trimestre chiuso. */
  you: PlayerResult | undefined;
  /** Come si è mossa la cassa nell'ultimo trimestre. */
  cashFlow: CashFlow | undefined;
  /** Cassa attuale. */
  cash: number;
  /** Debito verso fornitori ancora aperto. */
  debitiFornitori: number;
  /** Scadenzario dei debiti aperti. */
  scadenzario: PayableDue[];
  /** Trimestre corrente (quello chiuso è il precedente). */
  quarter: number;
};

/** Riga di prospetto: etichetta a sinistra, importo a destra. */
function Riga({ voce, importo, negativo = false, totale = false }: {
  voce: string; importo: number; negativo?: boolean; totale?: boolean;
}) {
  return (
    <div className="summary-row" style={totale ? { fontWeight: 700 } : undefined}>
      <span>{voce}</span>
      <b className={totale ? (importo >= 0 ? "pos" : "neg") : undefined}>
        {negativo && importo !== 0 ? "−" : ""}{eur(Math.abs(importo))}
      </b>
    </div>
  );
}

/**
 * Tab "Conti": cosa è successo alla contabilità nell'ultimo trimestre.
 *
 * Il pezzo che conta è la riconciliazione **da utile a cassa**: risponde alla domanda «ho fatto
 * utile, perché ho meno soldi?», che è esattamente la confusione da cui è nata questa sezione.
 */
export default function TabContabilita({
  you, cashFlow, cash, debitiFornitori, scadenzario, quarter,
}: Props) {
  if (!you) {
    return (
      <section className="card">
        <h2>Conti</h2>
        <p className="hint">Chiudi il primo trimestre per vedere com&apos;è andata la contabilità.</p>
      </section>
    );
  }

  const trimestreChiuso = quarter - 1;
  const acquistoMaterie = you.rawMaterialPurchaseCost ?? 0;

  return (
    <>
      <section className="card">
        <h2>Conto economico — trimestre {trimestreChiuso}</h2>
        <Riga voce="Ricavi di vendita" importo={you.revenue} />
        <Riga voce="Costo del venduto" importo={you.costOfGoodsSold} negativo />
        <Riga voce="Costi fissi e overhead" importo={you.fixedCost} negativo />
        <Riga voce="Ammortamento stabilimenti" importo={you.depreciation} negativo />
        {you.marketingCost > 0 && <Riga voce="Marketing" importo={you.marketingCost} negativo />}
        {you.holdingCost > 0 && <Riga voce="Costo di giacenza" importo={you.holdingCost} negativo />}
        <Riga voce="Risultato del trimestre" importo={you.profit} totale />
        <p className="hint">
          Quanto hai <b>guadagnato</b>. Il <b>costo del venduto</b> è quanto sono costate le unità
          che hai effettivamente venduto: la merce prodotta e rimasta in magazzino non pesa qui,
          resta un valore ({eur(you.finishedGoodsValue)}) e diventerà costo quando la venderai.
          {you.capex > 0 && ` L'acquisto di stabilimenti (${eur(you.capex)}) non è un costo: esce dalla cassa e si spalma sull'ammortamento.`}
        </p>
      </section>

      {cashFlow && (
        <>
          <section className="card">
            <h2>Flusso di cassa — trimestre {trimestreChiuso}</h2>
            <Riga voce="Incassi dalle vendite" importo={cashFlow.cashInSales} />
            <Riga voce="Pagamenti a fornitori (scaduti)" importo={cashFlow.cashOutSuppliers} negativo />
            <Riga voce="Altre uscite del trimestre" importo={cashFlow.cashOutOther} negativo />
            <Riga voce="Variazione di cassa" importo={cashFlow.netCashFlow} totale />
            <div className="summary-row">
              <span>Cassa a fine trimestre</span>
              <b className={cash >= 0 ? "pos" : "neg"}>{eur(cash)}</b>
            </div>
          </section>

          <section className="card">
            <h2>Da utile a cassa</h2>
            <p className="hint">
              Perché il risultato e i soldi in banca non coincidono.
            </p>
            <Riga voce="Risultato del trimestre" importo={you.profit} />
            {acquistoMaterie > 0 && (
              <Riga voce="+ Materie prime messe a costo ma non ancora pagate" importo={acquistoMaterie} />
            )}
            {cashFlow.cashOutSuppliers > 0 && (
              <Riga voce="− Pagamenti a fornitori scaduti ora" importo={cashFlow.cashOutSuppliers} negativo />
            )}
            <Riga voce="= Variazione di cassa" importo={cashFlow.netCashFlow} totale />
            <p className="hint">
              È la differenza fra <b>competenza</b> (quando il costo matura) e <b>cassa</b> (quando
              esci i soldi). Dilazionando i pagamenti tieni la liquidità più a lungo, ma il costo
              resta a carico del trimestre in cui hai ordinato.
            </p>
          </section>
        </>
      )}

      <section className="card">
        <h2>Debiti verso fornitori</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-k">Ancora da pagare</div>
            <div className="stat-v">{eur(debitiFornitori)}</div>
          </div>
          <div className="stat">
            <div className="stat-k">Scadenze aperte</div>
            <div className="stat-v">{num(scadenzario.length)}</div>
          </div>
        </div>
        {scadenzario.length > 0 ? (
          <table>
            <thead><tr><th>Scade in</th><th>Importo</th></tr></thead>
            <tbody>
              {scadenzario.map((p, i) => (
                <tr key={`${p.quarter}-${i}`}>
                  <td>T{p.quarter}</td>
                  <td>{eur(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="hint">Nessun debito aperto: stai pagando tutto alla consegna o in anticipo.</p>
        )}
      </section>

      <section className="card">
        <h2>Cosa non è ancora nei conti</h2>
        <p className="hint">
          Per onestà verso chi legge questi numeri: <b>si incassa sempre subito</b> dalle vendite
          (non esistono termini verso i clienti), lo <b>scoperto di cassa non costa interessi</b> e
          non c&apos;è un fido, e non esiste un vero stato patrimoniale. Sono i passi successivi
          già pianificati.
        </p>
      </section>
    </>
  );
}

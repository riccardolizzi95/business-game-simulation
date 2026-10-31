"use client";

import { useState } from "react";
import { type PlayerResult, type MarketConditions } from "@/lib/game-engine";
import type { CashFlow, PayableDue } from "@/lib/game-engine/cash";
import { eur, num } from "@/lib/ui/format";
import { raccontaTrimestre, consiglioProssimoTrimestre } from "@/lib/ui/racconto";
import TabContabilita from "./TabContabilita";

type Props = {
  you: PlayerResult | undefined;
  lastResults: PlayerResult[] | null;
  players: { id: string; name: string }[];
  marketConditions: MarketConditions | null;
  cashFlow: CashFlow | undefined;
  cash: number;
  variazioneCassa: number | undefined;
  debitiFornitori: number;
  scadenzario: PayableDue[];
  quarter: number;
  gameOver: boolean;
};

/**
 * Tab "Risultati": cosa è successo nel trimestre appena chiuso, e perché.
 *
 * Sostituisce i tre tab separati Mercato, Conti e Simula. Il racconto viene prima dei numeri:
 * giocando, la tabella a quattro colonne diceva COSA era successo ma mai PERCHÉ.
 */
export default function TabRisultati({
  you, lastResults, players, marketConditions, cashFlow, cash, variazioneCassa,
  debitiFornitori, scadenzario, quarter, gameOver,
}: Props) {
  const [contiAperti, setContiAperti] = useState(false);
  const [dettaglioAperto, setDettaglioAperto] = useState(false);

  if (!you || !lastResults) {
    return (
      <section className="card">
        <h2>Risultati</h2>
        <p className="hint">
          Chiudi il primo trimestre per vedere com&apos;è andata: qui trovi il racconto di cosa è
          successo, il confronto coi rivali e i conti.
        </p>
      </section>
    );
  }

  const nomi = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const frasi = raccontaTrimestre({
    you, tutti: lastResults, nomi, variazioneCassa,
    eventoMercato: marketConditions?.eventLabel,
    scostamentoDomanda: marketConditions ? marketConditions.demandMultiplier - 1 : undefined,
  });
  const consiglio = consiglioProssimoTrimestre({ you, tutti: lastResults, nomi, variazioneCassa });

  return (
    <>
      <section className="card">
        <h2>{gameOver ? "Ultimo trimestre" : `Com'è andato il trimestre ${quarter - 1}`}</h2>
        {frasi.map((f, i) => (
          <p key={i} className="frase" data-tono={f.tono}>{f.testo}</p>
        ))}
        {consiglio && (
          <p className="hint consiglio">💡 <b>Per il prossimo trimestre:</b> {consiglio}</p>
        )}
        <style jsx>{`
          .frase {
            margin: 0 0 10px;
            padding-left: 10px;
            border-left: 3px solid var(--border);
            line-height: 1.45;
          }
          .frase[data-tono="bene"] { border-left-color: var(--accent-2); }
          .frase[data-tono="male"] { border-left-color: var(--danger); }
          .consiglio { margin-top: 12px; }
        `}</style>
      </section>

      <section className="card">
        <h2>Il mercato</h2>
        <table>
          <thead>
            <tr><th>Azienda</th><th>Prezzo</th><th>Qualità</th><th>Vendite</th><th>Profitto</th></tr>
          </thead>
          <tbody>
            {lastResults.map((r) => (
              <tr key={r.playerId} className={r.playerId === "tu" ? "you" : ""}>
                <td>{nomi[r.playerId] ?? r.playerId}</td>
                <td>{eur(r.price)}</td>
                <td>{r.qualityIndex.toFixed(1)}</td>
                <td>{num(r.unitsSold)}</td>
                <td className={r.profit >= 0 ? "pos" : "neg"}>{eur(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {marketConditions?.eventLabel && (
          <p className="hint">
            Evento del trimestre: <b>{marketConditions.eventLabel}</b> · domanda di mercato{" "}
            {Math.round((marketConditions.demandMultiplier - 1) * 100) >= 0 ? "+" : ""}
            {Math.round((marketConditions.demandMultiplier - 1) * 100)}%.
          </p>
        )}
      </section>

      <section className="card">
        <button className="btn secondary" onClick={() => setDettaglioAperto((v) => !v)}>
          {dettaglioAperto ? "▾" : "▸"} Il tuo trimestre nel dettaglio
        </button>
        {dettaglioAperto && (
          <div className="stat-grid" style={{ marginTop: 12 }}>
            <div className="stat"><div className="stat-k">Domanda attratta</div><div className="stat-v">{num(you.demandUnits)}</div></div>
            <div className="stat"><div className="stat-k">Vendite</div><div className="stat-v">{num(you.unitsSold)}</div></div>
            <div className="stat"><div className="stat-k">Prodotto</div><div className="stat-v">{num(you.productionQty)}</div></div>
            <div className="stat"><div className="stat-k">Scorte finali</div><div className="stat-v">{num(you.closingInventory)}</div></div>
            <div className="stat"><div className="stat-k">Vendite perse</div><div className="stat-v">{num(you.lostSales)}</div></div>
            <div className="stat"><div className="stat-k">Qualità</div><div className="stat-v">{you.qualityIndex.toFixed(1)}</div></div>
          </div>
        )}
      </section>

      <section className="card">
        <button className="btn secondary" onClick={() => setContiAperti((v) => !v)}>
          {contiAperti ? "▾" : "▸"} I conti del trimestre
        </button>
        {!contiAperti && (
          <p className="hint">
            Conto economico, flusso di cassa e la riconciliazione fra utile e soldi in banca.
          </p>
        )}
      </section>

      {contiAperti && (
        <TabContabilita
          you={you}
          cashFlow={cashFlow}
          cash={cash}
          debitiFornitori={debitiFornitori}
          scadenzario={scadenzario}
          quarter={quarter}
        />
      )}
    </>
  );
}

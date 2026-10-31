"use client";

import { useState } from "react";
import { type PlayerResult } from "@/lib/game-engine";
import { eur, num } from "@/lib/ui/format";
import CampoNumerico from "./CampoNumerico";

type Props = {
  price: number;
  onPriceChange: (value: number) => void;
  priceMin: number;
  priceMax: number;
  unitCost: number;
  estProfit: number;
  margin: number;
  noisePct: number;
  rivalAlfaPrice: number;
  rivalBetaPrice: number;
  /** Prezzi da confrontare nella tabella di sensitività (era il tab «Simula»). */
  sensiPrices: number[];
  /** Simulazione a mercato neutro per un prezzo dato: la calcola il motore. */
  simulateFor: (price: number) => PlayerResult;
  /** Unità da vendere per andare in pari. */
  breakEven: number;
};

/** Sezione "Commerciale" del tab Decisioni: prezzo di vendita e stima rapida. */
export default function SezioneCommerciale({
  price,
  onPriceChange,
  priceMin,
  priceMax,
  unitCost,
  estProfit,
  margin,
  noisePct,
  rivalAlfaPrice,
  rivalBetaPrice,
  sensiPrices,
  simulateFor,
  breakEven,
}: Props) {
  const [confrontoAperto, setConfrontoAperto] = useState(false);

  return (
    <>
      <section className={`card price-card ${estProfit >= 0 ? "profit-pos" : "profit-neg"}`}>
        <h2>Decisione — Prezzo di vendita</h2>
        <CampoNumerico
          etichetta="Prezzo di vendita"
          valore={price}
          onChange={onPriceChange}
          min={priceMin}
          max={priceMax}
          unita="€ / unità"
          etichettaMin={`${eur(priceMin)} (aggressivo)`}
          etichettaMax={`${eur(priceMax)} (premium)`}
          scorciatoie={[
            { etichetta: "Come Alfa", valore: rivalAlfaPrice },
            { etichetta: "Come Beta", valore: rivalBetaPrice },
            { etichetta: "Pareggio", valore: Math.ceil(unitCost * 1.2) },
          ]}
          ariaLabel="Prezzo di vendita"
        />
        <p className="hint">Costo unitario {eur(unitCost)}. Prezzo basso = più domanda ma margine risicato.</p>
      </section>

      <section className="card">
        <h2>Stima rapida (mercato neutro)</h2>
        <div className="est-profit-box">
          <span>Profitto stimato / trim.</span>
          <b key={estProfit} className={`pop ${estProfit >= 0 ? "pos" : "neg"}`}>{eur(estProfit)}</b>
        </div>
        <p className="hint">
          Margine {margin.toFixed(1)}% · stima a mercato neutro: il reale può variare di ±{noisePct}%
          per rumore ed eventi di mercato.
        </p>
        <div className="competitors">
          <div className="chip"><div className="name">Rivale Alfa</div><div className="val">{eur(rivalAlfaPrice)}</div></div>
          <div className="chip"><div className="name">Rivale Beta</div><div className="val">{eur(rivalBetaPrice)}</div></div>
        </div>
        <p className="hint">
          Vai in pari a {breakEven === Infinity ? "—" : `${num(breakEven)} unità`} vendute.
        </p>
        <button className="btn secondary" onClick={() => setConfrontoAperto((v) => !v)}>
          {confrontoAperto ? "▾" : "▸"} Confronta prezzi diversi
        </button>
        {confrontoAperto && (
          <table>
            <thead><tr><th>Prezzo</th><th>Vendite</th><th>Profitto</th></tr></thead>
            <tbody>
              {sensiPrices.map((p) => {
                const r = simulateFor(p);
                return (
                  <tr key={p} className={p === price ? "you" : ""}>
                    <td>{eur(p)}</td>
                    <td>{num(r.unitsSold)}</td>
                    <td className={r.profit >= 0 ? "pos" : "neg"}>{eur(r.profit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

"use client";

import { eur } from "@/lib/ui/format";

type Riga = { id: string; name: string; profit: number };

type Props = {
  ranking: Riga[];
  gameOver: boolean;
  onRestart: () => void;
};

/** Tab "Classifica": profitto cumulato e, a fine partita, il vincitore. */
export default function TabClassifica({ ranking, gameOver, onRestart }: Props) {
  const winner = ranking[0];

  return (
    <>
      {gameOver && (
        <section className="winner-banner">
          <div className="trophy">{winner.id === "tu" ? "🏆" : "🤖"}</div>
          <div className="title">{winner.id === "tu" ? "Hai vinto!" : `Ha vinto ${winner.name}`}</div>
          <div className="cash-sub">Profitto cumulato: {eur(winner.profit)}</div>
        </section>
      )}
      <section className="card">
        <h2>Classifica (profitto cumulato)</h2>
        <table>
          <tbody>
            {ranking.map((p, i) => (
              <tr key={p.id} className={`${p.id === "tu" ? "you" : ""} rank-${i + 1}`}>
                <td>{i + 1}. {p.name}</td>
                <td className={p.profit >= 0 ? "pos" : "neg"}>{eur(p.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {gameOver && <button className="btn secondary" onClick={onRestart}>↺ Nuova partita</button>}
    </>
  );
}

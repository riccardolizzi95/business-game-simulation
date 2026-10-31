"use client";

import {
  HOLDING_COST_PER_UNIT_PER_QUARTER,
  type ControllingKPI,
  type PlayerResult,
} from "@/lib/game-engine";
import { eur, eurPrecise, num, pct, eurN } from "@/lib/ui/format";
import { getKpiStatus } from "@/lib/ui/kpi";
import type { Avviso } from "@/lib/ui/avvisi";

type Props = {
  cash: number;
  cumProfit: number;
  startCapital: number;
  capacity: number;
  plants: number;
  overtime: boolean;
  price: number;
  you: PlayerResult | undefined;
  kpis: ControllingKPI | null;
  gameOver: boolean;
  /** Indice di qualità del prodotto (0..10). */
  qualityIndex: number;
  /** Qualità della configurazione di partenza: sopra si attrae di più, sotto di meno. */
  qualityRef: number;
  /** Cose da sapere prima di chiudere il trimestre. */
  avvisi: Avviso[];
  /** Materie prime in magazzino. */
  scorteMaterie: number;
  onGoDecisioni: () => void;
  onGoClassifica: () => void;
};

/** Tab "Cruscotto": liquidità, stato azienda, magazzino e KPI di controlling. */
export default function TabCruscotto({
  cash,
  cumProfit,
  startCapital,
  capacity,
  plants,
  overtime,
  price,
  you,
  kpis,
  gameOver,
  qualityIndex,
  qualityRef,
  avvisi,
  scorteMaterie,
  onGoDecisioni,
  onGoClassifica,
}: Props) {
  const overdraft = cash < 0 ? -cash : 0;
  const statusEbitda = kpis ? getKpiStatus('ebitdaMargin', kpis.ebitdaMargin) : null;
  const statusContrib = kpis ? getKpiStatus('contributionMarginPerUnit', kpis.contributionMarginPerUnit) : null;
  const statusUtil = kpis ? getKpiStatus('capacityUtilization', kpis.capacityUtilization) : null;
  const statusLost = kpis ? getKpiStatus('lostSalesRatio', kpis.lostSalesRatio) : null;
  const statusAvgCost = kpis ? getKpiStatus('averageUnitCost', kpis.averageUnitCost) : null;
  const statusMarket = kpis ? getKpiStatus('marketShare', kpis.marketShare) : null;

  return (
    <>
      {!gameOver && avvisi.length > 0 && (
        <section className="card">
          <h2>Da sistemare</h2>
          {avvisi.slice(0, 3).map((a) => (
            <p key={a.id} className="avviso-breve" data-livello={a.livello}>{a.testo}</p>
          ))}
          <button className="btn" onClick={onGoDecisioni}>Vai a decidere ▸</button>
          <style jsx>{`
            .avviso-breve {
              margin: 0 0 8px;
              padding: 8px 10px;
              border-radius: 8px;
              font-size: 13px;
              line-height: 1.4;
              background: var(--bg-elev2);
              border-left: 3px solid var(--muted);
            }
            .avviso-breve[data-livello="avviso"] { border-left-color: var(--gold); }
            .avviso-breve[data-livello="conferma"] { border-left-color: var(--danger); }
          `}</style>
        </section>
      )}

      <section className="card">
        <h2>Liquidità</h2>
        <style jsx>{`
          .overdraft-badge {
            display: inline-block;
            margin-left: 0.5rem;
            padding: 0.125rem 0.375rem;
            background-color: #fee;
            color: #c00;
            border-radius: 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
          }
        `}</style>
        <div className={`cash ${cash >= 0 ? "positive" : "negative"}`}>
          {eur(cash)}
          {overdraft > 0 && <span className="overdraft-badge">Scoperto: {eur(overdraft)}</span>}
        </div>
        <div className="cash-sub">
          Profitto cumulato: <b>{eur(cumProfit)}</b> · capitale iniziale {eur(startCapital)}
        </div>
      </section>

      <section className="card">
        <h2>Stato azienda</h2>
        <div className="stat-grid">
          <div className="stat"><div className="stat-k">Capacità</div><div className="stat-v">{num(capacity)}</div></div>
          <div className="stat"><div className="stat-k">Stabilimenti</div><div className="stat-v">{plants}</div></div>
          <div className="stat"><div className="stat-k">Straordinari</div><div className="stat-v">{overtime ? "On" : "Off"}</div></div>
          <div className="stat"><div className="stat-k">Prezzo</div><div className="stat-v">{eur(price)}</div></div>
          <div className="stat">
            <div className="stat-k">Materie prime</div>
            <div className="stat-v">{num(scorteMaterie)}</div>
          </div>
          <div className="stat">
            <div className="stat-k">Qualità prodotto</div>
            <div className="stat-v">
              {qualityIndex.toFixed(1)}<small style={{ opacity: 0.6 }}>/10</small>
            </div>
          </div>
        </div>
        <p className="hint">
          Qualità di partenza del mercato: <b>{qualityRef.toFixed(1)}</b>. Sopra questo livello
          attrai più domanda a parità di prezzo, sotto ne attrai meno.
        </p>
        {you && (
          <p className="hint">
            Ultimo trimestre: {num(you.unitsSold)} vendite · profitto {eur(you.profit)}
            {you.lostSales > 0 ? ` · ⚠ ${num(you.lostSales)} vendite perse` : ""}.
          </p>
        )}
      </section>

      {/* Magazzino */}
      <section className="card">
        <h2>Magazzino</h2>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat-k">Scorte</div>
            <div className="stat-v">{you ? num(you.closingInventory) : "—"}</div>
          </div>
          <div className="stat">
            <div className="stat-k">Costo giacenza (ult. trimestre)</div>
            <div className="stat-v">{you ? eur(you.holdingCost) : "—"}</div>
          </div>
          <div className="stat">
            <div className="stat-k">Costo unitario di giacenza</div>
            {/* `eur` arrotonda agli interi e mostrerebbe 2,50 € come "3 €". */}
            <div className="stat-v">{eurPrecise(HOLDING_COST_PER_UNIT_PER_QUARTER)}/unità/trim.</div>
          </div>
        </div>
      </section>

      {kpis && (
        <section className="card">
          <h2>KPI Controlling</h2>
          <style jsx>{`
            .kpi-status {
              display: inline-flex;
              align-items: center;
              gap: 0.25rem;
              font-size: 0.75rem;
              font-weight: 500;
            }
            .kpi-status.good::before { content: "✅"; }
            .kpi-status.warning::before { content: "⚠️"; }
            .kpi-status.bad::before { content: "❌"; }
          `}</style>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-k">EBITDA Margin</div>
              <div className="stat-v">
                {pct(kpis.ebitdaMargin)}
                {statusEbitda && (
                  <span className={`kpi-status ${statusEbitda.class}`} aria-label={statusEbitda.label}>
                    {statusEbitda.label}
                  </span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Contributo/Unità</div>
              <div className="stat-v">
                {eurN(kpis.contributionMarginPerUnit)}
                {statusContrib && (
                  <span className={`kpi-status ${statusContrib.class}`} aria-label={statusContrib.label}>
                    {statusContrib.label}
                  </span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Utilizzo capacità</div>
              <div className="stat-v">
                {pct(kpis.capacityUtilization)}
                {statusUtil && (
                  <span className={`kpi-status ${statusUtil.class}`} aria-label={statusUtil.label}>
                    {statusUtil.label}
                  </span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Vendite perse</div>
              <div className="stat-v">
                {pct(kpis.lostSalesRatio)}
                {statusLost && (
                  <span className={`kpi-status ${statusLost.class}`} aria-label={statusLost.label}>
                    {statusLost.label}
                  </span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Costo medio unitario</div>
              <div className="stat-v">
                {eurN(kpis.averageUnitCost)}
                {statusAvgCost && (
                  <span className={`kpi-status ${statusAvgCost.class}`} aria-label={statusAvgCost.label}>
                    {statusAvgCost.label}
                  </span>
                )}
              </div>
            </div>
            <div className="stat">
              <div className="stat-k">Quota mercato</div>
              <div className="stat-v">
                {pct(kpis.marketShare)}
                {statusMarket && (
                  <span className={`kpi-status ${statusMarket.class}`} aria-label={statusMarket.label}>
                    {statusMarket.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {!gameOver ? (
        <button className="btn" onClick={onGoDecisioni}>Vai alle Decisioni ▸</button>
      ) : (
        <button className="btn" onClick={onGoClassifica}>Vedi la Classifica finale ▸</button>
      )}
    </>
  );
}

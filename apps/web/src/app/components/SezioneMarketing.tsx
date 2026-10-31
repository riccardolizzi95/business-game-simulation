"use client";

import {
  MAX_MARKETING_BUDGET,
  REF_BUDGET,
  splitBudget,
  campaignMultiplier,
  brandMultiplier,
} from "@/lib/game-engine";
import { eur } from "@/lib/ui/format";
import CampoNumerico from "./CampoNumerico";

type Props = {
  marketingBudget: number;
  onBudgetChange: (value: number) => void;
  campaignFocus: number;
  onCampaignFocusChange: (value: number) => void;
  brandEquity: number;
};

/** Sezione "Marketing" del tab Decisioni: budget del trimestre e divisione brand/campagne. */
export default function SezioneMarketing({
  marketingBudget,
  onBudgetChange,
  campaignFocus,
  onCampaignFocusChange,
  brandEquity,
}: Props) {
  // Effetti calcolati con le funzioni del motore: le formule non si riscrivono qui.
  const { awarenessInvestment, performanceInvestment } = splitBudget(marketingBudget, campaignFocus);
  const spintaCampagna = (campaignMultiplier(performanceInvestment) - 1) * 100;
  const spintaBrand = (brandMultiplier({ brandEquity }) - 1) * 100;

  return (
    <section className="card">
      <h2>Decisione — Marketing</h2>
      <CampoNumerico
        etichetta="Budget del trimestre"
        valore={marketingBudget}
        onChange={onBudgetChange}
        min={0}
        max={MAX_MARKETING_BUDGET}
        step={1_000}
        unita="€"
        etichettaMin="€0"
        etichettaMax={eur(MAX_MARKETING_BUDGET)}
        scorciatoie={[
          { etichetta: "Niente", valore: 0 },
          { etichetta: "Riferimento", valore: REF_BUDGET },
          { etichetta: "Il doppio", valore: REF_BUDGET * 2 },
        ]}
        ariaLabel="Budget marketing del trimestre"
      />

      <div className="prod-row">
        <div>
          <div className="prod-label">Come dividerlo</div>
          <div className="prod-value">
            {Math.round(campaignFocus * 100)}% brand · {Math.round((1 - campaignFocus) * 100)}% campagne
          </div>
        </div>
      </div>
      <input
        type="range" min={0} max={100} step={5}
        value={Math.round(campaignFocus * 100)}
        onChange={(e) => onCampaignFocusChange(Number(e.target.value) / 100)}
        aria-label="Quota del budget destinata al brand"
      />
      <div className="range-labels">
        <span>tutto campagne (subito)</span><span>tutto brand (dura)</span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-k">Spinta campagna (ora)</div>
          <div className="stat-v">+{spintaCampagna.toFixed(1)}%</div>
        </div>
        <div className="stat">
          <div className="stat-k">Spinta brand accumulato</div>
          <div className="stat-v">+{spintaBrand.toFixed(1)}%</div>
        </div>
      </div>
      <p className="hint">
        Il budget esce dalla cassa questo trimestre. {eur(performanceInvestment)} spingono
        la domanda <b>subito</b>, {eur(awarenessInvestment)} costruiscono un brand che
        resta e decade del 10% a trimestre se smetti di investirci.
      </p>
      <p className="hint">
        Rendimenti decrescenti: al budget di riferimento ({eur(REF_BUDGET)}) la campagna
        rende +15%, ma per raddoppiare quell&apos;effetto devi quadruplicare la spesa.
      </p>
    </section>
  );
}

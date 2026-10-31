"use client";

import {
  LEVEL_PARAMS,
  DEFAULT_MIX_PER_PLANT,
  calculateWorkforceCost,
  calculateWorkforceCapacity,
  type WorkforceLevel,
  type WorkforceMix,
  type LaborPoolState,
} from "@/lib/game-engine/workforce";
import { eur, num } from "@/lib/ui/format";

type Props = {
  /** Organico attuale per livello. */
  workforceMix: WorkforceMix;
  /** Callback quando l'organico cambia. */
  onWorkforceMixChange: (mix: WorkforceMix) => void;
  /** Stato del bacino di mercato (se abilitato). */
  laborPoolState?: LaborPoolState;
  /** Capacità produttiva degli impianti (unità/trimestre). */
  plantCapacity: number;
  /** Se true, mostra che il bacino è illimitato (config.enabled = false). */
  unlimitedPool?: boolean;
};

/**
 * Sezione "HR" del tab Decisioni: organico, assunzioni, bacino, capacità.
 *
 * ⚠️ NON È ANCORA COLLEGATA al gioco (S15-2, 2026-07-28): il componente è pronto e verificato,
 * ma accendere la leva dell'organico è una decisione di prodotto ancora aperta, perché
 *   1. il motore modella tempi di arrivo per livello e un'asta salariale sul bacino conteso,
 *      mentre qui le assunzioni sono immediate;
 *   2. con la leva attiva la capacità diventa min(impianti, forza lavoro) e il costo del
 *      personale entra nei costi fissi: cambia il bilanciamento, mai validato giocando;
 *   3. l'asta non ha senso finché i rivali non hanno una regola di assunzione
 *      (`generateRivalDecision` non produce decisioni di organico).
 * Si accende dopo il playtest e il ribilanciamento — vedi il task S16-2 sulla board.
 */
export default function SezioneHR({
  workforceMix,
  onWorkforceMixChange,
  laborPoolState,
  plantCapacity,
  unlimitedPool = false,
}: Props) {
  const levels: WorkforceLevel[] = ["junior", "skilled", "expert"];

  // Funzioni per modificare un livello
  const changeLevel = (level: WorkforceLevel, delta: number) => {
    const newMix = { ...workforceMix };
    const newValue = Math.max(0, newMix[level] + delta);
    newMix[level] = newValue;
    onWorkforceMixChange(newMix);
  };

  const resetToDefault = () => {
    onWorkforceMixChange({ ...DEFAULT_MIX_PER_PLANT });
  };

  // Calcoli derivati
  const totalWorkers = workforceMix.junior + workforceMix.skilled + workforceMix.expert;
  const workforceCapacity = calculateWorkforceCapacity(workforceMix);
  const workforceCost = calculateWorkforceCost(workforceMix);
  const limitingFactor = workforceCapacity < plantCapacity ? "forza lavoro" : "impianti";
  const capacityDifference = Math.abs(workforceCapacity - plantCapacity);

  // Disponibilità residua nel bacino
  const poolAvailable = (level: WorkforceLevel): number => {
    if (unlimitedPool) return Infinity;
    return laborPoolState?.levels[level]?.available ?? 0;
  };

  return (
    <section className="card">
      <h2>Decisione — Forza lavoro</h2>

      <div className="prod-row">
        <div>
          <div className="prod-label">Organico totale</div>
          <div className="prod-value">{num(totalWorkers)} addetti</div>
        </div>
        <button className="btn mini secondary" onClick={resetToDefault}>
          reset a default
        </button>
      </div>

      <div className="hr-levels">
        {levels.map((level) => {
          const params = LEVEL_PARAMS[level];
          const current = workforceMix[level];
          const available = poolAvailable(level);
          const canHire = unlimitedPool || current < available;
          return (
            <div key={level} className="hr-level">
              <div className="hr-level-header">
                <span className="hr-level-name">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                <span className="hr-level-count">{num(current)}</span>
              </div>
              <div className="hr-level-actions">
                <button
                  className="btn mini danger"
                  onClick={() => changeLevel(level, -1)}
                  disabled={current <= 0}
                >
                  –1 licenzia
                </button>
                <button
                  className="btn mini success"
                  onClick={() => changeLevel(level, +1)}
                  disabled={!unlimitedPool && current >= available}
                >
                  +1 assume
                </button>
              </div>
              <div className="hr-level-details">
                <div className="hr-detail">
                  <span className="hr-detail-label">Stipendio/trim:</span>
                  <span className="hr-detail-value">{eur(params.salary)}</span>
                </div>
                <div className="hr-detail">
                  <span className="hr-detail-label">Produttività:</span>
                  <span className="hr-detail-value">{num(params.productivity)} u/trim</span>
                </div>
                <div className="hr-detail">
                  <span className="hr-detail-label">Scarto:</span>
                  <span className="hr-detail-value">{(params.defectRate * 100).toFixed(1)}%</span>
                </div>
                <div className="hr-detail">
                  <span className="hr-detail-label">Costo assunzione:</span>
                  <span className="hr-detail-value">{eur(params.hiringCost)}</span>
                </div>
                <div className="hr-detail">
                  <span className="hr-detail-label">Tempo assunzione:</span>
                  <span className="hr-detail-value">{params.hiringQuarters} trim</span>
                </div>
                <div className="hr-detail">
                  <span className="hr-detail-label">Costo licenziamento:</span>
                  <span className="hr-detail-value">{eur(params.firingCost)}</span>
                </div>
                {!unlimitedPool && (
                  <div className="hr-detail">
                    <span className="hr-detail-label">Disponibili nel bacino:</span>
                    <span className="hr-detail-value">{num(available)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat">
          <div className="stat-k">Costo personale/trim</div>
          <div className="stat-v">{eur(workforceCost)}</div>
        </div>
        <div className="stat">
          <div className="stat-k">Capacità produttiva</div>
          <div className="stat-v">{num(workforceCapacity)} u/trim</div>
        </div>
        <div className="stat">
          <div className="stat-k">Capacità impianti</div>
          <div className="stat-v">{num(plantCapacity)} u/trim</div>
        </div>
        <div className="stat">
          <div className="stat-k">Limita</div>
          <div className="stat-v">{limitingFactor}</div>
        </div>
      </div>

      {capacityDifference > 0 && (
        <p className="hint">
          La capacità della {limitingFactor} è di {num(Math.min(workforceCapacity, plantCapacity))} unità.
          {workforceCapacity < plantCapacity
            ? ` La forza lavoro sta limitando di ${num(capacityDifference)} unità rispetto agli impianti.`
            : ` Gli impianti stanno limitando di ${num(capacityDifference)} unità rispetto alla forza lavoro.`}
        </p>
      )}

      {unlimitedPool ? (
        <p className="hint">Bacino di mercato illimitato: puoi assumere quanto vuoi senza competizione.</p>
      ) : (
        <p className="hint">
          Bacino di mercato finito: i lavoratori disponibili sono limitati e condivisi con i concorrenti.
          Le assunzioni sono possibili solo finché ci sono persone disponibili nel bacino.
        </p>
      )}

      <style jsx>{`
        .hr-levels {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 12px;
        }
        .hr-level {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          background: var(--bg-elev2);
        }
        .hr-level-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .hr-level-name {
          font-weight: 600;
          text-transform: capitalize;
        }
        .hr-level-count {
          font-size: 1.2em;
          font-weight: 700;
        }
        .hr-level-actions {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .hr-level-details {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 6px;
          font-size: 0.9em;
        }
        .hr-detail {
          display: flex;
          justify-content: space-between;
        }
        .hr-detail-label {
          color: var(--muted);
        }
        .hr-detail-value {
          font-weight: 500;
        }
      `}</style>
    </section>
  );
}

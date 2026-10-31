"use client";

import { HOLDING_COST_PER_UNIT_PER_QUARTER } from "@/lib/game-engine";
import { eur, num } from "@/lib/ui/format";
import CampoNumerico from "./CampoNumerico";

type Props = {
  plants: number;
  plantCapacity: number;
  plantCapex: number;
  plantsBought: number;
  onBuyPlant: () => void;
  overtime: boolean;
  onToggleOvertime: () => void;
  capacity: number;
  productionQty: number;
  onProductionChange: (value: number) => void;
  estDemandUnits: number;
  startingInventory: number;
  capacityShort: boolean;
  plantFixedCostPerQuarter: number;
  overheadPerQuarter: number;
};

/** Sezione "Operations" del tab Decisioni: stabilimenti, straordinari e quanto produrre. */
export default function SezioneOperations({
  plants,
  plantCapacity,
  plantCapex,
  plantsBought,
  onBuyPlant,
  overtime,
  onToggleOvertime,
  capacity,
  productionQty,
  onProductionChange,
  estDemandUnits,
  startingInventory,
  capacityShort,
  plantFixedCostPerQuarter,
  overheadPerQuarter,
}: Props) {
  return (
    <section className="card">
      <h2>Decisione — Produzione</h2>
      <div className="prod-row">
        <div>
          <div className="prod-label">Stabilimenti</div>
          <div className="prod-value">{plants} <small>×{num(plantCapacity)} u.</small></div>
        </div>
        <button className="btn mini" onClick={onBuyPlant}>
          + Compra ({eur(plantCapex)})
        </button>
      </div>
      <div className="prod-row">
        <div>
          <div className="prod-label">Straordinari</div>
          <div className="prod-value">{overtime ? "Attivi (+40% cap.)" : "Spenti"}</div>
        </div>
        <button className={`btn mini ${overtime ? "" : "secondary"}`} onClick={onToggleOvertime}>
          {overtime ? "Disattiva" : "Attiva"}
        </button>
      </div>
      <div className="capacity-box">
        <span>Capacità produttiva</span>
        <b>{num(capacity)} unità / trim.</b>
      </div>

      <CampoNumerico
        etichetta="Quanto produrre"
        valore={productionQty}
        onChange={onProductionChange}
        min={0}
        max={capacity}
        step={50}
        unita="unità"
        etichettaMin="0"
        etichettaMax={`${num(capacity)} (capacità)`}
        scorciatoie={[
          { etichetta: "Domanda stimata", valore: Math.round(estDemandUnits) },
          { etichetta: "Capacità piena", valore: capacity },
          { etichetta: "Niente", valore: 0 },
        ]}
        ariaLabel="Unità da produrre nel trimestre"
      />
      <p className="hint">
        In magazzino: <b>{num(startingInventory)}</b> unità · disponibili alla
        vendita <b>{num(startingInventory + productionQty)}</b>.
        {productionQty + startingInventory > estDemandUnits ? (
          <>
            {" "}Ne resterebbero <b>{num(startingInventory + productionQty - estDemandUnits)}</b> a
            magazzino, con un costo di giacenza di{" "}
            <b>{eur((startingInventory + productionQty - estDemandUnits) * HOLDING_COST_PER_UNIT_PER_QUARTER)}</b>.
          </>
        ) : (
          <>
            {" "}Copri tutta la domanda stimata solo fino a{" "}
            <b>{num(startingInventory + productionQty)}</b> unità: il resto sono vendite perse.
          </>
        )}
      </p>
      {capacityShort && (
        <p className="hint warn">
          ⚠ La domanda stimata ({num(estDemandUnits)}) supera la capacità attuale ({num(capacity)}).
          Valuta più stabilimenti o gli straordinari.
        </p>
      )}
      {plantsBought > 0 && (
        <p className="hint">Investimento previsto: {eur(plantsBought * plantCapex)} ({plantsBought} stab.).</p>
      )}
      <p className="hint">
        Costo fisso {eur(plantFixedCostPerQuarter)}/stab. + overhead {eur(overheadPerQuarter)}.
        Non vendi oltre la capacità: la domanda in eccesso è persa.
      </p>
    </section>
  );
}

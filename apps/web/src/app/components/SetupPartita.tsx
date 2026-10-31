"use client";

import { useState, useEffect } from "react";
import {
  GameSetup,
  DEFAULT_SETUP,
  deriveCosts,
  PRODUCT_PROFILES,
  setupFromProfile,
} from "@/lib/game-engine/setup";
import { num } from "@/lib/ui/format";

interface SetupPartitaProps {
  onAvvia?: (setup: GameSetup) => void;
  onSalta?: () => void;
}

export default function SetupPartita({ onAvvia, onSalta }: SetupPartitaProps) {
  const [setup, setSetup] = useState<GameSetup>(DEFAULT_SETUP);
  const [costi, setCosti] = useState(deriveCosts(DEFAULT_SETUP));
  const [profiloSelezionato, setProfiloSelezionato] = useState<string>("standard");

  // Aggiorna i costi derivati ogni volta che cambia un parametro
  useEffect(() => {
    setCosti(deriveCosts(setup));
  }, [setup]);

  const handleChange = (campo: keyof GameSetup, valore: number) => {
    setSetup((prev) => ({ ...prev, [campo]: valore }));
  };

  const handleProfiloChange = (profilo: string) => {
    setProfiloSelezionato(profilo);
    const nuovoSetup = setupFromProfile(profilo);
    setSetup(nuovoSetup);
  };

  const handleAvvia = () => {
    if (onAvvia) onAvvia(setup);
  };

  const handleSalta = () => {
    if (onSalta) onSalta();
  };

  return (
    <div className="card">
      <h2>Configurazione partita</h2>
      <p className="hint">
        Imposta i parametri iniziali che determineranno l&apos;economia della partita.
        I costi derivati vengono calcolati in tempo reale.
      </p>

      <div className="subtabs">
        {Object.keys(PRODUCT_PROFILES).map((key) => (
          <button
            key={key}
            className={`subtab-pill ${profiloSelezionato === key ? "active" : ""}`}
            onClick={() => handleProfiloChange(key)}
          >
            {key === "standard" && "Standard"}
            {key === "premium" && "Premium"}
            {key === "commodity" && "Commodity"}
          </button>
        ))}
      </div>

      <div className="prod-row">
        <div>
          <div className="prod-label">Prezzo standard del prodotto</div>
          <div className="prod-value">{setup.standardPrice} €</div>
        </div>
      </div>
      <input
        type="range" min={60} max={300} step={5}
        value={setup.standardPrice}
        onChange={(e) => handleChange("standardPrice", Number(e.target.value))}
        aria-label="Prezzo standard del prodotto"
      />
      <div className="range-labels"><span>60 €</span><span>300 €</span></div>

      <div className="prod-row">
        <div>
          <div className="prod-label">Incidenza del costo variabile</div>
          <div className="prod-value">{(setup.variableCostRatio * 100).toFixed(0)}% del prezzo</div>
        </div>
      </div>
      <input
        type="range" min={30} max={85} step={1}
        value={Math.round(setup.variableCostRatio * 100)}
        onChange={(e) => handleChange("variableCostRatio", Number(e.target.value) / 100)}
        aria-label="Incidenza del costo variabile"
      />
      <div className="range-labels"><span>30% (margine ampio)</span><span>85% (margine sottile)</span></div>

      <div className="prod-row">
        <div>
          <div className="prod-label">Scorta iniziale di materie prime</div>
          <div className="prod-value">{num(setup.initialRawMaterialStock)} kit</div>
        </div>
      </div>
      <input
        type="range" min={0} max={20000} step={500}
        value={setup.initialRawMaterialStock}
        onChange={(e) => handleChange("initialRawMaterialStock", Number(e.target.value))}
        aria-label="Scorta iniziale di materie prime"
      />
      <div className="range-labels"><span>0 (parti a secco)</span><span>20.000 kit</span></div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-k">Quota materie prime</div>
          <div className="stat-v">{(setup.materialShareOfVariableCost * 100).toFixed(0)}%</div>
        </div>
        <div className="stat">
          <div className="stat-k">Volume di riferimento</div>
          <div className="stat-v">{num(setup.referenceVolume)} unità</div>
        </div>
      </div>

      <div className="card">
        <h3>Costi derivati</h3>
        <div className="prod-row">
          <div className="prod-label">Costo variabile unitario</div>
          <div className="prod-value">{costi.unitCost} €</div>
        </div>
        <div className="prod-row">
          <div className="prod-label">Materie prime per unità</div>
          <div className="prod-value">{costi.materialCostPerUnit} €</div>
        </div>
        <div className="prod-row">
          <div className="prod-label">Costo lavoro per unità</div>
          <div className="prod-value">{costi.laborCostPerUnit} €</div>
        </div>
        <div className="prod-row">
          <div className="prod-label">Costi fissi totali (al volume di riferimento)</div>
          <div className="prod-value">{num(costi.totalFixedCostAtRefVolume)} €</div>
        </div>
        <div className="prod-row">
          <div className="prod-label">Costo fisso per unità (al volume di riferimento)</div>
          <div className="prod-value">{costi.fixedCostPerUnitAtRef} €</div>
        </div>
      </div>

      <div className="hint warn">
        <strong>Attenzione:</strong> modificare questi parametri cambia l&apos;economia di base
        della partita. I concorrenti giocheranno con le stesse regole.
      </div>

      <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
        <button className="btn secondary" onClick={handleSalta}>
          Salta e usa i default
        </button>
        <button className="btn" onClick={handleAvvia}>
          Avvia partita
        </button>
      </div>
    </div>
  );
}

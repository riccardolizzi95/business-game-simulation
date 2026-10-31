"use client";

/**
 * Un valore numerico impostabile in tre modi: digitandolo, col cursore, o con una scorciatoia.
 *
 * Nasce da un attrito misurato giocando: tutti i valori del gioco si impostavano solo con
 * cursori, e su un telefono centrare un numero preciso è quasi impossibile. Il campo e il
 * cursore sono collegati nei due sensi; le scorciatoie evitano il calcolo a mente («quanto era
 * la domanda stimata?»).
 */

export interface Scorciatoia {
  etichetta: string;
  valore: number;
}

type Props = {
  etichetta: string;
  valore: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Unità mostrata accanto al numero (es. "€", "unità"). */
  unita?: string;
  /** Etichette agli estremi del cursore. */
  etichettaMin?: string;
  etichettaMax?: string;
  /** Scorciatoie: valori pronti, per non doverli calcolare a mente. */
  scorciatoie?: Scorciatoia[];
  /** Descrizione per chi usa uno screen reader. */
  ariaLabel?: string;
};

export default function CampoNumerico({
  etichetta, valore, onChange, min, max, step = 1, unita,
  etichettaMin, etichettaMax, scorciatoie = [], ariaLabel,
}: Props) {
  const limita = (v: number) => Math.max(min, Math.min(max, v));

  return (
    <div className="campo-numerico">
      <div className="prod-row">
        <div>
          <div className="prod-label">{etichetta}</div>
        </div>
        <div className="campo-input">
          <input
            type="number"
            inputMode="numeric"
            value={valore}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!Number.isNaN(v)) onChange(limita(v));
            }}
            aria-label={ariaLabel ?? etichetta}
          />
          {unita && <span className="campo-unita">{unita}</span>}
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={valore}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${ariaLabel ?? etichetta} (cursore)`}
      />
      {(etichettaMin || etichettaMax) && (
        <div className="range-labels"><span>{etichettaMin}</span><span>{etichettaMax}</span></div>
      )}

      {scorciatoie.length > 0 && (
        <div className="scorciatoie">
          {scorciatoie.map((s) => (
            <button
              key={s.etichetta}
              className={`chip-azione ${valore === limita(s.valore) ? "attiva" : ""}`}
              onClick={() => onChange(limita(s.valore))}
            >
              {s.etichetta}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .campo-numerico { margin-bottom: 4px; }
        .campo-input {
          display: flex;
          align-items: baseline;
          gap: 4px;
          background: var(--bg-elev2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 6px 10px;
        }
        .campo-input input {
          width: 5.5em;
          background: transparent;
          border: none;
          color: var(--text);
          font-size: 20px;
          font-weight: 700;
          text-align: right;
          padding: 0;
          -moz-appearance: textfield;
        }
        .campo-input input:focus { outline: none; }
        .campo-input input::-webkit-outer-spin-button,
        .campo-input input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .campo-unita { color: var(--muted); font-size: 14px; font-weight: 600; }
        .scorciatoie { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .chip-azione {
          background: var(--bg-elev2);
          border: 1px solid var(--border);
          color: var(--muted);
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 12px;
          font-weight: 600;
        }
        .chip-azione.attiva {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
      `}</style>
    </div>
  );
}

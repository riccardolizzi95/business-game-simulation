"use client";

import {
  DELIVERY_TIME_OPTIONS,
  MATERIAL_QUALITY_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  STANDARD_MATERIAL_COST_PER_UNIT,
  calculateMaterialUnitPrice,
  calculateCashOutQuarter,
  type DeliveryTimeOption,
  type MaterialQualityOption,
  type PaymentTermsOption,
  type MaterialOrderRequest,
} from "@/lib/game-engine";
import { eur, eurPrecise, num } from "@/lib/ui/format";
import CampoNumerico from "./CampoNumerico";

type Props = {
  orderQty: number;
  onOrderQtyChange: (value: number) => void;
  productionQty: number;
  deliveryTime: DeliveryTimeOption;
  onDeliveryTimeChange: (value: DeliveryTimeOption) => void;
  materialQuality: MaterialQualityOption;
  onMaterialQualityChange: (value: MaterialQualityOption) => void;
  paymentTerms: PaymentTermsOption;
  onPaymentTermsChange: (value: PaymentTermsOption) => void;
  quarter: number;
  totalQuarters: number;
  /** Materie prime in magazzino, disponibili subito. */
  rawStock: number;
  /** Materie prime gia' ordinate ma non ancora arrivate. */
  inTransit: number;
  /** Indice di qualità del prodotto (0..10) con la scelta attuale. */
  qualityIndex: number;
  /** Qualità della configurazione di partenza. */
  qualityRef: number;
  /** Ordini già composti per questo trimestre. */
  ordini: MaterialOrderRequest[];
  onAggiungiOrdine: () => void;
  onRimuoviOrdine: (i: number) => void;
};

/** Sezione "Acquisti" del tab Decisioni: quantità, tempi di consegna, qualità e pagamento. */
export default function SezioneAcquisti({
  orderQty,
  onOrderQtyChange,
  productionQty,
  deliveryTime,
  onDeliveryTimeChange,
  materialQuality,
  onMaterialQualityChange,
  paymentTerms,
  onPaymentTermsChange,
  quarter,
  totalQuarters,
  rawStock,
  inTransit,
  qualityIndex,
  qualityRef,
  ordini,
  onAggiungiOrdine,
  onRimuoviOrdine,
}: Props) {
  // Prezzo e scadenza calcolati dal MOTORE: qui non si riscrive nessuna formula.
  const prezzoUnitario = calculateMaterialUnitPrice(
    STANDARD_MATERIAL_COST_PER_UNIT, deliveryTime, materialQuality, paymentTerms,
  );
  const totale = prezzoUnitario * orderQty;
  const consegna = DELIVERY_TIME_OPTIONS.find((o) => o.code === deliveryTime)!;
  const qualita = MATERIAL_QUALITY_OPTIONS.find((o) => o.code === materialQuality)!;
  const trimestreCassa = calculateCashOutQuarter(quarter, deliveryTime, paymentTerms);
  const arrivo = quarter + consegna.leadTimeQuarters;
  const delta = ((prezzoUnitario / STANDARD_MATERIAL_COST_PER_UNIT) - 1) * 100;

  // Con quel che c'e' in magazzino, quanto della produzione decisa si riesce a coprire.
  const coperto = Math.min(rawStock, productionQty);
  const scoperto = Math.max(0, productionQty - rawStock);

  return (
    <section className="card">
      <h2>Decisione — Acquisto materie prime</h2>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-k">In magazzino</div>
          <div className="stat-v">{num(rawStock)}</div>
        </div>
        <div className="stat">
          <div className="stat-k">In arrivo</div>
          <div className="stat-v">{num(inTransit)}</div>
        </div>
      </div>
      {scoperto > 0 ? (
        <p className="hint warn">
          ⚠ Vuoi produrre <b>{num(productionQty)}</b> unità ma hai materiale per <b>{num(coperto)}</b>:
          senza un ordine che arrivi in tempo, <b>{num(scoperto)}</b> unità non si faranno.
        </p>
      ) : (
        <p className="hint">
          Il magazzino copre la produzione decisa ({num(productionQty)} unità). Ne resteranno{" "}
          <b>{num(rawStock - productionQty)}</b> per il prossimo trimestre.
        </p>
      )}

      <CampoNumerico
        etichetta="Quantità da ordinare"
        valore={orderQty}
        onChange={onOrderQtyChange}
        min={0}
        max={12_000}
        step={100}
        unita="kit"
        etichettaMin="0"
        etichettaMax="12.000"
        scorciatoie={[
          { etichetta: "Quanto produco", valore: productionQty },
          { etichetta: "Quanto manca", valore: Math.max(0, productionQty - rawStock) },
        ]}
        ariaLabel="Unità di materia prima da ordinare"
      />

      <div className="prod-label" style={{ marginTop: 12 }}>Quando la vuoi</div>
      <div className="subtabs">
        {DELIVERY_TIME_OPTIONS.map((o) => (
          <button
            key={o.code}
            className={`subtab-pill ${deliveryTime === o.code ? "active" : ""}`}
            onClick={() => onDeliveryTimeChange(o.code)}
          >
            {o.label} <small>{o.leadTimeQuarters === 0 ? "subito" : `${o.leadTimeQuarters}Q`}</small>
          </button>
        ))}
      </div>

      <div className="prod-label" style={{ marginTop: 12 }}>Qualità del materiale</div>
      <div className="subtabs">
        {MATERIAL_QUALITY_OPTIONS.map((o) => (
          <button
            key={o.code}
            className={`subtab-pill ${materialQuality === o.code ? "active" : ""}`}
            onClick={() => onMaterialQualityChange(o.code)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="prod-label" style={{ marginTop: 12 }}>Quando paghi</div>
      <div className="subtabs">
        {PAYMENT_TERMS_OPTIONS.map((o) => (
          <button
            key={o.code}
            className={`subtab-pill ${paymentTerms === o.code ? "active" : ""}`}
            onClick={() => onPaymentTermsChange(o.code)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="prod-row" style={{ marginTop: 12 }}>
        <div>
          <div className="prod-label">Ordini di questo trimestre</div>
          <div className="prod-value">{ordini.length === 0 ? "nessuno" : `${ordini.length}`}</div>
        </div>
        <button className="btn mini" onClick={onAggiungiOrdine} disabled={orderQty <= 0}>
          + Aggiungi ordine
        </button>
      </div>
      {ordini.length > 0 ? (
        <table>
          <thead><tr><th>Quantità</th><th>Consegna</th><th>Qualità</th><th>Pagamento</th><th /></tr></thead>
          <tbody>
            {ordini.map((o, i) => (
              <tr key={i}>
                <td>{num(o.quantity)}</td>
                <td>{DELIVERY_TIME_OPTIONS.find((x) => x.code === o.delivery)!.label}</td>
                <td>{MATERIAL_QUALITY_OPTIONS.find((x) => x.code === o.quality)!.label}</td>
                <td>{PAYMENT_TERMS_OPTIONS.find((x) => x.code === o.payment)!.label}</td>
                <td>
                  <button className="btn mini secondary" onClick={() => onRimuoviOrdine(i)}>togli</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="hint">
          Imposta quantità e condizioni qui sopra, poi <b>Aggiungi ordine</b>. Puoi accodarne più
          d&apos;uno con consegne e pagamenti diversi: è così che ci si organizza in anticipo.
        </p>
      )}

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat">
          <div className="stat-k">Prezzo per unità</div>
          <div className="stat-v">{eurPrecise(prezzoUnitario)}</div>
        </div>
        <div className="stat">
          <div className="stat-k">Totale ordine</div>
          <div className="stat-v">{eur(totale)}</div>
        </div>
        <div className="stat">
          <div className="stat-k">Arriva nel trimestre</div>
          <div className="stat-v">{arrivo > totalQuarters ? "mai" : `T${arrivo}`}</div>
        </div>
        <div className="stat">
          <div className="stat-k">Paghi nel trimestre</div>
          <div className="stat-v">T{trimestreCassa}</div>
        </div>
      </div>
      <p className="hint">
        Rispetto al listino standard di {eurPrecise(STANDARD_MATERIAL_COST_PER_UNIT)}:{" "}
        <b>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</b>. Materiale {qualita.label.toLowerCase()}:{" "}
        scarto {qualita.scrapRateDelta >= 0 ? "+" : ""}{qualita.scrapRateDelta} punti,
        percezione di mercato {qualita.brandEffect >= 0 ? "+" : ""}{(qualita.brandEffect * 100).toFixed(0)}%.
      </p>
      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat">
          <div className="stat-k">Qualità del prodotto</div>
          <div className="stat-v">
            {qualityIndex.toFixed(1)}<small style={{ opacity: 0.6 }}>/10</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-k">Rispetto al mercato</div>
          <div className="stat-v">
            {qualityIndex >= qualityRef ? "+" : ""}{(qualityIndex - qualityRef).toFixed(1)}
          </div>
        </div>
      </div>
      <p className="hint">
        La materia prima pesa per il <b>55%</b> sulla qualità del prodotto, l&apos;organico per il
        restante 45%. Una qualità sopra la media di mercato ({qualityRef.toFixed(1)}) attira più
        domanda a parità di prezzo.
      </p>
      <p className="hint">
        Ordinare in anticipo costa meno ma immobilizza capitale; pagare tardi costa
        di più ma ti lascia la cassa oggi.
      </p>
    </section>
  );
}

"use client";

import { useState } from "react";
import { eur, num } from "@/lib/ui/format";
import { avvisiPreChiusura, livelloPiuGrave } from "@/lib/ui/avvisi";
import { useGioco, TOTAL_QUARTERS, START_CAPITAL, NOISE_PCT, PLAYERS, type TabId } from "./hooks/useGioco";
import SezioneCommerciale from "./components/SezioneCommerciale";
import SezioneOperations from "./components/SezioneOperations";
import SezioneAcquisti from "./components/SezioneAcquisti";
import SezioneMarketing from "./components/SezioneMarketing";
import TabCruscotto from "./components/TabCruscotto";
import TabRisultati from "./components/TabRisultati";
import TabClassifica from "./components/TabClassifica";
import SetupPartita from "./components/SetupPartita";

// Quattro destinazioni, non dieci. Prima erano 6 tab piu' 4 sottosezioni dentro Decisioni: per un
// turno che consiste nell'impostare quattro numeri e chiudere, era un labirinto (S18-1).
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "cruscotto", icon: "🏠", label: "Azienda" },
  { id: "decisioni", icon: "🎯", label: "Decisioni" },
  { id: "risultati", icon: "📊", label: "Risultati" },
  { id: "classifica", icon: "🏆", label: "Classifica" },
];

export default function Home() {
  const g = useGioco();
  const [confermaRichiesta, setConfermaRichiesta] = useState(false);

  // Prima schermata: si scelgono i parametri, oppure si salta e si gioca coi default.
  if (!g.setupDone) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">Business<span>Game</span></div>
        </header>
        <main className="content">
          <SetupPartita onAvvia={g.avviaConSetup} onSalta={g.saltaSetup} />
        </main>
      </div>
    );
  }

  const avvisi = g.gameOver ? [] : avvisiPreChiusura({
    est: g.est,
    productionQty: g.productionQty,
    capacity: g.capacity,
    rawStock: g.rawState.stock,
    ordinato: g.ordini.reduce((n, o) => n + o.quantity, 0),
    scorteIniziali: g.startingInventories.tu ?? 0,
    cash: g.cash,
    marketingBudget: g.marketingBudget,
    price: g.price,
    unitCost: g.cfg.unitCost,
    qualityIndex: g.qualityIndex,
    qualityRef: g.qualityRef,
  });
  const gravita = livelloPiuGrave(avvisi);

  // Si avverte, non si impedisce: al massimo si chiede un secondo tocco.
  const chiudiTrimestre = () => {
    if (gravita === "conferma" && !confermaRichiesta) {
      setConfermaRichiesta(true);
      return;
    }
    setConfermaRichiesta(false);
    g.closeQuarter();
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Business<span>Game</span></div>
        <div className="header-right">
          <div className={`pill cash-pill ${g.cash >= 0 ? "positive" : "negative"}`}>{eur(g.cash)}</div>
          <div className="pill quarter-pill">{g.gameOver ? "Fine" : `T ${g.quarter}/${TOTAL_QUARTERS}`}</div>
        </div>
      </header>

      <main className="content">
        {/* ---------------- AZIENDA ---------------- */}
        {g.tab === "cruscotto" && (
          <TabCruscotto
            cash={g.cash}
            cumProfit={g.cumProfit.tu}
            startCapital={START_CAPITAL}
            capacity={g.capacity}
            plants={g.plants}
            overtime={g.overtime}
            price={g.price}
            you={g.you}
            kpis={g.kpis}
            gameOver={g.gameOver}
            qualityIndex={g.qualityIndex}
            qualityRef={g.qualityRef}
            avvisi={avvisi}
            scorteMaterie={g.rawState.stock}
            onGoDecisioni={() => g.setTab("decisioni")}
            onGoClassifica={() => g.setTab("classifica")}
          />
        )}

        {/* ---------------- DECISIONI: tutto il turno in una schermata ---------------- */}
        {g.tab === "decisioni" && (
          g.gameOver ? (
            <section className="card"><h2>Partita finita</h2><p className="hint">Non ci sono altri trimestri. Vai alla Classifica.</p></section>
          ) : (
            <>
              <section className="card summary-sticky">
                <h2>Le tue decisioni · trimestre {g.quarter}</h2>
                <div className="summary-row"><span>💰 Prezzo</span><b>{eur(g.price)}</b></div>
                <div className="summary-row">
                  <span>🏭 Produzione</span>
                  <b>{num(g.productionQty)} u.{g.capacityShort ? " ⚠" : ""}</b>
                </div>
                <div className="summary-row">
                  <span>📦 Acquisti</span>
                  <span>
                    {g.ordini.length > 0
                      ? `${num(g.ordini.reduce((n, o) => n + o.quantity, 0))} u. in ${g.ordini.length} ord.`
                      : "—"}
                  </span>
                </div>
                <div className="summary-row">
                  <span>📣 Marketing</span>
                  <span>{g.marketingBudget > 0 ? eur(g.marketingBudget) : "—"}</span>
                </div>
              </section>

              <SezioneCommerciale
                price={g.price}
                onPriceChange={g.setPrice}
                priceMin={g.priceMin}
                priceMax={g.priceMax}
                unitCost={g.cfg.unitCost}
                estProfit={g.est.profit}
                margin={g.margin}
                noisePct={NOISE_PCT}
                rivalAlfaPrice={g.bots[0].price}
                rivalBetaPrice={g.bots[1].price}
                sensiPrices={g.sensiPrices}
                simulateFor={g.simulateFor}
                breakEven={g.breakEven}
              />

              <SezioneOperations
                plants={g.plants}
                plantCapacity={g.cfg.plantCapacity}
                plantCapex={g.cfg.plantCapex}
                plantsBought={g.plantsBought}
                onBuyPlant={g.buyPlant}
                overtime={g.overtime}
                onToggleOvertime={g.toggleOvertime}
                capacity={g.capacity}
                productionQty={g.productionQty}
                onProductionChange={g.handleProductionChange}
                estDemandUnits={g.est.demandUnits}
                startingInventory={g.startingInventories.tu ?? 0}
                capacityShort={g.capacityShort}
                plantFixedCostPerQuarter={g.cfg.plantFixedCostPerQuarter}
                overheadPerQuarter={g.cfg.overheadPerQuarter}
              />

              <SezioneAcquisti
                orderQty={g.orderQty}
                onOrderQtyChange={g.setOrderQty}
                productionQty={g.productionQty}
                deliveryTime={g.deliveryTime}
                onDeliveryTimeChange={g.setDeliveryTime}
                materialQuality={g.materialQuality}
                onMaterialQualityChange={g.setMaterialQuality}
                paymentTerms={g.paymentTerms}
                onPaymentTermsChange={g.setPaymentTerms}
                quarter={g.quarter}
                totalQuarters={TOTAL_QUARTERS}
                rawStock={g.rawState.stock}
                inTransit={g.materieInTransito}
                qualityIndex={g.qualityIndex}
                qualityRef={g.qualityRef}
                ordini={g.ordini}
                onAggiungiOrdine={g.aggiungiOrdine}
                onRimuoviOrdine={g.rimuoviOrdine}
              />

              <SezioneMarketing
                marketingBudget={g.marketingBudget}
                onBudgetChange={g.setMarketingBudget}
                campaignFocus={g.campaignFocus}
                onCampaignFocusChange={g.setCampaignFocus}
                brandEquity={g.brandStates.tu?.brandEquity ?? 0}
              />

              {avvisi.length > 0 && (
                <section className="card">
                  <h2>Prima di chiudere</h2>
                  {avvisi.map((a) => (
                    <p key={a.id} className="avviso" data-livello={a.livello}>{a.testo}</p>
                  ))}
                  <style jsx>{`
                    .avviso {
                      margin: 0 0 8px;
                      padding: 8px 10px;
                      border-radius: 8px;
                      font-size: 13px;
                      line-height: 1.4;
                      background: var(--bg-elev2);
                      border-left: 3px solid var(--muted);
                    }
                    .avviso[data-livello="avviso"] { border-left-color: var(--gold); }
                    .avviso[data-livello="conferma"] { border-left-color: var(--danger); }
                  `}</style>
                </section>
              )}

              {confermaRichiesta && (
                <section className="card">
                  <p className="hint warn">
                    Hai già visto gli avvisi qui sopra. Vuoi chiudere il trimestre lo stesso?
                  </p>
                  <button className="btn secondary" onClick={() => setConfermaRichiesta(false)}>
                    No, torno a decidere
                  </button>
                </section>
              )}

              <button className="btn cta-sticky" onClick={chiudiTrimestre}>
                {confermaRichiesta ? "Sì, chiudi comunque ▸" : "Chiudi il trimestre ▸"}
              </button>
            </>
          )
        )}

        {/* ---------------- RISULTATI ---------------- */}
        {g.tab === "risultati" && (
          <TabRisultati
            you={g.you}
            lastResults={g.lastResults}
            players={PLAYERS}
            marketConditions={g.marketConditions}
            cashFlow={g.cashFlow}
            cash={g.cash}
            variazioneCassa={g.cashFlow?.netCashFlow}
            debitiFornitori={g.debitiFornitori}
            scadenzario={g.scadenzario}
            quarter={g.quarter}
            gameOver={g.gameOver}
          />
        )}

        {/* ---------------- CLASSIFICA ---------------- */}
        {g.tab === "classifica" && (
          <TabClassifica ranking={g.ranking} gameOver={g.gameOver} onRestart={g.restart} />
        )}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${g.tab === t.id ? "active" : ""}`} onClick={() => g.setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

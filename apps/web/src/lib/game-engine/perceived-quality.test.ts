import { describe, it, expect } from "vitest";
import {
  INITIAL_PERCEIVED_QUALITY,
  MATERIAL_QUALITY_INDEX,
  PERCEIVED_QUALITY_SMOOTHING,
  PERSONNEL_QUALITY_INDEX,
  REFERENCE_QUALITY,
  calculateRealQuality,
  evolvePerceivedQuality,
  perceivedQualityMultiplier,
} from "./quality";
import { simulateQuarter } from "./simulate";
import { DEFAULT_CONFIG } from "./types";
import type { PlayerDecision } from "./types";

describe("qualità percepita — riferimento e non-regressione", () => {
  it("la qualità di riferimento è materiale standard con personale base", () => {
    expect(REFERENCE_QUALITY).toBeCloseTo(
      calculateRealQuality("standard", "base"),
      10,
    );
  });

  it("alla percezione di riferimento il moltiplicatore vale ESATTAMENTE 1", () => {
    // È la garanzia che senza la leva la formula di mercato resti quella di prima.
    expect(perceivedQualityMultiplier(INITIAL_PERCEIVED_QUALITY)).toBe(1);
  });

  it("senza lo stato di percezione la simulazione non cambia", () => {
    const due: PlayerDecision[] = [
      { playerId: "a", price: 100, plants: 5, overtime: false },
      { playerId: "b", price: 100, plants: 5, overtime: false },
    ];
    const senza = simulateQuarter(due);
    const conIniziale = simulateQuarter(
      due, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      { a: INITIAL_PERCEIVED_QUALITY, b: INITIAL_PERCEIVED_QUALITY },
    );
    expect(conIniziale.map((r) => r.share)).toEqual(senza.map((r) => r.share));
  });
});

describe("qualità percepita — il mercato si accorge con ritardo", () => {
  it("un salto di qualità reale NON si riflette subito per intero", () => {
    const alta = calculateRealQuality("ultra", "expert");
    const dopoUnTrimestre = evolvePerceivedQuality(INITIAL_PERCEIVED_QUALITY, alta);
    expect(dopoUnTrimestre.value).toBeGreaterThan(REFERENCE_QUALITY);
    expect(dopoUnTrimestre.value).toBeLessThan(alta); // ecco il ritardo
  });

  it("mantenendo la qualità la percezione converge verso quella reale", () => {
    const alta = calculateRealQuality("ultra", "expert");
    let stato = INITIAL_PERCEIVED_QUALITY;
    const dopo4 = (() => {
      let s = INITIAL_PERCEIVED_QUALITY;
      for (let q = 0; q < 4; q++) s = evolvePerceivedQuality(s, alta);
      return s.value;
    })();
    for (let q = 0; q < 20; q++) stato = evolvePerceivedQuality(stato, alta);
    // Convergenza asintotica: non tocca mai esattamente il valore reale, ma ci si avvicina
    // sempre di più. Verifichiamo che l'errore residuo sia sotto l'1% e che continui a calare.
    expect(Math.abs(stato.value - alta) / alta).toBeLessThan(0.01);
    expect(Math.abs(stato.value - alta)).toBeLessThan(Math.abs(dopo4 - alta));
  });

  it("anche il peggioramento arriva con ritardo: la reputazione protegge per un po'", () => {
    const bassa = calculateRealQuality("economy", "base");
    const partenzaAlta = { value: calculateRealQuality("ultra", "expert") };
    const dopo = evolvePerceivedQuality(partenzaAlta, bassa);
    expect(dopo.value).toBeGreaterThan(bassa); // non crolla di colpo
    expect(dopo.value).toBeLessThan(partenzaAlta.value);
  });

  it("lo smoothing è quello dichiarato", () => {
    const reale = 100;
    const dopo = evolvePerceivedQuality({ value: 0 }, reale);
    expect(dopo.value).toBeCloseTo(PERCEIVED_QUALITY_SMOOTHING * reale, 10);
  });
});

describe("qualità percepita — effetto competitivo", () => {
  it("a parità di prezzo, chi è percepito meglio conquista più quota", () => {
    const due: PlayerDecision[] = [
      { playerId: "buono", price: 100, plants: 5, overtime: false },
      { playerId: "medio", price: 100, plants: 5, overtime: false },
    ];
    const res = simulateQuarter(
      due, DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      {
        buono: { value: calculateRealQuality("ultra", "expert") },
        medio: INITIAL_PERCEIVED_QUALITY,
      },
    );
    const buono = res.find((r) => r.playerId === "buono")!;
    const medio = res.find((r) => r.playerId === "medio")!;
    expect(buono.share).toBeGreaterThan(medio.share);
  });

  it("la qualità non rende il prezzo irrilevante", () => {
    // Chi ha qualità massima ma prezzo doppio non deve comunque dominare.
    const res = simulateQuarter(
      [
        { playerId: "caro", price: 200, plants: 5, overtime: false },
        { playerId: "economico", price: 100, plants: 5, overtime: false },
      ],
      DEFAULT_CONFIG, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      { caro: { value: MATERIAL_QUALITY_INDEX.ultra * 0.6 + PERSONNEL_QUALITY_INDEX.expert * 0.4 } },
    );
    const caro = res.find((r) => r.playerId === "caro")!;
    const economico = res.find((r) => r.playerId === "economico")!;
    expect(economico.share).toBeGreaterThan(caro.share);
  });
});

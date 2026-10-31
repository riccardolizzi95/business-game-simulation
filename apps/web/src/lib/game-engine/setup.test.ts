import { describe, it, expect } from "vitest";
import {
  DEFAULT_SETUP,
  PRODUCT_PROFILES,
  deriveCosts,
  roundCents,
  setupFromProfile,
  type GameSetup,
} from "./setup";
import { DEFAULT_CONFIG } from "./types";

describe("setup — arrotondamento ai centesimi", () => {
  it("neutralizza l'errore di virgola mobile che rompeva la derivazione", () => {
    // Senza arrotondamento questi valgono 55.00000000000001 e 22.000000000000004.
    expect(roundCents(100 * 0.55)).toBe(55);
    expect(roundCents(55 * 0.4)).toBe(22);
  });

  it("lascia intatti i valori già esatti", () => {
    expect(roundCents(33)).toBe(33);
    expect(roundCents(2.5)).toBe(2.5);
  });
});

describe("setup — i default riproducono l'economia attuale", () => {
  const d = deriveCosts();

  it("il costo unitario derivato è esattamente quello del motore di oggi", () => {
    expect(d.unitCost).toBe(55);
    expect(d.unitCost).toBe(DEFAULT_CONFIG.unitCost); // ancorato al motore, non a un numero scritto qui
  });

  it("le quote di materiale e lavoro sono quelle attese", () => {
    expect(d.materialCostPerUnit).toBe(33);
    expect(d.laborCostPerUnit).toBe(22);
  });

  it("materiale e lavoro sommano ESATTAMENTE al costo unitario", () => {
    // Calcolare il lavoro per differenza evita che due arrotondamenti indipendenti
    // facciano sballare la somma di un centesimo.
    expect(d.materialCostPerUnit + d.laborCostPerUnit).toBe(d.unitCost);
  });

  it("i costi fissi per unità al volume di riferimento valgono 12 €", () => {
    // overhead 20.000 + (10.000/3.000) × 30.000 = 120.000, su 10.000 unità.
    expect(d.totalFixedCostAtRefVolume).toBe(120_000);
    expect(d.fixedCostPerUnitAtRef).toBe(12);
  });
});

describe("setup — scenari alternativi", () => {
  it("il profilo commodity ha materiali dominanti e margine sottile", () => {
    const d = deriveCosts(setupFromProfile("commodity"));
    const setup = setupFromProfile("commodity");
    expect(d.unitCost).toBe(roundCents(setup.standardPrice * setup.variableCostRatio));
    // Materiali oltre il 70% del costo variabile: qui decide l'approvvigionamento.
    expect(d.materialCostPerUnit / d.unitCost).toBeGreaterThan(0.7);
    // Margine per unità più sottile che nello standard.
    const margineCommodity = setup.standardPrice - d.unitCost;
    const margineStandard = DEFAULT_SETUP.standardPrice - deriveCosts().unitCost;
    expect(margineCommodity).toBeLessThan(margineStandard);
  });

  it("il profilo premium ha margine ampio e peso del lavoro maggiore", () => {
    const d = deriveCosts(setupFromProfile("premium"));
    const setup = setupFromProfile("premium");
    expect(setup.standardPrice - d.unitCost).toBeGreaterThan(
      DEFAULT_SETUP.standardPrice - deriveCosts().unitCost,
    );
    // Il lavoro pesa più che nello standard: qui decide l'HR.
    expect(d.laborCostPerUnit / d.unitCost).toBeGreaterThan(
      deriveCosts().laborCostPerUnit / deriveCosts().unitCost,
    );
  });

  it("ogni profilo mantiene la somma delle quote uguale al costo unitario", () => {
    for (const nome of Object.keys(PRODUCT_PROFILES)) {
      const d = deriveCosts(setupFromProfile(nome));
      expect(d.materialCostPerUnit + d.laborCostPerUnit).toBe(d.unitCost);
    }
  });
});

describe("setup — dinamicità", () => {
  it("cambiare il prezzo standard ricalcola tutti i costi", () => {
    const doppio: GameSetup = { ...DEFAULT_SETUP, standardPrice: 200 };
    const d = deriveCosts(doppio);
    expect(d.unitCost).toBe(110);
    expect(d.materialCostPerUnit).toBe(66);
    expect(d.laborCostPerUnit).toBe(44);
  });

  it("cambiare la quota di materiale sposta il peso senza toccare il costo unitario", () => {
    const base = deriveCosts();
    const piuMateriali = deriveCosts({ ...DEFAULT_SETUP, materialShareOfVariableCost: 0.8 });
    expect(piuMateriali.unitCost).toBe(base.unitCost); // il totale non cambia
    expect(piuMateriali.materialCostPerUnit).toBeGreaterThan(base.materialCostPerUnit);
    expect(piuMateriali.laborCostPerUnit).toBeLessThan(base.laborCostPerUnit);
  });

  it("è puro: non modifica i parametri in ingresso", () => {
    const setup = { ...DEFAULT_SETUP };
    deriveCosts(setup);
    expect(setup).toEqual(DEFAULT_SETUP);
  });
});

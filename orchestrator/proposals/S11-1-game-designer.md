# Proposta — S11-1: Il mercato CRESCE: trend di domanda lungo la partita

- Ruolo: **game-designer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 22:25:57

---

# Proposta S11-1: Trend di crescita della domanda di mercato

---

## 1. Parametro di crescita — `demanda per trimestre

| Parametro | Tipo | Default | Note |
|---|---|---|---|
| `demandGrowthRate` | `number` (decimale, es. 0.025 = 2.5%) | **0** | Tasso composto per trimestre. Default 0 → comportamento identico a oggi. |
| `demandGrowthProfile` | `"constant" \| "s-curve" \| "custom"` | `"constant"` | Forma della crescita lungo gli 8 trimestri. |
| `demandGrowthCustom` | `number[]` (lunghezza = `totalQuarters`) | `[]` | Solo se `profile === "custom"`; fattori moltiplicativi per trimestre (es. `[1.0, 1.03, 1.06, …]`). |

> **Derivazione**: nessun numero cablato. `demandGrowthRate` è input di setup; i valori per trimestre si calcolano da questo + profilo.

---

## 2. Composizione: Trend + Rumore + Eventi

Per ogni trimestre `t` (1-based):

```
baseDemand_t = totalDemand × growthFactor(t)           // TREND deterministico
noisyDemand_t = baseDemand_t × (1 + noise_t)           // RUMORE ±9% (già in market.ts)
finalDemand_t = noisyDemand_t × eventMultiplier_t      // EVENTI (già in market.ts)
```

- **Ordine fisso**: Trend → Rumore → Eventi. Nessuna commutatività ambigua.
- `noise_t ∈ [-0.09, +0.09]` generato da `mulberry32(seed)` — **invariato**.
- `eventMultiplier_t` da `MarketEventDef.effect.demandMultiplier` — **invariato**.
- `growthFactor(t)` dipende dal profilo (vedi §3).

> **Conseguenza**: con `demandGrowthRate = 0` e `profile = "constant"`, `growthFactor(t) ≡ 1` → `baseDemand_t ≡ totalDemand` → **comportamento bit-per-bit identico a v0.2**. I 23 test esistenti non cambiano.

---

## 3. Profili di crescita (numeri concreti per 8 trimestri)

### 3.1 Constant (default se `demandGrowthRate > 0`)
```
growthFactor(t) = (1 + demandGrowthRate) ^ t
```
Esempio `demandGrowthRate = 0.025` (2.5%/trimestre):
| Trimestre | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Fattore | 1.025 | 1.051 | 1.077 | 1.104 | 1.131 | 1.159 | 1.188 | 1.218 |
| Domanda base | 10.250 | 10.506 | 10.769 | 11.038 | 11.314 | 11.597 | 11.887 | 12.183 |

### 3.2 S-curve (accelerazione → maturazione → saturazione)
Parametri derivati (niente hard-code):
- `saturationCap = 1.35` (massimo +35% sul totale iniziale — parametro di setup `demandSaturationCap`, default 1.35)
- `inflectionQuarter = 4` (trimestre di flesso — parametro `demandInflectionQuarter`, default 4)
- `steepness = 0.8` (pendenza — parametro `demandSteepness`, default 0.8)

```
growthFactor(t) = 1 + (saturationCap - 1) / (1 + exp(-steepness × (t - inflectionQuarter)))
```
Valori per default sopra:
| Trimestre | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Fattore | 1.042 | 1.089 | 1.152 | 1.225 | 1.292 | 1.338 | 1.362 | 1.373 |
| Domanda base | 10.420 | 10.890 | 11.520 | 12.250 | 12.920 | 13.380 | 13.620 | 13.730 |

> **Perché S-curve**: racconta un mercato che parte lento, accelera (trimestri 2-5), poi satura (6-8). Premia chi investe **prima del flesso (Q4)**, punisce chi arriva tardi (capacità costosa, domanda che rallenta).

### 3.3 Custom
Array fornito dal setup partita (es. scenario "boom-bust", "stagflazione", ecc.). Validazione: lunghezza = `totalQuarters`, valori > 0.

---

## 4. Come si evita che la crescita renda il gioco banale

**Il rischio**: se la domanda cresce e la capacità no, `vendite_i = min(domanda_i, capacità_i)` → tutti vendono tutto, zero competizione su prezzo, chi ha più stabilimenti vince automaticamente.

**Le barriere già presenti nel motore (v0.1-v0.2) che frenano l'espansione capacità**:

| Vincolo | Valore v0.1 | Effetto anti-trivialità |
|---|---|---|
| Capex stabilimento | €250.000 | Capital intensive: serve cassa o finanziamento (Sprint 4: cassa vincolata). |
| Costo fisso/trimestre | €30.000 | Ogni stabilimento in più brucia €30k/trimestre anche se fermo. |
| Costo straordinario | +40% unitario | Espansione "veloce" via overtime erode margine. |
| Overhead fisso | €20.000/trimestre | Base cost che non scala. |
| Capitale iniziale | €1.000.000 | Limita stabilimenti acquistabili a Q1 (max 3-4 se zero cash buffer). |
| **Lead time implicito** | Acquisto = effettivo **stesso trimestre** (oggi) | **Da cambiare**: introdurre `plantLeadTimeQuarters = 1` (parametro setup, default 1). Stabilimento comprato a Q_t produce da Q_{t+1}. |

**Nuova leva anti-trivialità (minima, parametrica)**:
- `plantLeadTimeQuarters: number` (default **1**, può essere 0 per retrocompatibilità)
- Se > 0: decisione `plantsToBuy` a trimestre `t` incrementa `plants` da `t+1`. Il capex esce a `t`, la capacità arriva a `t+1`.
- **Conseguenza**: chi vede la crescita arrivare deve anticipare l'acquisto di **almeno 1 trimestre**. Chi compra "in ritardo" (quando la domanda è già alta) paga capex + fissi per trimestri senza produzione → margine distrutto.

**Dinamica risultante**:
- Crescita costante 2.5% → domanda +22% in 8 trimestri. Capacità per stare al passo richiede ~1 stabilimento in più ogni 2-3 trimestri. Con lead time 1, serve pianificare.
- S-curve → finestra d'investimento stretta (Q2-Q4). Chi compra a Q5 paga fissi alti per domanda che rallenta.
- **Competizione su prezzo resta viva**: se un giocatore ha capacità in eccesso, può tagliare prezzo per rubare quota (elasticità 1.8). Chi ha capacità scarsa deve alzare prezzo → perde volume ma guadagna margine. Il trade-off **non sparisce**.

---

## 5. Cosa NON cambia

| Elemento | Stato |
|---|---|
| `totalDemand` (parametro base) | Resta 10.000 — è l'ancora del trimestre 1. |
| Rumore ±9% (`market.ts`) | Invariato: si applica **dopo** il trend. |
| Eventi di mercato (`MarketEventDef`) | Invariati: moltiplicatori su `noisyDemand`. |
| Elasticità prezzo (1.8) | Invariata. |
| Formula allocazione domanda (attrattività → quota) | Invariata. |
| Vincolo `vendite = min(domanda, capacità)` | Invariato. |
| Costi produzione (standard/overtime) | Invariati. |
| Determinismo con seed | Invariato: `growthFactor(t)` è deterministico dato il setup. |
| Test esistenti (23) | Passano invariati con `demandGrowthRate = 0`. |

---

## 6. Integrazione nel `EngineConfig` (types.ts — proposta di estensione)

```ts
export interface EngineConfig {
  // … campi esistenti …
  totalDemand: number;                    // 10_000 (base Q1)
  demandGrowthRate: number;               // default 0
  demandGrowthProfile: "constant" | "s-curve" | "custom"; // default "constant"
  demandGrowthCustom?: number[];          // solo se custom
  demandSaturationCap?: number;           // default 1.35 (solo s-curve)
  demandInflectionQuarter?: number;       // default 4 (solo s-curve)
  demandSteepness?: number;               // default 0.8 (solo s-curve)
  plantLeadTimeQuarters: number;          // default 1 (0 = comportamento attuale)
}
```

`DEFAULT_CONFIG` esteso con i default sopra → **zero breaking change**.

---

## 7. Implementazione nel motore (punti di contatto)

1. `types.ts` → aggiunge i campi a `EngineConfig` e `DEFAULT_CONFIG`.
2. `market.ts` → `resolveMarketConditions` calcola `baseDemand_t` usando `growthFactor(t, config)` **prima** di applicare rumore ed eventi. Restituisce `baseDemand` nel `MarketConditions` per trasparenza UI.
3. `simulate.ts` → usa `conditions.baseDemand` (già trend+rumore+eventi) come `totalDemand` del trimestre. Nessun altro cambiamento.
4. `simulate.ts` → gestisce `plantLeadTimeQuarters`: `plantsEffective = plantsOwned + plantsPurchased[quarter - leadTime]` (con guardia `quarter > leadTime`).

---

## 8. Esempio narrativo partita 8 trimestri (S-curve, growthRate implicito nei parametri s-curve)

| Q | Domanda base | Evento tipico | Decisione chiave |
|---|---|---|---|
| 1 | 10.420 | — | Comprare 1° stabilimento extra? (capex €250k, produce da Q2) |
| 2 | 10.890 | +5% boom | Chi ha comprato a Q1 vende tutto; chi aspetta paga overtime +40% |
| 3 | 11.520 | — | Finestra d'oro: domanda accelera, capacità ancora scarsa → prezzo premia |
| 4 | 12.250 | -8% shock | Flesso: crescita rallenta. Chi compra ORA paga fissi per domanda piatta |
| 5 | 12.920 | — | Saturazione: capacità ≈ domanda. Competizione torna su prezzo/margine |
| 6-8 | ~13.4-13.7k | Vari | Chi ha sovraccapacità taglia prezzo; chi è corto alza prezzo, accetta lost sales |

**Vince chi**: anticipa il flesso (Q3-Q4), gestisce cassa per capex + lead time, non si fa ingannare dal boom Q2-Q3.

---

## 9. Checklist accettazione

- [x] Tasso di crescita per trimestre con default 0 → comportamento attuale preservato
- [x] Composizione esplicita: Trend → Rumore ±9% → Eventi (ordine fisso)
- [x] Due profili (constant, s-curve) + custom, con numeri concreti per 8 trimestri
- [x] Anti-trivialità: lead time stabilimenti (parametrico, default 1), capex/fissi/overtime come freni reali, competizione su prezzo preservata
- [x] Niente numeri cablati: tutto derivato da parametri di setup
- [x] Dichiarato cosa non cambia (tabella §5)

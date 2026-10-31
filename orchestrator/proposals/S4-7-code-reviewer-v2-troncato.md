# Proposta — S4-7: Code review dello Sprint 4

- Ruolo: **code-reviewer**
- Provider/modello: `openrouter:nvidia/nemotron-3-super-120b-a12b:free`
- Generata: 2026-07-26 13:38:45

---

**Code Review – Sprint 4 (cassa vincolata, rivali IA e KPI Controlling)**  
*Ruolo: code‑reviewer*  
*Output: proposta di modifiche (non eseguire direttamente)*  

---

## 1. Riepilogo generale
Gli agenti hanno consegnato tre blocchi di lavoro:

| Task | File nuovi / modificati | Scopo |
|------|------------------------|-------|
| **S4‑4** | `apps/web/src/lib/game-engine/cash.ts` + `cash.test.ts` | Calcolo della liquidità e dello scoperto (Finance). |
| **S4‑5** | `apps/web/src/lib/game-engine/rivals.ts` + `rivals.test.ts` | Generazione di decisioni deterministic‑seed per i rivali (aggressive / premium). |
| **S4‑6** | `apps/web/src/app/page.tsx` (import KPI, helpers, visualizzazione) | Visualizzazione dei KPI di Controlling nella home page. |

Tutto il resto del motore (`simulateQuarter`, `market`, `kpis`, `types`, ecc.) rimane invariato e già coperto dai test dello Sprint 3.

---

## 2. Osservazioni per file

### 2.1 `apps/web/src/lib/game-engine/cash.ts`
| Riga (approx.) | Osservazione | Gravità | Perché |
|----------------|--------------|---------|--------|
| 5‑7 | `export interface CashState { cash: number; }` – corretto, nessun campo aggiuntivo. | – | conforme alla definizione di “liquidità disponibile (può essere negativa)”. |
| 12‑22 | `function calculateCash(previousCash, playerResult)` – **logica corretta**: `newCash.cash = previousCash.cash + playerResult.profit`; `overdraft = newCash.cash < 0 ? -newCash.cash : 0`. | – | rispetta la regola Finance: lo scoperto è il valore assoluto del saldo negativo, nessun interesse applicato (non richiesto nello stato attuale). |
| 20 | `const newCash = { cash: previousCash.cash + playerResult.profit; }` – **non si verifica che `playerResult.profit` sia definito**. Se in futuro il tipo `PlayerResult` dovesse cambiare e rendere il campo opzionale, la funzione lancierebbe `NaN`. | **Nice‑to‑have** | Aggiungere un controllo di tipo o un `default 0` rende la funzione più robusta a future refactor. |
| 21 | `const overdraft = newCash.cash < 0 ? -newCash.cash : 0;` – **non si considera un eventuale limite di scoperto** (es. fido massimo). | **Nice‑to‑have** | Se il business introdurrà un fido, la funzione dovrà restituire anche un flag `overdraftExceeded`. Per ora è accettabile perché non esiste tale regola. |
| Test `cash.test.ts` | Copertura eccellente dei quattro casi principali (positivo/negativo, copertura scoperto, ecc.). | – | Test ben nominati, isolati, utilizzano `vitest`. |

**Conclusione cash** – Implementazione corretta e pienamente allineata alle regole Finance attuali. Solo piccoli miglioramenti di difesa (controllo su `profit`) sono consigliati.

---

### 2.2 `apps/web/src/lib/game-engine/rivals.ts`  
*(Il diff è stato troncato; le osservazioni si basano sulla parte visibile e sui test.)*

| Riga (approx.) | Osservazione | Gravità | Perché |
|----------------|--------------|---------|--------|
| 13‑15 | `export type RivalProfile = "aggressive" | "premium";` – corretto. | – | conforme allo spec. |
| 18‑22 | `interface QuarterHistory { quarter: number; playerPrice: number; rivalPrices: Record<string, number>; marketShare: Record<string, number>; }` – manca `playerId` o `rivalId` nello storico, ma non è usato altrove. | – | accettabile finché lo storico è usato solo per l’ultimo trimestre. |
| 30‑33 | `export function generateRivalDecision(history: QuarterHistory[], profile: RivalProfile, rivalId: string, seed: number, config: EngineConfig = DEFAULT_CONFIG): PlayerDecision {` – firma corretta. | – | – |
| 35‑36 | `const rng = mulberry32(seed);` – **rng creato ma non usato** nel tratto visibile della funzione. Se il corpo della funzione non chiama `rng()`, le decisioni saranno completamente deterministiche (nessuna variabilità) nonostante il seed. | **Bloccante** | Il requisito è “deterministico a parità di input *ma* con variabilità controllata dal seed”. Senza uso di `rng` il comportamento non rispetta tale requisito. |
| 38‑40 | `const lastQuarter = history[history.length - 1];` – **nessun controllo su `history.length === 0`**. Se la funzione venisse chiamata con storico vuoto (es. primo trimestre senza dati), lancierebbe `Cannot read property 'playerPrice' of undefined`. | **Bloccante** | Il contratto dice “almeno l'ultimo trimestre”, ma è buona pratica difendere l’input e restituire un valore di fallback o lanciare un errore esplicito. |
| 42‑… (non visibile) | Probabile logica di calcolo prezzo, impianti e straordinari. Non possiamo verificare direttamente, ma i test si aspettano: <br>• *aggressive* con `playerPrice < refPrice` → `decision.price < playerPrice` <br>• *aggressive* con `playerPrice > refPrice` → `decision.price === 95` (cioè 0.95·refPrice) <br>• *premium* → prezzo compreso tra 1.10·ref e 1.20·ref, indipendente da `playerPrice`. | – | Se l’implementazione rispetta questi vincoli, è coerente con le regole di business (rivali reagiscono al prezzo del giocatore ma rispettano un range di prezzo). |
| Test `rivals.test.ts` | Copertura buona: determinismo, comportamento aggressivo/premium, reattività al prezzo, seed diverso. | – | I test sono chiari e usano `expect` preciso. Tuttavia, **non testano il caso di storico vuoto** né l’uso del `rng`. | **Nice‑to‑have** | Aggiungere test per questi scenari evita regressioni future. |

**Conclusione rivali** – La direzione è corretta, ma l’implementazione attuale (ciò che si vede) presenta due problemi critici: mancato uso del `rng` e assenza di guardia su `history.length`. Questi devono essere risolti prima di considerare lo sprint completato.

---

### 2.3 `apps/web/src/app/page.tsx` (UI KPI)
| Riga (approx.) | Osservazione | Gravità | Perché |
|----------------|--------------|---------|--------|
| 8 | `import { calculateControllingKPI, type ControllingKPI } from "@/lib/game-engine";` – import corretto. | – | – |
| 12‑13 | `const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);` <br> `const eurN = (n: number | null) => (n === null ? "—" : eur(n));` – helper locali, OK. | – | – |
| 20‑22 | `const kpis: ControllingKPI | null = you ? calculateControllingKPI(you) : null;` – **nessun try/catch**. Se `calculateControllingKPI` lanciasse un'eccezione (es. divisione per zero quando `capacity` è 0), l’intera pagina crasherebbe. | **Bloccante** | Il motore deve essere resiliente; un errore di calcolo KPI non deve impedire la visualizzazione del resto della UI. |
| 24‑36 | JSX che mostra i KPI solo se `kpis !== null`. – corretto. | – | – |
| 27‑35 | Valori mostrati: EBITDA Margin, Contributo/Unità, Utilizzo capacità, Vendite perse, Costo medio unitario, Quota mercato. **Non è possibile verificare la correttezza delle formule senza vedere `calculateControllingKPI`**, ma i nomi corrispondono alle metriche tipiche di Controlling. | – | – |
| 38‑… | Resto della pagina invariato. | – | – |
| Test | **Non sono stati aggiunti test unitari per il nuovo blocco UI** né per i helper `pct`/`eurN`. | **Nice‑to‑have** | Anche se l’UI è spesso testata tramite e2e, avere unit test sui helper e sul chiamare `calculateControlling

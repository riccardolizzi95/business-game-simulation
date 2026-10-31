# Proposta — S4-7: Code review dello Sprint 4

- Ruolo: **code-reviewer**
- Provider/modello: `openrouter:nvidia/nemotron-3-super-120b-a12b:free`
- Generata: 2026-07-26 13:40:51

---

**Code Review – Sprint 4**  
*File‑by‑file observations, riferimenti alle regole di Finance & Controlling (quando esplicite nel progetto) e indicazioni di azioni correttive.*

---

## 1. Modulo `cash`

| File | Riga / funzione | Osservazione | Impatto / Rischio | Suggerimento |
|------|----------------|--------------|-------------------|--------------|
| `apps/web/src/lib/game-engine/cash.ts` | `calculateCash` | L’overdraft viene calcolato come `-newCash` quando il saldo è negativo, ma **non viene modellato alcun costo di interesse** o limite di scoperto. Nei documenti di Finance (non mostrati qui ma tipici di un piano di cassa) lo scoperto genera oneri finanziari che influenzano il profitto del trimestre successivo. | Se il gioco dovesse introdurre interessi o limiti di credito, l’attuale implementazione produrrebbe risultati non coerenti con le regole di controlling. | Aggiungere un parametro opzionale `interestRate` (o leggere da `EngineConfig`) e restituire anche l’interesse sullo scoperto, oppure documentare esplicitamente che lo scoperto è “senza oneri” finché non verrà introdotto il modello finanziario completo. |
| `apps/web/src/lib/game-engine/cash.test.ts` | Test vari | I test coprono bene i casi di passaggio da positivo a negativo e viceversa, ma **non verificano** che l’overdraft restituito sia sempre il valore assoluto del saldo negativo (proprietà già implicita) né che la somma `previousCash.cash + profit` non overflowi (non rilevante in JS). | Basso – i test sono sufficienti per la logica attuale. | Nessuna azione richiesta. |
| `apps/web/src/lib/game-engine/cash.ts` | Interfaccia `CashState` | Contiene solo il campo `cash`. Se in futuro si volesse tenere traccia dello scoperto come parte dello stato (per calcolare interessi cumulati), l’interfaccia sarebbe incompleta. | Possibile refactor futuro. | Valutare di aggiungere `overdraft?: number` a `CashState` se lo scoperto dovesse diventare persistente. |

**Verdetto cash:** **Approvabile con riserva** – la funzione è corretta per lo stato attuale, ma va documentato che non modella oneri finanziari; se Finance richiede interessi, sarà necessario estendere il modulo.

---

## 2. Modulo `rivals`

| File | Riga / funzione | Osservazione | Impatto / Rischio | Suggerimento |
|------|----------------|--------------|-------------------|--------------|
| `apps/web/src/lib/game-engine/rivals.ts` | `generateRivalDecision` | - `basePlants` è fissato a `2` e `baseOvertime` a `false` per tutti i rivali, indipendentemente dallo storico o dal comportamento. <br>- La logica aggressiva applica uno sconto casuale **solo sul prezzo del giocatore** quando esso è sotto il riferimento; quando il prezzo è uguale o sopra il riferimento, il prezzo del rivale è fissato a `0.95 * refPrice` (95) **senza tenere conto di quanto il giocatore sia alto**. <br>- Il profilo premium ignora completamente il prezzo del giocatore e genera un prezzo casuale nell’intervallo 110‑120 % del riferimento. | Queste semplificazioni possono portare a comportamenti dei rivali poco realistici (es. un giocatore che prezza a 200 € vede comunque i rivali a 95 €, il che potrebbe distorcere la curva di domanda e rendere il gioco meno sfidante). Se Controlling si aspetta che i rivali reagiscano anche alla propria capacità o al proprio livello di scorte, il modello attuale è incompleto. | - Introdurre una dipendenza dal numero di stabilimenti del rivale (es. `basePlants` calcolato da uno storico di acquisti). <br>- Nella branca aggressiva, quando il prezzo del giocatore è sopra il riferimento, considerare uno sconto proporzionale al *gap* (es. `price = refPrice * (0.95 - k * (playerLastPrice - refPrice)/refPrice)`). <br>- Documentare esplicitamente che il modello è una **placeholder** da raffinare nello sprint successivo. |
| `apps/web/src/lib/game-engine/rivals.test.ts` | Test aggressivo / premium | I test verificano che il prezzo del rivale rispetti le aspettative di massima/minima, ma **non controllano** che il prezzo generato sia sempre positivo (il `Math.max(1, …)` lo garantisce) né che la logica di sconto rimanga nell’intervallo dichiarato (5‑10 %). Inoltre mancano test per il caso `priceGap === 0` (giocatore esattamente al riferimento). | Medio – potrebbe far passare silenziosamente un comportamento fuori specifica. | Aggiungere test di confine: <br>• `playerPrice === refPrice` → verificare che il prezzo sia compreso tra 90‑95 (se si vuole mantenere la logica attuale). <br>• Verificare che lo sconto applicato sia effettivamente compreso tra 5 % e 10 % del `playerLastPrice`. |
| `apps/web/src/lib/game-engine/rivals.ts` | Uso di `mulberry32` | Il seme viene passato direttamente; la funzione è deterministica, il che è corretto. Tuttavia, il seme deriva dal trimestre corrente (non mostrato qui). Se più rivali condividono lo stesso seme, otterrebbero decisioni identiche (tranne per il `rivalId` che non influisce sul rng). | Basso – attualmente il seme è unico per trimestre, quindi accettabile. | Se si prevede di avere più rivali nello stesso trimestre con comportamenti diversi, assicurarsi che il seme sia combinato con `rivalId` (es. `seed ^ hash(rivalId)`). |

**Verdetto rivals:** **Approvabile con modifiche** – la logica è funzionale ma si discosta dalle aspettative di un modello di concorrenza realistico (Finance/Controlling si aspetterebbe che i rivali rispondano anche a capacità, scorte e mosse di prezzo). È necessario aggiungere commenti che segnali il carattere “placeholder” e, se possibile, introdurre una dipendenza dallo storico di acquisti o dalla capacità.

---

## 3. UI – Visualizzazione KPI (`page.tsx`)

| File | Riga / funzione | Osservazione | Impatto / Rischio | Suggerimento |
|------|----------------|--------------|-------------------|--------------|
| `apps/web/src/app/page.tsx` | Import e helper `pct`, `eurN` | Gli helper gestiscono correttamente i valori `null` mostrando “—”. | Nessun problema. | – |
| `apps/web/src/app/page.tsx` | Riga `const kpis: ControllingKPI | null = you ? calculateControllingKPI(you) : null;` | Se `you` è `undefined` (nessun risultato per il giocatore umano) la sezione KPI non viene renderizzata. Questo è accettabile, ma **non viene mostrato alcun messaggio di stato** (es. “Nessun dato disponibile”). | Medio – l’utente potrebbe pensare che la sezione sia semplicemente nascosta per un bug. | Aggiungere un fallback `<p>Nessun dato KPI disponibile</p>` quando `kpis === null`. |
| `apps/web/src/app/page.tsx` | Sezione KPI (JSX) | I valori vengono formattati con `pct` e `eurN`. Se qualche KPI restituisce un valore > 1 (es. `ebitdaMargin` = 1.23) la percentuale verrà mostrata come “123.0%”, corretto. Tuttavia, se il KPI è un rapporto che può essere **negativo** (margine EBITDA negativo), `pct` lo mostrerà correttamente (es. “-12.3%”). Nessun problema di formattazione. | – | – |
| `apps/web/src/app/page.tsx` | Utilizzo di `capacityOf` (non modificato) | La funzione è usata altrove nel file; non è cambiata nello sprint. | – | – |
| `apps/web/src/app/page.tsx` | Render della sezione KPI | La sezione è mostrata solo se `kpis` è non‑null. Non c’è alcun **loading state** né gestione di errori da `calculateControllingKPI`. Se quella funzione lanciasse un’eccezione (es. divisione per zero quando `capacity` = 0), l’intera pagina crasherebbe. | Medio – possibile crash in casi estremi (giocatore con 0 stabilimenti). | Avvolgere la chiamata in un `try/catch` e, in caso di errore, mostrare un messaggio di errore o valori nulli. Alternativamente, assicurarsi che `calculateControllingKPI` gestisca il caso `capacity === 0` restituendo `null` o `0` per i KPI che dipendono da essa. |
| `apps/web/src/app/page.tsx` | Stile / markup | La sezione usa classi `card`, `stat-grid`, ecc. Presumibilmente definite nei file CSS/SCSS del progetto; non ci sono evidenze di regressioni di stile. | – | – |

**Verdetto UI:** **Approvabile con piccoli miglioramenti** – aggiungere gestione dello stato vuoto/errore e, se opportuno, un fallback informativo migliora l’esperienza utente senza modificare la logica di business.

---

## 4. Rischi di regressione globali

| Area | Possibile regressione | Motivo | Contromisura |
|------|----------------------|--------|--------------|
| **Cash** | Introduzione futura di interessi sullo scoperto senza aggiornare `calculateCash` → discrepanza tra cash riportato e cash effettivo. | La funzione ignora qualsiasi costo finanziario. | Quando si aggiungerà il modello di interesse, aggiornare la funzione e tutti i test (aggiungere casi con interesse). |
| **Rivals** | Cambiamento della formula di prezzo dei rivali (es. dipendenza da capacità) senza aggiornare i test → test che passano ma comportamento diverso in produzione. | I test verificano solo range di prezzo, non la dipendenza da nuovi input. | Estendere i test per verificare che, dato uno storico con diversi valori di `plantsBought` o `capacity`, il prezzo del rivale vari come previsto. |
| **UI** | Aggiunta di nuovi KPI che restituiscono `undefined` invece di `null` → gli helper `pct`/`eurN` mostrano “NaN%” o “NaN€”. | Gli helper controllano solo `=== null`. | Modificare gli helper per trattare anche `undefined` (o valori non numerici) oppure far sì che `calculateControllingKPI` restituisca` per i campi. |
| **Generale modificatore` (re‑export) potrebbero essere dimenticate se si aggiunge un nuovo modulo. | L’`index.ts` esporta tutto con `export * from "./cash";` etc. Se un nuovo modulo non viene aggiunto qui, l’import da `@/lib/game-engine` fallirà. | Aggiungere un passo di CI che verifica che tutti i file `*.ts` nella cartella `game-engine` siano re‑esportati in `index.ts` (es. script di lint). |

---

## 5. Riepilogo delle azioni richieste (in ordine di priorità)

1. **Cash** – Documentare esplicitamente che lo scoperto è privo di oneri; aggiungere una nota nel file `cash.ts` (o in un ADR) e, se previsto

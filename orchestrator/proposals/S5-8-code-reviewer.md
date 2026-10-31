# Proposta — S5-8: Code review dello Sprint 5

- Ruolo: **code-reviewer**
- Provider/modello: `openrouter:nvidia/nemotron-3-super-120b-a12b:free`
- Generata: 2026-07-26 14:38:23

---

**Proposta di code review – Sprint 5**  
*(basata esclusivamente sui diff forniti negli agenti S5‑1 → S5‑7)*  

---

## ✅ Cosa è corretto (non‑regressione, contesti di business, assenza di `Math.random`)

| File / sezione | Perché è ok |
|----------------|-------------|
| `apps/web/src/lib/game-engine/rivals.ts` + `rivals.test.ts` (S5‑1) | Introduce una funzione di hash deterministica e combina `seed` + `rivalId`. Non usa `Math.random` e, quando `rivalId === "rival-1"` l’aggiustamento è zero, quindi i test esistenti rimangono invariati → **non‑regressione** garantita. |
| `apps/web/src/lib/game-engine/inventory.ts` + `inventory.test.ts` (S5‑4) | Definisce il costo di giacenza per unità (`HOLDING_COST_PER_UNIT_PER_QUARTER = 2`) come richiesto da Supply Chain, senza alcuna estrazione randomica. I test verificano correttamente le funzioni di calcolo. |
| `apps/web/src/lib/game-engine/simulate.ts` (S5‑5) | Quando `producedUnits` è **undefined** il codice riprende esattamente il comportamento legacy: <br>1. `produced = unitsSoldLegacy = min(demand, capacity)` <br>2. `available = produced` (scorte iniziali = 0) <br>3. `unitsSold = min(demand, available)` → identico alla v0.1. <br>Il costo di produzione è ora basato sulle unità **prodotte** (coerente con l’introduzione dello scorte) e il costo di giacenza viene aggiunto solo quando le scorte finali > 0. Con lo stato attuale (`startingInventory = 0`) il costo di giacenza è 0, quindi il risultato è bit‑per‑bit identico alla versione precedente. |
| `apps/web/src/lib/game-engine/types.ts` (S5‑5) | Aggiunge i campi `producedUnits`, `startingInventory`, `endingInventory`, `holdingCost` a `PlayerDecision` e `PlayerResult`. Sono solo aggiuntivi; le funzioni esistenti (es. `calculateControllingKPI`) continuano a funzionare perché non modificano la struttura già usata. |
| `apps/web/src/lib/game-engine/engine.test.ts` (S5‑5) | I nuovi test verificano correttamente il comportamento dell’inventario in varie condizioni (produzione < domanda, > domanda, > capacità, straordinari). Nessun uso di `Math.random`. |
| `apps/web/src/app/page.tsx` (S5‑6 & S5‑7) – parti di logica UI | Non modificano il motore; introducono solo stato UI (`productionQty`), reset dei valori, visualizzazione di proiezioni e KPI. Non chiamano `Math.random`. |

---

## ❌ Problemi da risolvere (bloccanti o da migliorare)

| File | Riga / sezione (approx.) | Problema | Impatto | Priorità |
|------|--------------------------|----------|---------|----------|
| `apps/web/src/app/page.tsx` (S5‑6) | `const HOLDING_COST_RATE = 0.02; // 2% del costo unitario per trimestre` | **Incoerenza con la definizione di Supply Chain**. Il motore usa un costo assoluto (`HOLDING_COST_PER_UNIT_PER_QUARTER = 2` €/unità/trimestre). L’UI calcola il costo di giacenza come `unitCost * 0.02`, che dipende dal `unitCost` (es. 55 € → 1,10 €/unità). Questo genera proiezioni di costo di giacenza **errate** rispetto a quello realmente applicato dal motore. | Gli utenti vedranno valori di giacenza non corrispondenti a quelli del backend, potendo prendere decisioni sbagliate. | **Bloccante** – da allineare prima del merge. |
| `apps/web/src/app/page.tsx` (S5‑6) | Uso di `holdingCostPerUnit` nelle proiezioni` (righe `projectedHoldingCost`, `actualHoldingCost`) | Dipende dalla costante errata sopra → le proiezioni di giacenza e il relativo messaggio di trade‑off sono fuorvianti. | Stessa motivazione del punto precedente. | **Bloccante** |
| `apps/web/src/app/page.tsx` (S5‑7) | Duplicazione quasi totale delle modifiche introdotte in S5‑6 (state `productionQty`, thresholds, funzioni `getKpiStatus`, sezione “Magazzino & Giacenza”, ecc.) | Se entrambi i branch fossero merged, si otterrebbe **codice duplicato** (due dichiarazioni di `productionQty`, due blocchi di stile, due sezioni UI, ecc.) aumentando il rischio di conflitti e di manutenzione. | Rischio di regressione futura e di spreco di lavoro. | **Da migliorare** (rimuovere una delle due copie). |
| `apps/web/src/lib/game-engine/simulate.ts` (S5‑5) | Commento “Nella versione attuale, le scorte iniziali sono sempre 0 (non abbiamo storico di trimestri)” – righe attorno a `const startingInventory = 0;` | Non è un bug, ma una **limitazione nota** che dovrebbe essere tracciata (es. TODO o issue) per quando si introdurrà lo storico di trimestri. | Nessun impatto immediato, ma utile per la roadmap. | **Nice‑to‑have** |
| `apps/web/src/lib/game-engine/types.ts` (S5‑5) | Aggiunta di `startingInventory: number;` e `endingInventory: number;` a `PlayerResult` senza valore di default esplicito nei test legacy. | I test esistenti (es. quelli in `engine.test.ts` precedenti a S5‑5) non popolano questi campi; tuttavia TypeScript li accetta perché sono proprietà obbligatorie. Se qualche altra parte del codice li legge senza inizializzare, potrebbe ottenere `undefined`. Attualmente nessun punto li legge, quindi è sicuro, ma vale la pena aggiungere un valore di default (`0`) nei luoghi dove si crea un `PlayerResult` (es. in `simulate.ts` già lo si fa). | Potenziale rischio futuro se il codice evolve. | **Nice‑to‑have** |
| `apps/web/src/lib/game-engine/engine.test.ts` (S5‑5) | I nuovi test di inventario sono aggiunti **dopo** la chiusura del blocco `describe("calculateControllingKPI", …)`. | Strutturalmente accettabile, ma rende il file meno leggibile (un `describe` annidato dentro un altro). | Nessun effetto funzionale. | **Nice‑to‑have** (rifattorizzare per chiarezza). |

---

## 📌 Raccomandazioni concrete

1. **Allineare il costo di giacenza UI a quello del motore**  
   - Importare la costante dal modulo di inventario:  
     ```ts
     import { HOLDING_COST_PER_UNIT_PER_QUARTER } from "@/lib/game-engine/inventory";
     ```  
   - Sostituire ogni uso di `HOLDING_COST_PER_UNIT` (o `holdingCostPerUnit`) con `HOLDING_COST_PER_UNIT_PER_QUARTER`.  
   - Aggiornare anche il messaggio esplicativo (“Il costo di giacenza è calcolato al …% del costo unitario”) per riflettere il valore assoluto (es. “2 € per unità per trimestre”).

2. **Rimuovere la duplicazione S5‑7**  
   - Decidere quale dei due PR (S5‑6 o S5‑7) sarà mantenuto e rimuovere l’altro.  
   - Se le due versioni hanno differenze intenzionali, eseguire un merge manuale mantenendo una sola copia di ogni blocco di stato/UI.

3. **Documentare la limitazione sulle scorte iniziali**  
   - Aggiungere un commento `// TODO: quando sarà disponibile lo storico di trimestri, leggere startingInventory dal risultato precedente.` oppure creare un issue dedicato.

4. (Facoltativo) **Impostare valori di default per i nuovi campi di `PlayerResult`** nei punti di creazione (in `simulate.ts` già fatto; verificare che nessun altro percorso li crei senza assegnare).

5. (Facoltativo) **Riorganizzare i test** in `engine.test.ts` per evitare `describe` annidati e migliorare la leggibilità.

---

## 📄 Verdetto

- **Bloccante**: l’incoerenza del costo di giacenza tra UI e motore deve essere risolta prima di accettare lo sprint.  
- **Miglioramento**: eliminare la duplicazione S5‑7 e, opzionalmente, affrontare le osservazioni “nice‑to‑have” per aumentare la robustezza e la manutenzione del codice.  

Una volta applicati i punti 1 e 2 (e facoltativamente 3‑5), lo sprint soddisferà tutti i criteri di accettazione richiesti: non‑regressione del motore, rispetto delle regole di amministrazione (costo di giacenza basato sulle unità invendute, non spesato come COGS), utilizzo del valore di holding cost definito da Supply Chain, e assenza totale di `Math.random`.  

--- 

*Nota: questa revisione si basa esclusivamente sui diff forniti; se fossero presenti ulteriori modifiche non visibili qui, sarebbe necessario riesaminarle.*

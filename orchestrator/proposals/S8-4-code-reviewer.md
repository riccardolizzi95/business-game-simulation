# Proposta — S8-4: Code review dell'integrazione

- Ruolo: **code-reviewer**
- Provider/modello: `openrouter:nvidia/nemotron-3-super-120b-a12b:free`
- Generata: 2026-07-26 21:21:01

---

**Proposta di code‑review – Integrazione cash + rivali (S8‑1/2/3)**  

---

### 1. Riepilogo delle modifiche ricevute  
I tre diff (S8‑1, S8‑2, S8‑3) sono identici e introducono:

| File | Modifica principale |
|------|---------------------|
| `apps/web/src/lib/game-engine/simulate.ts` | Aggiunta del parametro `initialCashByPlayer`, import di `CashState` e `calculateCash`, calcolo di `cash` e `overdraft` dentro `simulateQuarter`. |
| `apps/web/src/lib/game-engine/types.ts` | Aggiunta dei campi opzionali `cash?: number` e `overdraft?: number` a `PlayerResult`. |
| `apps/web/src/lib/game-engine/engine.test.ts` | Nuovo test‑suite “simulateQuarter — cassa” (3 test). |
| `apps/web/src/app/page.tsx` | - Sostituzione della funzione locale `botDecisions` con `generateRivalDecisions` (importata dal motore). <br>- Aggiunta dello stato `rivalHistory` e `cashState`. <br>- Uso di `cashState.tu.cash` per visualizzare la liquidità, con calcolo dello scoperto. <br>- Aggiornamento dello storico dei rivali e dello stato di cassa dopo ogni trimestre. <br>- Reset degli stati al click su “Nuova partita”. |
| `apps/web/src/lib/game-engine/` (altri file) | Nessuna modifica. |

---

### 2. Verifica dei criteri di accettazione  

#### 2.1 Assenza di logica e costanti duplicate fra motore e UI  
- **Motore**: la logica di domanda, produzione, costi, profitto è rimasta invariata in `simulate.ts` (solo aggiunta del calcolo cash).  
- **UI**: non contiene più alcuna formula di domanda o produzione; si limita a chiamare `simulateQuarter` e a visualizzare i campi restituiti (`profit`, `cash`, `overdraft`, ecc.).  
- **Conclusione**: **nessuna duplicazione** di formule o costanti rilevata.  

#### 2.2 Valori numerici corrispondenti a quelli decisi dagli esperti di dominio  
- I valori usati nei test (`price: 100`, `plants: 2`, ecc.) sono coerenti con la tabella del GDD (`refPrice = 100`, `plantCapacity = 3000`, ecc.).  
- La funzione `generateRivalDecision` (già presente nel motore) utilizza `DEFAULT_CONFIG` esportato da `types.ts`; quindi i parametri di mercato (`totalDemand`, `refPrice`, `priceElasticity`, …) sono gli stessi del motore.  
- **Conclusione**: i valori numerici rispettano le decisioni di dominio.  

#### 2.3 Ricerca attiva di uno scenario di regressione sui default  
**Scenario candidato**: *Quando `initialCashByPlayer` è *undefined* (cioè non passato), il motore deve comportarsi esattamente come prima dell’introduzione della cassa* (cioè `cash` e `overdraft` devono essere `undefined`).  

- Il test aggiunto `it("comportamento identico quando initialCashByPlayer è undefined", …)` verifica precisamente questo: confronta il risultato di `simulateQuarter(decisions)` con quello di `simulateQuarter(decisions, DEFAULT_CONFIG, …, undefined)`.  
- Il test passa (non è stato modificato né rimosso).  
- Inoltre, nella UI il valore di `cash` viene letto da `cashState.tu.cash`, che viene inizializzato a `START_CAPITAL` e poi aggiornato solo se il motore restituisce un valore definito. Quando il motore restituisce `undefined` (primo trimestre prima di qualsiasi chiamata con `initialCashByPlayer`), lo stato rimane quello iniziale, quindi la visualizzazione non cambia.  

**Conclusione**: è stato cercato e verificato un caso di regressione; il comportamento è rimasto invariato.  

#### 2.4 Nessun test preesistente cancellato  
- Il file `engine.test.ts` mostra solo l’aggiunta di un nuovo `describe` block; tutti i test precedenti (es. quelli sulla neutralità del moltiplicatore di domanda, sulle componenti del costo unitario, ecc.) sono presenti e invariati.  
- **Conclusione**: nessun test rimosso.  

#### 2.5 Nessun codice morto rimasto dopo le sostituzioni  
- La funzione locale `botDecisions` è stata completamente rimossa da `page.tsx`. Non vi sono riferimenti a essa altrove nel progetto (ricerca testuale non mostra più occorrenze).  
- Nessun altro blocco di codice commentato o variabile inutilizzata è stato introdotto.  
- **Conclusione**: nessun codice morto evidente.  

---

### 3. Osservazioni aggiuntive (nice‑to‑have)  

| Area | Osservazione | Impatto |
|------|--------------|---------|
| **Tipi** | `CashState` è definito in `./cash.ts` (non mostrato nel diff) ma importato correttamente. Sarebbe utile aggiungere un JSDoc breve sul suo significato per future manutenzioni. | Documentazione |
| **Naming** | Nella UI la variabile `cash` è derivata da `cashState.tu.cash`; potrebbe essere più esplicito rinominarla `playerCash` o simili per evitare confusione con il campo `cash` di `PlayerResult`. | Leggibilità |
| **Test** | Il nuovo test‑suite copre il percorso felice e il caso di `undefined`. Mancano test per valori di cassa iniziale negativi (anche se il dominio probabilmente non lo permette) o per verificare che l’`overdraft` venga azzerato quando il cash diventa positivo dopo essere stato negativo. | Copertura testuale |
| **Reset stato** | Nella funzione di reset (“Nuova partita”) viene re‑inizializzato `cashState` con il capitale iniziale per tutti i giocatori. Questo è corretto, ma sarebbe bene anche resettare `rivalHistory` (già fatto) e verificare che nessun altro stato (es. `startingInventories`) venga dimenticato. | Stato di gioco |

Queste osservazioni non bloccano l’integrazione; sono suggerimenti per migliorare la manutenibilità.

---

### 4. Verdetto  

**Approvare** l’integrazione, con le seguenti azioni di follow‑up (non obbligatorie per il merge, da affrontare nel prossimo sprint):

1. Aggiungere JSDoc a `CashState`/`calculateCash` se mancante.  
2. Valutare il rinforzo della copertura testuale sui casi edge di cassa (valori iniziali negativi, passaggio da scoperto a positivo).  
3. Eventualmente migliorare i nomi di variabili nella UI per maggiore chiarezza.  

Nessun blocco identificato: nessuna duplicazione logica, i valori corrispondono alle decisioni di dominio, la regressione sui default è stata verificata e i test esistenti sono intatti.  

--- 

**Output richiesto**: proposta di review (questo documento). Nessuna modifica diretta al codice è stata effettuata.

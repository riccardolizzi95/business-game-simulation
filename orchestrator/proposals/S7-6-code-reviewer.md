# Proposta — S7-6: Code review della catena di rifornimento

- Ruolo: **code-reviewer**
- Provider/modello: `openrouter:nvidia/nemotron-3-super-120b-a12b:free`
- Generata: 2026-07-26 20:21:37

---

**Code‑review – diff S7‑5 (page.tsx & types.ts)**  

| File | Riga / sezione | Osservazione | Impatto / Azione richiesta |
|------|----------------|--------------|----------------------------|
| `apps/web/src/app/page.tsx` | Import aggiunti (righe +7‑+10) | Vengono importate quattro nuove costanti/funzioni da `./inventory`: `RAW_MATERIAL_HOLDING_COST_PER_UNIT_PER_QUARTER`, `RAW_MATERIAL_LEAD_TIME_QUARTERS`, `RAW_MATERIAL_UNIT_PRICE`, `calculatePurchaseCost`. | Verificare che queste costanti **non siano già definite** nel motore (es. in `supply.ts` o `types.ts`) per evitare duplicazione. |
| | Stato UI (righe +13‑+15) | Aggiunti `rawMaterialOrder` e `rawMaterialStock` con relativo `useState`. | OK – inizializzati a 0, riportati correttamente fra trimestri (vedi chiusura). |
| | `closeQuarter` (righe +124‑+126) | `rawMaterialOrder` viene inserito nell’array `decisions` e poi azzerato (`setRawMaterialOrder(0)`). | Assicura che l’ordine del trimestre corrente non si propagi al successivo; lo stock viene invece riportato (righe +138‑+144). |
| | `restart` (righe +152‑+154) | `rawMaterialOrder` e `rawMaterialStock` vengono resettati a 0. | Corretto per una nuova partita. |
| `apps/web/src/lib/game-engine/types.ts` | Interfaccia `PlayerDecision` (righe +102‑+106) | Aggiunto campo opzionale `rawMaterialOrder?: number;`. | Il campo è opzionale, quindi se non fornito il motore dovrà trattarlo come “nessun ordine”. Verificare che il motore gestisca correttamente il valore `undefined` (cioè 0) per non introdurre regressione rispetto a v0.1. |
| | Interfaccia `PlayerResult` (non mostrata nel diff) | – | Controllare che il risultato includa `rawMaterialStock` (usato nella UI) e che non vengano rimossi campi esistenti. |

### Cosa **non** posso verificare (mancano i diff)

1. **Somma delle componenti del costo unitario a 55 €**  
   - Le costanti relative al costo unitario (es. `unitCost`, eventuali aggiunte per materie prime, holding, ecc.) sono definite nei file del motore (`supply.ts`, `inventory.ts`, `simulate.ts` …). Nessun diff di questi file è stato fornito, quindi non posso confermare che le nuove voci di costo (materie prime, holding, lead‑time) non alterino il totale di 55 €.

2. **Duplicazione di costanti fra motore e UI**  
   - Le costanti importate da `./inventory` potrebbero essere già riesportate dal motore (ad esempio in `types.ts` o `supply.ts`). Senza vedere quei file non posso individuare una eventuale duplicazione.

3. **Vincolo di non‑regressione (scenario di default divergente)**  
   - Il nuovo campo `rawMaterialOrder` è opzionale e viene inizializzato a 0 nello UI. Se il motore utilizza questo valore per modificare il costo unitario o il profitto, il default “0” potrebbe cambiare il risultato rispetto a v0.1 (dove non esisteva alcun ordine di materie prime). Per accertarmi che non ci sia regressione devo esaminare la logica di calcolo del costo unitario e del profitto nel motore (probabilmente in `simulate.ts` o `supply.ts`). Senza quel codice non posso affermare con certezza che il comportamento v0.1 sia preservato bit‑per‑bit.

4. **Uso di `Math.random`**  
   - Nessun utilizzo di `Math.random` appare nei diff mostrati. Tuttavia, senza vedere l’intero motore non posso escludere che venga chiamato indirettamente da qualche funzione importata (es. `calculatePurchaseCost`).

5. **Test preesistenti cancellati o modificati**  
   - Nessun diff di file di test è stato incluso nello snippet fornito, quindi non posso verificare che i test esistenti siano rimasti intatti.

### Conclusione

- **Posso confermare** che le modifiche UI e al tipo `PlayerDecision` sono coerenti, che lo stato delle scorte di materie prime viene riportato correttamente fra trimestri e che non c’è evidenza diretta di `Math.random` nei file mostrati.
- **Non posso completare** la verifica richiesta perché mancano i diff dei file del motore dove sono definiti il costo unitario, le costanti di inventario e la logica di simulazione. Senza quei dettagli non è possibile:
  - verificare che le componenti del costo unitario sommino ancora a 55 €,
  - accertarsi che non vi siano duplicazioni di costanti,
  - dimostrare attivamente l’assenza di una regressione sui valori di default,
  - garantire che nessun test esistente sia stato alterato o che `Math.random` non sia usato altrove.

**Proposta:** fornire i diff (o il contenuto) di almeno i seguenti file del motore prima di proseguire con la review:

- `apps/web/src/lib/game-engine/supply.ts` (o dove è definito il calcolo del costo unitario)
- `apps/web/src/lib/game-engine/inventory.ts` (definizione delle costanti di materie prime)
- `apps/web/src/lib/game-engine/simulate.ts` (logica che usa `rawMaterialOrder` e calcola profitto)
- eventuali file di test (`*.test.ts`) che coprono la simulazione del trimestre.

Solo con quei dati potrò eseguire i controlli richiesti e dare un verdetto definitivo (approva / cambia / blocca). Fino ad allora, la risposta corretta è: **non posso svolgere questo task perché mancano i dettagli del motore necessari per verificare la somma dei costi, la duplicazione delle costanti e la non‑regressione**.

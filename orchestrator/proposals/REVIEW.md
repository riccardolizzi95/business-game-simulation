# Review delle proposte — orchestrator/proposals/

> Revisione del Code Reviewer rispetto allo stato REALE del progetto: motore v0.1 a **due
> leve soltanto** (prezzo + produzione, vedi `docs/01-game-design.md §0` e
> `apps/web/src/lib/game-engine/index.ts`), UI = singolo `page.tsx` client-side senza alcuna
> integrazione Supabase/backend (`apps/web/src/app/page.tsx`, nessun file `*supabase*`,
> nessuna cartella `packages/` nel repo). Data review: 2026-07-25.

---

## T-001 — designer-ux — Navigazione a sezioni

**Verdetto: 🟡 applica con modifiche**

- 🔴 **Bloccante — documento troncato.** Il file si interrompe a metà parola a riga 96
  ("BUDGET MARKET…") dentro il wireframe 3.2. Mancano i wireframe di 3.3 (Mercato) e 3.4
  (Classifica). L'acceptance criteria del task T-001 chiede "wireframe testuale di almeno 2
  sezioni": ne è completa solo 1 (Cruscotto) + mezza (Decisioni). Va rigenerato o completato
  prima di considerarlo chiuso.
- 🔴 **Bloccante — assume leve/dati che non esistono nel motore v0.1.** La proposta include
  Budget Marketing, R&S/Qualità, Soddisfazione clienti, Stock/stock-out, "marketing stimato"
  dei competitor: nessuno di questi campi esiste in `EngineConfig`/`PlayerDecision`/
  `PlayerResult`. `docs/01-game-design.md §0` è esplicito: v0.1 ha **solo** prezzo e
  produzione (stabilimenti + straordinari); le altre leve sono "rimandate alle epiche
  successive". Il tab "Decisioni" e le KPI card del Cruscotto vanno riscritti sui campi reali:
  prezzo, stabilimenti/straordinari, capacità, `unitsSold`, `lostSales`, profitto.
- 🟡 **Nice-to-have — funzionalità social/multiplayer premature.** Il tab "Classifica"
  propone filtro Globale/Amici/Gruppo, "Condividi risultato", "Invita amici": nessuna di
  queste esiste (l'app è oggi una demo locale a 3 giocatori simulati, senza account/social).
  Va bene tenerle come nota per v0.2+, ma non come parte del wireframe da implementare ora.
- 🟡 **Nice-to-have — "grafico andamento domanda ultimi 5 turni" ed "eventi di mercato"** nel
  tab Mercato presuppongono storicizzazione dei turni passati, che oggi non esiste
  (`page.tsx` tiene solo `lastResults` dell'ultimo trimestre). Da rimandare o sostituire con
  uno storico minimo se si vuole tenere la sezione.
- ✅ **Usabile così com'è:** l'impostazione generale (tab bar fissa a 4 voci, header sticky
  con turno/cash, CTA sticky "Conferma turno") è un buon pattern mobile-first e coerente con
  le convenzioni del progetto (PWA mobile-first). Riutilizzabile come scheletro di
  navigazione una volta ripulita dai campi inesistenti.

---

## T-002 — frontend-developer — Piano navigazione a sezioni (Next.js)

**Verdetto: 🔴 rimanda**

- 🔴 **Bloccante — documento troncato.** Il file si interrompe a metà riga 97 ("5 | **Se"),
  lo step 5 e successivi mancano. L'acceptance "elenco ordinato dei passi di implementazione"
  non è soddisfatto (solo 4 step parziali su un piano che presuppone molto di più).
- 🔴 **Bloccante — l'intero piano presuppone un'infrastruttura backend che non esiste e non è
  stata architettata.** Il piano dà per scontati: tabelle Supabase `games/turns/decisions/
  results/players`, RPC `submit_decision`, trigger Postgres + `broadcast`, canali realtime
  `game:{id}`/`presence:{id}`, autenticazione con route group `(auth)`, e un pacchetto
  `packages/shared-types` generato da `supabase gen types typescript`. Nel repo **non esiste
  nulla di tutto ciò**: niente file Supabase, niente cartella `packages/`, nessun ADR di
  schema dati o di realtime (gli ADR presenti sono 0001-stack, 0002-orchestratore,
  0003-multi-provider-llm, 0004-model-curation — nessuno tratta DB/multiplayer). Per le
  regole del progetto (CLAUDE.md: "decisioni tecniche pesanti → nuovo ADR"), uno schema dati
  multiplayer e la strategia realtime devono passare prima dall'Architect con un ADR
  dedicato, non essere introdotti di riflesso dentro un piano di navigazione UI.
- 🟡 **Nice-to-have — mismatch di scope con T-001.** T-001 (da cui questo task dipende)
  propone 4 sezioni (Cruscotto/Decisioni/Mercato/Classifica); T-002 ne propone 5 con nomi
  diversi (Lobby/Dashboard/Decisions/Results/History). Vanno riconciliati prima di procedere.
- ✅ **Usabile parzialmente, ma solo la parte "locale":** il concetto di route group
  `(game)` con layout persistente per non smontare lo stato di gioco durante la navigazione
  tra tab è corretto e applicabile **oggi** a `page.tsx`, ma senza Context/reducer collegato
  a Supabase: lo stato può restare `useState` locale come adesso finché non esiste backend.
  Consiglio: riscrivere questa proposta come "come spezzare `page.tsx` in route/tab con lo
  stato client attuale", rimandando tutta la parte Supabase/realtime a dopo l'ADR di
  architettura dati (che non è stato ancora commissionato).

---

## T-003 — software-architect — Leva Distribuzione (canali)

**Verdetto: 🔴 rimanda**

- 🔴 **Bloccante — fuori scope per v0.1.** `docs/01-game-design.md §0` dice esplicitamente:
  "**Due leve: PREZZO + PRODUZIONE**… Le altre leve (forza lavoro dettagliata, distribuzione,
  marketing) sono rimandate alle epiche successive." La proposta disegna proprio la leva
  Distribuzione che il game design ha deliberatamente escluso da v0.1. Va tenuta come design
  per l'epica futura (è materiale utile, non da buttare) ma non va approvata per
  implementazione ora.
- 🔴 **Bloccante — priorità sbagliata rispetto al backlog reale.** Il problema aperto e
  urgente sul motore è lo sbilanciamento prezzo-premium già annotato in
  `docs/01-game-design.md` e diagnosticato in dettaglio da T-004. Aggiungere una terza leva
  (distribuzione) sopra un motore a due leve già squilibrato complica il debug e il
  bilanciamento invece di risolverlo. Sequenza corretta: prima T-004 (fix bilanciamento
  v0.1), poi eventualmente nuove leve.
- 🟡 **Rilievo tecnico (per quando si riprenderà in mano):** la sezione 5 sulla
  normalizzazione delle quote è internamente incoerente. Il testo stesso ammette l'ambiguità:
  usa `share_i = attr_i / Σattr_j` (somma globale delle attrattività) ma poi scala la
  "domanda attratta assoluta" per il `reachableDemand_i` **individuale** di ogni giocatore.
  Con `reachableDemand` diversi per player questo non conserva la domanda totale e romperebbe
  l'invariante "somma delle quote ≈ 1" già verificato nei test esistenti
  (`engine.test.ts`, "la somma delle quote è ~1"). Da rivedere con un modello di
  normalizzazione esplicito prima di passare al backend-developer.
- 🟡 **Nice-to-have — numerazione ADR sbagliata.** La proposta dice "procedo a scrivere
  ADR-0003", ma `ADR-0003-multi-provider-llm.md` esiste già in `docs/05-decisioni/`. Il
  prossimo ADR libero è 0005.
- ✅ **Aspetti positivi da conservare per dopo:** il modello a canali (reach/margine/costi
  fissi e variabili), il default backward-compatible (`channels` opzionale → retail
  intensity 1.0) e la checklist di accettazione con test su backward-compatibility e casi di
  sovrapposizione sono un buon punto di partenza quando l'epica Distribuzione verrà
  effettivamente pianificata.

---

## T-004 — tester-qa — Analisi bilanciamento v0.1 (prezzo premium dominante)

**Verdetto: 🟡 applica con modifiche**

- ✅ **In scope e ben ancorata al codice reale.** Diagnosi corretta e verificata contro
  `simulateQuarter` in `apps/web/src/lib/game-engine/index.ts`: `lostSales` non viene mai
  riassegnata (righe 130-131), non c'è alcun costo/penalità sulla domanda persa, e questo è
  esattamente il problema già annotato in `docs/01-game-design.md` ("il prezzo premium rende
  troppo… la ridistribuzione della domanda persa ai concorrenti non è ancora modellata").
  Questo è il task più direttamente applicabile delle quattro.
- 🔴 **Bloccante — l'algoritmo di redistribuzione (Proposta 1) ha un bug di conservazione.**
  `extraSales_i = min(residualCap_i, totalLost × attractiveness_i / totalAttractiveness)`
  normalizza su `totalAttractiveness` **globale** (che include anche i giocatori già saturi,
  con `residualCap = 0`, che quindi non assorbono nulla ma restano nel denominatore). Il
  risultato è che, in generale, `Σ extraSales_i < totalLost`: non tutta la domanda persa
  viene ridistribuita in un solo passaggio, specialmente se il player con più capacità
  residua ha bassa attrattività. Serve un algoritmo iterativo (redistribuire, ricalcolare
  capacità residua e attrattività-tra-chi-ha-ancora-spazio, ripetere finché non c'è più
  capacità libera o domanda persa) oppure normalizzare solo sui giocatori con
  `residualCap > 0`. Da correggere prima che il coder lo implementi, altrimenti il test S5
  proposto ("totalSold + totalLost ≈ totalDemand") fallirebbe.
- 🟡 **Nice-to-have — contabilità costi/ricavi delle unità ridistribuite non specificata.**
  Non è chiaro se le `extraSales` assegnate a un concorrente vadano prezzate al suo prezzo
  standard o in "straordinario" (dato che occupano la sua capacità residua, potenzialmente
  oltre `standardCapacity`), né se vadano aggiornati coerentemente `revenue`, `productionCost`
  e `lostSales` nel `PlayerResult` restituito. Va chiarito nell'implementazione.
- 🟡 **Nice-to-have — dipendenza test non presente nel progetto.** Lo scenario S5 usa
  `fast-check`, non presente in `apps/web/package.json` (solo `vitest` è installato). O si
  aggiunge la dipendenza esplicitamente (`npm i -D fast-check --prefix apps/web`) o si
  riscrive S5 come test a scenari fissi con `vitest`, coerente con lo stile di
  `engine.test.ts` già in repo.
- ✅ **Proposta 2 (elasticità 1.8→2.5 + `maxMarketShare`) è la più semplice e immediatamente
  applicabile**: sono due parametri, facilmente testabili con l'infrastruttura vitest
  esistente, nessuna nuova dipendenza, nessun rischio di bug di conservazione. Consiglio di
  implementarla per prima come fix rapido, trattando la Proposta 1 (redistribuzione) come
  follow-up dopo aver corretto l'algoritmo.
- 🟡 **Nice-to-have:** la Proposta 3 (stockout penalty) è compatibile e semplice ma andrebbe
  scelta come alternativa a, non cumulativa con, la Proposta 1 in prima battuta, per isolare
  l'effetto di ciascun fix sul bilanciamento (altrimenti diventa difficile capire quale
  meccanica ha risolto cosa nei test S1-S8).

---

## Riepilogo verdetti

| Task | Ruolo | Verdetto |
|---|---|---|
| T-001 | designer-ux | 🟡 applica con modifiche (completare doc, rimuovere leve inesistenti) |
| T-002 | frontend-developer | 🔴 rimanda (backend/realtime inventati senza ADR, doc troncato) |
| T-003 | software-architect | 🔴 rimanda (fuori scope v0.1, priorità sbagliata, bug di normalizzazione) |
| T-004 | tester-qa | 🟡 applica con modifiche (bug di conservazione nella redistribuzione da correggere) |

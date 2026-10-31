# SPRINT BOARD — Sprint corrente

> Gestito dal Project Manager. Un task attraversa: **Todo → In Progress → Review → Done**.

## Sprint 0 — Fondamenta
**Obiettivo:** basi documentali e team di agenti pronti. **Stato: quasi completo.**

| Task | Owner | Stato |
|---|---|---|
| Struttura documentale (docs/) | PM/Architect | ✅ Done |
| ADR-0001 stack | Architect | ✅ Done |
| Definizione ruoli agenti | PM | ✅ Done |
| File di project management | PM | ✅ Done |
| **Riempire Game Design (A1, A2)** | Utente + Architect | ⏳ Todo (serve input utente) |

## Sprint 1 — Walking skeleton (in corso)
**Obiettivo:** far vedere il core loop giocabile. Parte offline/local, poi aggiungiamo
auth + multiplayer + persistenza in modo incrementale.

| Task | Owner | Stato |
|---|---|---|
| Scaffolding Next.js 14 PWA (`apps/web`) — B1 | Frontend Dev | ✅ Done (SW/offline: da fare) |
| `game-engine` v0 (leva prezzo) + test — B5 | Backend Dev | ✅ Done (7 test verdi) |
| UI mobile core loop + rivali IA locali — B7 | Frontend Dev | ✅ Done (demo local) |
| Leva Produzione (stabilimenti + straordinari) — C1 | Backend/Frontend | ✅ Done (v0.1, 11 test) |
| Auth Google via Supabase — B2 | Backend/Frontend | ⏳ Todo |
| Schema DB + RLS — B3 | Backend Dev | ⏳ Todo |
| Lobby realtime (avvio a N giocatori) — B4 | Backend/Frontend | ⏳ Todo |
| Tick trimestrale server-side — B6 | Backend Dev | ⏳ Todo |
| Estrarre engine in `packages/` + PWA offline shell | Architect/Frontend | ⏳ Todo (backlog) |

## Sprint 2 — UI a sezioni nel codice reale
**Obiettivo (unico, dimostrabile):** applicare la navigazione a sezioni mobile (Cruscotto,
Decisioni, Mercato, Classifica) al codice reale della PWA, mantenendo il gioco locale v0.1
(leve prezzo + produzione, IA rivali locali, nessun backend) **pienamente funzionante e
navigabile su viewport telefono**. Slice: dal tap sulla tab bar alla chiusura di un
trimestre, senza perdita di stato. Riferimenti: `orchestrator/proposals/T-001-designer-ux.md`,
`orchestrator/proposals/T-002-frontend-developer.md`. Item di backlog: **[B8]**.

> **Nota di adattamento:** il piano tecnico T-002 assume auth/DB/realtime Supabase già
> presenti (`GameProvider` su canali realtime, RPC `submit_decision`…), ma nel codice reale
> non ci sono ancora (B2 Auth, B3 Schema DB, B4 Lobby realtime sono tuttora *Todo* in
> Sprint 1). **ST2-1** adatta il piano: sezioni + tab bar su Next.js App Router con stato di
> gioco locale (Context/hook), pensate per essere estese a Supabase senza rework quando
> arriveranno B2–B4.
>
> **Volutamente fuori da questo sprint:** T-003 (leva Distribuzione) e T-004 (bilanciamento
> "premium-dominance"). Sono proposte già pronte e valide, ma aggiungerle qui romperebbe
> l'obiettivo unico dello sprint (UI) e mescolerebbe modifiche al motore con la
> ristrutturazione della UI. Restano tracciate in `BACKLOG.md` (C3, C5) per lo Sprint 3.

| Task | Owner | Taglia | Dipendenze | Stato |
|---|---|---|---|---|
| ST2-1 — Adattare il piano T-002 allo stato reale (no backend) | Architect | S | — | ✅ Done |
| ST2-2 — Adattare i wireframe T-001 ai dati reali del motore v0.1 | Designer UX | S | — | ✅ Done |
| ST2-3 — Shell di navigazione (layout + tab bar + stato condiviso) | Frontend Dev | M | ST2-1, ST2-2 | ✅ Done |
| ST2-4 — Migrare i contenuti esistenti nelle 4 sezioni | Frontend Dev | M | ST2-3 | ✅ Done |
| ST2-5 — Regressione + usabilità mobile | QA/Tester | S | ST2-4 | ✅ Done |
| ST2-6 — Code review pre-merge | Code Reviewer | S | ST2-4, ST2-5 | ✅ Done |

### Dettaglio task

**ST2-1 — Adattare il piano di navigazione (T-002) allo stato reale (no backend)**
- Owner: **software-architect**
- Descrizione: partendo da T-002, definire una versione del piano coerente col codice
  attuale (un solo `apps/web/src/app/page.tsx` con `useState`, nessun Supabase). Decidere:
  struttura di route/componenti App Router per le 4 sezioni con tab bar mobile fissa;
  meccanismo di stato condiviso tra sezioni (es. React Context + reducer, o stato sollevato
  in un componente shell) che sostituisca per ora il `GameProvider`/realtime di T-002; come
  questa struttura potrà accogliere Supabase in futuro (B2 Auth, B3 Schema DB, B4 Lobby)
  senza riscrivere le sezioni. Se la decisione è ritenuta strutturalmente rilevante, produrre
  un ADR (prossimo numero libero: **ADR-0006**, i numeri 0001–0005 sono già usati);
  altrimenti basta una nota tecnica in `docs/02-architettura.md`.
- Criteri di accettazione:
  - Struttura di cartelle/componenti proposta, compatibile con l'App Router già in uso.
  - Nessuna dipendenza da Supabase introdotta in questo sprint.
  - Strategia di stato condiviso descritta ed esplicitamente collegata ai 4 componenti
    sezione (Cruscotto, Decisioni, Mercato, Classifica).
  - Nota su come estendere la struttura a Supabase in uno sprint futuro, senza rework.
  - Documentato in `docs/02-architettura.md` (o nuovo ADR).
- Dipendenze: nessuna (input: T-001, T-002).
- Taglia: **S**

**ST2-2 — Adattare i wireframe T-001 ai dati reali del motore v0.1**
- Owner: **designer-ux**
- Descrizione: i wireframe T-001 includono metriche non presenti nel motore attuale
  (soddisfazione clienti, stock, R&S, budget marketing — il motore v0.1 ha solo prezzo e
  produzione). Riscrivere i contenuti delle 4 sezioni usando **solo** i campi realmente
  disponibili in `PlayerResult`/`EngineConfig` (`apps/web/src/lib/game-engine/index.ts`):
  Cruscotto → cash, profitto trimestre/cumulato, quota, capacità vs domanda, vendite perse;
  Decisioni → prezzo (slider) + produzione (stabilimenti, straordinari), le uniche 2 leve
  v0.1; Mercato → prezzi e quote dei 2 rivali IA; Classifica → ranking per profitto
  cumulato. Mantenere i principi mobile di T-001 (tab bar 4 voci, header sticky, CTA sticky
  in Decisioni).
- Criteri di accettazione:
  - Wireframe aggiornato per le 4 sezioni, salvato in `docs/01-game-design.md` (nuova
    sotto-sezione UX) o in un nuovo file `docs/07-ux-navigazione.md`.
  - Nessun riferimento a leve/metriche non implementate nel motore v0.1.
  - Coerente con lo stile e i principi mobile già proposti in T-001.
- Dipendenze: nessuna (input: T-001).
- Taglia: **S**

**ST2-3 — Shell di navigazione (layout + tab bar + stato condiviso)**
- Owner: **frontend-developer**
- Descrizione: implementare la shell secondo la struttura decisa in ST2-1: layout con tab
  bar fissa a 4 voci (Cruscotto, Decisioni, Mercato, Classifica) e header sticky
  (turno/cash), con lo stato di gioco oggi in `page.tsx` (quarter, price, plants, overtime,
  plantsBought, cumProfit, lastResults) sollevato nel meccanismo condiviso scelto
  dall'Architect, così le sezioni non perdono stato passando dall'una all'altra. In questo
  task le 4 sezioni possono restare "guscio vuoto" (contenuti in ST2-4).
- Criteri di accettazione:
  - Tab bar visibile e utilizzabile su viewport mobile (375×812).
  - Navigazione tra le 4 sezioni senza perdita di stato (es. cambio prezzo, cambio sezione,
    il prezzo resta impostato).
  - Header sticky con turno corrente e cash.
- Dipendenze: ST2-1, ST2-2.
- Taglia: **M**

**ST2-4 — Migrare i contenuti esistenti nelle 4 sezioni**
- Owner: **frontend-developer**
- Descrizione: spostare markup e logica oggi in `page.tsx` (decisione prezzo, decisione
  produzione, tabella prezzi rivali, esito trimestre, classifica, banner vittoria/restart)
  nelle rispettive sezioni secondo i wireframe di ST2-2. Aggiungere le CTA di navigazione
  previste da T-001 ("Vai alle Decisioni" nel Cruscotto, "Conferma turno" sticky in
  Decisioni).
- Criteri di accettazione:
  - Il gioco è interamente giocabile navigando tra le 4 sezioni (chiudere un trimestre da
    Decisioni aggiorna Cruscotto/Mercato/Classifica).
  - Nessuna funzionalità v0.1 persa: compra stabilimento, attiva/disattiva straordinari,
    avviso vendite perse, banner fine partita, restart.
  - `npm --prefix apps/web run build` (o dev) senza errori.
- Dipendenze: ST2-3.
- Taglia: **M**

**ST2-5 — Regressione + usabilità mobile**
- Owner: **tester-qa**
- Descrizione: verificare che i test del game-engine restino verdi (il motore non cambia in
  questo sprint), testare manualmente il flusso completo (8 trimestri) attraverso le 4
  sezioni su viewport mobile, e i casi limite: fine partita, restart, straordinari attivi,
  vendite perse per capacità insufficiente, navigazione avanti/indietro tra sezioni senza
  perdita di stato.
- Criteri di accettazione:
  - `npm --prefix apps/web test` verde (7+ test esistenti, nessuna regressione).
  - Checklist di test manuale (scenari sopra) documentata con esito, viewport testato.
  - Eventuali difetti trovati aperti come nuovi item in `BACKLOG.md`, non bloccano
    necessariamente lo sprint se minori (da valutare con PM).
- Dipendenze: ST2-4.
- Taglia: **S**

**ST2-6 — Code review pre-merge**
- Owner: **code-reviewer**
- Descrizione: revisione del codice di ST2-3/ST2-4 su correttezza, leggibilità, coerenza
  con le convenzioni del progetto (motore invariato/puro, nessun segreto nel client, stato
  condiviso pulito).
- Criteri di accettazione: revisione completata, eventuali richieste di modifica risolte
  prima di segnare i task come Done.
- Dipendenze: ST2-4, ST2-5.
- Taglia: **S**

## Sprint 3 — Stabilizza il motore + rework UI
**Obiettivo (unico, dimostrabile):** il tab Decisioni è diviso in sotto-tab per reparto
(Commerciale/Operations, con teaser disabilitati per Distribuzione/Marketing), con Riepilogo
sticky e CTA "Chiudi il trimestre" sempre visibile; il motore introduce rumore ed eventi di
mercato riproducibili via seed **senza rompere il determinismo v0.1** (nessun seed ⇒ output
identico), il tab Simula mostra una stima a mercato neutro (non più un oracolo) e il tab
Mercato & Rischio mostra l'evento realmente accaduto a posteriori; l'elasticità di prezzo
diventa asimmetrica (fix T-004, niente più dominio strutturale del prezzo premium). **Niente
nuove leve giocabili** (Distribuzione/Marketing restano teaser, rimandate a Sprint 4+).
Riferimenti: `orchestrator/proposals/T-003-software-architect.md` (fuori scope, per dopo),
`orchestrator/proposals/T-004-tester-qa.md` (input per l'elasticità asimmetrica).

> **Contratto d'interfaccia del motore (proposto dal PM, da ratificare in ADR-0006 — ST3-1):**
> vedi dettaglio nel messaggio di pianificazione dello Sprint 3. In sintesi: `EngineConfig`
> guadagna `demandNoisePct`, `marketEvents: MarketEventDef[]`, `priceElasticityBelow` e
> `priceElasticityAbove` (al posto di `priceElasticity`); nuova interfaccia `MarketConditions`
> e funzione pura `resolveMarketConditions(seed, config)`; `simulateQuarter(decisions, config,
> seed?)` — **seed assente ⇒ comportamento bit-identico a v0.1** (i seed sono un branch di
> codice interamente opt-in, non modificano il percorso esistente).

| Task | Owner | Taglia | Dipendenze | Stato |
|---|---|---|---|---|
| ST3-1 — Contratto d'interfaccia motore → ADR-0006 | Architect | S | — | ✅ Done |
| ST3-2 — Wireframe sotto-tab Decisioni + 5 migliorie CSS | Designer UX | S | — | ✅ Done |
| ST3-3 — Implementare sotto-tab + Riepilogo sticky + CTA sempre visibile | Frontend Dev | M | ST3-2 | ✅ Done |
| ST3-4 — 5 migliorie visive CSS | Frontend Dev | S | ST3-3 | ✅ Done |
| ST3-5 — Motore: rumore + eventi ambientali con seed | Backend Dev | L | ST3-1 | ✅ Done |
| ST3-6 — Motore: fix T-004 elasticità asimmetrica | Backend Dev | M | ST3-1 | ✅ Done |
| ST3-7 — Test motore: regressione + nuovi scenari (seed/eventi/elasticità) | QA/Tester | M | ST3-5, ST3-6 | ✅ Done |
| ST3-8 — Tab Simula a mercato neutro + avviso variabilità | Frontend Dev | S | ST3-1 | ✅ Done |
| ST3-9 — Tab "Mercato & Rischio": evento a posteriori | Frontend Dev | M | ST3-8, ST3-5, ST3-7 | ✅ Done |
| ST3-10 — Regressione E2E + usabilità mobile | QA/Tester | S | ST3-4, ST3-9 | ✅ Done |
| ST3-11 — Code review pre-merge | Code Reviewer | S | ST3-10 | ✅ Done |

### Dettaglio task

**ST3-1 — Contratto d'interfaccia motore → ADR-0006**
- Owner: **software-architect**
- Descrizione: ratificare in un ADR il contratto proposto dal PM (vedi box sopra): nomi di
  campi/funzioni e firme di `EngineConfig`/`simulateQuarter`/`resolveMarketConditions`
  congelati, così backend e frontend possono lavorare in parallelo senza aspettarsi a vicenda.
  Verificare esplicitamente la compatibilità con il vincolo "senza seed = identico a v0.1" e
  con gli 11 test esistenti in `engine.test.ts`.
- Accettazione: ADR-0006 in `docs/05-decisioni/`; contratto congelato; vincolo di
  non-regressione esplicitato.
- Dipendenze: nessuna. Taglia: **S**

**ST3-2 — Wireframe sotto-tab Decisioni + 5 migliorie CSS**
- Owner: **designer-ux**
- Descrizione: progettare le sotto-tab per reparto nel tab Decisioni — 💰 Commerciale (prezzo),
  🏭 Operations (produzione), pillole "presto" disabilitate per 🚚 Distribuzione e 📣 Marketing
  (teaser, non cliccabili, copy "Presto disponibile") — più la card Riepilogo sticky in alto
  e la CTA "Chiudi il trimestre" sempre visibile indipendente dal sotto-tab attivo. Elencare
  puntualmente le 5 migliorie visive solo-CSS: colore dello slider prezzo in base al segno/
  livello del profitto stimato, badge/pallino di rischio "capacità < domanda" sulla pillola
  Operations, micro-animazione sui numeri che cambiano (cash, profitto), stile hint
  uniformato, spaziatura/padding coerente.
- Accettazione: wireframe in `docs/07-ux-navigazione.md` (o nuova sotto-sezione); ogni
  sotto-tab mappa 1:1 un campo REALE del motore attuale (price, plants, overtime); teaser
  esplicitamente disabilitati, nessuna leva finta.
- Dipendenze: nessuna. Taglia: **S**

**ST3-3 — Implementare sotto-tab + Riepilogo sticky + CTA sempre visibile**
- Owner: **frontend-developer**
- Descrizione: in `apps/web/src/app/page.tsx`, tab "decisioni": introdurre sotto-navigazione
  per reparto secondo ST3-2, card Riepilogo sticky in cima (riusa i valori già calcolati in
  `est`: prezzo, capacità, profitto stimato), CTA "Chiudi il trimestre" sticky visibile e
  funzionante da qualunque sotto-tab.
- Accettazione: cambiare sotto-tab non perde stato; CTA chiude il trimestre da ogni sotto-tab;
  Riepilogo sempre visibile; `npm --prefix apps/web run build` senza errori; nessuna leva
  Distribuzione/Marketing realmente funzionante (solo pillola disabilitata).
- Dipendenze: ST3-2. Taglia: **M**

**ST3-4 — 5 migliorie visive CSS**
- Owner: **frontend-developer**
- Descrizione: implementare le 5 migliorie di ST3-2 in `globals.css`, usando classi derivate
  da valori già calcolati nel componente (niente nuova logica di dominio): colore slider,
  badge rischio su pillola Operations, micro-animazione sui numeri, hint uniformati,
  spaziatura.
- Accettazione: le 5 migliorie visibili e verificabili a schermo; nessuna regressione
  funzionale; solo CSS/toggling di classi.
- Dipendenze: ST3-3. Taglia: **S**

**ST3-5 — Motore: rumore + eventi ambientali con seed**
- Owner: **backend-developer**
- Descrizione: in `apps/web/src/lib/game-engine/index.ts`, secondo il contratto ST3-1:
  aggiungere `demandNoisePct` e `marketEvents: MarketEventDef[]` a `EngineConfig`/
  `DEFAULT_CONFIG`; esportare l'interfaccia `MarketConditions` e la funzione pura
  `resolveMarketConditions(seed, config)` (pseudo-random deterministico da seed, niente
  `Math.random`); estendere `simulateQuarter(decisions, config, seed?)` — seed assente ⇒
  path invariato rispetto a v0.1; seed presente ⇒ applica il moltiplicatore di domanda
  risolto da `resolveMarketConditions` al `totalDemand` prima del calcolo delle quote.
- Accettazione: gli 11 test esistenti verdi SENZA modifiche; stesso seed ⇒ stesso esito;
  seed diversi ⇒ esiti diversi entro il range configurato; `resolveMarketConditions`
  richiamabile indipendentemente da `simulateQuarter`.
- Dipendenze: ST3-1. Taglia: **L**

**ST3-6 — Motore: fix T-004 elasticità asimmetrica**
- Owner: **backend-developer**
- Descrizione: sostituire `priceElasticity` con `priceElasticityBelow`/`priceElasticityAbove`
  in `EngineConfig`/`DEFAULT_CONFIG`. Sopra il `refPrice` si applica l'esponente "Above"
  (maggiore di "Below") così la quota cala più rapidamente sopra il prezzo di riferimento di
  quanto salga sotto. Tarare i valori di default con il tester-qa sulla base della diagnosi
  già pronta in `orchestrator/proposals/T-004-tester-qa.md`.
- Accettazione: test esistenti verdi (nessuno referenzia `priceElasticity` direttamente);
  nuovi test dimostrano l'asimmetria; il prezzo premium non domina più negli scenari di
  `T-004-tester-qa.md`.
- Dipendenze: ST3-1 (può correre in parallelo a ST3-5, modifiche isolate nello stesso file).
  Taglia: **M**

**ST3-7 — Test motore: regressione + nuovi scenari**
- Owner: **tester-qa**
- Descrizione: verificare che gli 11 test esistenti restino invariati; scrivere nuovi test:
  determinismo con seed fisso, range del rumore rispettato, evento di mercato applicato
  correttamente, "senza seed = identico a v0.1" (assert sui risultati storici con
  `DEFAULT_CONFIG`), asimmetria dell'elasticità con gli scenari di `T-004-tester-qa.md`.
- Accettazione: `npm --prefix apps/web test` verde con tutti i test (vecchi+nuovi); nessuna
  regressione silenziosa.
- Dipendenze: ST3-5, ST3-6. Taglia: **M**

**ST3-8 — Tab Simula a mercato neutro + avviso variabilità**
- Owner: **frontend-developer**
- Descrizione: il tab Simula continua a chiamare `simulateQuarter(decisions, CFG)` SENZA
  seed (mercato neutro, deterministico); aggiungere un avviso visibile ("Stima a mercato
  neutro: il risultato reale a chiusura può variare per eventi di mercato").
- Accettazione: nessuna chiamata con seed nel tab Simula; avviso presente e leggibile;
  nessuna regressione sulle funzionalità esistenti (sensitività prezzo, dettaglio stima).
- Dipendenze: ST3-1 (nome/firma); integrazione finale verificata dopo ST3-7. Taglia: **S**

**ST3-9 — Tab "Mercato & Rischio": evento a posteriori**
- Owner: **frontend-developer**
- Descrizione: generare un seed di trimestre in `closeQuarter()` (es. seed di partita fissato
  a inizio gioco + numero trimestre), passarlo a `simulateQuarter`, e mostrare nel tab
  Mercato (rinominato "Mercato & Rischio") l'esito recuperato via `resolveMarketConditions
  (seed, CFG)`: evento eventuale (label) ed effetto sulla domanda, oltre ai dati già presenti
  (prezzi/quote rivali, esito trimestre).
- Accettazione: l'evento mostrato corrisponde a quello realmente applicato nel trimestre
  appena chiuso (stesso seed); se nessun evento, messaggio neutro; build/test verdi.
- Dipendenze: ST3-8, ST3-5, ST3-7. Taglia: **M**

**ST3-10 — Regressione E2E + usabilità mobile**
- Owner: **tester-qa**
- Descrizione: flusso completo 8 trimestri su viewport mobile (375×812): sotto-tab
  Decisioni, Riepilogo sticky, CTA sempre visibile, Simula neutro, Mercato & Rischio con
  evento a posteriori, casi limite invariati (fine partita, restart, straordinari, vendite
  perse).
- Accettazione: `npm --prefix apps/web test` verde, `npm --prefix apps/web run build` OK,
  checklist di test manuale documentata con esito; difetti minori tracciati in
  `BACKLOG.md` se non bloccanti.
- Dipendenze: ST3-4, ST3-9. Taglia: **S**

**ST3-11 — Code review pre-merge**
- Owner: **code-reviewer**
- Descrizione: revisione dell'intero diff dello sprint (motore + UI): correttezza, coerenza
  con ADR-0006, vincolo "nessuna leva finta", sicurezza (nessun segreto nel client), qualità
  e copertura dei test.
- Accettazione: revisione completata, eventuali richieste di modifica risolte prima di
  segnare i task come Done.
- Dipendenze: ST3-10. Taglia: **S**

---
### Legenda
- **Todo:** pronto da prendere (rispetta Definition of Ready).
- **In Progress:** in lavorazione (un solo owner).
- **Review:** in revisione (QA/Architect).
- **Done:** rispetta la Definition of Done (codice+test+doc+board).

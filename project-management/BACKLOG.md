# BACKLOG — Elenco prioritizzato

> Ordinato per priorità (alto = prima). Taglie: **S**/**M**/**L**. Gestito dal Project Manager.
> Ogni item: descrizione · valore · criteri di accettazione.

## Epica A — Fondamenta & Game Design
- **[A1] Definire parametri di partita** · Taglia S · *Aperto*
  - Valore: senza numeri non c'è motore.
  - Accettazione: capitale iniziale, n° giocatori, n° trimestri, condizione di vittoria scritti nel GDD.
- **[A2] Definire il modello di mercato (formula domanda→vendite)** · Taglia L · *Aperto*
  - Valore: è il cuore del gioco.
  - Accettazione: formula esplicita e input/output chiari nel GDD, rivista dall'Architect.

## Epica B — Walking skeleton (Sprint 1 candidato)
- **[B1] Init monorepo + Next.js PWA vuota deployabile** · Taglia M · *Aperto*
- **[B2] Auth Google via Supabase (login/logout)** · Taglia M · *Aperto*
- **[B3] Schema DB minimo (partite, giocatori, decisioni, risultati) + RLS** · Taglia M · *Aperto*
- **[B4] Lobby realtime: crea/entra partita, avvio a N giocatori** · Taglia L · *Aperto*
- **[B5] `game-engine` v0: una sola leva (prezzo) → vendite** · Taglia M · *Aperto*
- **[B6] Tick trimestrale (edge function) su una partita** · Taglia L · *Aperto*
- **[B7] UI mobile minima: imposta prezzo, vedi classifica** · Taglia M · *Aperto*
- **[B8] Navigazione a sezioni mobile (Cruscotto/Decisioni/Mercato/Classifica) nel codice reale** · Taglia L · ✅ *Fatto (Sprint 1/2, chiuso 2026-07-26)*
  - Valore: rende il gioco leggibile e usabile su telefono man mano che crescono le leve;
    base di navigazione riutilizzabile per le epiche future senza refactor totale della UI.
  - Origine: proposte `orchestrator/proposals/T-001-designer-ux.md` (design) e
    `T-002-frontend-developer.md` (piano tecnico), adattate allo stato reale del codice
    (nessun backend ancora — vedi Sprint 2 in `SPRINT-BOARD.md`).
  - Accettazione: le 4 sezioni sono navigabili via tab bar mobile, il gioco locale v0.1
    resta interamente funzionante, stato condiviso senza perdite tra sezioni, test motore
    verdi. Scomposizione task in `SPRINT-BOARD.md` → Sprint 2 (ST2-1…ST2-6).

## Epica C — Profondità gioco (dopo lo skeleton)
- **[C1] Leva Produzione/Capacità (stabilimenti)** · Taglia L · ✅ *Fatto (v0.1)*
- **[C2] Leva Forza lavoro (dipendenti, turni, straordinari)** · Taglia L · *Parziale*
  - Straordinari già presenti in v0.1; manca il dettaglio dipendenti/produttività.
- **[C3] Leva Distribuzione (proprietari/retail/online)** · Taglia L · *Aperto*
  - Proposta tecnica pronta: `orchestrator/proposals/T-003-software-architect.md` (canali
    con reach/margine/costi, integrazione nel motore, checklist per il coder). Volutamente
    FUORI dallo Sprint 3 (niente nuove leve giocabili in quello sprint) — rimandata a Sprint
    4+; userà ADR-0007 quando pianificata (ADR-0006 è assegnato al contratto motore dello
    Sprint 3: rumore/eventi via seed + elasticità asimmetrica).
- **[C4] Leva Marketing** · Taglia M · *Aperto*
- **[C5] Bilanciamento & playtest automatizzati** · Taglia L · *In corso (Sprint 3, parziale)*
  - Noto (v0.1): il prezzo premium rende troppo; valutare ridistribuzione domanda persa,
    curva di elasticità, tetto di domanda per segmento.
  - Analisi pronta: `orchestrator/proposals/T-004-tester-qa.md` — diagnosi del perché il
    premium domina, 3 proposte di correzione (ridistribuzione domanda persa, elasticità +
    tetto di quota, costo opportunità stockout) e 8 scenari di test per validare il
    ribilanciamento. **La correzione via elasticità asimmetrica è pianificata nello Sprint 3**
    (ST3-6/ST3-7 in `SPRINT-BOARD.md`); le altre due proposte (ridistribuzione domanda persa,
    costo opportunità stockout) restano aperte per sprint futuri.

## Epica E — Team di agenti riutilizzabile (visione `docs/08`)
- **[E1] Separare core-ruolo generico da overlay di progetto** · Taglia M · *Aperto*
- **[E2] Repo/cartella `agent-team` condiviso + knowledge base** · Taglia L · *Aperto*
- **[E3] Formato "lezioni apprese" + raccolta a fine task** · Taglia M · *Aperto*
- **[E4] Orchestratore multi-progetto (board per progetto, KB comune)** · Taglia L · *Aperto*

## Epica D — Qualità & rilascio
- **[D1] PWA installabile + offline shell** · Taglia M · *Aperto*
- **[D2] Hardening sicurezza (audit RLS, validazioni)** · Taglia M · *Aperto*
- **[D3] Deploy Vercel + Supabase produzione** · Taglia M · *Aperto*

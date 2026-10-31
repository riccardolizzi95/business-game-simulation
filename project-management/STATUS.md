# STATUS — Stato del progetto

> Fonte di verità sullo stato "in un colpo d'occhio". Aggiornato dal Project Manager.

- **Fase attuale:** 1 — Walking skeleton + Orchestratore agenti (in corso)
- **Ultimo aggiornamento:** 2026-07-29
- **Motore v0.3 COMPLETO e in produzione** (185 test verdi): oltre alle leve v0.2 ci sono ora
  parametri di partita con costi derivati, approvvigionamento a tre dimensioni, magazzino,
  scarto produttivo, qualità percepita, organico come mix con mercato del lavoro conteso,
  cassa, marketing e rivali reattivi. Le leve nuove sono **spente di default**.
- **Interfaccia rifatta (2026-07-29 notte):** 4 tab invece di 10 destinazioni, turno in una
  schermata, campi numerici con scorciatoie, avvisi prima di chiudere e racconto dell'esito.
- **PUNTO FERMO raggiunto (2026-07-29):** motore e contabilità completi e coerenti, 232 test
  verdi. Guida per giocare e testare: [`docs/16-come-funziona-il-motore.md`](../docs/16-come-funziona-il-motore.md).
- **Prossimo passo:** **playtest** (S16-1), ora sbloccato: è l'unica cosa che manca per sapere se
  il gioco funziona davvero. Poi le tarature già tracciate (S16-7 scala qualità e rivali, S16-2
  leva HR, S17-9 fido e scoperto).
- **S15-1 FATTO (2026-07-28):** `page.tsx` da 931 a **219 righe**, spezzato in 8 componenti +
  hook `useGioco` + due moduli condivisi. Refactor puro, invarianza verificata giocando.
- **S15-4 FATTO (2026-07-28):** le vendite perse dicono ora la causa vera (`lostSalesCause`
  dal motore: capacità, materiali, produzione o scarto). Prima consigliavano sempre di comprare
  stabilimenti, anche quando la capacità era tripla della domanda. 193 test verdi.
- **S15-3 FATTO (2026-07-28):** schermata di setup partita collegata. Chi la salta gioca
  identico a prima (verificato: 0 differenze sui numeri); chi sceglie un profilo cambia
  l'economia, e cursore del prezzo e rivali si adattano.
- **S15-2 — HR IN FRIGO (2026-07-28):** componente su `main` ma **leva spenta**, per scelta:
  si accende dopo il playtest (S16-2 dipende da S16-1). Le tre decisioni di design aperte sono
  scritte in testa a `SezioneHR.tsx` e nel task.
- **Regole agenti corrette (2026-07-28):** il rulebook veniva iniettato troncato a 1800 caratteri
  su 5820 — gli agenti non leggevano Definition of Done né convenzioni. Ora intero (8000), e c'è
  una sezione sulle convenzioni UI che prima mancava del tutto.
- **Contabilità completa (2026-07-29):** ammortamento degli stabilimenti (12.500 €/trim su 20
  trimestri), costo del venduto sulle unità vendute, **ordini multipli** con magazzino a lotti e
  qualità a media pesata.
- **Cassa ≠ profitto (2026-07-29):** i termini di pagamento funzionano davvero — pagare a 60
  giorni tiene la liquidità due trimestri, e il debito esce alla scadenza. Nuova sezione **Conti**
  con conto economico, flusso di cassa e riconciliazione «da utile a cassa».
  Restano da fare ammortamento, costo del venduto e **ordini multipli** (S17-6..S17-9).
- **Materie prime VERE (2026-07-28):** si consumano, si riordinano con lead time, e senza
  materiale non si produce. Scorta iniziale settabile nel setup.
- **Qualità = leva giocabile (2026-07-28):** indice 0–10 (materiali 55% + organico 45%, penalità
  straordinari, piccolo alone pubblicitario), visibile nel Cruscotto, in Acquisti e nel confronto
  del Mercato. Sposta la domanda accanto al prezzo.
- **Gate rafforzato (2026-07-28):** `npm --prefix apps/web run verify` (tipi + test) è ora nella
  Definition of Done, e il gate dell'orchestratore esegue `test` → `typecheck` → `build`.
  Corretti gli 8 errori di tipo che si erano accumulati invisibili nei file di test.
- **Policy modelli attiva:** design e requisiti sui **modelli gratuiti** OpenRouter (dove il
  consuntivo è ottimo); i task di **codice** su **deepseek/deepseek-v3.2 a pagamento**
  (~0,02 $ per task, tetto di 2 $ per sessione letto dal saldo reale; consumati 0,35 $ finora).
  Ripartizione dei ruoli fra agenti e Claude in `docs/15-metodo-di-lavoro.md`.
- Baseline requisiti: `REQUIREMENTS.md` v2 CONVERGENTE (Word consegnato). Skill del Coach applicate.

## Risorse / infrastruttura (create)
- **GitHub:** repo privato (versioning attivo).
- **Supabase:** progetto dedicato · regione eu-west-1 · piano free.
  Chiavi: anon/publishable recuperabili dal dashboard; **mai nel repo**, vanno in env
  (Vercel + `apps/web/.env.local` locale). `service_role` e segreti: solo lato server.
- **Vercel:** ambiente di **test LIVE** (piano Hobby free, git-collegato al repo, Root Directory
  `apps/web`, auto-deploy ad ogni push su `apps/web`). In futuro: ambiente di **produzione** separato.
  Le impostazioni del progetto Vercel le modifica l'utente dal pannello.

## Fatto
- Scelte fondanti: motore agenti **ibrido**, metodo **iterativo-incrementale**.
- Struttura documentale creata (visione, architettura, team, metodo, GDD).
- ADR-0001: stack tecnologico (Next.js + Supabase + Vercel).
- Definiti i 6 ruoli del team di agenti in `.claude/agents/`.
- GDD §0: regole v0 (leva prezzo, formula di mercato).
- **Demo giocabile del core loop**: Next.js PWA + `game-engine` v0 (7 test verdi) + UI
  mobile, verificata su viewport telefono. Gira in locale end-to-end.
- **Orchestratore autonomo** (`orchestrator/`): **multi-provider** (8 provider OpenAI-compatible,
  modello per ruolo via `models.json`), degradazione sicura a mock. Dry-run e fallback testati.
- **Team a 12 ruoli** (aggiunto **model-curator/LLMOps** che mantiene i modelli aggiornati).
- **Primo run live riuscito** (OpenRouter/Nemotron Ultra): 4 proposte reali generate.
- Orchestratore migliorato: blackboard con GDD+codice motore, `max_tokens` 4000, loop resiliente.
- **Team messo al lavoro davvero** (subagent Claude): PM ha pianificato Sprint 2, Code Reviewer
  ha revisionato le proposte.
- **Autonomia schedulata** pronta: curator autonomo (`curator.py`) + GitHub Actions + notifiche
  (`NOTIFICATIONS.md`). Attivabile con push su GitHub + secret.
- **Orchestratore PARALLELO** (ondate + handoff su dipendenze); **daemon locale**
  (`orchestrator/daemon.py`) + **launchd** per il curator giornaliero. Guida `orchestrator/AUTONOMY.md`.
- **Continuità di sessione**: `CLAUDE.md` con protocollo "leggi il progetto" (auto-caricato).
- Visioni tracciate: motore adattivo (`docs/06`), team riutilizzabile tra progetti (`docs/08`).

## In corso
- **Motore COMPLETO** (185 test verdi, in produzione): setup con costi derivati dai parametri di
  partita, approvvigionamento a tre dimensioni, scarto produttivo, qualità percepita con ritardo,
  organico come mix con mercato del lavoro conteso, crescita della domanda. **Tutte le leve nuove
  sono spente di default**: il gioco online si comporta come prima finché non le si accende.
- **UI: fatti il tab Acquisti e la schermata di setup partita** (verificati giocando).
  Manca il tab HR, il cui componente è pronto ma non integrato (vedi sopra).
- **UI ristrutturata (S15-1)**: le schermate stanno in `apps/web/src/app/components/`, lo stato
  della partita in `apps/web/src/app/hooks/useGioco.ts`, e `page.tsx` è sola composizione.
  I file grandi non sono più un ostacolo per gli agenti.
- **Metodo di lavoro rivisto** (2026-07-27) → [`docs/15-metodo-di-lavoro.md`](../docs/15-metodo-di-lavoro.md):
  agli agenti il lavoro di alto livello e i pezzi piccoli e ben specificati, a Claude
  l'integrazione e i file grandi. Deciso sui dati: gli agenti riescono sui moduli isolati e
  falliscono sistematicamente su `simulate.ts` e `page.tsx`.

## Prossimi passi proposti
1. **S16-1 — playtest e ribilanciamento**: nessuno dei numeri decisi dagli esperti è stato
   validato giocando. Da verificare in particolare la corsa al ribasso dei rivali (il profilo
   aggressivo arriva a perdere 36.000 € in un trimestre), se la volatilità del mercato basta a
   rendere sensate le scelte, e i tre profili di prodotto della schermata di setup (col premium
   il margine stimato risulta molto alto).
2. **S16-2 — accendere la leva HR**, dopo il playtest: tempi di arrivo, regola di assunzione dei
   rivali, effetto sul bilanciamento.
3. **Multiplayer**: auth Google, schema DB + RLS, lobby realtime, tick server-side. Mai iniziato,
   ed è l'obiettivo originale del progetto: oggi è un gioco locale a giocatore singolo.

## Rischi / note aperte
- **Regressione motore (Sprint 3):** il vincolo "senza seed = identico a v0.1" è la principale
  fonte di rischio tecnico dello sprint → mitigato con ADR-0006 (contratto congelato prima
  di implementare) e ST3-7 (test di non-regressione dedicati, 11 test esistenti invariati).
- **Scope creep sulle leve teaser:** rischio che le pillole "presto" per Distribuzione/
  Marketing diventino controlli funzionanti per fretta → mitigato: criterio di accettazione
  esplicito "ogni pillola mappa 1:1 un campo reale del motore", verificato in code review
  (ST3-11).
- Bilanciamento del gioco = incognita principale → serve playtest presto (in parte indirizzato
  dal fix T-004 in Sprint 3).
- Limiti reali delle API NVIDIA → swarm rimandato a dopo il game-engine testabile.
- Vincoli cron/edge function Supabase per il tick → da verificare in fase di design tecnico
  (non in scope Sprint 3).

## Retrospettiva (note "cosa migliorare")
- **2026-07-25 — Raccolta requisiti.** Andato bene: il motore produce requisiti veri e ricchi
  dai modelli gratuiti (v1 = 1340 righe, 10 domini). Andato male: il free tier di OpenRouter
  non regge 20 giri di fila (rate limit dopo ~5), e un bug sovrascriveva il buon documento.
  Fix applicati: throttling, stop-senza-sovrascrivere, cap per-run ripartibile, gate di
  convergenza IT. Lezione: **pochi giri di qualità > 20 alla cieca**; valutare più provider o
  piccolo budget per throughput.

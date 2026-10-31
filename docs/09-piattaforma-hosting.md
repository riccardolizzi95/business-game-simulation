# 09 — Piattaforma di hosting e backend

> Scritto dal DevOps/Platform Engineer. Questo documento è **preparazione**: descrive cosa
> è pronto nel repo e i passi che deve fare l'**utente** per attivare gli account/progetti
> reali. Nessuna risorsa cloud è stata creata, nessun segreto è stato toccato, nessun deploy
> è stato lanciato.

## 1. Decisione: piattaforma confermata

Confermo lo stack di [ADR-0001](05-decisioni/ADR-0001-stack-tecnologico.md): **Vercel** per il
frontend, **Supabase** per dati/auth/realtime/funzioni. Non propongo un'alternativa: per i
requisiti dati (PWA mobile multiplayer a turni, auth Google, dati relazionali con RLS,
realtime di lobby, esecuzione server-side + tick schedulato) resta la scelta più rapida e
con meno rischio operativo per un progetto di questa fase.

**Perché, in sintesi:**
- **Un solo ecosistema per auth + Postgres + RLS + realtime + funzioni**, invece di comporne
  quattro (es. Clerk/Auth0 + Neon/Railway Postgres + Pusher/Ably + un runtime a parte). Meno
  superficie da mettere in sicurezza, meno segreti da far girare tra sistemi diversi.
- **RLS di Postgres è il meccanismo giusto per "un giocatore vede solo i propri dati e le
  viste pubbliche della propria partita"** — più espressivo delle regole di sicurezza tipiche
  dei DB NoSQL (scartano quindi Firebase, valutato in ADR-0001).
- **Vercel + Next.js App Router è zero-config per una PWA**, con preview deploy automatici
  per ogni PR: utile per un team di agenti che propone modifiche via PR/branch.

**Contro/rischi confermati (già in ADR-0001), a cui questo documento risponde:**
- Lock-in su Supabase → accettato per ora, mitigato tenendo il `game-engine` come libreria
  TypeScript pura, non legata a Supabase (vedi §5).
- Vincoli dei cron/edge function da verificare per il tick → vedi §5, due opzioni concrete.
- Il motore in Deno (Edge Functions) va tenuto isolato e testabile → vedi §5, gap aperto.

Non ho trovato motivi per riaprire la decisione; se in futuro emergesse un vincolo che la
mette in discussione (es. costi a scala, necessità di realtime a bassissima latenza per
gameplay continuo), va scritto un nuovo ADR — non è questo il caso oggi.

## 2. Cosa è stato preparato in questo passaggio

Solo file versionati nel repo, nessuna risorsa reale:

| File | Scopo |
|---|---|
| `.env.example` | Elenco commentato di tutte le variabili d'ambiente necessarie (nessun valore reale). |
| `supabase/config.toml` | Config per `supabase start` in locale (porte, auth, edge runtime). Da riconciliare con `supabase init` quando si installa il CLI (vedi nota nel file). |
| `supabase/.gitignore` | Ignora lo stato locale del CLI (`.branches`, `.temp`) e eventuali `.env` locali della cartella. |
| `supabase/migrations/README.md` | Convenzione per le migrazioni SQL; cartella vuota, schema reale a cura del Backend Developer. |
| `supabase/functions/tick/index.ts` | Placeholder della Edge Function del tick: verifica solo un segreto condiviso, non tocca ancora il DB. Commenti che indicano cosa manca (vedi §5). |
| `apps/web/vercel.json` | Header HTTP per `manifest.webmanifest` e `icon.svg` (content-type/cache corretti per la PWA). Vive in `apps/web/` perché quella sarà la Root Directory del progetto Vercel. |
| `.vercelignore` | Esclude dal contesto di build cartelle non necessarie alla PWA (`orchestrator/`, `docs/`, `project-management/`, ecc.). |
| `docs/09-piattaforma-hosting.md` | Questo documento. |

Non ho modificato `project-management/STATUS.md`, `CHANGELOG.md`, né creato ADR (numerazione
gestita dall'utente): le decisioni che li richiedono sono segnalate come tali più sotto.

## 3. Passi che deve fare l'utente per attivare gli account

Tutti i passi che seguono sono **azioni reali su servizi esterni**: le faccio io (agente)
solo su richiesta esplicita e sotto conferma puntuale, mai in autonomia. Elenco qui la
sequenza per quando l'utente vorrà procedere.

### 3.1 Supabase
1. Creare un account su [supabase.com](https://supabase.com) e un nuovo progetto (scegliere
   la region più vicina agli utenti attesi; il piano Free basta per sviluppo/demo).
2. Annotare, da **Project Settings → API**: `Project URL`, chiave `anon public`, chiave
   `service_role` (quest'ultima va trattata come segreto pieno, mai nel client).
3. Annotare, da **Project Settings → General**: `Reference ID` (serve per `supabase link`).
4. Abilitare Google come provider auth: **Authentication → Providers → Google**. Serve prima
   creare un OAuth Client ID su [Google Cloud Console](https://console.cloud.google.com/)
   (tipo "Web application"), con come *Authorized redirect URI* quello mostrato da Supabase
   nella stessa schermata (`https://<project-ref>.supabase.co/auth/v1/callback`). Incollare
   `client_id`/`client_secret` ottenuti **nella Dashboard Supabase**, mai in file del repo.
5. Installare il Supabase CLI in locale quando si inizia a scrivere le migrazioni
   (`npm install -g supabase` oppure `brew install supabase/tap/supabase` — è l'utente/il
   Backend Developer a farlo quando serve, non è stato installato ora).
6. `supabase login`, poi `supabase link --project-ref <REFERENCE_ID>` dentro il repo.

### 3.2 Vercel
1. Creare un account su [vercel.com](https://vercel.com) (consigliato: login con lo stesso
   account GitHub del repo, per gli auto-deploy da push/PR).
2. **Import Project** dal repo GitHub del Business Game.
3. Impostare **Root Directory = `apps/web`** nelle impostazioni del progetto (il repo è un
   monorepo; è questo che fa sì che Vercel trovi `package.json`, `next.config.mjs` e il
   `vercel.json` preparato in `apps/web/`).
4. In **Project Settings → Environment Variables**, aggiungere le variabili elencate in
   `.env.example` (sezione "PWA — connessione a Supabase" + "solo server"), replicandole per
   gli ambienti Development/Preview/Production con i valori giusti per ciascuno (es. progetti
   Supabase separati per dev/prod se si vuole isolare i dati — opzionale in questa fase, non
   necessario finché non c'è vero traffico multiplayer da proteggere).
5. Deploy: automatico a ogni push su `main` (produzione) e a ogni PR (preview URL). Nessuna
   pipeline CI separata per ora esegue lint/test *prima* del deploy Vercel — vedi §6.

### 3.3 Verifica post-attivazione
- Aprire l'URL di preview/produzione da telefono, controllare che il prompt "Aggiungi a
  schermata Home" compaia (richiede manifest + HTTPS, entrambi già presenti).
- Provare il login Google end-to-end in ambiente Preview prima di considerarlo pronto per
  utenti reali.

## 4. Segreti — dove vivono

| Segreto | Dove va | Dove NON va mai |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env vars (server-only, no `NEXT_PUBLIC_`) | Nel repo, in log, in codice client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env vars, tutti gli ambienti | — (è pensata per essere pubblica, ma non va comunque committata come valore in chiaro nel repo) |
| Google OAuth `client_id`/`client_secret` | Dashboard Supabase (Auth Providers) | Repo, `.env` committato, codice |
| `TICK_CRON_SECRET` | Vercel env vars **e** Supabase Edge Function secrets (`supabase secrets set`) — stesso valore in entrambi i posti | Repo |
| `SUPABASE_ACCESS_TOKEN` (personal token CLI) | Variabile locale della persona che fa le migrazioni, o secret di un futuro workflow CI di migrazione | Repo, condiviso in chat |
| `NVIDIA_API_KEY` / `OPENROUTER_API_KEY` (orchestratore) | Già gestiti da `orchestrator/README.md` e dai secret di GitHub Actions ([ADR-0005](05-decisioni/ADR-0005-autonomia-schedulata.md)) | Non riguardano questa piattaforma di hosting del gioco |

Regola generale (già in `CLAUDE.md`): nessun segreto nel repo o nel client; RLS su ogni
tabella; il motore gira solo server-side.

## 5. Come si collega al motore server-side + al tick

Flusso previsto a regime:

```
Giocatore (PWA) → invia DECISIONE → Postgres (Supabase, dietro RLS: scrive solo la propria riga)
                                            │
                         scheduler (cron)   │  allo scadere del turno (1x/giorno)
                                            ▼
                          Edge Function "tick" (supabase/functions/tick/)
                                            │  legge le decisioni di TUTTI i giocatori
                                            │  della partita, esegue il game-engine
                                            ▼
                          scrive RISULTATI + apre il turno successivo (transazione)
```

**Cosa è già pronto:** il placeholder `supabase/functions/tick/index.ts` verifica un segreto
condiviso (`TICK_CRON_SECRET`) passato nell'header `x-tick-secret`, fail-closed se il segreto
non è configurato. Non tocca ancora il database: è deliberatamente inerte finché la logica
reale non viene scritta dal Backend Developer.

**Due opzioni per lo scheduling**, entrambe compatibili con l'architettura, da scegliere
quando si implementa davvero il tick (segnalo la decisione come **candidata a un ADR**, non
la prendo io):
1. **`pg_cron` + `pg_net` dentro Supabase** (coerente con la formulazione letterale di
   ADR-0001, "cron Supabase"): una migrazione SQL schedula una chiamata HTTP interna alla
   Edge Function. Tutto resta dentro Supabase, nessuna dipendenza da Vercel per l'affidabilità
   del tick.
2. **Vercel Cron** (`crons` in `vercel.json`) che chiama un Route Handler Next.js
   (`/api/cron/tick`, non ancora creato) il quale invoca la Edge Function o una funzione RPC.
   Più semplice da leggere/debuggare (log Vercel), e il ritmo di 1 esecuzione/giorno rientra
   comodamente nei limiti anche del piano gratuito. Da non confondere con la scelta fatta in
   [ADR-0005](05-decisioni/ADR-0005-autonomia-schedulata.md): quell'ADR riguarda l'autonomia
   del **team di agenti** (serve filesystem persistente + commit git → per questo usa GitHub
   Actions), non il tick del gioco (che deve solo fare una chiamata HTTP + scrivere su
   Postgres, cosa che Vercel Cron sa fare bene).

Non ho creato né il file di migrazione per `pg_cron` né la route `/api/cron/tick`: sono
implementazione, non preparazione della piattaforma, e dipendono dalla scelta sopra.

**Gap architetturale aperto (segnalo, non risolvo qui):** `docs/02-architettura.md` prevede
`packages/game-engine/` come libreria pura condivisa tra la PWA (Next.js) e le Edge Function
(Deno). Oggi il motore vive solo in `apps/web/src/lib/game-engine/`, il monorepo `packages/`
non esiste ancora, e la scelta dello strumento (pnpm workspaces / Turborepo) è esplicitamente
"da decidere" nello stesso documento. **Finché questo non è risolto, la Edge Function del
tick non può importare il motore reale** — è il motivo per cui il placeholder resta inerte.
Segnalo che serve una decisione del Software Architect (probabilmente un ADR) prima di
implementare il tick sul serio.

## 6. CI/CD — stato attuale e raccomandazione

Oggi non esiste una pipeline che esegua lint/test **prima** del deploy: Vercel builda e
pubblica ad ogni push, GitHub Actions ha solo i workflow dell'orchestratore
(`.github/workflows/model-curator.yml`, `agents-run.yml`), non uno per `apps/web`. Il motore
ha già test (`npm --prefix apps/web test`, Vitest) ma nulla li fa girare automaticamente su
PR. `next lint` non ha ancora una config ESLint nel progetto (prima esecuzione andrebbe
configurata interattivamente).

**Raccomandazione per un prossimo passo** (non implementato ora, per restare dentro
"preparazione" e non introdurre file che potrebbero fallire senza una config ESLint testata):
aggiungere `.github/workflows/web-ci.yml` che su ogni PR esegue `npm --prefix apps/web ci`
+ `npm --prefix apps/web test`, e blocca il merge se falliscono (branch protection su
`main`, impostazione che solo l'utente può attivare da GitHub). Lint da aggiungere in un
secondo momento, dopo aver scelto/configurato ESLint.

## 7. Checklist di rilascio (da spuntare prima di un vero go-live)

- [ ] Progetto Supabase creato, Google OAuth funzionante in Preview.
- [ ] RLS attiva e testata su ogni tabella (nessuna tabella "aperta" per dimenticanza).
- [ ] Variabili d'ambiente impostate su Vercel per Preview **e** Production (non solo una).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` presente solo lato server, verificato che non compaia nel
      bundle client (`grep` sul build output o ispezione DevTools → Network → JS).
- [ ] `TICK_CRON_SECRET` impostato sia su Vercel/scheduler sia su Supabase Edge Function
      secrets, stesso valore, generato con `openssl rand -hex 32`.
- [ ] Decisione presa (e ADR scritto) su: strumento monorepo, estrazione `packages/game-engine`,
      meccanismo di scheduling del tick (`pg_cron` vs Vercel Cron).
- [ ] Tick testato manualmente end-to-end (invocazione con segreto corretto → risultati
      scritti correttamente) prima di affidarlo allo scheduler.
- [ ] CI che fa girare i test del motore prima del merge su `main` (vedi §6).

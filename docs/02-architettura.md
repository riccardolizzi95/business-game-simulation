# 02 — Architettura software

> Documento vivo. Le decisioni "pesanti" vengono registrate come ADR in
> [`05-decisioni/`](05-decisioni/).

## Vista d'insieme

```
        ┌──────────────────────────┐
        │   PWA (Next.js, mobile)   │  ← telefono del giocatore
        │  App Router + Service     │
        │  Worker + Realtime client │
        └────────────┬─────────────┘
                     │ HTTPS / WebSocket
        ┌────────────▼─────────────┐
        │        Supabase          │
        │  ┌────────────────────┐  │
        │  │ Auth (Google OAuth)│  │
        │  ├────────────────────┤  │
        │  │ Postgres + RLS     │  │  ← stato partite, decisioni, risultati
        │  ├────────────────────┤  │
        │  │ Realtime           │  │  ← lobby, presenza giocatori
        │  ├────────────────────┤  │
        │  │ Edge Functions     │  │  ← MOTORE del gioco (tick trimestrale)
        │  │   + cron scheduler │  │
        │  └────────────────────┘  │
        └──────────────────────────┘
     Frontend hostato su Vercel · Dati e funzioni su Supabase
```

## Scelte principali
- **Frontend: Next.js (App Router) come PWA.** Manifest + service worker per installabilità
  e caching offline della shell. Mobile-first, componenti leggeri.
- **Auth: Supabase Auth con Google OAuth.** Nessuna password gestita da noi. Sessioni via
  cookie sicuri. Provider aggiuntivi (email magic link) attivabili in seguito.
- **Database: Postgres (Supabase) con Row Level Security su TUTTE le tabelle.** Un giocatore
  può leggere/scrivere solo i propri dati e le viste pubbliche della partita a cui partecipa.
- **Realtime:** presenza in lobby e notifica "turno elaborato".
- **Motore di gioco:** logica di simulazione (calcolo vendite/ricavi) in **Edge Functions**
  server-side. **Mai** nel client: il client invia solo le *decisioni*, il server calcola gli esiti.
- **Tick trimestrale:** funzione schedulata (cron Supabase) che, allo scadere del turno,
  legge le decisioni di tutti i giocatori della partita, esegue la simulazione, scrive i
  risultati e apre il turno successivo.

## Perché il motore è server-side (sicurezza + fairness)
Se la logica di calcolo vivesse nel client, un giocatore potrebbe manometterla. Le decisioni
sono input; l'elaborazione e la classifica sono autorità del server. Questo è anche il motivo
per cui l'RLS deve impedire di leggere le decisioni *altrui* prima della chiusura del turno.

## Struttura del codice (prevista — monorepo)
```
apps/
  web/            # Next.js PWA
packages/
  game-engine/    # logica di simulazione pura (TypeScript), testabile in isolamento
  shared-types/   # tipi condivisi (generati da Supabase + domini di gioco)
supabase/
  migrations/     # schema DB versionato
  functions/      # edge functions (tick, elaborazione turno)
```
> Nota: il `game-engine` come **libreria pura e testabile** è un investimento chiave —
> permette al tester di verificare il bilanciamento senza database.

## Sicurezza — regole non negoziabili
1. RLS attiva su ogni tabella; policy esplicite, deny-by-default.
2. Nessun segreto (service key, API key NVIDIA, ecc.) nel bundle client.
3. Il client non calcola mai gli esiti economici.
4. Validazione input server-side su ogni decisione (limiti di budget, capacità, ecc.).

## Da decidere (aperto)
- Monorepo con quale tool (pnpm workspaces / Turborepo)? → ADR futuro.
- Gestione del tempo/turni: cron fisso globale vs scheduler per-partita? → ADR futuro.
- Determinismo del motore (seed per riproducibilità dei playtest). → ADR futuro.

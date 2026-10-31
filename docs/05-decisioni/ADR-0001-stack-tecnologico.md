# ADR-0001 — Stack tecnologico

- **Stato:** Accettata
- **Data:** 2026-07-23

## Contesto
Serve uno stack per una PWA multiplayer mobile-first con: auth sicura (preferibilmente
Google), dati relazionali con regole di accesso forti, realtime per la lobby, ed esecuzione
server-side del motore di gioco e del tick trimestrale. L'utente conosce Vercel e Supabase.

## Decisione
- **Frontend:** Next.js (App Router) come PWA, hostato su **Vercel**.
- **Backend/Dati/Auth:** **Supabase** — Postgres + Row Level Security, Auth con Google OAuth,
  Realtime, Edge Functions per il motore e cron per il tick.

## Alternative considerate
- **Firebase:** ottimo realtime/auth, ma dati NoSQL meno adatti a un modello economico
  relazionale e query analitiche; RLS di Postgres è più espressiva.
- **Backend custom (Node/Nest + Postgres self-hosted):** massimo controllo ma molto più
  lavoro infrastrutturale; non giustificato in questa fase.
- **Colyseus/socket server dedicato per il realtime:** utile se servisse simulazione in
  tempo reale continua; qui i turni sono a cadenza giornaliera → non necessario ora.

## Conseguenze
**Pro:** velocità di sviluppo, auth Google integrata, sicurezza dati con RLS, hosting
gestito, un solo ecosistema. Adatto a mobile/PWA.
**Contro/rischi:** lock-in su Supabase; i cron/edge function hanno vincoli da verificare
per il tick; il motore in Deno (Edge Functions) va tenuto isolato e testabile.

## Note
Il `game-engine` sarà una libreria TypeScript **pura** (in `packages/`), indipendente da
Supabase, così da poter girare sia nelle Edge Functions sia nei test del QA.

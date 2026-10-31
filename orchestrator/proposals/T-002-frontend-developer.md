# Proposta — T-002: Piano di implementazione della navigazione a sezioni nella PWA

- Ruolo: **frontend-developer**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-25 10:55:10

---

# Proposta T-002: Piano navigazione a sezioni (Next.js App Router)

---

## 1. Struttura route/componenti (App Router)

```
apps/web/
├── app/
│   ├── (auth)/                    # Route group: solo login
│   │   └── login/page.tsx
│   ├── (game)/                    # Route group: shell partita + nav
│   │   ├── layout.tsx             # Layout persistente: header + bottom-nav + GameProvider
│   │   ├── page.tsx               # Redirect → /lobby o /dashboard
│   │   ├── lobby/
│   │   │   └── page.tsx           # Sezione: attesa giocatori, avvio
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Sezione: overview partita (turno, KPI, grafici)
│   │   ├── decisions/
│   │   │   └── page.tsx           # Sezione: input decisioni (prezzo, marketing, ecc.)
│   │   ├── results/
│   │   │   └── page.tsx           # Sezione: esito turno, classifica, log
│   │   └── history/
│   │       └── page.tsx           # Sezione: storico turni passati
│   ├── layout.tsx                 # Root layout: PWA metadata, providers globali
│   └── page.tsx                   # Landing → redirect a (auth) o (game)
├── components/
│   ├── game/
│   │   ├── GameProvider.tsx       # Context: stato partita + azioni (Supabase realtime)
│   │   ├── GameHeader.tsx         # Titolo partita, turno, timer, saldo
│   │   ├── BottomNav.tsx          # 4-5 icone: Lobby, Dashboard, Decisioni, Risultati, Storico
│   │   ├── SectionOutlet.tsx      # Wrapper: loading/error/empty per ogni sezione
│   │   └── hooks/
│   │       ├── useGameState.ts    # Selezione tipizzata da context
│   │       ├── useRealtimeGame.ts # Sottoscrizione canale Supabase
│   │       └── useActions.ts      # Mutazioni: submitDecision, startGame, nextTurn
│   ├── ui/                        # Primitive riutilizzabili (Button, Card, Chart, ecc.)
│   └── layout/
│       └── InstallPWAButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client (anon key)
│   │   └── realtime.ts            # Helper canali: `game:{id}`, `presence:{id}`
│   └── game/
│       ├── types.ts               # Re-export da @shared-types
│       └── validators.ts          # Zod schemas per decisioni input
└── public/manifest.json, sw.js    # PWA assets
```

**Punti chiave**
- **Route group `(game)`** mantiene `GameProvider` e `BottomNav` vivi durante la navigazione tra sezioni → zero flash, stato preservato.
- Ogni sezione è una **page.tsx** autonoma (SSR/ISR opzionale) che consuma `useGameState()`.
- `GameProvider` è **l’unica fonte di verità** lato client per lo stato partita.

---

## 2. Strategia gestione stato partita

| Livello | Cosa contiene | Come aggiornato | Persistenza |
|---------|---------------|-----------------|-------------|
| **Server (Supabase)** | `games`, `turns`, `decisions`, `results`, `players` | Mutazioni via RPC/REST (solo server calcola esiti) | Fonte di verità |
| **Realtime channel `game:{id}`** | Broadcast: `turn_started`, `decision_submitted`, `turn_resolved`, `player_joined/left` | `supabase.channel().on('postgres_changes'…)` + `broadcast()` | Effimero, sincronizza client |
| **Client `GameContext`** | `game: GameState`, `me: Player`, `turn: TurnState`, `decisions: Decision[]`, `results: Result[]`, `status: 'lobby'|'playing'|'ended'` | Riduttore (`reducer`) applica eventi realtime + optimistic update per submit locale | In memoria (persiste navigazione grazie a route group) |
| **LocalStorage (opzionale)** | `lastGameId`, preferenze UI (tema, grafici) | `useEffect` sync | Sopravvive a refresh |

**Flusso dati**
```
User action (es. submitDecision)
   → useActions.submitDecision()  // optimistic: set local "pending"
   → Supabase RPC submit_decision()
   → Postgres trigger → broadcast "decision_submitted"
   → GameContext reducer riceve evento → conferma/rollback optimistic
   → UI si aggiorna via useGameState()
```

**Perché non Zustand/Redux?**  
Context + reducer è sufficiente (stato unico, bassa frequenza aggiornamenti), evita dipendenze extra, funziona bene con React 18 concurrent features.

---

## 3. Passi implementazione ordinati

| # | Step | Descrizione | Criterio done |
|---|------|-------------|---------------|
| 1 | **Tipi condivisi** | Generare/aggiornare `packages/shared-types` da schema Supabase (`supabase gen types typescript`). | `GameState`, `TurnState`, `Decision`, `Result` disponibili in `apps/web`. |
| 2 | **Supabase client & realtime helpers** | `lib/supabase/client.ts` (singleton browser), `lib/supabase/realtime.ts` (funzioni `subscribeGame`, `subscribePresence`). | Test unitario: canale riceve evento broadcast. |
| 3 | **GameProvider + Context** | `components/game/GameProvider.tsx` con `GameReducer`, `useRealtimeGame` hook interno, espone `useGameState`, `useActions`. | Context fornisce stato iniziale da `supabase.from('games').select().eq('id', gameId).single()`. |
| 4 | **Layout `(game)` + BottomNav** | `app/(game)/layout.tsx` avvolge figli in `<GameProvider><GameHeader /><BottomNav />{children}</GameProvider>`. `BottomNav` usa `usePathname` per evidenziare attivo. | Navigazione tra `/lobby`, `/dashboard`, `/decisions` mantiene stato (no remount provider). |
| 5 | **Se

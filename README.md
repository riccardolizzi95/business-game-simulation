# Business Game — multiplayer business simulation

A turn-based business-simulation game, mobile-first PWA. Each player runs a company — plants,
production, raw materials, quality, marketing, pricing, cash — and competes for a shared market.
**One real day = one business quarter**: when the turn closes, everyone's decisions are processed
and the engine computes demand, sales, accounts and the ranking.

The project is also an experiment in **AI-native development**: a team of 23 role agents
(product, engineering and business experts) driven by a Python orchestrator, with Claude Code as
coordinator and integrator.

> Documentation (`docs/`, `project-management/`, agent personas, orchestrator notes) and the UI are
> in **Italian**; code and identifiers are in English. `CLAUDE.md` and this README are in English.

## Current status

| Area | State |
|---|---|
| **Game engine** (`apps/web/src/lib/game-engine/`) | v0.3 complete: pure, deterministic TypeScript. Demand split by attractiveness (price elasticity × marketing × perceived quality), plants and overtime, raw materials with lead time / quality / payment terms and multiple orders, inventory by lots, production scrap, quality index, marketing with lasting brand, cash ≠ profit (depreciation, COGS, payables), two reactive rivals, game setup profiles. Workforce/HR module built but switched off pending playtest. |
| **Tests** | 15 test files, **247 tests** (14 engine files + 1 for the in-game guide) |
| **Web app** (`apps/web/`) | Playable **single-player prototype** in the browser: you against two simulated rivals over 8 quarters, 4 tabs (Company, Decisions, Results with the accounts, Ranking), setup screen, explanations of each outcome. State lives in the browser. |
| **Multiplayer backend** | Not built yet: Supabase project, migration conventions and a fail-closed placeholder for the quarterly `tick` Edge Function are in place; schema, auth and persistence are next. |
| **Agent orchestrator** (`orchestrator/`) | Working: board of 85 tasks (74 done, 5 in review, 6 abandoned), proposals, verification gate, multi-provider LLM support, daily Model Curator. |
| **Next step** | Playtest, then the tuning items already on the board. |

Details: [`project-management/STATUS.md`](project-management/STATUS.md) and the engine guide
[`docs/16-come-funziona-il-motore.md`](docs/16-come-funziona-il-motore.md).

## Stack

- **Web:** Next.js 14 (App Router) as a PWA, React 18, TypeScript, Vitest
- **Planned backend:** Supabase (Postgres + RLS, Auth with Google OAuth, Realtime, scheduled Edge Function for the quarterly tick), Vercel hosting
- **Orchestrator:** Python 3 (standard library only), OpenAI-compatible LLM providers (OpenRouter, NVIDIA NIM, DeepSeek, Groq, Together, Ollama…)
- **CI:** GitHub Actions (scheduled orchestrator run and Model Curator)

## Getting started

```bash
npm --prefix apps/web install
npm --prefix apps/web run dev        # http://localhost:3000
```

No environment variables are needed to play the prototype. `.env.example` lists the variables
for the planned backend and for running the agents.

Orchestrator (free dry-run with a mock provider, no keys, no network):
```bash
python3 orchestrator/run.py
```
Live mode reads provider keys from the environment only (see `orchestrator/README.md`).

## Tests

```bash
npm --prefix apps/web run verify     # type check + all tests (the Definition-of-Done gate)
npm --prefix apps/web test           # tests only
npm --prefix apps/web run typecheck  # types only (next build does not type-check test files)
```

## Repository structure

```
apps/web/                 Next.js PWA
  src/lib/game-engine/    pure simulation engine + tests (simulate.ts orchestrates the modules)
  src/lib/ui/             presentation helpers: KPIs, warnings, outcome narrative, in-game guide
  src/app/                page, tabs and decision sections, useGioco hook
orchestrator/             Python orchestrator: board, roles, providers, gate, curator, daemon
  proposals/              agent outputs awaiting review
  requirements/           requirements baseline produced by the business agents
.claude/agents/           23 role personas (engineering, product, 10 business domains, coach, curator)
.github/workflows/        scheduled orchestrator run and Model Curator
docs/                     vision, game design, architecture, team, method, ADRs (05-decisioni/)
project-management/       STATUS, BACKLOG, SPRINT-BOARD, CHANGELOG
supabase/                 local config, migration conventions, tick Edge Function placeholder
```

## How it was built with Claude Code

- **`CLAUDE.md` as the operating manual.** Every session starts with the same protocol: check
  notifications, read `STATUS.md`, the latest `CHANGELOG.md` entries and the board, summarise,
  then wait for confirmation before large or irreversible work. A "golden rule" makes doc updates
  part of the Definition of Done, so any session can resume without explanations.
- **A team of 23 agents in `.claude/agents/`.** Engineering roles (architect, frontend, backend,
  QA, code reviewer, security, DevOps, UX, technical writer), a project manager, a game designer,
  ten business-domain experts (finance, controlling, supply chain, HR, marketing…) who wrote the
  requirements, an agent coach and a model curator. The same persona files are used by Claude
  subagents and by the Python orchestrator, and a shared rulebook (`docs/12-regole-agenti.md`)
  is injected into every prompt.
- **Orchestrator + deterministic gate.** Agents run on free or cheap models and only produce
  **proposals**; a verification gate (tests → type check → build, no LLM involved) accepts or
  rejects them, and Claude Code reviews and integrates. Decisions are recorded as ADRs.
- **Who does what, decided from data.** After measuring outcomes, agents keep high-level work
  (requirements, design, domain numbers) and small, well-specified modules in their own files;
  Claude Code acts as collector and integrator on the large shared files
  ([`docs/15-metodo-di-lavoro.md`](docs/15-metodo-di-lavoro.md)).
- **Self-maintaining infrastructure.** A Model Curator checks every day which free models are
  still available, swaps them, records per-model success statistics and writes notifications
  that Claude reports at the next session. An agent coach reviews the personas against real
  outputs and proposes improvements.
- **Verification rules.** `npm --prefix apps/web run verify` must be green before anything is
  delivered; changes to the engine are checked by playing, and refactors are verified for
  invariance (same numbers before and after).

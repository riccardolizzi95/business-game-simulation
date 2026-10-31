# CLAUDE.md — Instructions for every Claude session

> This file is **loaded automatically** at the start of every Claude Code session in this
> folder. Its job is to let work resume without explanations.
> (Translated from the Italian original; the rest of the documentation is in Italian.)

## What the project is
**Business Game**: a multiplayer business-simulation game (mobile-first PWA). 1 real day =
1 quarter; players make decisions (price, production, distribution…) and compete. Built by a
**team of agents** with an iterative-incremental method.

## 🔔 Notifications (ALWAYS check)
At the start of every session and on the command "read the project", open
[`NOTIFICATIONS.md`](NOTIFICATIONS.md): if there are `## [ ]` entries (unread, e.g. model changes
made by the Model Curator), **report them to the user** and then mark them `## [x]`.

## 🌅 Start-of-day routine (IMPORTANT)
On the **first interaction of each new day** (check today's date in the context), as the
**very first thing** run the daily Model Curator and then check what needs doing:
```bash
python3 orchestrator/curator.py --daily   # self-limiting: really runs only once a day
```
Then: read `NOTIFICATIONS.md` (unread entries → report them), look at
`project-management/STATUS.md` and `orchestrator/board.json` for pending tasks, and tell the
user what came up. (`--daily` is harmless if run several times: the second run on the same day
does nothing.)

## 🔑 "Read the project" protocol
When the user writes **"read the project"** (or comes back after a break), do in order:
0. Check `NOTIFICATIONS.md` (see above) and report unread entries.
1. Read [`project-management/STATUS.md`](project-management/STATUS.md) — current state and next steps (source of truth).
2. Read the recent entries of [`project-management/CHANGELOG.md`](project-management/CHANGELOG.md) — what was done recently.
3. Skim the index in [`README.md`](README.md) and, if needed, the files in [`docs/`](docs/).
4. Check [`orchestrator/board.json`](orchestrator/board.json) and the proposals in
   [`orchestrator/proposals/`](orchestrator/proposals/) still in `review`.
5. **Summarise** for the user: where we are, what is pending, and propose next steps.
Then wait for confirmation before large or irreversible work.

## Golden rule: track everything
On **every** change update the documentation, so continuity never breaks:
- State / next steps → `project-management/STATUS.md`
- What was done (with date) → `project-management/CHANGELOG.md`
- What remains → `project-management/BACKLOG.md` and/or `orchestrator/board.json`
- Significant technical decisions → new ADR in `docs/05-decisioni/`
A task is **not done** if the docs are not updated. Dates are absolute (e.g. 2026-07-25).

## Conventions
- 📏 **Shared rules for all agents:** [`docs/12-regole-agenti.md`](docs/12-regole-agenti.md)
  (rulebook). The orchestrator injects them into every agent's prompt; Claude subagents follow
  them. When you launch a subagent, remind it to respect them.
- **Language:** documentation and communication in **Italian**; code and identifiers in English.
- **Security:** no secrets in the repo or the client (NVIDIA API key, Supabase service key →
  environment variables only). The game engine runs server-side. RLS on every table.
- **Definition of Done:** works end-to-end · tests where they make sense · `npm --prefix apps/web
  run verify` green (types + tests) · docs + board updated.

## Quick map
| Where | What |
|---|---|
| `apps/web/` | Next.js 14 PWA (the game). Pure engine in `src/lib/game-engine/`. |
| `orchestrator/` | Autonomous orchestrator of the agent team (Python). See its `README.md`. |
| `.claude/agents/` | Role personas (used both by Claude subagents and by the orchestrator). |
| `docs/` | Vision, game design, architecture, team, method, ADRs. |
| `project-management/` | STATUS, BACKLOG, SPRINT-BOARD, CHANGELOG. |

## 🧭 Who does what (method updated 2026-07-27)
**Rule:** agents get the **high-level** work (requirements, design, domain numbers) and
**small, well-specified pieces** (new modules in their own files, reviews of diffs). Claude is the
**collector and integrator**: break the work down, integrate modules, touch the large shared
files (`simulate.ts`, `page.tsx`), verify by playing, and ship.
Rationale and data in [`docs/15-metodo-di-lavoro.md`](docs/15-metodo-di-lavoro.md): agents
succeed on small files with a clear spec and fail systematically on large ones.

## The agent team (how it works)
- **POLICY (2026-07-26): the team runs on OpenRouter (free models) through the orchestrator. Do
  NOT spawn Claude subagents for the team roles** (they cost Claude tokens). Claude keeps **only
  the overall coordination** (this session), which **finalises and verifies the code** to ship.
  Models per agent in `orchestrator/models.json`; full sheet in `docs/13-modelli-agenti.md`.
  The orchestrator produces **drafts**; finished code is guaranteed by the coordinator.
- Agents do not collaborate peer-to-peer: they are coordinated through the **board** + the
  **blackboard** (the `.md` files).
- The orchestrator produces **proposals** (`orchestrator/proposals/`) to be reviewed: it never
  applies code changes on its own.

## Useful commands
```bash
# Full check before delivering: types + tests (the minimum gate)
npm --prefix apps/web run verify
# Game-engine tests only
npm --prefix apps/web test
# Type check only (`next build` does NOT type-check test files)
npm --prefix apps/web run typecheck
# PWA dev server (in a Claude session use the preview tools, not a terminal)
npm --prefix apps/web run dev
# Orchestrator: a single round (free dry-run)
python3 orchestrator/run.py
# Local daemon: keeps the team running while you develop (parallel + daily curator)
ORCH_MODE=live OPENROUTER_API_KEY="sk-or-v1-..." python3 orchestrator/daemon.py
# Manual model check
python3 orchestrator/curator.py --check
```

## Long-term visions (do not lose them)
- **Non-deterministic** engine with environmental events and **LLM-simulated consumers**
  → `docs/06-visione-motore-adattivo.md`.
- Agent team **reusable across projects** (shared skills + cross-project memory +
  per-project compartments) → `docs/08-team-riutilizzabile.md`.

# 03 — Il team di agenti

Lo sviluppo è condotto da un **team simulato** di agenti con ruoli specializzati, come
un vero team di prodotto. Questo documento definisce **modello, ruoli e regole di lavoro**.

## Modello ibrido (deciso)
- **Team "senior" = Claude Code.** I ruoli sono implementati come *subagent* di Claude Code
  definiti in [`.claude/agents/`](../.claude/agents/). Fanno il lavoro che richiede qualità:
  architettura, codice, review, test. È il team che tu supervisioni e a cui dai le linee guida.
- **Swarm NVIDIA = opzionale, in background.** Un orchestratore esterno (Python, modelli NVIDIA
  NIM gratuiti) per task ripetitivi/a basso rischio: generazione di dati di test, bozze di
  documentazione, esplorazioni. Progettato in [`99-nvidia-swarm.md`](99-nvidia-swarm.md);
  **non** costruito nella fase 0.

> Perché ibrido: i modelli NVIDIA gratuiti hanno rate limit e qualità di coding inferiore.
> Ottimi come "manovalanza" supervisionata, non come lead engineer di un progetto complesso.

## I ruoli

| Ruolo | File agente | Responsabilità |
|---|---|---|
| **Project Manager** | `project-manager.md` | Backlog, priorità, sprint, coordinamento, tiene aggiornati STATUS/board. |
| **Software Architect** | `software-architect.md` | Decisioni tecniche (ADR), design di sistema, coerenza, sicurezza. |
| **Game Designer** | `game-designer.md` | Meccaniche, leve, economia e **bilanciamento** del gioco, GDD. |
| **Backend Developer** | `backend-developer.md` | Supabase, schema DB, RLS, edge functions, motore di gioco. |
| **Frontend Developer** | `frontend-developer.md` | PWA Next.js, UI mobile, integrazione realtime/auth. |
| **QA / Tester** | `tester-qa.md` | Test del motore, bilanciamento con dati, casi limite, regressioni. |
| **Code Reviewer** | `code-reviewer.md` | Revisione di codice e proposte: correttezza, coerenza, DoD. |
| **Security Engineer** | `security-engineer.md` | Audit RLS, segreti, auth, anti-cheat/fairness, validazioni. |
| **DevOps / Platform** | `devops-platform.md` | Deploy Vercel/Supabase, CI/CD, ambienti, cron/edge, PWA build. |
| **UX / Designer** | `designer-ux.md` | Flussi, wireframe, sistema visivo, usabilità mobile, asset grafici. |
| **Technical Writer** | `technical-writer.md` | Documentazione chiara e coerente, onboarding, lezioni apprese. |
| **Model Curator (LLMOps)** | `model-curator.md` | Mantiene aggiornati i modelli degli agenti: monitora prezzi/disponibilità, anticipa i passaggi a pagamento, adotta i migliori modelli gratuiti. Gira come subagent Claude. |
| **Agent Coach (Formatore)** | `agent-coach.md` | Meta-agente: valuta e **affina le skill** degli altri agenti in base al loro compito e ai loro output/aggiornamenti. Gira come subagent Claude. |

Il team può crescere ancora (es. Data/Analytics, Product Owner) quando il progetto lo richiede.
Non tutti i ruoli lavorano ad ogni sprint: il PM attiva quelli utili all'obiettivo corrente.

## Agenti di Business (esperti di dominio)
Ruoli **diversi** dal team di sviluppo: non costruiscono il software, ma **definiscono i
requisiti del gioco** portando la prospettiva reale del loro settore. Il **PM** (skillato
PMP/Scrum) li facilita nella raccolta requisiti; il **Game Designer** traduce in meccaniche.

| Agente di Business | File | Prospettiva |
|---|---|---|
| Operations / Produzione | `business-operations.md` | capacità, efficienza, qualità di processo |
| Commerciale / Vendite | `business-commerciale.md` | canali, clienti, prezzo, rete vendita |
| Marketing | `business-marketing.md` | domanda, brand, campagne, posizionamento |
| HR | `business-hr.md` | organico, costo lavoro, produttività, clima |
| Controlling | `business-controlling.md` | KPI, budget, margini, cruscotti |
| Amministrazione | `business-amministrativo.md` | contabilità, cassa, **quadratura conti** |
| Supply Chain | `business-supply-chain.md` | fornitori, scorte, logistica |
| Finance / Tesoreria *(consigliato)* | `business-finance.md` | capitale, prestiti, investimenti, liquidità |
| R&D / Prodotto *(consigliato)* | `business-rd-prodotto.md` | innovazione, qualità, nuovi prodotti |
| Strategia / Direzione *(consigliato)* | `business-strategy.md` | visione d'insieme, trade-off, "voce del CEO" |

Opzionali in futuro: Legal/Compliance, Customer Service/Qualità, IT/Digital.
Ogni leva di gioco che propongono avrà un'**icona che spiega l'effetto singolo** (vedi
`docs/06-visione-motore-adattivo.md`); la profondità nasce dalle combinazioni.

## Regola d'oro: tutto tracciato in `.md`
Ogni agente, ad ogni intervento, aggiorna la documentazione:
- **Cosa sto facendo** → task nel [`SPRINT-BOARD`](../project-management/SPRINT-BOARD.md).
- **Cosa ho fatto** → voce nel [`CHANGELOG`](../project-management/CHANGELOG.md) + eventuale ADR.
- **Cosa resta** → task nel [`BACKLOG`](../project-management/BACKLOG.md).
Decisioni tecniche non banali → nuovo **ADR** in [`05-decisioni/`](05-decisioni/).

## Flusso di lavoro (handoff)
```
Utente (linee guida, approvazioni)
      │
      ▼
Project Manager ── prioritizza ──► Architect (design/ADR se serve)
      │                                   │
      ▼                                   ▼
  assegna task ──► Backend / Frontend Dev ──► QA/Tester ──► review
      │                                                        │
      └──────────────── checkpoint utente ◄────────────────────┘
```

## Checkpoint umani (dove intervieni tu)
Il team **non** procede all'infinito senza di te. Si ferma e chiede approvazione:
1. Fine di ogni **sprint** (demo/playtest + priorità del prossimo).
2. Prima di ogni **decisione architetturale pesante** (ADR "significativo").
3. Prima di azioni **irreversibili o esterne** (deploy in produzione, spese, dati pubblici).

## Stato reale (onesto) — aggiornato 2026-07-23
- I file in `.claude/agents/` sono **definizioni di ruolo pronte**, ma **non ancora invocate**:
  finora il lavoro è stato svolto dall'agente principale (orchestratore) in prima persona.
- Quando invocati, sono **subagent reali** di Claude Code: istanza LLM indipendente, contesto
  isolato, system prompt del ruolo, accesso agli strumenti. Ma **vivono solo durante
  l'invocazione** (nessun processo 24/7, nessuna memoria propria oltre ai file).
- **Non collaborano peer-to-peer.** Modello **hub-and-spoke**: l'orchestratore li coordina e
  passa loro il contesto; la "collaborazione" avviene tramite la **lavagna comune** dei file
  `.md` (board, ADR, changelog). Un bus di messaggi tra pari + loop autonomo è lavoro futuro
  (orchestratore esterno, vedi `99-nvidia-swarm.md`).

## Convenzioni
- **Lingua:** documentazione in italiano; codice, identificatori e commenti tecnici in inglese.
- **Definition of Done:** codice + test + doc aggiornata + board aggiornata.
- Un task non è "fatto" se la documentazione non è aggiornata.

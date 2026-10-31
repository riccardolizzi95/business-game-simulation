# Orchestratore autonomo — Team di agenti

Programma Python (solo stdlib) che fa lavorare i ruoli del team in un **loop autonomo**:
pesca task da una board, li fa eseguire a un modello, salva le **proposte** e traccia tutto.
Progettato per usare le **API NVIDIA gratuite**, ma gira anche a costo zero in `dry-run`.

Decisione architetturale: [ADR-0002](../docs/05-decisioni/ADR-0002-orchestratore-autonomo.md).

## Come funziona (in breve)
```
board.json (task)  ──►  loop  ──►  per ogni task:
                                     persona del ruolo (.claude/agents/*.md)
                                   + task + contesto (blackboard: STATUS.md)
                                   ──► provider LLM (mock | NVIDIA)
                                   ──► proposta in proposals/  (stato → review)
                                   ──► log in runs/ e ACTIVITY.md
```
- La **board** (`board.json`) è la fonte di verità operativa. Stati: `todo → in-progress → review → done`.
- I **ruoli** riusano le stesse persona dei subagent Claude (`.claude/agents/`).
- Rispetta le **dipendenze** tra task (`deps`).

## Sicurezza / guardrail (importante)
- L'orchestratore **non modifica il codice**: produce **proposte** in `proposals/` da
  **revisionare e approvare** prima di applicarle.
- Scrive **solo** in `orchestrator/proposals/`, `orchestrator/runs/`, `ACTIVITY.md`, `board.json`.
- Niente deploy, niente spese, niente comandi di sistema, niente cancellazioni.
- Si ferma a **checkpoint umano** quando non ci sono più task eleggibili.

## Uso

### 1) Dry-run (gratis, nessuna chiave, gira subito)
```bash
python3 orchestrator/run.py
```
Usa un provider **mock** deterministico: dimostra il loop end-to-end senza costi né rete.

### 2) Live con provider reali (multi-provider)
1. Scegli un provider da [`providers.json`](providers.json) e procurati la sua **API key**.
2. Esporta le variabili (la chiave resta nel tuo ambiente, **mai** nel repo):
   ```bash
   export ORCH_MODE=live
   export NVIDIA_API_KEY="nvapi-..."        # la chiave del provider che userai
   # facoltativo: forza UNA spec per tutti i ruoli (comodo per la prima prova)
   export ORCH_MODEL="nvidia:meta/llama-3.3-70b-instruct"
   python3 orchestrator/run.py --max-iters 1
   ```
Se manca la chiave di un provider, quel task **ricade sul mock** con avviso (il run non si blocca).

### Provider disponibili (`providers.json`)
Tutti OpenAI-compatible. La chiave si legge dalla variabile `api_key_env`, mai dal file.
| Provider | Chiave (env) | Note |
|---|---|---|
| `nvidia` | `NVIDIA_API_KEY` | NIM, ~16 modelli gratis, ~40 req/min |
| `deepseek` | `DEEPSEEK_API_KEY` | DeepSeek (CN): chat + reasoner |
| `openrouter` | `OPENROUTER_API_KEY` | aggregatore, molti modelli `:free` |
| `together` | `TOGETHER_API_KEY` | molti open source |
| `groq` | `GROQ_API_KEY` | velocissimo, free tier |
| `moonshot` / `zhipu` | `MOONSHOT_API_KEY` / `ZHIPU_API_KEY` | Kimi / GLM (CN) |
| `ollama` | — | **locale/offline**, nessuna chiave |

### Un modello per ruolo (`models.json`)
Ogni ruolo può usare il **provider+modello** più adatto, con spec `provider:modello`
(es. `deepseek:deepseek-reasoner`). Si configura in [`models.json`](models.json): `default`
per tutti + `by_role` per specializzare (vuoto = usa `default`). Vedi i suggerimenti per ruolo
nel file stesso.

> ⚠️ I modelli gratuiti hanno **rate limit** e qualità variabile: ottimi per design/analisi,
> da supervisionare per il codice. Gli id esatti si copiano dal catalogo del provider.
> Consiglio: prima prova con **una sola spec** (`ORCH_MODEL`); specializza i ruoli dopo.

### Opzioni
```bash
python3 orchestrator/run.py --status        # mostra solo lo stato della board
python3 orchestrator/run.py --max-iters 2   # esegue al massimo 2 task in questo run
```

## File
| File | Ruolo |
|---|---|
| `run.py` | entrypoint CLI |
| `orchestrator.py` | loop di lavoro + logging |
| `config.py` | configurazione (env + providers.json + models.json) |
| `providers.py` | client LLM generico OpenAI-compatible + `mock` + fallback |
| `providers.json` | registro dei provider (base_url, variabile della chiave) |
| `models.json` | modello per ruolo (spec `provider:modello`) |
| `roles.py` | carica le persona da `.claude/agents/` |
| `board.py` / `board.json` | gestione e dati della board |
| `guardrails.py` | aree scrivibili e azioni vietate |
| `proposals/` | output degli agenti (da revisionare) |
| `runs/` · `ACTIVITY.md` | log delle esecuzioni |

## Task di CODICE (dal 2026-07-26)
Un task con `"kind": "code"` non produce prosa: l'agente **scrive codice vero**, su un branch
isolato e con verifica automatica.

```
worktree git isolato (branch agent/<task>, node_modules in symlink)
  └─► il modello free produce blocchi ### FILE: / ### EDIT:
      └─► applicazione con guardrail sui percorsi scrivibili
          └─► gate: npm test + npm run build  (~8s, deterministico, gratis)
              ├─ verde  → commit sul branch + report in runs/
              └─ rosso  → l'errore torna al modello e si riprova (default: 4 tentativi)
```

```bash
python3 orchestrator/run.py --code S4-3          # un singolo task di codice
python3 orchestrator/session.py --minutes 60     # sessione autonoma a tempo
python3 orchestrator/briefing.py                 # digest di stato, zero token LLM
```

- **Niente push, niente merge automatico**: il lavoro resta su `agent/*`, il merge è umano.
- Aree scrivibili dagli agenti in `patcher.py` (`apps/web/src/`, `docs/`, …); `.env`,
  `orchestrator/`, `.claude/` e `.github/` sono vietati anche se il modello ci prova.
- I task di codice **si impilano**: se un task dipende da un altro task di codice, parte dal
  branch di quello invece che da `main` (vedi `resolve_base`).
- `must_touch` nel task elenca i file che l'agente **deve** aver modificato: serve perché il
  gate verifica "non ho rotto niente", non "ho fatto ciò che serviva".

## Robustezza sui modelli gratuiti
`models.json` accetta per ogni ruolo una **lista** di spec, più una `fallback_chain` comune:
se un modello va in 429 (frequente sui free tier) si passa al successivo in pochi secondi
invece di perdere il task. Gestita anche la risposta `content: null` dei modelli reasoning.

## Limiti attuali (onesti)
- **Il gate è cieco all'intento**: `npm test` passa anche se l'agente ha implementato la cosa
  sbagliata o ha omesso i test richiesti. Mitigato da `must_touch`, non risolto: la revisione
  umana del diff resta necessaria.
- Le proposte testuali non hanno alcun gate oggettivo: valgono quanto il modello che le scrive.
- La board è separata dai `.md` umani (`project-management/`): `briefing.py` ora **rileva** le
  incoerenze, ma non le corregge da solo.
- Nessun bus di messaggi peer-to-peer: la collaborazione passa da board + blackboard +
  artefatti delle dipendenze.

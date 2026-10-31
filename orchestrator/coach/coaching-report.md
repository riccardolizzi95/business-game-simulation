# Coaching Report — Giro 1 (Agent Coach)

> Generato dal Formatore/Coach del team. Analisi di `.claude/agents/*.md`, cronologia git,
> output reali (`orchestrator/requirements/REQUIREMENTS.md`, `orchestrator/proposals/*.md`,
> `orchestrator/proposals/REVIEW.md`, `project-management/`). Data: 2026-07-25.
>
> **Importante:** queste sono **proposte da revisionare**, non applicate. Nessun file agente è
> stato modificato in questo giro.

## Metodo

1. Letto `docs/03-team-agenti.md` e `docs/08-team-riutilizzabile.md` per il modello del team.
2. Letti tutti i 23 file in `.claude/agents/*.md`.
3. Controllata la cronologia git di ciascun file (`git log --oneline -- .claude/agents/<f>.md`):
   **tutti i ruoli tecnici (architect, backend, frontend, tester, code-reviewer, security,
   devops, designer-ux, technical-writer) sono fermi al commit di fondazione `2b22a4b` e non
   sono mai stati affinati.** Solo il `project-manager` ha ricevuto un secondo commit
   (`71c312f`, competenze PMP/PMBOK + Scrum). Questo è quindi davvero il **primo giro reale**
   di coaching per quasi tutto il team.
4. Letto l'unico corpus di **output reali e già revisionati** disponibile:
   `orchestrator/proposals/T-001..T-004` (generate dai ruoli architect/frontend/designer-ux/
   tester-qa via modello economico dell'orchestratore) + `orchestrator/proposals/REVIEW.md`
   (verdetto del Code Reviewer su ciascuna). Letto anche `orchestrator/requirements/
   REQUIREMENTS.md` (1340 righe, output dei 10 agenti di Business + sintesi PM).

## Osservazione trasversale più importante

Il **Code Reviewer** ha bocciato o rimandato **3 proposte su 4** dei ruoli tecnici, sempre per
lo **stesso pattern**: proporre meccaniche/infrastruttura che **non esistono nel repo reale**
e che **contraddicono lo scope dichiarato** in `docs/01-game-design.md §0` ("v0.1 = due leve:
PREZZO + PRODUZIONE; le altre leve sono rimandate"). Il Code Reviewer, al contrario, cita
sempre file:riga reali (`apps/web/src/lib/game-engine/index.ts` righe 130-131, ADR esistenti,
test esistenti) — è il modello di comportamento "grounded" che gli altri quattro ruoli
dovrebbero imitare. **Nessuna modifica proposta per il Code Reviewer**: è già ben equipaggiato
e il suo stile va preso a riferimento.

Interessante contrasto: gli **agenti di Business** (Operations, Commerciale, ecc.) già
distinguono esplicitamente, nei loro stessi output, "già in v0.1" vs "target epiche future"
(v. tabelle "Stato v0.1" in REQUIREMENTS.md). I quattro ruoli tecnici sotto analisi **non**
hanno questa disciplina nella loro persona — è la causa diretta dei respingimenti.

---

## 1. Software Architect — priorità ALTA

**Diagnosi.** La proposta T-003 (leva Distribuzione) è stata respinta per tre motivi
cumulativi, tutti riconducibili a mancanza di "grounding" prima di proporre:
- ha disegnato una leva che `docs/01-game-design.md §0` esclude esplicitamente da v0.1;
- ha anteposto una nuova feature a un bug di bilanciamento noto e prioritario (diagnosticato
  dallo stesso giro da tester-qa);
- ha proposto di scrivere "ADR-0003", numero già occupato da
  `docs/05-decisioni/ADR-0003-multi-provider-llm.md`;
- il modello di normalizzazione delle quote (sez. 5 della proposta) è internamente
  incoerente e romperebbe l'invariante "Σ quote ≈ 1" già verificato nei test esistenti — non
  è stato controllato prima di consegnare.

La sezione "Responsabilità"/"Regole" attuale dice di "allineare le decisioni allo stack
deciso (ADR-0001)" ma non impone alcun passo di verifica pre-proposta contro lo scope
corrente, il backlog di priorità o gli ADR già numerati.

**Skill mirate da aggiungere** (nuova sezione "Competenze / Framework"):

```diff
+## Competenze / Framework
+Prima di ogni proposta tecnica, esegui un **grounding check**:
+- **Scope corrente**: rileggi `docs/01-game-design.md §0` (regole v0.1 vigenti) — non
+  proporre leve/meccaniche esplicitamente "rimandate alle epiche successive" a meno che il
+  task non lo richieda in modo esplicito.
+- **ADR esistenti**: controlla l'indice `docs/05-decisioni/` prima di numerare un nuovo ADR
+  o riproporre una decisione già presa.
+- **Priorità reale**: controlla `project-management/BACKLOG.md` e le note di bilanciamento
+  aperte prima di proporre nuove feature sopra un motore con bug/sbilanciamenti noti irrisolti.
+- **Verifica formale dei modelli quantitativi**: per ogni formula/algoritmo che tocca un
+  invariante (conservazione, normalizzazione — es. "Σ quote ≈ 1", "venduto + perso ≈
+  domanda"), esplicitalo e verificalo con un controesempio numerico (non solo un caso che
+  "torna") prima di passarlo al backend-developer.
+- Framework di riferimento: template ADR di **Michael Nygard** (contesto/decisione/
+  conseguenze); notazione leggera **C4 model** (contesto/contenitori/componenti) per
+  diagrammi quando la complessità lo giustifica.
```

**Perché serve.** Evidenza diretta: `orchestrator/proposals/REVIEW.md` §T-003, verdetto
🔴 *rimanda* — fuori scope, priorità sbagliata, ADR duplicato, bug di normalizzazione non
colto.

---

## 2. Frontend Developer — priorità ALTA

**Diagnosi.** La proposta T-002 ha progettato un'intera architettura dati/realtime
(tabelle `games/turns/decisions/results/players`, RPC `submit_decision`, trigger Postgres +
`broadcast`, canali `game:{id}`/`presence:{id}`, route group `(auth)`,
`packages/shared-types`) **che non esiste nel repo e non è mai stata decisa in un ADR**. È
un'invasione del perimetro dell'Architect (che per regola di progetto — CLAUDE.md — deve
approvare le decisioni tecniche pesanti con un ADR) e ha prodotto un piano largamente
inapplicabile. Il persona file attuale dice solo "usa i tipi condivisi generati da Supabase":
non c'è alcuna istruzione su cosa fare quando quei tipi/quello schema **non esistono ancora**.

**Skill mirate da aggiungere:**

```diff
+## Competenze / Framework
+- **Confine con l'Architect**: se un piano di implementazione richiede infrastruttura non
+  ancora esistente/decisa (tabelle DB, RLS, realtime, auth), **non progettarla
+  autonomamente**: fermati al confine, segnala esplicitamente "richiede ADR
+  dell'Architect" e consegna solo la parte implementabile con lo stato attuale del repo.
+- **Grounding sul repo reale**: prima di pianificare, verifica cosa esiste davvero
+  (`apps/web/src/app`, presenza/assenza di `packages/`, file `*supabase*`) invece di
+  assumere strutture aspirazionali.
+- Framework: budget di performance mobile (**Core Web Vitals**), pattern **app-shell /
+  offline-first** per la PWA; introduci gestione stato client (Context+reducer, store) solo
+  quando la complessità reale lo richiede, non come default.
```

**Perché serve.** Evidenza diretta: `orchestrator/proposals/REVIEW.md` §T-002, verdetto
🔴 *rimanda* — "l'intero piano presuppone un'infrastruttura backend che non esiste e non è
stata architettata".

---

## 3. UX / Designer — priorità ALTA

**Diagnosi.** La proposta T-001 (navigazione a sezioni) disegna KPI e leve — Budget
Marketing, R&S/Qualità, Soddisfazione clienti, Stock/stock-out, "marketing stimato" dei
competitor — **nessuno dei quali esiste** in `EngineConfig`/`PlayerDecision`/`PlayerResult`
del motore v0.1. Il persona file dice di "documentare le scelte in `docs/` quando
rilevanti" ma non impone di verificare che gli elementi disegnati corrispondano a dati reali
del motore prima di consegnare un wireframe come "pronto".

**Skill mirate da aggiungere:**

```diff
+## Competenze / Framework
+- **Vincolo ai dati reali**: ogni KPI/campo mostrato in un wireframe deve mappare a un campo
+  esistente in `EngineConfig`/`PlayerDecision`/`PlayerResult`
+  (`apps/web/src/lib/game-engine`); se un elemento non esiste ancora nel motore, marcalo
+  esplicitamente come "futuro (v0.2+)" invece di disegnarlo come disponibile oggi.
+- **Leggi lo scope prima di disegnare**: `docs/01-game-design.md §0` definisce cosa esiste
+  oggi; costruisci i wireframe su quello, con eventuali sezioni future chiaramente separate.
+- Framework: **euristiche di usabilità di Nielsen**, linee guida mobile (Material Design /
+  Apple HIG) per pattern di tab bar, CTA sticky, stati vuoti/errore/caricamento.
```

**Perché serve.** Evidenza diretta: `orchestrator/proposals/REVIEW.md` §T-001, verdetto
🟡 *applica con modifiche* — due sezioni su quattro da riscrivere perché "assumono leve/dati
che non esistono nel motore v0.1".

---

## 4. QA / Tester — priorità MEDIA-ALTA

**Diagnosi.** T-004 è la proposta **meglio ancorata** delle quattro (diagnosi corretta,
citazioni file:riga reali, in scope) — ma l'algoritmo proposto per la "Proposta 1"
(ridistribuzione della domanda persa) ha un **bug di conservazione**: normalizza
sull'attrattività totale includendo giocatori già saturi (capacità residua zero), quindi in
generale `Σ extraSales < totalLost`. Il tester ha scritto un property test (S5) che avrebbe
fatto emergere il bug — ma non lo ha eseguito/verificato prima di consegnare la proposta.
Questo è un gap di **tecnica di allocazione con vincoli di capacità**, non di rigore generale
(il resto del lavoro è solido).

**Skill mirate da aggiungere:**

```diff
+## Competenze / Framework
+- **Algoritmi di allocazione capacity-constrained**: per proposte di ridistribuzione di una
+  risorsa scarsa tra soggetti con capacità residua diversa, usa tecniche note come
+  **water-filling** o **iterative proportional fitting** (alloca, ricalcola capacità/pesi
+  residui tra chi ha ancora spazio, ripeti finché non c'è più capacità libera o quota da
+  assegnare) invece di normalizzazioni a singolo passaggio, che rompono facilmente gli
+  invarianti di conservazione quando alcuni soggetti sono già saturi.
+- **Verifica prima di proporre**: non limitarti a scrivere il test di proprietà (es.
+  property-based con `fast-check`/`vitest`) — esegui mentalmente o con un piccolo script lo
+  scenario limite dichiarato (es. tutti saturi tranne uno a bassa attrattività) per
+  controllare che l'invariante regga, prima di consegnare.
+- Framework: cenni di **teoria delle code/allocazione sotto vincolo**, **Monte Carlo** per
+  playtest multi-strategia, boundary value analysis (già presente, va rafforzata con
+  l'invariante "conservazione della domanda").
```

**Perché serve.** Evidenza diretta: `orchestrator/proposals/REVIEW.md` §T-004 — "l'algoritmo
di redistribuzione (Proposta 1) ha un bug di conservazione... da correggere prima che il
coder lo implementi, altrimenti il test S5 proposto fallirebbe".

---

## 5. Gap strutturale trasversale — priorità MEDIA

**Diagnosi.** Il `project-manager` e tutti i **10 agenti di Business** hanno una sezione
dedicata "Competenze / Framework" con metodi concreti (PMBOK/Scrum, Lean/Six Sigma/TOC,
Porter/SWOT/BCG, partita doppia, ecc.). I **9 ruoli tecnici** (architect, backend, frontend,
tester, code-reviewer, security, devops, designer-ux, technical-writer) **non hanno questa
sezione**: solo "Responsabilità" + "Regole" generiche. Per i quattro ruoli con evidenza
diretta di errore (architect, frontend, designer-ux, tester-qa) ho già proposto sezioni sopra
(priorità alta perché **motivate da un fallimento osservato**). Per gli altri cinque
(backend-developer, code-reviewer, security-engineer, devops-platform, technical-writer) non
c'è ancora output reale da valutare (non hanno prodotto proposte in questo batch, tranne
code-reviewer che ha fatto la review — già ottima, nessuna modifica necessaria). Propongo
quindi framework **preventivi**, a bassa priorità, da confermare o scartare al prossimo giro
quando produrranno output reali:

| Ruolo | Framework preventivo suggerito | Nota |
|---|---|---|
| backend-developer | Checklist di sicurezza delle migrazioni (idempotenza, reversibilità), pattern di test delle policy RLS (un test per ruolo × tabella × operazione) | Nessuna evidenza di errore ancora; il rischio (RLS sbagliata) è alto se/quando si passa a Supabase reale — vale la pena anticipare |
| security-engineer | **OWASP ASVS** (livello 1) come checklist di audit, **STRIDE** leggero per il threat modeling delle nuove feature | Coerente con "Threat modeling leggero" già menzionato, ma senza un framework nominato |
| devops-platform | **12-factor app**, blue-green/rollback per il tick trimestrale schedulato | Il tick cron è un punto di fallimento singolo del gioco: merita un framework di affidabilità esplicito |
| technical-writer | **Diátaxis** (tutorial/how-to/reference/spiegazione) per distinguere i tipi di documento in `docs/` | Oggi i documenti mischiano registri; aiuterebbe la manutenibilità |
| code-reviewer | *(nessuna modifica)* | Già ben equipaggiato: la REVIEW.md prodotta è puntuale, cita file:riga, verifica contro il codice reale — è il modello da cui gli altri dovrebbero imparare |

Priorità **bassa** per questa riga: sono ipotesi, non diagnosi. Da confermare quando questi
ruoli produrranno il primo output reale da revisionare.

---

## 6. Agenti di Business (10) + Project Manager + Model Curator + Agent Coach — nessuna modifica

**Diagnosi.** L'output reale (`orchestrator/requirements/REQUIREMENTS.md`, 1340 righe, 10
domini + sintesi) è ricco, ben strutturato e **già disciplinato sullo scope**: ogni dominio
letto (Operations, Commerciale, Marketing, HR) distingue esplicitamente "già in v0.1" da
"target epiche future" con tabelle dedicate, cita parametri coerenti con
`docs/01-game-design.md`, e propone KPI/eventi/interazioni implementabili. La sintesi del PM
(duplicati da unificare, conflitti tra domini, MoSCoW) è esattamente il lavoro atteso da un
PM formato PMP/Scrum. Le sezioni "Competenze / Framework" già presenti sono puntuali (Lean/
Six Sigma/TOC per Operations, 4P/STP/AARRR per Marketing, partita doppia per Amministrativo,
ecc.) e non generiche. **Nessuna modifica proposta in questo giro.**

`model-curator` e `agent-coach` non hanno ancora output valutabili (sono meta-ruoli appena
introdotti); nessuna modifica.

---

## Riepilogo priorità

| Priorità | Agente | Proposta |
|---|---|---|
| **Alta** | software-architect | Grounding pre-proposta (scope, ADR, backlog) + verifica invarianti sui modelli quantitativi |
| **Alta** | frontend-developer | Non progettare infrastruttura non ancora architettata; grounding sul repo reale |
| **Alta** | designer-ux | Vincolare wireframe ai campi reali del motore; leggere lo scope prima di disegnare |
| **Media-Alta** | tester-qa | Algoritmi di allocazione capacity-constrained (water-filling/IPF) + verifica pre-consegna |
| **Media** | backend-dev, security, devops, technical-writer | Framework preventivi (nessuna evidenza ancora — da confermare al prossimo giro) |
| **Nessuna modifica** | code-reviewer, project-manager, 10 agenti di Business, model-curator, agent-coach | Già equipaggiati per il compito reale osservato |

## Prossimo passo suggerito

Se le proposte alta priorità vengono accettate, applicarle ai 4 file (`software-architect.md`,
`frontend-developer.md`, `designer-ux.md`, `tester-qa.md`) e annotare l'aggiornamento nel
`CHANGELOG.md` (data + motivazione + link a questo report). Ripetere il giro di coaching dopo
il prossimo batch di proposte reali per validare se il pattern "fuori scope / non grounded" è
stato corretto.

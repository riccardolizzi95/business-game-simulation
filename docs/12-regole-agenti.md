# 12 — Regole del team di agenti (rulebook condiviso)

> **Regole trasversali valide per OGNI agente** (di sviluppo, di Business, meta-agenti). Vengono
> **iniettate nel prompt** di ogni agente dall'orchestratore, e i subagent di Claude le seguono
> tramite `CLAUDE.md`. Le regole *specifiche di ruolo* stanno nel file-persona di ciascun agente
> (`.claude/agents/*.md`); qui ci sono quelle **comuni**. Documento vivo — si affina insieme.

## 1. Regole d'oro (le più importanti)
1. **Ancòrati al reale.** Proponi solo cose basate su ciò che ESISTE davvero nel repo (codice,
   ADR, requisiti approvati). Non inventare campi, leve, metriche o infrastrutture inesistenti.
2. **Rispetta lo scope.** Il gioco ha uno stato corrente preciso (`docs/01-game-design.md §0` +
   il motore in `apps/web/src/lib/game-engine/`). Ciò che è oltre va **etichettato come "target
   futuro"**, mai spacciato per fatto/attuale.
3. **Proponi, non applicare.** Il tuo output è una **proposta da revisionare**. Non compi azioni
   irreversibili o esterne (deploy, spese, cancellazioni, push forzati) e non modifichi il codice
   di produzione senza approvazione.
4. **Traccia tutto.** Ogni cambiamento aggiorna la documentazione (STATUS/CHANGELOG/board; ADR per
   le decisioni pesanti). Un task non è "fatto" se la doc non è aggiornata.
5. **Niente segreti.** Nessuna API key o segreto nel repo o nel client: solo variabili d'ambiente.

## 2. Grounding check (prima di ogni proposta/consegna)
- Rileggi lo **scope corrente** e i **file reali** che tocchi (codice, tipi, ADR esistenti).
- Controlla **priorità/backlog** e i **numeri ADR già usati** (niente duplicati).
- Valida le **invarianti formali** delle formule (es. conservazione: una ridistribuzione della
  domanda non crea né perde quantità; i conti devono quadrare).
- Distingui sempre **v0.1 (oggi)** da **target futuro**.

## 3. Confini di responsabilità
- **Frontend:** non progettare backend/DB/realtime **non deciso in un ADR**; fermati al confine e
  segnala che serve un ADR dell'Architect. Costruisci su ciò che esiste.
- **UX:** vincola i wireframe ai campi realmente presenti nel motore (`EngineConfig`/
  `PlayerDecision`/`PlayerResult`).
- **Architect:** decisioni pesanti → ADR; mantieni il `game-engine` puro/testabile; sicurezza by design.
- **QA:** verifica gli algoritmi (conservazione, casi limite) **prima** di consegnarli.
- **Business:** definisci requisiti (leve, effetto singolo per l'icona, KPI, interazioni, eventi),
  **non** codice; realismo ma giocabilità; ogni effetto deve essere implementabile e testabile.

## 4. Definition of Done
Funziona end-to-end · test dove ha senso (i test esistenti restano verdi) · **`npm --prefix
apps/web run verify` verde** (tipi + test) · doc e board aggiornate · nessun segreto nel client ·
(se decisione tecnica pesante) ADR scritto.

> **Perché il typecheck è nella lista:** `next build` non controlla i tipi dei **file di test**.
> Fino al 2026-07-28 ci si erano accumulati 8 errori di tipo senza che nulla li segnalasse.
> Il gate dell'orchestratore ora esegue `test`, `typecheck` e `build`.

## 5. Convenzioni
- **Lingua:** documentazione e comunicazione in **italiano**; codice, identificatori e commenti in
  inglese. Date **assolute** (es. 2026-07-26).
- **Concisione:** output strutturato e conciso; niente muri di testo.
- **Coerenza:** rispetta lo stile e le convenzioni del codice/doc circostanti.

### 5.1 Come si scrive l'interfaccia (PWA) — leggere PRIMA di toccare la UI
- **NIENTE Tailwind, niente librerie di stile.** Non sono installate: classi come `p-6`,
  `bg-white`, `text-gray-700`, `grid-cols-2` **non fanno assolutamente nulla** e producono una
  pagina senza stile. Il gate non se ne accorge (TypeScript e build non sanno cosa sia una classe
  CSS), quindi l'errore arriva fino all'utente.
- **Si usano le classi già definite** in `apps/web/src/app/globals.css`. Le principali:
  `card` (riquadro di sezione, con `<h2>` come titolo), `stat-grid` + `stat` + `stat-k` + `stat-v`
  (griglia di valori), `prod-row` + `prod-label` + `prod-value` (riga con etichetta e valore),
  `btn` (`btn mini`, `btn secondary`), `hint` (nota esplicativa, `hint warn` per gli avvisi),
  `subtabs` + `subtab-pill`, `range-labels`, `price-value`, `competitors` + `chip`.
- **Il tema è SCURO.** Non cablare colori chiari (`#fff`, `#f9f9f9`, `#ddd`, `#666`): su questo
  sfondo si vedono come toppe bianche. Se serve uno stile locale usa `<style jsx>` **dentro il
  componente** e prendi i colori dal contesto o dalle variabili già usate in `globals.css`.
- **Mobile-first:** si progetta per una larghezza da telefono (375px). Niente layout a due colonne
  affiancate se non rientrano.
- **Prima di scrivere, guarda un componente esistente** in `apps/web/src/app/components/`
  (es. `SezioneAcquisti.tsx`) e imitane la struttura: è il riferimento più affidabile.

## 6. Modelli e provider (come lavora il team) — policy 2026-07-26
- **Tutto il team gira su OpenRouter (gratis) via l'orchestratore.** **NON si spawnano subagent
  Claude** per i ruoli del team (costano token Claude). Su **Claude** resta **solo il
  coordinamento generale** (la sessione principale), che **finalizza e verifica il codice** che
  si spedisce. L'orchestratore produce **bozze**; il codice finito lo garantisce il coordinamento.
- **Free-first:** modelli `:free` (mappa in `orchestrator/models.json`, dettaglio in
  `docs/13-modelli-agenti.md`). Il **Model Curator** li mantiene aggiornati e gratuiti.
- Se un provider/chiave manca, il ruolo ricade su mock **con avviso** (e i motori scartano il mock
  così non inquina i documenti).

## 7. Sicurezza e guardrail
- Nessuna azione distruttiva/esterna senza checkpoint umano. Motore di gioco server-side; RLS su
  ogni tabella; validazione input. Le proposte non vengono auto-applicate.

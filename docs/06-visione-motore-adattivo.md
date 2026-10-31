# 06 — Visione: motore adattivo e non-deterministico (LLM-driven)

> 🌟 **Visione a tendere, NON stato attuale.** Oggi il motore è deterministico (v0.1).
> Questo documento cattura dove vogliamo arrivare, per non perdere la rotta. Ci arriviamo
> per gradi, migliorando di volta in volta.

## L'idea
Il gioco non deve basarsi su un motore deterministico classico e prevedibile, ma su un
sistema che **ha una logica sotto ma non è prevedibile — come la vita reale**. Tre pilastri:

1. **Tanti parametri** (a tendere): non solo prezzo e produzione, ma R&S, qualità, brand,
   canali, logistica, finanza, HR… un'azienda simulata a tutto tondo.
2. **Eventi / imprevisti ambientali**: shock di domanda, crisi, mode, stagionalità,
   concorrenza esterna, costi materie prime — per simulare la vita reale.
3. **Consumatori simulati via LLM**: invece di una formula fissa, si chiamano modelli
   (es. API NVIDIA) che impersonano **segmenti/gruppi di persone**. Ogni chiamata decide
   quanti prodotti di ogni tipo quel gruppo acquista, dato prezzo, prodotto, marketing e
   contesto. Questo introduce **variabilità realistica** con una logica dietro.

## Come si integra con l'attuale (approccio graduale)
Non si butta il motore deterministico: diventa lo **scheletro** su cui innestare gli strati.
```
Motore deterministico (v0.1)         → base leggibile e testabile
  + strato stocastico (eventi, rumore) → variabilità controllata
    + segmenti-consumatori LLM         → domanda emergente, non prevedibile
```
Ogni strato è opzionale e attivabile: si può giocare in modalità "deterministica" (per
test/bilanciamento) o "viva" (LLM). Il `game-engine` resta puro; lo strato LLM è un
**fornitore di domanda** intercambiabile dietro un'interfaccia.

## Perché le API NVIDIA calzano qui
È il vero uso "figo" dei modelli gratuiti citati all'inizio: non (solo) agenti-sviluppatori,
ma **agenti-consumatori**. Un pool di prompt-persona ("famiglia a basso reddito", "early
adopter tech", "azienda B2B") → ogni trimestre ricevono l'offerta di mercato e rispondono
con acquisti. Collegato a [`99-nvidia-swarm.md`](99-nvidia-swarm.md).

## Sfide da risolvere (oneste)
- **Costo / latenza**: una partita = molte chiamate (segmenti × trimestri × giocatori).
  Serve batching, caching, e un budget di chiamate per partita.
- **Riproducibilità**: gli LLM sono stocastici → servono seed/temperature controllate e un
  log delle risposte per poter rigiocare e fare debug.
- **Leggibilità per il giocatore**: deve comunque capire *perché* ha venduto tot, altrimenti
  sembra arbitrario. Serve che il modello restituisca anche una **motivazione sintetica**.
- **Anti-exploit / fairness**: nessun giocatore deve poter manipolare il prompt; lo strato
  LLM gira solo server-side.
- **Coerenza economica**: il totale acquistato deve rispettare vincoli (domanda finita,
  budget dei segmenti), quindi l'output LLM va **normalizzato/validato** dal motore.

## Passi realistici verso questa visione
1. Astrarre la "domanda" dietro un'interfaccia `DemandProvider` (oggi: formula; domani: LLM).
2. Aggiungere prima gli **eventi ambientali** deterministici-con-seed (più semplici degli LLM).
3. Prototipo di **un solo segmento LLM** su una partita di test, misurando costo/latenza/qualità.
4. Espandere a più segmenti + motivazioni + validazione economica.
5. Modalità mista configurabile per partita.

> Nota: manteniamo sempre una modalità deterministica per QA e bilanciamento — non si può
> bilanciare ciò che non si può rigiocare uguale.

## Precisazioni sul motore (2026-07-25)
Dettagli aggiunti dall'utente, da tenere come bussola:
- **Motore AI-simulativo, non per forza generativo.** Il "modello AI" che elabora i parametri
  può essere anche non generativo (statistico/ML/agent-based): l'obiettivo è **realismo** e
  **prevedibilità imperfetta** — si può *stimare* l'esito ma **non esserne certi**. È questa
  incertezza (con una logica sotto) a rendere il gioco accattivante.
- **Due strati che convivono:**
  1. una **parte deterministica** che fa **quadrare i conti in modo puntuale** (contabilità,
     bilanci, cassa — i numeri devono tornare sempre);
  2. un **motore simulativo** che lega quella parte deterministica con **tutti gli altri
     giocatori** e con gli **imprevisti randomici**, producendo l'incertezza realistica.
- **Un'icona per ogni leva.** Ogni leva del gioco ha un'**icona che spiega il suo effetto
  singolo** (isolato). Sta poi al giocatore capire **come combinare** i vari effetti — la
  profondità nasce dalle combinazioni, non da tabelle da studiare.
- **Strutture-popolazione:** più "strutture" che calcolano il comportamento di segmenti/gruppi
  di popolazione (vedi consumatori-LLM sopra), per aumentare il realismo emergente.
> Resta una **visione a tendere**: il motore attuale è deterministico v0.1; ci arriviamo per gradi.

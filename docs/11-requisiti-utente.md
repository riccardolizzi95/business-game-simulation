# 11 — Requisiti dell'utente (Product Owner)

> Input diretto dell'utente (che fa da **Product Owner**). Ha priorità: gli agenti di Business e
> il Game Designer devono **incorporare e raffinare** questi requisiti nelle iterazioni. Questo
> file viene letto come contesto dal motore di raccolta requisiti.

## 1. Giocatori e simulatori
- **Minimo 4 giocatori** per partita; **nessun massimo**.
- Se non si raggiungono 4 giocatori **reali**, entrano dei **simulatori (bot)** a completare il
  numero minimo.
- I bot devono essere **leggermente depotenziati** rispetto a un buon giocatore umano, per
  rendere il gioco **divertente** (non frustrante né troppo facile). Da definire *come* e *quanto*
  depotenziarli (es. decisioni meno ottimali, reattività ridotta agli eventi).

## 2. Personalizzazione a inizio partita (impostazioni dell'host)
Parametri configurabili quando si crea la partita:
- **Capitale iniziale** (importo di partenza).
- **Mercato / prodotto** su cui si compete: es. **lavatrice**, **TV**, **abbigliamento**, ecc.
  (il prodotto scelto può cambiare parametri di costo/domanda/stagionalità).
- **Durata del trimestre**: default **1 giorno reale**, ma opzione **1 settimana** (per dare a
  tutti il tempo di analizzare i dati e decidere le leve).
- **Numero di partecipanti**: minimo 4, massimo illimitato.
- **Livello degli eventi esterni** (gli **imprevisti** di ambiente, sia **positivi** che
  **negativi**, che **valgono per tutti** i giocatori): si regola la **probabilità/intensità**.

## 3. Demand Planner (sezione previsioni)
Sezione dove il giocatore **stima le previsioni di vendita per il trimestre successivo**.
- È **molto importante**: il numero di pezzi stimati permette di calcolare, nel tab del prezzo,
  **quanto incidono le varie voci di costo** rispetto al prezzo di vendita.
- Giocando su questi parametri si **stimano i profitti**.
- Deve fornire **strumenti di supporto** alla stima (es. storico, trend, effetto delle leve).

## 4. Tab Simulazione (strumento decisionale)
Raccogliere **domanda + prezzo + costi** in un unico **tab "Simulazione"** che permetta di:
- fare agilmente **aggiustamenti tra domanda stimata e prezzo**;
- vedere l'impatto sul **margine/profitto** in tempo reale;
- **decidere il prezzo di vendita** con l'aiuto di strumenti (es. break-even, analisi di
  sensitività prezzo↔volume, ripartizione dei costi sul prezzo).
> Idea: è il "quartier generale decisionale" del giocatore — collega Demand Planner ↔ Prezzo ↔ Costi.

## Note per gli agenti
- Questi requisiti sono **target** (non tutti in v0.1): il motore attuale ha solo prezzo +
  produzione. Il Game Designer e i domini devono mappare questi punti su leve/parametri/UX
  implementabili e a fasi (v0.1 → v0.2 → …), mantenendo le icone-per-effetto e la giocabilità.
- La parte deterministica deve far **quadrare i conti**; domanda/eventi restano lo strato
  simulativo (vedi `docs/06`).

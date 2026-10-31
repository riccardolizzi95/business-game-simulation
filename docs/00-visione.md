# 00 — Visione e scope

## Elevator pitch
Un gioco di simulazione aziendale multiplayer in cui, prendendo decisioni strategiche
e operative, batti i tuoi competitor sul mercato. Tecnico e profondo, ma giocabile dal
telefono in pochi minuti al giorno.

## Concetto di base
- Si gioca a **partite** con un numero definito di giocatori.
- La partita **inizia** quando il numero richiesto di giocatori si è connesso alla lobby.
- **1 giorno reale = 1 trimestre** aziendale. Ogni giorno i giocatori impostano le decisioni;
  allo scadere del turno il motore le elabora e produce i risultati.
- Le decisioni determinano **produzione, costi, vendite, ricavi** e la posizione competitiva.

## Aree decisionali (bozza — da dettagliare nel game design)
- **Produzione / Capacità:** quanti stabilimenti comprare/aprire, capacità, investimenti.
- **Forza lavoro:** numero di dipendenti, turni, straordinari, costo del lavoro, produttività.
- **Distribuzione:** negozi proprietari vs vendita ai retailer vs online; margini e reach diversi.
- **Marketing / Prezzo:** prezzo di vendita, spesa marketing, posizionamento.
- **Finanza:** liquidità, prestiti, investimenti (fase successiva).
- **R&S / Qualità:** miglioramento prodotto (fase successiva).

## Cosa rende "tecnico" il gioco
Profondità nelle leve operative (turni, straordinari, mix distributivo, saturazione impianti)
e nel modo in cui interagiscono con un mercato condiviso e competitivo.

## Pubblico e piattaforma
- Piattaforma: **PWA** installabile, ottimizzata per **mobile**.
- Sessioni brevi giornaliere; adatto a gruppi (amici, classi, aziende, formazione).

## Fuori scope (per ora)
Elenco esplicito di ciò che NON facciamo nella prima versione, per evitare scope creep:
- App native iOS/Android (la PWA copre il mobile).
- Economia con mercato azionario / M&A tra giocatori.
- Chat in-game, social feed.
- Monetizzazione / pagamenti.

Questi possono rientrare in roadmap future, ma non guidano le prime iterazioni.

## Metriche di successo (bozza)
- Una partita completa (lobby → più trimestri → classifica finale) giocabile su telefono.
- Regole trasparenti: il giocatore capisce *perché* ha venduto tot.
- Bilanciamento tale che nessuna singola strategia domini banalmente.

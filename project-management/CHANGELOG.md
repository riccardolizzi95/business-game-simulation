# CHANGELOG

Registro cronologico di ciò che è stato fatto. Voce più recente in alto.
Formato: `AAAA-MM-GG — [ruolo] — descrizione`.

## 2026-07-29 (notte) — Interfaccia rifatta: da 10 destinazioni a 4, e il gioco ti parla
Il committente: «mi risulta molto difficile al momento giocarci». Prima di consultare il team ho
giocato e **misurato** l'attrito, così il brief è partito da prove e non da impressioni:
10 destinazioni (6 tab + 4 sottosezioni), sezione Acquisti alta 2,2 schermate con 17 controlli,
prima schermata del gioco un muro di parametri economici, e — la prova più netta — **si poteva
chiudere un trimestre senza decidere nulla**, perdere 1.370 vendite e scoprirlo dopo.

**Team consultato**: UX designer (S18-1, struttura) e game designer (S18-2, guida al giocatore).
Due regole scartate in revisione: «stabilimenti = 0» è irraggiungibile in questo gioco, e la
stima della domanda volevano ricalcolarla nell'interfaccia mentre il motore la espone già.

**Cosa è cambiato**
- **Quattro tab** invece di dieci destinazioni: Azienda · Decisioni · Risultati · Classifica.
  Simula, Conti e Mercato non sono spariti: la sensitività al prezzo è dove si decide il prezzo,
  i conti e il mercato sono dentro Risultati.
- **Il turno in una schermata**: le quattro sezioni una sotto l'altra, con il riepilogo delle
  decisioni ancorato in alto e il bottone di chiusura ancorato in basso, sempre raggiungibile.
- **Campi numerici digitabili** al posto dei soli cursori, con scorciatoie: «Domanda stimata»,
  «Quanto manca», «Come Alfa», «Capacità piena». Su un telefono centrare un numero con un cursore
  era quasi impossibile.
- **Avvisi PRIMA di chiudere**: materie prime insufficienti, produzione sotto la domanda, cassa che
  va sotto zero, vendite sottocosto, capacità ferma. Si avverte, non si impedisce: al massimo si
  chiede un secondo tocco. Il gioco deve poter essere giocato male.
- **Il racconto dell'esito** al posto della tabella: tre o quattro frasi che dicono *perché* è
  andata così, con la causa vera delle vendite perse, più un consiglio per il trimestre dopo.

**Verificato giocando**: chiudendo senza decidere nulla ora compare «la domanda stimata è 3.582
unità ma ne avrai 3.000 da vendere: circa 582 vendite perse» **prima** della chiusura. E dopo:
«Hai perso 559 vendite perché la capacità produttiva non bastava: erano 55.900 € di ricavi
mancati», col consiglio di valutare uno stabilimento in più.

**Corretto in revisione** un mio errore: la frase su utile e cassa diceva «una parte dei costi la
pagherai più avanti» anche quando la differenza veniva dall'ammortamento e dal materiale già in
magazzino. Ora elenca i motivi veri invece di indovinarne uno. 247 test verdi.

## 2026-07-29 (sera) — Contabilità completata: ammortamento, costo del venduto, ordini multipli
Chiusi in sequenza i tre passi rimasti del piano S17-5. Da qui il motore è a un **punto fermo**
testabile: guida completa in [`docs/16-come-funziona-il-motore.md`](../docs/16-come-funziona-il-motore.md).

**Ammortamento (S17-6)** — l'acquisto di uno stabilimento non è più un costo del trimestre:
escono 250.000 € di cassa e sul risultato pesano **12.500 €/trimestre** per 20 trimestri.
Scelti 20 e non i 40 del consolidamento: su una partita di 8 trimestri la quota da 6.250 € sarebbe
stata impercettibile. Verificato giocando: comprando uno stabilimento il trimestre chiude a
**+55.441 €** invece di −194.559 €.

**Costo del venduto (S17-7)** — la merce prodotta e non venduta non pesa più sul trimestre in cui
la produci: resta valorizzata a magazzino e diventa costo quando la vendi. Produrre in eccesso ora
costa **solo la giacenza**, non l'intero valore della merce invenduta.

**Ordini multipli (S17-8)** — richiesta esplicita del giocatore. Il magazzino è ora a **lotti**,
ognuno con il suo prezzo e la sua qualità; si possono accodare più ordini nello stesso trimestre
con consegne e pagamenti diversi; il consumo è FIFO e la qualità del prodotto è la **media pesata**
di ciò che si consuma. Verificato in partita: due ordini (Economy/express/anticipato e
Ultra/2Q/90 giorni) → 49.324 € pagati subito e 101.534 € a scadenza T4.

**Nodo logico risolto**: la domanda si calcola prima della produzione, quindi la qualità che entra
nell'attrattività è quella del materiale **già in magazzino**, non di quello consumato. Usare il
consumo avrebbe creato una dipendenza circolare.

**Cinque test esistenti aggiornati**, ciascuno con la motivazione del cambiamento scritta accanto:
il capex non è più nel profitto, nel costo c'è l'ammortamento, e la cassa non è più «saldo +
utile» ma passa dal ponte competenza→cassa. Nessun test è stato piegato per farlo passare.

**232 test verdi**, gate verde. Restano aperti solo il playtest (S16-1, ora sbloccato) e le
tarature/aggiunte già tracciate: leva HR, scala della qualità, fido e scoperto.

## 2026-07-29 — [team + coordinamento] La cassa smette di essere il profitto (+ sezione Conti)
Segnalazione del giocatore: «pagavo la materia prima a 2 trimestri ma i soldi mi venivano tolti
subito». Verificato sul motore, ed era **peggio**: con «paga a 60 giorni» l'ordine costava
105.000 € invece di 95.000 (sovrapprezzo per la dilazione) **e la cassa usciva comunque subito**.
Cassa finale 817.800 € contro 827.800 €: la dilazione era **strettamente peggiore**, si pagava un
premio per un beneficio mai ricevuto. `supply.ts` calcolava già la scadenza corretta
(`accountsPayableDue`), ma `simulate.ts` non la guardava.

**Cinque esperti di dominio al lavoro insieme** (S17-1 amministrativo, S17-2 finance, S17-3
controlling, S17-4 supply chain, S17-5 architetto per il consolidamento). L'architetto ha risolto
5 contraddizioni, incluse le due segnalate in revisione dal coordinamento, e ha prodotto un piano
in 9 passi ordinati per urgenza.

**Implementato il passo P1 — la cassa segue i PAGAMENTI, non il profitto**
- `CashState` porta ora lo **scadenzario dei debiti** verso fornitori; `calculateCashFlow()`
  calcola la cassa dai flussi (incassi − pagamenti scaduti − altre uscite).
- Chi non usa il magazzino materie prime (i rivali) resta sul vecchio calcolo: cassa = profitto.
- Verificato giocando: ordine a 60 giorni al T1 → «paghi nel trimestre T3», cassa che **sale** a
  1.154.600 € invece di scendere, e al T3 escono i 105.000 € con risultato 158.200 € ma
  variazione di cassa 53.200 €.

**Nuova sezione «Conti»** (richiesta esplicita): conto economico del trimestre, flusso di cassa,
e soprattutto la riconciliazione **«Da utile a cassa»** che risponde a «ho fatto utile, perché ho
meno soldi?». C'è anche una scheda che dichiara **cosa non è ancora nei conti** — ammortamenti,
costo del venduto, termini di incasso — invece di far finta che i conti siano completi.
Sei tab entrano a 375px senza tagliare le etichette.

**Divergenza da risolvere in S17-6**: sull'ammortamento S17-1 propone 20 trimestri (12.500 €/trim)
mentre S17-5 ha cambiato a 40 (6.250 €/trim) senza dichiararlo. Su una partita di 8 trimestri la
differenza è fra un costo visibile e uno impercettibile.

**Restano da fare** (tracciati S17-6..S17-9): ammortamento, costo del venduto sulle unità vendute,
**ordini multipli** (richiesti dal giocatore, richiedono il magazzino a lotti), e la fase 2 con
fido, interessi e bancarotta. 221 test verdi.

## 2026-07-28 — [team + coordinamento] La qualità del prodotto diventa una leva vera (0–10)
Richiesta del committente: un indice di qualità confrontabile da mostrare ai giocatori, così che
la qualità diventi un terreno di gara oltre al prezzo. **10 = condizioni massime**, e la qualità
massima NON si ottiene assumendo solo esperti ma con un organico bilanciato, come nel mondo vero.

**Design del team** (tre task in parallelo, modelli gratuiti):
- **S16-3 (HR)**: mix ideale **1 junior : 3 skilled : 2 expert** e una funzione di bilanciamento
  basata sul coefficiente di Bhattacharyya: vale 1 sul mix ideale, **0,33 con soli esperti**,
  0,17 con soli junior. È davvero non monotona nel numero di esperti, come richiesto.
- **S16-4 (marketing)**: la pubblicità sposta la percezione ma non sostituisce la sostanza.
- **S16-5 (game designer)**: consolidamento in un indice unico e effetto sulla domanda.

**Tre errori trovati in revisione** (i documenti non sono stati presi per buoni):
1. La penalità di S16-4 **non distingueva** prodotto buono da prodotto scadente: calcolando il
   punto fisso, la percezione si fermava sempre a `realtà + 1,24`, sia con qualità 7 sia con 3.
   Rimandata al game designer, che l'ha corretta con un bonus **proporzionale alla qualità reale**.
2. La tabella di verifica della correzione aveva ancora una riga sbagliata (qualità 7 → punto
   fisso 8,02, non 7,04): i test sono stati scritti ricalcolando, non copiando.
3. S16-5 applicava il coefficiente di bilanciamento **senza quadrato** e assumeva un organico di
   default «tutti skilled», mentre il default del gioco è 6/8/4 (già quasi bilanciato, 0,959).

**Implementazione** (`product-quality.ts`, 15 test):
```
realQ = (0,55 × materiali + 0,45 × organico) × (1 − penalità straordinari)
indice = realQ + alone pubblicitario (max +0,5, proporzionale alla qualità reale)
```
Il punto di riferimento **non è un numero scritto a mano** ma è calcolato dalla configurazione di
partenza: il moltiplicatore di domanda vale 1 per costruzione, e la non-regressione non dipende
da un'aritmetica da rifare a mano. 215 test verdi.

**Verificato giocando**: la qualità risponde al materiale (Economy 7,6 · Standard 8,4 · Premium
9,0 · Ultra 9,5) e **sposta la domanda** (3.424 → 3.659 → 3.948 unità stimate). L'indice è ora
visibile nel Cruscotto, in Acquisti (con il confronto rispetto al mercato) e soprattutto nella
tabella del Mercato, dove si legge accanto a quella dei rivali.

**Due questioni aperte, tracciate in S16-7** (da chiudere col playtest): la scala è compressa in
alto (si parte già da 8,4 su 10) e i rivali non hanno una strategia di qualità, quindi restano
fissi al riferimento e il giocatore vince sempre il confronto comprando meglio.

## 2026-07-28 — [coordinamento] S16-6: le materie prime si consumano davvero
Si potevano comprare materie prime ma non servivano a nulla. Sondando il motore sono emersi
**tre difetti**, non uno.

1. **Gli ordini non arrivavano mai.** In `simulate.ts` il trimestre corrente era cablato a `0`
   («placeholder»): con un «adesso» fermo, ogni ordine scadeva sempre nel futuro. Sonda: tre
   trimestri, produzione `0, 0, 0`. Chi avesse collegato il magazzino così avrebbe fermato il gioco.
2. **La materia prima era contata due volte**: 25 €/unità dentro `productionCost` *e* di nuovo
   come costo d'acquisto dell'ordine.
3. **«Express» non era immediata.** L'opzione ha lead time 0 e l'interfaccia annuncia «subito»,
   ma l'ordine finiva comunque fra quelli in transito: arrivava il trimestre dopo, costando di
   più di «standard» per lo stesso risultato.

Inoltre il risultato del motore esponeva solo la giacenza, non gli **ordini in transito**: senza
`rawMaterialState` l'interfaccia non poteva riportarli al trimestre successivo e le consegne
differite si sarebbero perse per strada.

**Cosa c'è ora:** scorta iniziale settabile nella schermata di setup (default 6.000 kit = due
trimestri a capacità piena di uno stabilimento), ordini che arrivano secondo il lead time scelto,
produzione limitata dal materiale disponibile, magazzino e merce in arrivo visibili nel tab
Acquisti con l'avviso di quanto non si riuscirà a produrre. I rivali hanno riapprovvigionamento
automatico e non si bloccano mai (scelta dell'utente).

**Verificato giocando**, oltre a 7 test nuovi (200 verdi): magazzino 6.000 → 3.000 → 0 con
l'avviso al terzo trimestre; e un ordine di 6.000 piazzato a T1 con consegna standard arriva a
T2 (6.000 «in arrivo») e a T3 il magazzino è di nuovo pieno.

**Difetto dell'ambiente corretto:** `next build` e `next dev` condividono `.next`, quindi ogni
volta che girava il gate a server acceso i chunk sparivano (404 su `main-app.js`) e la pagina
restava senza JavaScript — nessun bottone rispondeva. Sembrava un errore di idratazione, non lo
era. Ora la build del gate scrive in `.next-gate` (`distDir` in `next.config.mjs` +
`GATE_ENV` in `verify.py`): verificato lanciando il gate a server acceso, i chunk restano serviti.

## 2026-07-28 — [coordinamento] Tab HR in frigo: componente in casa, leva spenta
Decisione dell'utente sulle tre opzioni aperte: **si accende dopo il playtest**, non prima.
Ribilanciare adesso significherebbe farlo due volte, perché la leva cambia capacità e costi fissi.

- `SezioneHR.tsx` portato su `main` **non collegato**, invece di lasciarlo marcire su un branch.
  In testa al file c'è il motivo, con le tre decisioni di design ancora aperte e il rimando al
  task che le risolverà: chi lo riapre fra un mese capisce subito perché è lì e non è attivo.
- Sostituiti i colori chiari cablati (`#f9f9f9`, `#ddd`, `#666`) con le variabili del tema scuro:
  è un difetto indipendente da come lo accenderemo, tanto vale correggerlo ora.
- Aperti due task veri sulla board, perché finora il playtest era solo una riga in STATUS:
  **S16-1 playtest e ribilanciamento** (tre partite complete, squilibri con i dati, proposta di
  ritaratura) e **S16-2 accensione della leva HR**, che dipende da S16-1 e porta scritte dentro
  le tre domande: tempi di arrivo, regola di assunzione dei rivali, effetto sul bilanciamento.
- Ripuliti branch e worktree degli agenti (`agent/S15-2`, `agent/S15-3`).

Verificato che il gioco non sia cambiato: la sezione HR non compare fra le sottosezioni delle
Decisioni, il trimestre si chiude normalmente, nessun errore. Gate verde.

## 2026-07-28 — [team + coordinamento] S15-3: schermata di setup partita, e gli agenti tornano a leggere le regole
Primo uso del team dopo il refactor S15-1. Entrambi i task hanno superato il gate al primo
tentativo, ma **la revisione ne ha bocciato uno**: è il motivo per cui il gate non basta.

**Il difetto scoperto (grave, riguardava TUTTI gli agenti)**
Il rulebook `docs/12-regole-agenti.md` veniva iniettato nei prompt **troncato a 1800 caratteri**
su 5820: gli agenti non vedevano né la Definition of Done, né le convenzioni, né la policy sui
modelli. Il primo `SetupPartita.tsx` era infatti scritto in **Tailwind**, che in questo progetto
non esiste (nessuna dipendenza, nessun config): sarebbe uscita una pagina senza stile. Il gate
non poteva accorgersene — TypeScript e build non sanno cosa sia una classe CSS.
- Aggiunta la sezione **§5.1 «Come si scrive l'interfaccia»** al rulebook: niente Tailwind e
  perché, l'elenco delle classi vere di `globals.css`, il tema scuro, mobile-first, e l'invito a
  imitare `SezioneAcquisti.tsx`.
- Alzato il limite di iniezione a 8000 caratteri (`RULEBOOK_CHARS` in `coder.py` e
  `orchestrator.py`), con la motivazione nel commento.
- Rilanciato il task: **secondo tentativo idiomatico**, 125 righe contro 304, solo classi del
  progetto.

**Integrazione (coordinamento)**
- Stato del setup nell'hook `useGioco`, con `configFromSetup()`: senza scelta si restituisce
  `DEFAULT_CONFIG` **intatta**, ed è questa la garanzia di non-regressione.
- Gli estremi del cursore del prezzo seguono il prezzo di riferimento (60%..140%): col profilo
  Premium (180 €) il cursore va da 108 a 252 €. Prima era cablato 60..140 e il gioco sarebbe
  stato ingiocabile fuori dal profilo standard.
- **I rivali giocano con la stessa economia** (`cfg` passata a `generateRivalDecision`): senza
  questo avrebbero quotato 95 € contro un prodotto da 180 €.
- Aggiunti i due controlli mancanti (prezzo standard e incidenza del costo): l'agente li mostrava
  in sola lettura, mentre il task chiedeva di sceglierli.
- Corretto un **errore di idratazione**: `toLocaleString()` senza locale formatta `10,000` sul
  server e `10.000` nel browser. Ora usa `num()`, che fissa `it-IT` in un punto solo.

**Verificato giocando**: chi salta il setup rigioca la partita di riferimento di S15-1 con
**0 differenze sui numeri** (4 righe cambiate, tutte etichette del cursore: `€60` → `60 €`, che
ora segue la formattazione del resto dell'app). Col profilo Premium l'economia cambia coerente:
costo unitario 81 € = 180 × 45%, rivali a 171/204 €.

**S15-2 (tab HR) NON integrato**, in attesa di una decisione di prodotto: il motore modella tempi
di arrivo e asta salariale mentre il componente assume all'istante, accendere la leva cambia il
bilanciamento, e l'asta non ha senso finché i rivali non hanno una regola di assunzione. Il
componente resta sul branch `agent/S15-2`.

## 2026-07-28 — [coordinamento] Il controllo dei tipi entra nel gate (8 errori nascosti)
`npm run build` **non controlla i tipi dei file di test**: ci si erano accumulati 8 errori di
tipo mai segnalati da nessuno, perché nessuno lanciava `tsc` e il gate dell'orchestratore girava
solo `test` + `build`.

- **Corretti tutti e 8**: `cash.test.ts` importava `CashState` dal modulo sbagliato e costruiva
  cinque `PlayerResult` a cui mancavano sei campi obbligatori (ora un solo `makeResult` con
  override, le asserzioni sono identiche); `engine.test.ts` leggeva `availableForSale`, che è un
  calcolo interno e non esiste sul risultato (il controllo a runtime resta, con un cast esplicito
  che dice perché), e il suo `makeResult` non aveva `marketingCost` e `brandEquity`.
- **Nuovi comandi**: `npm --prefix apps/web run typecheck` e `run verify` (tipi + test).
- **Gate dell'orchestratore**: ora `test` → `typecheck` → `build`, in ordine di costo crescente
  (~0,6s / ~4s / ~20s). Vale quindi anche per il lavoro degli agenti.
- **Definition of Done** aggiornata in `CLAUDE.md` e in `docs/12-regole-agenti.md`.
- `*.tsbuildinfo` in `.gitignore`: la cache incrementale di TypeScript nascondeva parte degli
  errori fra un'esecuzione e l'altra (la prima volta ne mostrava 2 su 8).

**Verificato che il gate fallisca davvero**: introdotto apposta un errore di tipo in un test, il
gate si è fermato al passo `typecheck` con il messaggio giusto — mentre i test passavano lo
stesso, che è esattamente la classe di difetti che prima sfuggiva.

## 2026-07-28 — [coordinamento] S15-4: la causa delle vendite perse la dice il motore
Difetto trovato **giocando** durante S15-1, non dai test: quando si perdevano vendite il gioco
dava sempre la colpa alla capacità produttiva e consigliava di comprare stabilimenti — anche
quando la capacità era **tripla** della domanda e il limite vero era la produzione decisa.
Caso reale: «Hai perso 783 vendite: la domanda (4327) ha superato la tua capacità (12.600)».
Seguire quel consiglio costava 250.000 € per un problema che stava altrove.

- **Motore**: nuovo campo `lostSalesCause` su `PlayerResult` (`capacity` | `materials` |
  `production` | `scrap`), calcolato in `simulate.ts` prendendo il vincolo che morde per primo,
  dal più duro al più rimediabile. Le scorte iniziali entrano nel conto: se magazzino + capacità
  coprono la domanda, la capacità non è la causa.
- **Interfaccia**: `TabMercato` sceglie solo il testo in base alla causa — nessuna formula
  duplicata nella UI, come da regole. Quattro messaggi, ciascuno col consiglio giusto.
- **Avviso in Operations**: `capacityShort` non rifà più il confronto `domanda > capacità`
  (che ignorava il magazzino) ma usa il verdetto del motore.
- Corretta l'etichetta «Vendite perse (capacità)» in Simula: ora è solo «Vendite perse».

**Verificato giocando**, oltre agli 8 test nuovi (193 verdi in tutto):
capacità 12.000 con produzione 2.000 → «la capacità (12.000) non era il limite: avresti potuto
produrre di più»; capacità 3.000 contro domanda 4.234 → messaggio di prima, invariato; con 1.559
unità in magazzino e domanda 3.640 sopra una capacità di 3.000 l'avviso sugli stabilimenti **non
compare più**, perché le scorte coprono.

## 2026-07-28 — [coordinamento] S15-1: `page.tsx` spezzato in componenti (931 → 219 righe)
Refactor puro, **comportamento invariato**: nessuna formula spostata, nessun valore cambiato.
È il prerequisito di tutta la UI che resta: quel file era il motivo per cui ogni task di
interfaccia affidato a un agente falliva.

**Cosa è stato estratto** (ognuno su file proprio)
- Sezioni del tab Decisioni: `SezioneCommerciale`, `SezioneOperations`, `SezioneAcquisti`,
  `SezioneMarketing` — props minimali, formule importate dal motore.
- Tab interi: `TabCruscotto`, `TabSimula`, `TabMercato`, `TabClassifica`.
- Stato della partita nell'hook `useGioco` (decisioni, chiusura trimestre, ripartenza, stime).
- Condivisi: `lib/ui/format.ts` (formattazione) e `lib/ui/kpi.ts` (soglie KPI).

**Come è stata verificata l'invarianza** (i test non coprono la UI)
Partita di 2 trimestri con una **sequenza di input fissa** e **seed congelato**, poi confronto
automatico di 247 righe di interfaccia — tutti e cinque i tab più le quattro sottosezioni,
numeri compresi. Rieseguito **dopo ognuna delle 9 estrazioni**: sempre identico. Il seed è stato
ripristinato a casuale a fine lavoro. Verificati a parte, perché il confronto testuale non li
vede: le icone ✅/⚠️/❌ dei KPI (che arrivano da `content` CSS, con lo scope per componente di
styled-jsx) e il funzionamento con **clic reali**, non solo con eventi sintetici.
185 test verdi, build di produzione ok.

**Numeri di riferimento della partita di prova** (seed 424242, per riprodurla):
dopo 2 trimestri cassa 815.123 €, profitto cumulato −184.878 €, ultimo trimestre 3281 vendite e
67.878 € di profitto, scorte 296, quota 32,4%.

**Difetto dell'orchestratore corretto in corsa**: il Model Curator giornaliero crashava
(`'list' object has no attribute 'strip'`) perché `models.json` contiene ora catene di
escalation (liste) mentre il curator assumeva stringhe. Sistemato; inoltre non tocca più i
modelli a pagamento scelti dalla policy, che prima avrebbe sostituito con dei free.

## 2026-07-27 (notte) — Motore v0.3 completo + metodo di lavoro rivisto
Sessione lunga: dai dieci documenti di design al motore completo, con la UI a metà.

**Motore (185 test verdi, tutte le leve spente di default)**
- `setup.ts`: sette parametri di partita da cui si derivano tutti i costi. Niente più costanti
  cablate — è la correzione dell'utente che ha eliminato alla radice la contraddizione fra
  design (25,00 € contro 27,50 € per lo stesso kit).
- `supply.ts`: approvvigionamento a tre dimensioni indipendenti. Verificato giocando: da 17,97 €
  (pianificato 3Q + economy + anticipato) a 43,41 € (express + ultra + 90 giorni), un fattore 2,4×.
- `quality.ts`: scarto produttivo da materiali, personale e straordinari, con tre destini per i
  pezzi scartati; e qualità percepita che insegue quella reale con ~4 trimestri di ritardo.
- `workforce.ts`: organico come mix, bacino conteso con asta salariale deterministica, formazione
  interna. Il bacino finito rende «tutti Expert» **irraggiungibile**, non solo subottimale.
- Integrati in `simulate.ts`: capacità = min(impianti, forza lavoro), costo del personale fra i
  fissi, crescita della domanda separata dal rumore.

**UI** — tab Acquisti giocabile e verificato. Mancano HR e schermata di setup.

**Difetti dell'orchestratore corretti in corsa**
- Il lavoro fallito veniva distrutto: ora si conserva con marcatore `[NON SUPERATO]`. È così che
  si è scoperto che un task «fallito» aveva in realtà tutti i test verdi.
- Un solo blocco SEARCH andato a vuoto buttava via l'intero tentativo, anche con l'albero verde.
- Budget di output per i task di prosa fermo a 4.000 token: tutti e sei i design erano usciti
  troncati a metà frase.
- La quarantena dei modelli aveva escluso 6 modelli su 7, e l'ordinamento aveva retrocesso al
  quarto posto il modello a pagamento in favore dei gratuiti, per scarti di puro rumore.
- Aggiunta al contratto la trappola della virgola mobile (`100 × 0.55 = 55.00000000000001`), che
  aveva bloccato per quattro tentativi il modulo fondamentale.
- I test nuovi vanno ora in file nuovi: `engine.test.ts` a 1.400 righe era stato corrotto tre
  volte da SEARCH/REPLACE, perdendo ogni volta lavoro sul motore che era corretto.

**Metodo di lavoro rivisto** → `docs/15-metodo-di-lavoro.md`
Deciso dall'utente sui dati della sessione: agli agenti il lavoro di alto livello (requisiti,
design, moduli isolati con specifica chiara, review) e a Claude l'integrazione e i file grandi.
La discriminante osservata non è la difficoltà concettuale ma la dimensione del file da toccare:
i moduli nuovi passano al primo colpo, `simulate.ts` e `page.tsx` falliscono sistematicamente.
Corollario: conviene avere file piccoli, quindi il prossimo passo è spezzare `page.tsx`.

## 2026-07-26 (sera, 5) — MAGAZZINO in produzione: scorte, costo di giacenza e leva di produzione
Il rifacimento (S5-9 + S5-10) ha corretto entrambi i difetti che avevano bloccato il rilascio:
`simulateQuarter` accetta ora `startingInventories` per giocatore e le scorte si riportano
davvero fra trimestri; il costo di giacenza è **2,50 €/unità/trimestre** come deciso da Supply
Chain, definito in un solo punto ed **importato** dalla UI invece che riscritto.
**Verificato giocando**: prodotte 6000 unità con domanda 4332 ⇒ 1668 restano, e il trimestre
successivo si apre con 1668 in magazzino. 67 test verdi.

### Tre difetti trovati in revisione, tutti invisibili al gate
- **Non-regressione rotta da un default.** `d.productionQty ?? capacity` faceva produrre a
  capacità piena quando il campo manca. Con capacità superiore alla domanda un trimestre passava
  da **+69.985 € a −83.367 €**. I 38 test esistenti non l'hanno visto perché **nessuno copriva il
  caso domanda < capacità**: punto cieco storico della suite. Corretto il default e aggiunti 4 test
  di non-regressione su quello scenario.
- **Un test che sanciva il bug.** L'agente aveva scritto `expect(productionQty).toBe(10 * plantCapacity)`,
  cristallizzando il comportamento sbagliato. Corretto: ora verifica `productionQty === unitsSold`.
- **Leva inerte.** `handleProductionChange` era definita ma nessun elemento la chiamava: il
  giocatore non poteva decidere la produzione, e la UI forzava comunque 3000 unità. Aggiunto lo
  slider con il trade-off esplicito ("ne resterebbero N a magazzino, costo di giacenza X").
- Difetto minore: il costo unitario di giacenza era reso con `eur()`, che arrotonda agli interi e
  mostrava 2,50 € come «3 €». Aggiunto un formattatore con i centesimi.

### Corretto un difetto dell'orchestratore: i task abbandonati venivano resuscitati
`session.py` usava `blocked` sia per «fallito, riprova» sia per «accantonato di proposito», e la
sessione ha rifatto da capo tre task del magazzino già scartati, sprecando un giro. Aggiunto lo
stato **`abandoned`**, che la rianimazione non tocca mai.

## 2026-07-26 (sera, 4) — Sprint 5: rilasciato a metà, e il motivo vale più dello sprint
Gli agenti hanno consegnato tutti gli 8 task e **tutti hanno superato il gate**. In revisione ne
sono stati rilasciati solo due: è la prova che il gate verde non basta.

**RILASCIATO** (in produzione)
- **S5-1** — il seed dei rivali ora dipende dal `rivalId`. Verificato: prima due rivali aggressivi
  con lo stesso seed davano 85 e 85, ora 81 e 85, col determinismo intatto.
- **S5-6** — soglie buono/attenzione/preoccupante sui KPI del Cruscotto. **Corretto in revisione**:
  `getKpiStatus` applicava "più alto è meglio" a TUTTI i KPI, quindi un 23,5% di vendite perse
  risultava «Buono». Le soglie erano scritte giuste, mancava la direzione → aggiunto
  `higherIsBetter`. Ora 33,6% di vendite perse ⇒ «Preoccupante».

**NON RILASCIATO** — il magazzino (S5-4, S5-5, S5-7) resta su branch
- **Le scorte non si riportano mai.** In `simulate.ts` c'è `const startingInventory = 0` cablato e
  `simulateQuarter` non ha modo di ricevere il magazzino precedente: produci in eccesso, paghi la
  giacenza, e il trimestre dopo la merce è sparita. Sarebbe solo una penalità.
- **Il costo di giacenza ha tre valori diversi**: 2,50 € deciso da Supply Chain, 2,00 € nel motore,
  1,10 € nella UI. Gli artefatti portano il design *fino* all'agente, ma nulla verificava che
  l'avesse rispettato.
- Rifacimento tracciato in **S5-9**.

### Il buco più grave: si possono cancellare i test e il gate resta verde
S5-5 ha provato due volte a modificare `engine.test.ts` con blocchi `EDIT` mirati; falliti i
SEARCH, al quarto tentativo ha **riscritto l'intero file da capo** (437 righe) ricostruendolo a
memoria e **perdendo 11 test dei KPI** (38 → 32). Il gate è passato lo stesso, perché *un test
cancellato non può fallire*. Nessun controllo se n'era accorto, e nemmeno il code reviewer.
- Fix: nuovo controllo deterministico in `coder.py` che confronta i **nomi** dei test fra il branch
  e la base della catena; se ne manca anche uno, il tentativo viene respinto con l'elenco esatto dei
  test spariti. Verificato a posteriori su S5-5: li rileva tutti e 11.

## 2026-07-26 (sera, 3) — Sprint 4 "Base gestionale" COMPLETATO dagli agenti in parallelo
Terza sessione autonoma: **tutti i task dello Sprint 4 consegnati**, tre agenti in parallelo su
file disgiunti, merge senza un solo conflitto. **50 test verdi**, build OK, in produzione.

- **S4-4** `cash.ts` + test (cassa e scoperto, regole Finance) · `nemotron-3-super-120b` dopo due
  fallimenti dei modelli laguna — la catena di fallback ha fatto esattamente il suo mestiere.
- **S4-5** `rivals.ts` + test (rivali reattivi al prezzo, deterministici via mulberry32) · `laguna-m.1`.
- **S4-6** KPI di Controlling nel Cruscotto · `laguna-s-2.1`. Verificato nel browser su viewport
  telefono: valori aritmeticamente corretti, `null` resi come "—", classi CSS esistenti riusate.
- **Motore spezzato in moduli** (`types` · `market` · `simulate` · `kpis` · `cash` · `rivals`) con
  `index.ts` ridotto a barrel. È ciò che ha reso possibile il parallelismo: sul monolite i tre
  agenti si sarebbero scontrati sullo stesso file.
- **Router dei modelli per tipo di lavoro** + **pagella** (`model-stats.json`) alimentata dagli
  esiti oggettivi, con **quarantena automatica** sotto il 34% di successo.
- **Policy costi**: bloccate le spec non `:free` (il credito di 10 € non va toccato), con sblocco
  solo via `ORCH_ALLOW_PAID=1`. Serve perché il Model Curator aggiorna `models.json` da solo.

### Il code review ha rivelato il buco più grave, e poi ha prodotto valore vero
- **v1 — allucinata.** Il revisore dipende da task di CODICE, che non producono proposte `.md` ma
  branch git: `read_dep_artifacts` gli passava il vuoto. Ha inventato file (`bots.ts`), funzioni
  (`updateCash`, `calculateROI`) e **quattro verdetti "BLOCCANTI" su codice inesistente**.
  Fix: il diff reale dei branch delle dipendenze entra nel prompt; e regola esplicita nel system
  prompt di ogni agente — «se ti manca il materiale, dichiaralo e fermati; un'analisi inventata è
  peggio di un'analisi mancante».
- **v2 — corretta ma troncata.** Diff tagliato a 7k caratteri ⇒ due falsi "bloccanti" (un `rng`
  «mai usato» che era usato 20 righe sotto, una guardia «mancante» che era optional chaining).
  Fix: `DIFF_LIMIT` a 60k — con finestre da 262k token risparmiare caratteri lì costa solo
  conclusioni sbagliate.
- **v3 — utile.** Zero falsi positivi e **un difetto reale**: `rivalId` non entra nel generatore
  casuale, quindi due rivali con lo stesso profilo e seed producono lo stesso identico prezzo
  (verificato: 85 e 85). Aperto **S5-1** per correggerlo.

## 2026-07-26 (sera, 2) — [Coordinamento] Prime due sessioni autonome: 3 task consegnati, 4 bug corretti
Due sessioni non sorvegliate (50' + 45') sullo Sprint 4. Consegnati **S4-1** (Finance, regole
della cassa vincolata), **S4-2** (Controlling, 6 KPI con formule e soglie) e **S4-3** (motore:
KPI implementati + 14 test nuovi, `agent/S4-3`, 37 test verdi). I bug emersi valgono più dei task:

- **Modello reasoning che non scrive mai** — `cohere/north-mini-code:free` ha consumato 8326 token
  di ragionamento sui 8000 disponibili producendo **zero caratteri** (`finish_reason=length`).
  Fix: `CODE_MAX_TOKENS` 8000→24000, prompt di retry sfoltito (blackboard e artefatti solo al primo
  tentativo: 11.9k→7.9k token), modello spostato in coda alla catena con la motivazione annotata.
- **Sessione che gira a vuoto** — `session.py` rianimava i task bloccati solo se NESSUN task era
  `todo`; con un task bloccato e 4 dipendenti `todo` ma non eleggibili la condizione non scattava:
  101 giri inutili in 33 minuti. Fix: si valuta l'**eleggibilità**, non lo stato `todo`.
- **`must_touch` che chiedeva l'impossibile** — misurava i file toccati *in quell'esecuzione*, ma un
  task ripreso trova parte del lavoro già committato sul proprio branch e non ha più nulla da
  cambiare lì. L'agente veniva bocciato all'infinito (e negli output grezzi lo si vede litigare con
  l'istruzione impossibile). Fix: si confronta col **punto di partenza della catena**
  (`resolve_chain_base`), non con l'ultimo tentativo. Il lavoro di S4-3 era già completo e corretto:
  era il controllo a essere sbagliato.
- **Symlink `node_modules` nel commit** — il pattern `node_modules/` del `.gitignore` non copre un
  symlink, che per git è un file. Fix: esclusione esplicita in `info/exclude` del worktree.
- Aggiunti: ripresa dei task falliti dal proprio branch invece che da zero (`resolve_base`), e
  salvataggio dell'**output grezzo** del modello quando il parsing fallisce (senza, un errore di
  formato è indistinguibile da una risposta vuota).

## 2026-07-26 (sera) — [Coordinamento] Autonomia degli agenti: dalla prosa al codice verificato
Obiettivo dichiarato dall'utente: **ridurre al minimo il consumo di token Claude** sfruttando i
modelli gratuiti di OpenRouter, dare più autonomia agli agenti e migliorarne la collaborazione.
Diagnosi: Claude era centrale non per policy ma per tre buchi architetturali — gli agenti
producevano solo `.md`, non potevano verificarsi, e non si scambiavano il lavoro.

- **`orchestrator/briefing.py`** — digest deterministico dello stato del progetto (git, STATUS,
  CHANGELOG, board, sprint) **senza alcuna chiamata a LLM**, con rilevamento automatico delle
  incoerenze fra documentazione e board. Sostituisce la lettura di ~800 righe di markdown nel
  contesto di Claude. `--narrate` aggiunge un riassunto da modello free. Alla prima esecuzione ha
  ritrovato da solo tutto il drift che era stato individuato a mano.
- **Passaggio degli artefatti fra task** (`read_dep_artifacts` in `orchestrator.py`): l'output dei
  task da cui un task dipende entra ora nel suo prompt. Prima le `deps` ordinavano solo
  l'esecuzione — il frontend non vedeva mai i wireframe dell'UX.
- **Agenti che scrivono CODICE** (`coder.py`, `patcher.py`, `verify.py`): worktree git isolato su
  branch `agent/<task>`, formati di modifica robusti (`### FILE:` e `### EDIT:` con SEARCH/REPLACE
  invece dei diff unificati, che i modelli deboli sbagliano sistematicamente), guardrail sui
  percorsi scrivibili, **gate di verifica `npm test` + `npm run build` (~8s)** e loop di **retry
  che rimanda l'errore al modello**. Niente push, niente merge automatico su `main`.
- **Catena di fallback fra modelli** (`models.json` + `complete_with_chain`): i free tier vanno in
  429 senza preavviso; ora un rate limit costa qualche secondo invece di un task perso. Il coder ha
  8 modelli di riserva. Gestita anche la risposta `content: null` dei modelli reasoning.
- **Controllo `must_touch`**: il gate è cieco all'intento (i test passano anche se l'agente
  "dimentica" i test richiesti) → controllo deterministico sui file obbligatori del task.
- **`orchestrator/session.py`** — sessione di lavoro a tempo, non sorvegliata, che rimette in coda
  i task bloccati per motivi transitori invece di fermare tutta la catena a valle.
- **Verificato end-to-end**: prova reale con `cohere/north-mini-code:free` → tentativo 1 a vuoto,
  tentativo 2 gate verde e commit sul branch. Codice prodotto di qualità reale (tipi corretti,
  JSDoc in italiano, divisioni per zero gestite). **Limite onesto emerso e documentato**: il gate
  verifica "non ho rotto", non "ho fatto quel che serviva" — l'agente aveva omesso i test richiesti,
  da cui il controllo `must_touch`.
- **Tracciamento riallineato**: chiusi in `board.json` i task T-005…T-012 (Sprint 3, consegnato ma
  mai chiuso) e in `SPRINT-BOARD.md` i 17 task di Sprint 2 e 3 rimasti ⏳; corretta la sezione
  "In corso" di `STATUS.md`. Caricato lo **Sprint 4 "Base gestionale"** (S4-1…S4-7).

## 2026-07-26 (pomeriggio) — [Backend Dev] Motore v0.2: rumore/eventi con seed + fix T-004
- **Rumore + eventi di mercato riproducibili** (Tappa A): nuovi campi `EngineConfig.demandNoisePct`
  (default 0.09) e `EngineConfig.marketEvents` (4 eventi bilanciati: boom +20%, tendenza +12%,
  rallentamento −20%, stretta −12%); nuova funzione esposta
  `resolveMarketConditions(seed, config?)` (PRNG mulberry32 deterministico) e nuova firma
  `simulateQuarter(decisions, config?, seed?)`. **Vincolo di regressione rispettato**: senza
  seed l'output resta bit-identico alla v0.1 (`appliedDemandMultiplier = 1`, nuovo campo
  additivo su `PlayerResult`, nessuna rimozione).
- **Fix T-004** (dominio del prezzo premium): `priceElasticity` unico sostituito da
  `priceElasticityBelow` (1.8, sconto, valore storico) e `priceElasticityAbove` (2.6, premium,
  più aggressivo), scelto in base a `price` vs `refPrice` nel calcolo dell'attrattività; nessuna
  discontinuità a `price === refPrice` (`Math.pow(1, x) = 1`). Verificato via grep che nessun
  altro file (incl. `apps/web/src/app/page.tsx`) referenziasse il vecchio nome — rinomina sicura.
- Contratto congelato in **ADR-0006** (`docs/05-decisioni/ADR-0006-motore-rumore-eventi-elasticita-asimmetrica.md`).
- Verificato: `npm --prefix apps/web test` → **11/11 test verdi** (nessuna riscrittura, come da
  consegna — i nuovi scenari li scrive il tester-qa in un secondo momento);
  `npm --prefix apps/web run build` → nessun errore TypeScript.

## 2026-07-26 — [PM] Sprint 3 pianificato: "Stabilizza il motore + rework UI"
- Recepito lo scope deciso dal Product Owner dopo la verifica cross-team (UX, Game Designer,
  Strategy, Marketing, Operations): tre filoni, **niente nuove leve giocabili** — (1) rework
  UI Decisioni in sotto-tab per reparto + Riepilogo sticky + CTA sempre visibile + 5 migliorie
  CSS; (2) motore, rumore + eventi ambientali riproducibili via seed, con vincolo di
  non-regressione "senza seed = identico a v0.1"; (3) fix T-004, elasticità di prezzo
  asimmetrica (niente più dominio del prezzo premium).
- Definito il **contratto d'interfaccia del motore** (nuovi campi `EngineConfig`, interfaccia
  `MarketConditions`, funzione `resolveMarketConditions(seed, config)`, nuova firma
  `simulateQuarter(decisions, config, seed?)`), da ratificare in **ADR-0006** (ST3-1).
- Sprint backlog dettagliato in `project-management/SPRINT-BOARD.md` (ST3-1…ST3-11, con owner,
  criteri di accettazione e dipendenze).
- Board dell'orchestratore aggiornata in `orchestrator/board.json`: **T-001/T-002 chiusi
  `done`** (UI a sezioni, già realizzata in Sprint 1/2 ma mai chiusa), **T-004 chiuso `done`**
  (analisi accettata, la correzione diventa T-009), **T-003 lasciato in backlog** (fuori scope,
  userà ADR-0007), aggiunti **T-005…T-012** per lo Sprint 3.
- `BACKLOG.md`: B8 chiuso done; C3 esplicitamente rimandata (ADR-0007); C5 in corso parziale
  (la correzione via elasticità asimmetrica rientra in Sprint 3, le altre proposte restano
  aperte).

## 2026-07-25 (sera) — Sprint 2: tab Simulazione
- **[Sprint 2 — Frontend]** Nuovo tab **Simulazione (Demand Planner / decision support)**:
  stima profitto in base a domanda/prezzo/costi correnti col motore reale (bot deterministici).
  Mostra domanda→capacità→vendite→ripartizione costi→profitto, margine, **break-even** e
  **sensitività al prezzo**, con "Chiudi il trimestre". Ancorato ai campi reali di `EngineConfig`/
  `PlayerResult` (lezione Coach). Verificato in preview (profitto stimato = esito reale); 11 test
  verdi, build di produzione OK; auto-deploy Vercel.

## 2026-07-25 (sera) — Sprint 1: UI a sezioni
- **[Coach]** Applicate le 4 skill proposte ai ruoli tecnici (architect grounding-check,
  frontend disciplina di confine, UX ancoraggio ai campi reali, QA allocazione+conservazione).
- **[Sprint 1 — Frontend]** Ristrutturata la PWA in **navigazione a sezioni** (tab mobile:
  Cruscotto, Decisioni, Mercato, Classifica) con stato di gioco condiviso; meccaniche v0.1
  preservate (prezzo, produzione, chiusura trimestre, esito, classifica). Verificato in preview
  (11 test verdi, nessun errore console). Auto-deploy su Vercel (test env).

## 2026-07-25 (sera) — Requisiti CONVERGENTI (baseline)
- **[Requisiti]** Con i $10 di credito OpenRouter (limiti free alzati) la raccolta è ripartita
  pulita: iterazione 2 con 9/10 domini OK, i **nuovi requisiti utente incorporati** (Demand
  Planner, Tab Simulazione, personalizzazione partita, bot depotenziati, eventi esterni). Il
  **gate IT ha dichiarato CONVERGED** → baseline pronta per lo sprint. `REQUIREMENTS.md` v2
  (1215 righe) + Word rigenerato e consegnato. Curator giornaliero (`--daily`) + caffeinate per i run lunghi.

## 2026-07-25 (sera) — Requisiti utente + provider
- **[Provider]** **Groq rimosso** dalla configurazione: bloccato dalla VPN dell'utente (403
  Cloudflare/access-denied). Fix User-Agent applicato al client (superava Cloudflare) ma resta il
  blocco lato Groq via VPN. `models.json` tornato su OpenRouter `:free`. OpenRouter free ha un
  tetto giornaliero (~50 req) → con ≥$10 di credito sale a ~1000/giorno (consigliato).
- **[Requisiti]** Aggiunto `docs/11-requisiti-utente.md` (input del Product Owner): min 4
  giocatori + bot depotenziati; personalizzazione partita (capitale, prodotto/mercato, durata
  trimestre, n° partecipanti, livello eventi esterni); **Demand Planner** (previsioni vendite) e
  **tab Simulazione** (domanda↔prezzo↔costi per decidere il prezzo). Agganciato al contesto del
  motore requisiti così i domini lo incorporano nelle prossime iterazioni.
- **[Agent Coach]** Report di coaching prodotto (4 proposte skill per architect/frontend/UX/QA).
  In attesa dell'ok utente per applicarle.

## 2026-07-25 (pomeriggio) — Multi-provider + Agent Coach
- **[Multi-provider]** Aggiunto **Groq** e distribuito il carico su 2 provider in `models.json`
  (metà domini su Groq `llama-3.3-70b-versatile`, metà su OpenRouter `nemotron-ultra:free`; ruoli
  leggeri su Groq `llama-3.1-8b-instant`) per non saturare i limiti gratuiti. Richiede
  `GROQ_API_KEY` nel `.env`. Safety: il motore requisiti ora **scarta i fallback mock** (chiave
  provider mancante) così non inquinano il documento.
- **[Nuovo ruolo]** **agent-coach** (Formatore): meta-agente che valuta e affina le skill degli
  altri agenti in base al loro compito e ai loro output/aggiornamenti. Gira come subagent Claude.

## 2026-07-25 (pomeriggio) — Retrospettiva requisiti + fix
- **[Retro]** Primo run a tappeto (20 giri) interrotto a 7/20: **rate limit** OpenRouter free
  dopo ~5 giri, e un bug ha **sovrascritto** il buon documento con errori. v1 (1340 righe)
  recuperato da git. Lezioni in `project-management/STATUS.md` (retrospettiva) e `docs/10`.
- **[Fix motore requisiti]** `requirements.py` reso prudente: **throttling** (parallelismo 2 +
  pausa), **stop ai rate limit/errori di massa senza sovrascrivere** il documento buono (backup
  `.bak`), **cap per-run** ripartibile. Aggiunto **gate di convergenza**: il team IT decide
  `CONTINUE`/`CONVERGED` (fine raccolta → sprint). Macro-loop requisiti→sprint→ripeti in `docs/10`.
- **[Deliverable]** Requisiti v1 esportati in **Word** (`pandoc`, ora installato) e consegnati
  all'utente come "requisiti di partenza".

## 2026-07-25
- **[Team]** **Skill** aggiunte a tutti i 10 agenti di Business (framework di dominio: Lean/Six
  Sigma, 4P/STP, SCOR, Porter/BCG, corporate finance, Stage-Gate, Balanced Scorecard, partita
  doppia, ecc.), come già fatto per il PM (PMP/Scrum).
- **[Requisiti]** Costruito il **motore di raccolta requisiti iterativa** `orchestrator/requirements.py`:
  ogni giro = 10 domini di Business in parallelo → consolidamento del PM → revisione IT (Architect
  + Game Designer) → ripete. Gira sui **modelli gratuiti** (autonomo, ripartibile). Validato in
  dry-run (13 agenti/iterazione). Processo in `docs/10`; output vivo in
  `orchestrator/requirements/REQUIREMENTS.md`, poi export in **Word**. Approccio: predittivo la
  prima volta, poi agile.
- **[Team]** Creati i **10 agenti di Business** (esperti di dominio) in `.claude/agents/`:
  Operations, Commerciale, Marketing, HR, Controlling, Amministrativo, Supply Chain (i 7 richiesti)
  + Finance/Tesoreria, R&D/Prodotto, Strategia/Direzione (3 consigliati). Definiranno i requisiti
  del gioco, facilitati dal PM. Roster in `docs/03`.
- **[Visione motore]** `docs/06` aggiornato: motore AI-simulativo (non per forza generativo),
  prevedibile ma non certo; parte deterministica che fa quadrare i conti + strato simulativo con
  imprevisti; un'icona per leva che spiega l'effetto singolo; strutture-popolazione.
- **[DevOps]** **GitHub**: creato repo privato e push del
  progetto (versioning attivo). **Vercel**: ambiente di test **LIVE**
  (Hobby free, git-collegato, Root Directory `apps/web`,
  auto-deploy su push). Risolto un 404 iniziale (Root Directory + framework Next.js non applicati
  al primo deploy → redeploy con le impostazioni corrette). **Supabase**: creato il progetto
  `business-game` (eu-west-1, free), liberando uno slot del piano free (scelta utente, reversibile).
- **[PM]** Ruolo project-manager **potenziato** con competenze PMP/PMBOK + Scrum/Agile.
- **[DevOps]** (subagent) **Preparata la piattaforma**: confermato Vercel + Supabase (ADR-0001).
  Creato scaffolding sicuro senza toccare risorse cloud: `.env.example` (segreti solo come
  placeholder), `supabase/` (config.toml, migrations/, functions/tick placeholder fail-closed),
  `apps/web/vercel.json`, `.vercelignore`, guida `docs/09-piattaforma-hosting.md`. Build e test
  verdi. Decisioni aperte segnalate (per l'Architect): meccanismo del tick (pg_cron vs Vercel
  Cron → ADR), ed estrazione del `game-engine` in `packages/` prima di implementare il tick.
- **[Backend Dev]** Orchestratore ora **PARALLELO**: esecuzione a ondate con
  `ThreadPoolExecutor` (default 3 worker), i task senza dipendenze pendenti partono insieme e
  i dipendenti aspettano l'handoff. Verificato: T-001/T-003/T-004 in parallelo, T-002 nell'ondata
  successiva. `max_parallel` configurabile (`ORCH_MAX_PARALLEL`).
- **[DevOps]** **Autonomia locale**: `orchestrator/daemon.py` tiene il team attivo sul Mac
  mentre si sviluppa (giri paralleli + curator giornaliero); LaunchAgent `launchd`
  (`orchestrator/launchd/`) esegue il Model Curator ogni giorno anche a daemon spento. Guida in
  `orchestrator/AUTONOMY.md`. Curator verificato dal vivo (18 modelli free, config sana).
- **[Team al lavoro]** Primi subagent Claude reali messi in produzione: il **Project Manager**
  ha pianificato lo **Sprint 2** (UI a sezioni, ST2-1…ST2-6) aggiornando SPRINT-BOARD e BACKLOG;
  il **Code Reviewer** ha revisionato le 4 proposte. Verifica del funzionamento del team riuscita.
- **[Model Curator]** Reso **autonomo**: `orchestrator/curator.py` (script deterministico)
  controlla l'elenco free di OpenRouter e sostituisce i modelli non più gratuiti per fascia
  (`curator_policy.json`), tracciando in MODEL-WATCH e in `NOTIFICATIONS.md`. Logica testata.
- **[DevOps]** Autonomia schedulata via **GitHub Actions** (ADR-0005): `model-curator.yml`
  (giornaliero) e `agents-run.yml` (manuale/settimanale, richiede secret OPENROUTER_API_KEY).
  Chiarito: Vercel ospita il gioco, non il team di agenti. Canale notifiche = `NOTIFICATIONS.md`
  (Claude lo legge a inizio sessione / "leggi il progetto").
- **[Model Curator]** Nuovo ruolo **model-curator (LLMOps)** (ADR-0004): mantiene i modelli
  degli agenti (monitora prezzi/disponibilità, anticipa i passaggi a pagamento, adotta i
  migliori free). Creato registro `orchestrator/MODEL-WATCH.md` e prima assegnazione per-ruolo
  in `models.json` (default nemotron per il ragionamento; ling-flash per i ruoli leggeri;
  coder free sperimentali per backend/frontend). Team ora a **12 ruoli**.
- **[Backend Dev]** Orchestratore migliorato: la blackboard ora include **GDD + codice reale
  del game-engine** (basta agenti che indovinano formule); `max_tokens` 1600→4000 (niente
  troncamenti); loop **resiliente** (task fallito → `blocked`, il run prosegue invece di fermarsi).
- **[Primo run live]** Generate 4 proposte reali (T-001..T-004) via OpenRouter/Nemotron Ultra.
- **[Architect]** ADR-0003: architettura **multi-provider** per gli LLM. Orchestratore rifatto
  con client generico OpenAI-compatible + registro `providers.json` (nvidia, deepseek,
  openrouter, together, groq, moonshot, zhipu, ollama). Modello per ruolo come spec
  `provider:modello` in `models.json`; degradazione sicura a mock se manca la chiave. Testato.
- **[PM]** **Team allargato** a 11 ruoli: aggiunti Game Designer, Security Engineer,
  DevOps/Platform, Code Reviewer, Technical Writer (`.claude/agents/`); roster in `docs/03`.
- **[Architect]** ADR-0002: architettura dell'**orchestratore autonomo** del team di agenti.
- **[Backend Dev]** Costruito `orchestrator/` (Python stdlib): board operativa con dipendenze,
  provider LLM intercambiabili (mock/NVIDIA), loop di lavoro, guardrail (proposte non
  auto-applicate), logging in markdown. Ruoli riusati da `.claude/agents/`. Verificato in
  dry-run: 4 task processati end-to-end (rispettando le dipendenze), 4 proposte in `review`,
  checkpoint umano. Pronto per il `live` con una NVIDIA_API_KEY.

## 2026-07-23
- **[Backend/Frontend Dev]** Motore v0.1: aggiunta leva **Produzione** (stabilimenti +
  straordinari) con vincolo di capacità (non vendi oltre ciò che produci), costi fissi per
  stabilimento e capex d'acquisto. Engine e UI aggiornati; 11 test verdi. Verificato in demo
  il vincolo di capacità (avviso vendite perse). GDD §0 aggiornato + nota di bilanciamento.
- **[QA]** Segnalato sbilanciamento: il prezzo premium rende troppo (item C5).
- **[Frontend/Backend Dev]** Sprint 1 avviato: scaffolding Next.js 14 PWA (`apps/web`),
  motore di gioco v0 (`src/lib/game-engine`) come funzione pura+deterministica con 7 test
  (tutti verdi), UI mobile del core loop (leva prezzo → simulazione trimestre → esito +
  classifica) con 2 rivali IA locali. Demo giocabile end-to-end su localhost, verificata su
  viewport mobile 375×812. Game Design GDD §0 riempito con le regole v0.
- **[PM/Architect]** Creata la struttura di fondamenta del progetto: README, documenti
  `docs/` (visione, architettura, team-agenti, metodo agile, GDD bozza, swarm NVIDIA futuro),
  ADR-0001 (stack tecnologico), file di project management (STATUS, BACKLOG, SPRINT-BOARD,
  CHANGELOG) e definizione dei 6 ruoli del team di agenti in `.claude/agents/`.
- **[Decisioni]** Motore agenti = **ibrido** (Claude Code + swarm NVIDIA opzionale).
  Metodo = **iterativo-incrementale**. Stack = **Next.js PWA + Supabase + Vercel**.

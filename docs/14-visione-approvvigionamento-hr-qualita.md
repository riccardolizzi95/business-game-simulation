# Visione — Approvvigionamento, HR, qualità e struttura di costo variabile

> Dettata dall'utente il 2026-07-26. Questo documento fissa **cosa** deve fare il gioco.
> I **numeri** li determinano gli esperti di dominio (Supply Chain, HR, Operations,
> Amministrazione, Marketing) nei rispettivi task di design: qui non se ne inventa nessuno.

## 1. Il cambio architetturale più importante: il costo unitario non è più una costante

Oggi il motore ha `unitCost = 55 €`, uguale per tutte le partite. La visione lo ribalta:

> «In base alla partita e al prodotto che avremo scelto decideremo effettivamente la
> percentuale con cui inciderà il costo della materia prima — in questo modo avremo una
> grande varietà di partite diverse.»

Quindi **a inizio partita** si sceglie la *struttura* di costo del prodotto:
- quota della **materia prima** sul costo unitario,
- quota del **costo del lavoro**,
- quota dei **costi fissi**.

Un prodotto ad alta intensità di materiali (es. 70% materie prime) rende decisiva la leva
approvvigionamento; uno ad alta intensità di lavoro (es. 50% manodopera) rende decisiva la leva
HR. **La stessa partita giocata su due prodotti diversi richiede strategie diverse.** È questa la
fonte di varietà, non la casualità.

Le quote non restano poi congelate: gli acquisti (prezzo pagato, qualità scelta, sconti) le
fanno **oscillare durante la partita**.

> **Precisazione dell'utente (2026-07-26, sera).** Nessun costo va cablato come numero fisso.
> Il costo della materia prima è un **default derivato dai parametri iniziali di partita**, a
> partire dal prezzo standard del prodotto: «in modo da rendere dinamico il tutto e non
> vincolato a un unico scenario». Se nel codice compare un valore assoluto che poteva essere
> derivato, è un errore di progettazione — è così che due documenti di design sono arrivati a
> contraddirsi su 25,00 € contro 27,50 €.

## 2. Tab Approvvigionamento — tre decisioni indipendenti, tutte con effetto sul prezzo

Il giocatore ordina i componenti scegliendo **tre dimensioni separate**:

| Dimensione | Scelta del giocatore | Effetto |
|---|---|---|
| **Tempo di consegna** | subito, oppure fra N trimestri | Prima lo vuoi, più costa |
| **Qualità della materia prima** | livelli di qualità | Più alta, più costa |
| **Termini di pagamento** | quando paghi il fornitore | Cambia leggermente il prezzo **e il flusso di cassa** |

I termini di pagamento sono la dimensione più sottile: pagare in anticipo dovrebbe costare meno
ma impegna liquidità subito; pagare a lungo termine costa di più ma libera cassa. È una leva
**finanziaria** travestita da leva di acquisto, e va coordinata con la cassa vincolata.

## 3. La qualità diventa una seconda dimensione competitiva

Finora la quota di mercato dipende solo dal prezzo (e ora dal marketing). La qualità aggiunge un
asse:

- **verso l'interno** → la qualità della materia prima incide sui **difetti di produzione**,
  introducendo uno **scarto produttivo**: parte di ciò che produci non è vendibile;
- **verso l'esterno** → una qualità superiore percepita dal mercato **aumenta la quota** a
  parità di prezzo.

Conseguenza di modello: non si può più assumere `unità prodotte = unità vendibili`. Serve una
resa di produzione, e lo scarto è un costo che non genera ricavo.

## 4. Tab HR — le persone incidono su costo, qualità e scarto

Il giocatore decide la **composizione dell'organico**: quanti addetti per ciascun livello di
competenza, non un livello unico aziendale. Può **assumere e licenziare**, con costi e tempi.
Effetti su tre fronti:

- **costo del personale** (più qualificati costano di più),
- **qualità del prodotto** (mano d'opera migliore, prodotto migliore),
- **scarto produttivo** (mano d'opera migliore, meno difetti),
- **capacità produttiva effettiva** (uno stabilimento senza abbastanza addetti non produce a pieno).

> **Precisazione dell'utente:** il mix ottimale non deve mai essere un estremo. «Non è che
> un'azienda ha tutti super qualificati o nessuno qualificato, ma deve esserci il giusto
> compromesso.» Se il modello premia sempre 'tutti esperti' o 'tutti base', il modello è
> sbagliato. Il costo del personale è inoltre **fisso nel trimestre**: si paga a prescindere
> da quanto si produce.

Si crea così un trade-off incrociato con l'approvvigionamento: materia prima scadente lavorata da
personale molto qualificato può dare un risultato simile a materia prima ottima lavorata da
personale base, ma con struttura di costo diversa. **Due strade per lo stesso obiettivo** è ciò
che rende una simulazione gestionale interessante.

## 4-bis. Il mercato del lavoro è finito e conteso

> **Decisione dell'utente (2026-07-26, sera).** Le persone assumibili sono un numero limitato
> **per ogni livello**, non solo per gli esperti: «in modo che ci sia una certa competizione
> tra i concorrenti per l'assunzione». Il bacino va dimensionato «considerando la forza
> produttiva di tutti rispetto a quello che il mercato chiede»: non tutti possono servire
> tutto il mercato.

Questo risolve alla radice il rischio che l'organico ottimale collassi su «tutti esperti»: il
vincolo non è una regola arbitraria calata dall'alto, ma **scarsità che emerge dalle scelte di
tutti i giocatori**. Chi si muove prima ottiene le persone migliori; chi tarda si adatta.

## 4-ter. Il mercato cresce come trend

> **Decisione dell'utente:** «la mia idea è che il mercato cresca come trend».

Oggi `totalDemand` è fisso a 10.000 unità/trimestre e il rumore ±9% oscilla attorno a una
costante. La domanda deve invece **crescere lungo la partita**: il rumore resta l'oscillazione,
la crescita diventa il trend sottostante. Combinato col bacino di lavoro finito, significa che
la competizione per le persone si stringe man mano che il mercato si allarga.

## 5. Marketing: costo del prodotto e percezione

Il marketing incide sul costo del prodotto, ma il suo effetto vero è sulla **percezione degli
acquirenti**, e da lì sulla quota di mercato. Va coordinato con la qualità reale: la percezione
non dovrebbe poter divergere indefinitamente dalla sostanza.

## 6. Vincoli di realizzazione

- **Non-regressione**: ogni leva nuova è opzionale. Con i valori di default il motore deve
  comportarsi esattamente come oggi, e i test esistenti passare senza modifiche.
- **I numeri li decidono gli esperti**, non gli implementatori. Le costanti vivono in un solo
  punto e vengono importate, mai riscritte.
- **Una leva non è fatta finché non è giocabile**: un modulo testato ma non collegato a UI e
  motore non conta come consegnato.

## 7. Ordine proposto

1. Struttura di costo parametrica per partita (è il fondamento: tutto il resto vi si appoggia).
2. Approvvigionamento a tre dimensioni + qualità materia prima.
3. Scarto produttivo e resa.
4. HR e qualificazione.
5. Qualità percepita nella formula di quota di mercato.

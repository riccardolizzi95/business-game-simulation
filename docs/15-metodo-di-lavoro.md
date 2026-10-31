# Metodo di lavoro — chi fa cosa, e perché

> Deciso dall'utente il 2026-07-27, dopo una sessione lunga che ha reso evidente dove gli agenti
> riescono e dove no. Sostituisce l'impostazione precedente ("gli agenti fanno tutto lo sviluppo,
> Claude coordina").

## La regola

**Gli agenti fanno lavoro di alto livello e pezzi piccoli e ben specificati. Claude fa il
collettore e l'integratore.**

Nelle parole dell'utente: *«Agli agenti facciamo fare del lavoro di alto livello, tipo raccolta
requisiti. Tu devi fungere da collettore, demandando dei piccoli pezzi specifici e segmentati agli
agenti in modo che, dandogli una specifica, loro possano effettivamente eseguirla senza troppi
problemi.»*

## Perché: cosa dicono i dati

Nella sessione del 26-27 luglio 2026 il tasso di riuscita si è diviso nettamente.

| Tipo di lavoro | Esito |
|---|---|
| **Design e requisiti** (10 documenti) | Riusciti quasi tutti al primo colpo, di qualità alta |
| **Moduli nuovi su file propri** (`quality.ts`, `workforce.ts`, `supply.ts`) | Riusciti, gate verde senza intervento |
| **Integrazione in `simulate.ts`** | Falliti quasi tutti; codice spesso corretto, impalcatura rotta |
| **UI su `page.tsx`** | Falliti tutti |

La discriminante non è la difficoltà concettuale: è **quanto è grande e conteso il file da
toccare**. Un modulo nuovo da 100 righe con una specifica chiara riesce. Un file da 1.400 righe
con vincoli incrociati no — e i modi di fallire sono sempre gli stessi:

- blocchi `SEARCH/REPLACE` che non trovano l'ancoraggio in un file grande;
- file di test corrotti riscrivendoli a memoria (graffe sbilanciate, frammenti orfani, una volta
  perfino una lineetta al posto di un numero);
- variabili dichiarate due volte;
- **ristrutturazioni non richieste**: davanti a un task difficile, un agente ha creato un modulo
  parallelo che duplicava quello esistente invece di fare il lavoro chiesto.

Tre volte il codice del motore era **corretto** e si è perso solo per l'impalcatura attorno.

## Come si traduce in pratica

**Agli agenti:**
- raccolta requisiti, regole di dominio, numeri di bilanciamento (fanno questo benissimo);
- moduli nuovi, su file propri, con una specifica che dice cosa esportare e cosa non toccare;
- code review sui diff reali;
- test in **file nuovi**, mai in coda a file di test esistenti.

**A Claude:**
- scomporre il lavoro in pezzi che un agente può davvero eseguire;
- tutta l'**integrazione** fra moduli, dove i vincoli si incrociano e nessun agente vede il quadro;
- il lavoro su file grandi e condivisi (`simulate.ts`, `page.tsx`);
- verifica giocando, merge e pubblicazione.

## Il corollario architetturale

Se gli agenti riescono sui file piccoli, **conviene avere file piccoli**. Spezzare il motore in
moduli (Sprint 4) è ciò che ha reso possibile il lavoro in parallelo. Lo stesso va fatto per la
UI: `page.tsx` è oggi il collo di bottiglia, ed è il motivo per cui ogni task di interfaccia
fallisce. Estrarre le sezioni in componenti separati non è una pulizia estetica — è ciò che
restituisce agli agenti un terreno su cui sanno lavorare.

## Modelli: dove conviene spendere

Il credito OpenRouter va usato col miglior rapporto costo/qualità, senza vincolo di gratuità
(decisione dell'utente, 2026-07-27). La ripartizione segue il consuntivo reale:

| Tipo di lavoro | Modello | Perché |
|---|---|---|
| Design, requisiti, review | **gratuiti** | consuntivo al 100%: spendere non comprerebbe nulla |
| Codice, tentativi 1-2 | `deepseek/deepseek-v3.2` (~0,022 $) | provato: ha consegnato tre moduli al primo colpo |
| Codice, dopo 2 fallimenti | `z-ai/glm-4.7` (~0,061 $) | si sale solo dove l'economico ha già fallito |
| Ultima riserva | gratuiti | se anche il modello forte non ce la fa |

L'**escalation** è il punto: non si paga di più su ogni task, ma solo su quelli che il modello
economico ha già dimostrato di non saper fare. Ripetere lo stesso tentativo con lo stesso modello
è denaro e tempo buttati; salire di livello è una decisione informata da un fallimento reale.

Evitati di proposito i modelli *thinking* per il codice: uno di loro bruciava l'intero budget di
output ragionando e restituiva zero caratteri.

Tetto di spesa per sessione: **2 $**, letto dal saldo reale prima di ogni giro.

## Cosa NON cambia

- Il merge su `main` resta una decisione umana, dopo verifica giocando: il gate verde dice «non ho
  rotto», non «ho fatto la cosa giusta».
- I numeri li decidono gli esperti di dominio, non gli implementatori.
- Ogni leva nuova nasce spenta: con i default il gioco deve comportarsi come prima.

# Come funziona il motore — guida per giocare e testare

> Stato al **2026-07-29** (interfaccia rifatta la sera del 29). Descrive il comportamento **reale** del codice, non le intenzioni.
> Dove una cosa non è ancora modellata, è scritto esplicitamente.
> Codice: `apps/web/src/lib/game-engine/`. Test: 247 verdi.

Una partita dura **8 trimestri**. Si parte con **1.000.000 €** di cassa, **1 stabilimento** e
**6.000 kit** di materie prime. Ogni trimestre si prendono decisioni, si chiude, e il motore
calcola cosa è successo a te e ai due rivali (Alfa, aggressivo sul prezzo; Beta, premium).

---

## 1. Le leve che hai in mano

Tutte le decisioni del trimestre stanno nel tab **Decisioni**, una sotto l'altra: non c'è da
girare fra sottosezioni.

| Leva | Cosa muove |
|---|---|
| **Prezzo** | La domanda che attrai, contro quella dei rivali |
| **Stabilimenti** | Capacità produttiva (3.000 unità/trim. ciascuno) |
| **Straordinari** | +40% capacità, ma costo unitario +40% e **qualità −10%** |
| **Quanto produrre** | Quante unità fabbrichi (limitate da capacità **e** materie prime) |
| **Ordini di materie prime** | Quantità, **quando arriva**, **che qualità**, **quando paghi**. Se ne possono accodare più d'uno |
| **Budget marketing** | Domanda immediata (campagne) e brand che dura |
| **Parametri di partita** | Prezzo di riferimento, incidenza costi, profilo prodotto, scorta iniziale (schermata iniziale, saltabile) |

Non ancora giocabile: l'**organico** (il componente esiste ma la leva è spenta — vedi §7).

---

## 2. Come si determina la domanda

Ogni giocatore ha un'**attrattività**, e la domanda totale del mercato (10.000 unità) si divide
in proporzione ad essa. L'attrattività è il prodotto di quattro fattori:

```
attrattività = (prezzo di riferimento / tuo prezzo) ^ elasticità
             × moltiplicatore marketing
             × moltiplicatore qualità percepita
             × moltiplicatore qualità del prodotto
```

- **Elasticità asimmetrica**: sotto il prezzo di riferimento vale 1,8; sopra 2,6. Alzare il
  prezzo fa perdere quota più in fretta di quanto abbassarlo la faccia guadagnare.
- **Qualità**: indice 0–10 (vedi §4). Vale esattamente **1** alla configurazione di partenza,
  quindi finché non tocchi materiali o straordinari la qualità non sposta nulla.
- Alla domanda si applica poi il **rumore di mercato** (±9%) e gli **eventi** (boom, rallentamento…).

**La domanda si calcola prima della produzione.** Quindi la qualità che conta è quella del
materiale **già in magazzino a inizio trimestre**, non di quello che consumerai: altrimenti ci
sarebbe una dipendenza circolare (domanda → produzione → consumo → qualità → domanda).

---

## 3. Dalla domanda alle vendite: cosa può fermarti

```
capacità        = stabilimenti × 3.000  (× 1,4 con straordinari)
produzione      = min(quanto hai deciso, capacità, materie prime disponibili)
pezzi buoni     = produzione − scarto            (scarto oggi spento di default)
disponibili     = scorte iniziali + pezzi buoni
vendite         = min(domanda, disponibili)
vendite perse   = domanda − vendite
```

Quando perdi vendite il gioco ti dice **perché**, distinguendo quattro cause: capacità
insufficiente, materie prime finite, produzione decisa troppo bassa, scarto. È una distinzione
che conta: comprare uno stabilimento da 250.000 € quando il problema era la produzione decisa
sarebbe uno spreco.

---

## 4. La qualità del prodotto (indice 0–10)

```
qualità reale = (0,55 × materiali + 0,45 × organico) × (1 − 0,10 se straordinari)
indice        = qualità reale + alone pubblicitario (max +0,5)
```

- **Materiali** (0–10): Economy 6,0 · Standard 7,5 · Premium 8,5 · Ultra 9,5.
  Con **più ordini di qualità diversa** conta la **media pesata** di ciò che hai in magazzino.
- **Organico**: quanto il tuo mix è vicino a quello ideale **1 junior : 3 skilled : 2 expert**.
  Non è «più esperti = meglio»: solo esperti vale 0,33, solo junior 0,17, il mix ideale 1,0.
  Con la leva HR spenta vale il mix di default (già quasi ideale: 0,959).
- **Pubblicità**: alza la qualità *percepita*, ma in proporzione a quella reale — su un prodotto
  scadente rende +0,45, su uno ottimo +1,05. Non si compra reputazione con la comunicazione.

**Configurazione di partenza = 8,4 su 10**, ed è il punto in cui il moltiplicatore vale 1.
Sopra attrai più domanda a parità di prezzo, sotto ne attrai meno (elasticità 1,0: +10% di
qualità relativa = +10% di attrattività).

> ⚠️ **Da tarare**: la scala è compressa in alto (si parte da 8,4/10) e i rivali non hanno una
> strategia di qualità, quindi restano fissi a 8,4 e comprando meglio vinci sempre il confronto.

---

## 5. Materie prime: tre dimensioni indipendenti

Ogni ordine ha **quantità**, **consegna**, **qualità**, **pagamento** — e puoi accodarne **più
d'uno** nello stesso trimestre.

| Dimensione | Opzioni | Effetto |
|---|---|---|
| **Consegna** | Express (subito) · Standard (1 trim.) · Pianificato 2Q / 3Q | Prima la vuoi, più costa |
| **Qualità** | Economy · Standard · Premium · Ultra | Prezzo, scarto e **qualità del prodotto** |
| **Pagamento** | Anticipato · Alla consegna · 30/60/90 giorni | **Quando esce la cassa** |

- Il magazzino è a **lotti**: ogni lotto ricorda prezzo e qualità con cui l'hai comprato.
- Il consumo è **FIFO** (prima il materiale arrivato prima), ma la qualità del prodotto è la
  **media pesata** di ciò che consumi: in produzione i lotti si mescolano.
- **Senza materie prime non produci**, per quanta capacità tu abbia.

---

## 6. Contabilità: perché utile e cassa non coincidono

È il punto che genera più confusione, ed è modellato sul serio.

### Conto economico (competenza)
```
Ricavi di vendita
− Costo del venduto        ← solo le unità VENDUTE, non quelle prodotte
− Costi fissi e overhead
− Ammortamento stabilimenti ← 12.500 €/trim. per stabilimento (250.000 su 20 trimestri)
− Marketing, costo di giacenza
= Risultato del trimestre
```

### Flusso di cassa (denaro vero)
```
Incassi dalle vendite       ← si incassa subito
− Pagamenti a fornitori     ← SOLO quelli scaduti, secondo i termini che hai scelto
− Altre uscite              ← produzione, fissi, marketing, giacenza, e l'acquisto di stabilimenti
= Variazione di cassa
```

**Le tre regole da tenere a mente:**

1. **L'acquisto di uno stabilimento non è un costo.** Escono 250.000 € di cassa, ma sul risultato
   pesano 12.500 € a trimestre. Prima l'investimento bruciava tutto l'utile in un colpo.
2. **La merce prodotta e non venduta non pesa sul trimestre.** Resta un valore a magazzino e
   diventa costo quando la vendi. Produrre scorte costa solo la giacenza (2,50 €/unità/trim.).
3. **Pagare a 60 o 90 giorni tiene i soldi in cassa.** Il costo entra nel conto economico quando
   ordini, ma la cassa esce alla scadenza. Il sovrapprezzo si ripaga **se ti serve liquidità**.

Il tab **Risultati** racconta il trimestre in poche frasi e, aprendo «I conti del trimestre»,
mostra i due prospetti e la riconciliazione «da utile a cassa».

---

## 7. Cosa NON è ancora modellato

Da sapere prima di dare giudizi sul bilanciamento:

| Cosa | Stato |
|---|---|
| **Organico (HR)** | Componente pronto ma **leva spenta**: manca la regola su tempi di assunzione e su come assumono i rivali |
| **Scarto produttivo** | Nel motore ma **spento di default** |
| **Termini di incasso** | Si incassa **sempre subito**: non esiste dilazione verso i clienti |
| **Scoperto di cassa** | La cassa può andare sotto zero **senza interessi né conseguenze** |
| **Stato patrimoniale** | Non esiste un prospetto patrimoniale completo |
| **Qualità dei rivali** | Fissa al riferimento: non comprano meglio o peggio |
| **Bilanciamento** | **Mai validato giocando**: i numeri vengono dai documenti di design |

---

## 8. Parametri principali (valori di partenza)

| Parametro | Valore | Dove |
|---|---|---|
| Domanda totale di mercato | 10.000 unità/trim. | `types.ts` |
| Prezzo di riferimento | 100 € | modificabile nel setup |
| Costo unitario | 55 € (25 materiali + 20 lavoro + 10 energia) | derivato dal setup |
| Capacità per stabilimento | 3.000 unità/trim. | `types.ts` |
| Costo fisso per stabilimento | 30.000 €/trim. | `types.ts` |
| Overhead | 20.000 €/trim. | `types.ts` |
| Acquisto stabilimento | 250.000 € | `types.ts` |
| Vita utile stabilimento | 20 trimestri → 12.500 €/trim. | `types.ts` |
| Giacenza prodotti finiti | 2,50 €/unità/trim. | `inventory.ts` |
| Giacenza materie prime | 1,80 €/kit/trim. | `supply.ts` |
| Rumore di mercato | ±9% | `types.ts` |

---

## 9. Come provarlo

```bash
npm --prefix apps/web run dev      # gioco in locale
npm --prefix apps/web run verify   # tipi + 232 test
```

**Tre esperimenti che mostrano se il motore fa quel che deve:**

1. **Compra uno stabilimento.** Il risultato del trimestre deve restare positivo (prima crollava
   di 250.000 €), e in Conti devi vedere l'ammortamento fra i costi e il capex fra le uscite.
2. **Ordina a 90 giorni.** La cassa non deve muoversi, e in Conti deve comparire un debito con la
   sua scadenza. Due trimestri dopo, la cassa cala anche senza aver ordinato nulla.
3. **Produci più di quanto vendi.** Il risultato deve peggiorare solo del costo di giacenza, non
   del costo dell'intera merce invenduta.

# ADR-0006 — Motore v0.2: rumore/eventi di mercato con seed + elasticità asimmetrica

- **Stato:** Accettata
- **Data:** 2026-07-26

## Contesto
Sprint 3 (pianificato dal PM, vedi CHANGELOG 2026-07-26) richiede due modifiche al
`game-engine` (`apps/web/src/lib/game-engine/index.ts`), senza introdurre nuove leve
giocabili:

1. **Rumore + eventi ambientali riproducibili** (Tappa A): rendere il mercato meno
   prevedibile trimestre su trimestre, mantenendo la determinatezza necessaria a test e a un
   futuro motore server-side (Edge Function) che deve produrre lo stesso esito per lo stesso
   turno se rieseguito.
2. **Fix T-004** (`orchestrator/proposals/T-004-tester-qa.md`): con `priceElasticity` unica
   (1.8), il prezzo premium domina a parità di volume servito perché la domanda persa per
   capacità insufficiente semplicemente "evapora" invece di penalizzare chi non la serve; un
   esponente più alto sopra il prezzo di riferimento contiene la distorsione senza toccare la
   meccanica di capacità (riservata a una proposta più ampia, fuori scope qui).

Vincolo non negoziabile: il motore v0.1 è già in produzione (demo, tab Simulazione) e coperto
da 11 test. Qualunque nuovo comportamento deve essere **opt-in**, per non rompere i chiamanti
esistenti (`apps/web/src/app/page.tsx`) né i test.

## Decisione

### 1. Rumore ed eventi solo con `seed` esplicito
`simulateQuarter` guadagna un terzo parametro opzionale:

```ts
export function simulateQuarter(
  decisions: PlayerDecision[],
  config?: EngineConfig,
  seed?: number,
): PlayerResult[];
```

**Se `seed` è `undefined`, l'output è bit-identico alla v0.1**: nessun rumore, nessun evento,
`appliedDemandMultiplier = 1` (moltiplicare per 1 non altera i valori esistenti). Il branch
rumore/eventi si attiva SOLO quando il chiamante passa un seed esplicito — tipicamente il
tick trimestrale server-side, che deriva il seed da turno+partita per riproducibilità
(`hash(gameId, quarter)` o simile, non ancora implementato — fuori scope di questo ADR).

Il generatore è **mulberry32**, un PRNG deterministico seedato a 32 bit: stesso seed ⇒ stessa
sequenza, su qualunque piattaforma JS (niente dipendenza da `Math.random`, che non è
riproducibile). Rumore ed evento condividono lo stesso `seed` ma consumano due estrazioni in
sequenza dal medesimo generatore (prima il rumore, poi la selezione evento), quindi la coppia
(rumore, evento) è deterministica per seed.

Rumore ed evento si **combinano moltiplicativamente** sulla domanda totale
(`demandMultiplier = noise × eventMultiplier`), applicata prima del riparto per attrattività
di prezzo — quindi non altera le quote relative tra giocatori, solo la torta totale.

### 2. `resolveMarketConditions` esposta separatamente
```ts
export function resolveMarketConditions(seed: number, config?: EngineConfig): MarketConditions;
```
È **staccata** da `simulateQuarter` (anche se `simulateQuarter` la richiama internamente
quando riceve un seed) per un motivo preciso: il frontend deve poter mostrare "cosa è successo
sul mercato questo trimestre" (es. banner "Boom di mercato +20%") **a posteriori**, senza
dover rieseguire l'intera simulazione multi-giocatore solo per leggere l'evento. Passando lo
stesso seed usato per il turno, il client ottiene lo stesso `MarketConditions` in modo
economico e puro.

`MarketConditions` espone `demandMultiplier`, `eventId`, `eventLabel` (null se nessun evento
estratto). Il mazzo di eventi (`EngineConfig.marketEvents: MarketEventDef[]`) e l'intensità del
rumore (`EngineConfig.demandNoisePct`) sono configurabili e hanno un default in
`DEFAULT_CONFIG`: rumore ±9%, quattro eventi bilanciati attorno allo zero (boom +20% prob 8%,
tendenza positiva +12% prob 12%, rallentamento −20% prob 8%, stretta −12% prob 12% — 60% di
probabilità residua = nessun evento in un dato trimestre).

### 3. `appliedDemandMultiplier` aggiunto a `PlayerResult`
Campo **additivo** (non rimuove né rinomina nulla): riporta il moltiplicatore di domanda
effettivamente applicato quel trimestre (1 se nessun seed). Non introduce breaking change
perché i chiamanti esistenti leggono i campi per nome, non fanno assert sulla shape esatta
dell'oggetto.

### 4. Elasticità asimmetrica: `priceElasticityBelow` / `priceElasticityAbove`
`EngineConfig.priceElasticity` (singolo) è **sostituito** da due esponenti:
- `priceElasticityBelow` (price ≤ refPrice, sconto) — 1.8, valore storico invariato.
- `priceElasticityAbove` (price > refPrice, premium) — 2.6, più aggressivo: il premium perde
  quota più rapidamente all'aumentare del prezzo, riducendo il vantaggio "meno volume, margine
  unitario alto" diagnosticato in T-004.

Nel calcolo dell'attrattività si sceglie l'esponente in base al confronto `price` vs
`refPrice` prima di elevare `refPrice/price`. A `price === refPrice`,
`Math.pow(refPrice/price, x) = Math.pow(1, x) = 1` per qualunque esponente: il punto di
riferimento resta continuo per costruzione, nessun if speciale necessario.

Rinominare (non deprecare) `priceElasticity` è sicuro: grep sul repo conferma che nessun altro
file (in particolare `apps/web/src/app/page.tsx`, che usa `DEFAULT_CONFIG` e
`simulateQuarter` solo posizionalmente) referenzia il vecchio nome del campo.

## Alternative considerate
- **Evento e rumore come parametro esplicito invece che seed**: scartata, perché vogliamo che
  il motore resti "chiama con lo stesso seed ⇒ stesso risultato" anche per il tick
  server-side, senza che il chiamante debba pre-calcolare rumore/evento a mano.
- **`Math.random()` per il rumore**: scartata, non riproducibile — rompe test e la futura
  necessità di rieseguire/validare un turno lato server.
- **Deprecare `priceElasticity` con fallback** invece di rimuoverlo: scartata su indicazione
  del PM — nessun consumer esterno lo referenzia, mantenerlo avrebbe solo aggiunto ambiguità
  su quale esponente venga davvero usato.
- **Share cap / redistribuzione della domanda persa** (altre proposte di T-004): non incluse
  in questo ADR, restano disponibili come lavoro futuro se l'elasticità asimmetrica da sola non
  bastasse a validare gli scenari S1-S8 del tester-qa.

## Conseguenze
**Pro:** i chiamanti esistenti (demo client-side, tab Simulazione) continuano a funzionare
identici senza modifiche; il futuro motore server-side/Edge Function può attivare
rumore/eventi passando un seed derivato dal turno, restando deterministico e testabile; il fix
T-004 è isolato a un cambio di configurazione + branch nell'esponente, senza toccare la
meccanica di capacità.
**Contro/rischi:** due esponenti invece di uno aumentano la superficie di tuning (il
game-designer deve validare entrambi, non solo uno); il mazzo di eventi di default è una prima
taratura, va validato con playtest reali (owner: tester-qa, scenari S1-S8 in
`orchestrator/proposals/T-004-tester-qa.md`) prima di considerarlo definitivo per il bilancio
di gioco.

## Note
Collegato a: `orchestrator/proposals/T-004-tester-qa.md` (diagnosi), CHANGELOG 2026-07-26 (PM,
pianificazione Sprint 3), `project-management/SPRINT-BOARD.md` (ST3-1…ST3-11).

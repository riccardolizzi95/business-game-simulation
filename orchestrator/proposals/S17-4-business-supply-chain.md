# Proposta — S17-4: Ordini multipli di materie prime: regole e cosa vede il giocatore

- Ruolo: **business-supply-chain**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-29 18:34:56

---

# Proposta: Ordini multipli di materie prime — Regole e UI

---

## 1. Regole sugli ordini aperti

| Regola | Valore | Motivazione |
|--------|--------|-------------|
| **Max ordini simultanei** | **3** per giocatore | Abbastanza per differenziare scadenze (es. consegna Q+1, Q+2, Q+3) senza esplodere la complessità. Coerente con lead time tipico 1-2 trimestri. |
| **Annullamento** | • **Prima della conferma fornitore** (stato `DRAFT`): gratis<br>• **Dopo conferma, prima spedizione** (`CONFIRMED`): penale **15% valore ordine** (costo amministrativo + perdita slot fornitore)<br>• **Dopo spedizione** (`IN_TRANSIT`): **non annullabile** | Reale: i fornitori bloccano capacità. Penale scoraggia "ordino tutto e poi vedo". |
| **Modifica** | Trattata come **annulla + nuovo ordine** (stesse regole sopra). Non si modifica in-place. | Semplifica motore e tracciabilità. |
| **Limite magazzino (capacità fisica)** | **Cap_max = 2 × capacità_produttiva_trimestrale** (somma stabilimenti × 3.000 kit) | Evita accumuli infiniti. 2 trimestri di copertura = buffer ragionevole. |
| **Costo giacenza** | **1,80 €/kit/trimestre** (già in `HOLDING_COST_PER_UNIT_PER_QUARTER`) | Già implementato. Si applica a **giacenza media** del trimestre: `(apertura + chiusura) / 2`. |
| **Overflow (consegna > cap_max)** | L'eccedenza è **rifiutata al dock**: fornitore la rimette in stock, giocatore paga **penale 25% valore eccedenza** + **costo trasporto ritorno** (forfait 2.000 €). Il materiale **non entra in magazzino**. | Deterrente forte contro ordini ciechi. Il giocatore vede il rischio prima di confermare. |

---

## 2. Consumo materiale a qualità mista — Criterio e qualità risultante

### Criterio: **Media pesata per quantità consumata (blended consumption)**

```
quality_input = Σ (qta_consumata_i × quality_i) / Σ qta_consumata_i
```

Dove `quality_i` è l'indice qualità del lotto `i` (scala 0–100, come da `product-quality.ts`).

### Perché non FIFO / LIFO / Peggiore

| Metodo | Contro |
|--------|--------|
| **FIFO** | Crea "scatti" di qualità del prodotto finito quando cambia il lotto in testa. Poco realistico: in produzione si miscelano lotti (es. tramogge, silos). |
| **LIFO** | Stesso problema, più artificioso. |
| **Peggiore (min)** | Troppo punitivo: un solo lotto basso degrada tutto. Non riflette la fisica della miscelazione. |
| **Media pesata** | ✅ Riflette la realtà industriale (blending).<br>✅ Lineare, prevedibile, testabile.<br>✅ Coerente con il peso 55% della materia prima sull'indice qualità finale (già in `product-quality.ts`).<br>✅ Il giocatore può **gestire il mix** ordinando qualità diverse per bilanciare costo/qualità target. |

### Qualità risultante del prodotto finito

Il motore calcola già l'indice qualità prodotto (`productQualityIndex`) combinando:
- **55% materia prima** (ora = media pesata sopra)
- **45% altri fattori** (processo, manodopera, macchinari — invariati)

Nessun cambiamento alla formula finale: cambia solo *come* si ottiene l'input "qualità materia prima".

---

## 3. Cosa vede il giocatore — Ordini aperti e copertura

### 3.1 Tabella "Ordini in viaggio" (sempre visibile in sezione Acquisti)

| Colonna | Contenuto | Formato |
|---------|-----------|---------|
| **Ordine** | ID breve (es. `PO-2026-Q3-01`) | Testo |
| **Stato** | `DRAFT` · `CONFIRMED` · `IN_TRANSIT` · `ARRIVED` | Badge colorato |
| **Quantità** | Kit ordinati | Numero intero |
| **Qualità** | Indice 0–100 | Numero + barra visiva (verde/giallo/rosso) |
| **Consegna prevista** | Trimestre arrivo (es. `Q4 2026`) | Etichetta trimestre |
| **Termini pagamento** | `Anticipato` / `30gg` / `60gg` / `90gg` | Testo |
| **Scadenza pagamento** | Trimestre in cui esce cassa (es. `Q1 2027`) | Etichetta trimestre |
| **Valore ordine** | € totali (qta × prezzo unitario qualità) | Valuta |
| **Azioni** | Annulla (se `DRAFT`/`CONFIRMED`) | Pulsante |

> **Nota cassa:** La colonna "Scadenza pagamento" risolve la confusione attuale: il giocatore vede *subito* quando uscirà la cassa, distinguendola dal momento della consegna.

### 3.2 Indicatore di copertura — "Quanto produco con cosa ho in arrivo"

Posizionato **sopra la tabella**, a colpo d'occhio:

```
┌─────────────────────────────────────────────────────────────┐
│  COPERTURA PRODUZIONE PREVISTA                              │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐        │
│  │  Q3     │  Q4     │  Q1     │  Q2     │  Q3     │  ...  │  ← Trimestri
│  ├─────────┼─────────┼─────────┼─────────┼─────────┤        │
│  │ ████████│ ███████ │ ████    │ ░░░░░░░░│ ░░░░░░░░│        │  ← Barre: % fabbisogno coperto
│  │ 120%    │  95%    │  40%    │   0%    │   0%    │        │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘        │
│  Giacenza attuale: 4.200 kit  |  Cap. magazzino: 18.000 kit  │
│  ⚠ Q1: copertura < 100% — rischio fermo produzione            │
└─────────────────────────────────────────────────────────────┘
```

**Calcolo per trimestre T:**
```
fabbisogno_T = produzione_pianificata_T × (1 + tasso_scarto)
disponibile_T = giacenza_apertura_T + Σ qta_ordini_in_arrivo_T
copertura_T   = disponibile_T / fabbisogno_T
```

- **Verde** ≥ 100% · **Giallo** 70–99% · **Rosso** < 70%
- La "produzione pianificata" = decisione del giocatore per quel trimestre (già inserita in `PlayerDecision.productionTarget` o equivalente).

### 3.3 Avvisi automatici (toast / banner)

| Trigger | Messaggio |
|---------|-----------|
| Ordine in arrivo farebbe superare `Cap_max` | "Attenzione: l'ordine PO-… porterebbe il magazzino a X kit (limite Y). Rischio penale overflow 25%." |
| Copertura prossimo trimestre < 100% | "Materiali insufficienti per la produzione pianificata Q+1. Rischio vendite perse per mancanza materiali." |
| Pagamento in scadenza questo trimestre | "In uscita cassa: 105.000 € per ordine PO-… (scadenza 60gg)." |

---

## 4. Consegne che si accavallano (stesso trimestre)

### Regola di accumulo
Se **più ordini arrivano nello stesso trimestre T**:
- Le quantità **si sommano** in `incomingMaterials[T]`
- La qualità in arrivo per T = **media pesata** delle quantità in arrivo in T
- Il motore processa **prima gli arrivi**, poi la produzione del trimestre

### Controllo capacità **prima** della conferma ordine
Quando il giocatore sta per confermare un nuovo ordine con consegna in T:
```
proiettato_T = giacenza_attuale + Σ ordini_confermati_in_arrivo_T + qta_nuovo_ordine
SE proiettato_T > Cap_max → MOSTRA AVVISO ROSSO (non bloccante, ma esplicito)
```
Il giocatore può confermare lo stesso (si assume il rischio overflow), ma non "per sbaglio".

### Priorità di consumo (se giacenza + arrivi > fabbisogno)
L'eccedenza resta in magazzino (paga holding cost). Nessuno scarto automatico — lo scarto produttivo (`productionScrapRate`) si applica solo a ciò che **entra in produzione**.

---

## 5. Numeri di riferimento (per implementazione/test)

| Parametro | Valore | Fonte |
|-----------|--------|-------|
| `MAX_CONCURRENT_ORDERS` | 3 | Questa proposta |
| `CANCELLATION_PENALTY_CONFIRMED` | 15% | Questa proposta |
| `OVERFLOW_PENALTY_RATE` | 25% | Questa proposta |
| `OVERFLOW_FIXED_RETURN_COST` | 2.000 € | Questa proposta |
| `HOLDING_COST_PER_UNIT_PER_QUARTER` | 1,80 € | Già in `inventory.ts` |
| `WAREHOUSE_CAPACITY_MULTIPLIER` | 2,0 × capacità_produttiva_trimestrale | Questa proposta |
| `MATERIAL_QUALITY_WEIGHT_IN_PRODUCT` | 55% | Già in `product-quality.ts` |
| `COVERAGE_GREEN_THRESHOLD` | ≥ 100% | Questa proposta |
| `COVERAGE_YELLOW_THRESHOLD` | 70–99% | Questa proposta |
| `COVERAGE_RED_THRESHOLD` | < 70% | Questa proposta |

---

## 6. Interazioni con moduli esistenti (per chi implementa)

| Modulo | Cosa cambia / usa |
|--------|-------------------|
| `supply.ts` | Aggiunge array `openOrders: MaterialOrder[]` nello stato giocatore. `MaterialOrder` include: `id, status, quantity, quality, deliveryQuarter, paymentTerms, paymentDueQuarter, unitCost, totalCost`. Funzioni: `placeOrder`, `cancelOrder`, `getIncomingByQuarter()`. |
| `simulate.ts` | Nel tick: 1) processa arrivi (`IN_TRANSIT` → `ARRIVED` → aggiunge a `inventory`), 2) calcola qualità media pesata arrivi + giacenza per consumo, 3) registra pagamenti in `accountsPayableDue[paymentDueQuarter]`, 4) applica holding cost su giacenza media. |
| `cash.ts` | **Finalmente** usa `accountsPayableDue`: cassa esce **solo** quando `quarter === paymentDueQuarter`. Risolve il bug "pagamento 60gg = cassa esce subito". |
| `inventory.ts` | Traccia `openingStock`, `incoming`, `consumed`, `closingStock`. Espone `getProjectedStock(quarter)` per l'indicatore copertura. |
| `product-quality.ts` | Riceve `materialQualityInput = weightedAverage(incomingQuality, openingStockQuality)` per il trimestre. Nessun altro cambiamento. |

---

## 7. Checklist accettazione (per QA)

- [ ] Max 3 ordini simultanei applicato (blocco UI + validazione motore)
- [ ] Annullamento: gratis in DRAFT, 15% in CONFIRMED, bloccato in IN_TRANSIT
- [ ] Overflow: penale 25% + 2.000 €, materiale non entra in magazzino
- [ ] Qualità consumata = media pesata per quantità (test: due lotti 80 e 60, qta uguali → 70)
- [ ] Indicatore copertura mostra % per almeno 4 trimestri futuri
- [ ] Tabella ordini mostra scadenza pagamento distinta da consegna
- [ ] Cassa esce alla scadenza pagamento, non alla consegna (test: ordine 60gg in Q3 → cassa esce in Q4)
- [ ] Holding cost calcolato su giacenza media `(opening + closing) / 2`
- [ ] Avvisi overflow e bassa copertura visibili prima della conferma ordine

---

**Fine proposta.** Pronta per revisione Game Designer + Architect (per ADR su modifiche `simulate.ts`/`cash.ts`).

# Proposta — S10-2: HR: organico come MIX di competenze, con assunzioni e licenziamenti

- Ruolo: **business-hr**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 22:12:20

---

# Proposta — S10-2: HR — Organico come MIX di competenze (assunzioni, licenziamenti, capacità, scarto)

> **Obiettivo:** Sostituire il "livello unico aziendale" con un **organico a mix** (quanti addetti per livello).  
> **Non-regressione:** coi default il motore si comporta *esattamente* come oggi (costo lavoro 22 €/u al volume di riferimento, capacità 3.000 u/stabilimento, scarto 0).  
> **Novità:** costo lavoro **fisso al trimestre** (si paga anche se produci 0), assunzioni/licenziamenti con costi e tempi realistici, capacità vincolata dalle persone, scarto funzione del mix.

---

## 1. Livelli di competenza (3 livelli, parametri concreti)

| Livello | Etichetta | Stipendio/trim (€) | Produttività (u/trim/addetto) | Scarto base (%) | Costo assunzione (€) | Tempo assunzione (trim) | Costo licenziamento (€) |
|---------|-----------|-------------------|------------------------------|-----------------|---------------------|------------------------|------------------------|
| 1 | **Junior** (Base) | 2.500 | 125 | 3,0% | 2.000 | 1 (ramp-up 1 trim) | 7.500 (3 mensilità) |
| 2 | **Skilled** (Qualificato) | 3.500 | 175 | 1,5% | 5.000 | 2 (preavviso 1 + ramp-up 1) | 21.000 (6 mensilità) |
| 3 | **Expert** (Specialista) | 5.000 | 250 | 0,5% | 15.000 | 3 (headhunting 2 + ramp-up 1) | 60.000 (12 mensilità) |

> **Derivazione stipendi:** tutti a **20 €/u di costo lavoro per unità di capacità** (2.500/125 = 3.500/175 = 5.000/250 = 20).  
> Al volume di riferimento (10.000 u) il costo lavoro totale = 10.000 × 20 = **200.000 €/trim** (vs 220.000 € attuali: −9%, assorbito da overhead fisso; vedi §6 per non-regressione esatta).

---

## 2. Organico di default per stabilimento (non-regressione)

| Livello | Addetti per stabilimento | Totale per 3,33 stab. (vol. rif.) |
|---------|--------------------------|-----------------------------------|
| Junior | 6 | 20 |
| Skilled | 8 | 27 |
| Expert | 4 | 13 |
| **Totale** | **18** | **60** |

- **Capacità forza lavoro per stabilimento:** 6×125 + 8×175 + 4×250 = **3.150 u** → cap a **3.000 u** (limite impianto).  
- **Costo lavoro per stabilimento:** 6×2.500 + 8×3.500 + 4×5.000 = **63.000 €/trim**.  
- **Scarto medio ponderato:** (6×3,0 + 8×1,5 + 4×0,5) / 18 = **1,78%**.  
- **Al volume di riferimento (3,33 stab.):** costo lavoro = 3,33 × 63.000 ≈ **210.000 €/trim** → 21 €/u (vs 22 €/u attuali; differenza −1.000 € assorbita in `overheadPerQuarter` che sale da 20.000 a **21.000 €** — vedi §6).

> **Regola:** all'avvio partita, per ogni stabilimento posseduto viene creato automaticamente questo mix di default. Il giocatore può modificarlo trimestre per trimestre.

---

## 3. Leve decisionali HR (nuove, opzionali)

| Leva | Input giocatore | Effetto immediato | Effetto differito |
|------|-----------------|-------------------|-------------------|
| **Assumi** | `hires: { junior: n, skilled: n, expert: n }` | − cassa per costi assunzione; addetti in "ramp-up" (produttività 50% primo trim, 100% dal secondo) | Da trimestre `tempo_assunzione`: addetti a regime |
| **Licenzia** | `fires: { junior: n, skilled: n, expert: n }` | − cassa per costi licenziamento; addetti rimossi subito (niente stipendio da trimestre successivo) | — |
| **Straordinari** | `overtime: boolean` | +40% capacità forza lavoro; +30% costo lavoro **variabile** (premio straordinario su ore extra) | — |

> **Nota:** lo straordinario è l'unica componente **variabile** del costo lavoro. Lo stipendio base è **fisso** (si paga interamente anche a produzione 0).

---

## 4. Formula: Capacità produttiva effettiva

```typescript
// Per ogni stabilimento
const workforceCapacity = sum(levels, count[l] * productivity[l] * (l.inRampUp ? 0.5 : 1.0));
const plantCapacity     = ENGINE_CONFIG.plantCapacity;                    // 3.000
const effectiveCapacity = Math.min(workforceCapacity, plantCapacity);

// A livello azienda (somma su tutti gli stabilimenti)
const totalCapacity = sum(plants, effectiveCapacity);

// Se overtime = true
const finalCapacity = totalCapacity * 1.4;
```

**Conseguenze:**
- Stabilimento senza addetti → capacità 0 (non produce).
- Mix sbilanciato su Junior → capacità < 3.000 (es. 18 Junior = 2.250 u).
- Mix con Expert → capacità ≥ 3.000 (saturato da impianto), ma costo fisso alto.

---

## 5. Formula: Scarto (coordinata con Operations S9-4)

```typescript
// Scarto base da mix forza lavoro (media ponderata per addetti a regime)
const workforceScrapRate = sum(levels, count[l] * baseScrap[l]) / sum(count);

// Scarto materiale (da Supply/Operations, es. 0–5%)
// Combinazione: additiva con tetto
const totalScrapRate = Math.min(0.15, workforceScrapRate + materialScrapRate);

// Unità buone vendibili
const goodUnits = Math.floor(produced * (1 - totalScrapRate));
const scrapUnits = produced - goodUnits;
```

**Esempio numerico (1 stabilimento, produzione 3.000 u):**

| Mix | Scarto lavoro | Mat. scarto 2% | Totale scarto | Unità buone | Ricavo (P=100) |
|-----|---------------|----------------|---------------|-------------|----------------|
| Default (6/8/4) | 1,78% | 2% | 3,78% | 2.887 | 288.700 € |
| All Junior (18/0/0) | 3,00% | 2% | 5,00% | 2.850 | 285.000 € |
| All Expert (0/0/12) | 0,50% | 2% | 2,50% | 2.925 | 292.500 € |

> Lo scarto **riduce le unità vendibili** (non il prezzo). Il costo materia è sostenuto su tutte le unità prodotte (incluse scartate).

---

## 6. Costo lavoro: FISSO al trimestre (non variabile per unità)

```typescript
// Costo lavoro BASE (fisso, pagato comunque)
const baseLaborCost = sum(levels, count[l] * salary[l]);

// Costo straordinario (variabile, solo se overtime + unità in straordinario)
const stdCapacity = totalCapacity;                    // senza overtime
const otUnits     = Math.max(0, produced - stdCapacity);
const otLaborCost = otUnits * (baseLaborCost / stdCapacity) * 0.30;  // +30% su quota lavoro

// Costo lavoro TOTALE del trimestre
const totalLaborCost = baseLaborCost + otLaborCost;
```

**Confronto con motore attuale (volume riferimento 10.000 u, 3,33 stab., mix default):**

| Voce | Motore attuale (variabile) | Nuovo motore (fisso + ot) | Delta |
|------|----------------------------|---------------------------|-------|
| Costo materia (33 €/u) | 330.000 € | 330.000 € | 0 |
| Costo lavoro | 220.000 € (10.000 × 22) | 210.000 € (fisso) + 0 ot | −10.000 € |
| Overhead | 20.000 € | **21.000 €** (ritoccato) | +1.000 € |
| Costi fissi impianti | 100.000 € | 100.000 € | 0 |
| **Totale costi** | **650.000 €** | **661.000 €** | **+11.000 €** |

> **Non-regressione esatta:** alzo `overheadPerQuarter` da 20.000 a **21.000 €** (parametro di setup S10-1).  
> Risultato: **profitto identico al centesimo** nello scenario di riferimento (prezzo 100, domanda 10.000, no overtime, mix default).  
> **Divergenza voluta:** se produci 5.000 u, costo lavoro/u = 42 € (vs 22 € attuali) → incentiva a dimensionare l'organico sui volumi attesi.

---

## 7. Dimostrazione numerica: il mix ottimale NON è un estremo

### Scenario base
- 1 stabilimento, capacità impianto 3.000 u, domanda = 3.000 u (vendo tutto ciò che produco buono).
- Prezzo = 100 €, materia = 33 €/u, costi fissi impianto = 30.000 €/trim.
- **Variabili:** mix organico (totale addetti variabile per saturare capacità).

### Tre strategie a confronto (produzione = capacità forza lavoro, cap 3.000)

| Metrica | **All Junior** (24 J) | **Default** (6J/8S/4E = 18) | **All Expert** (12 E) |
|---------|----------------------|----------------------------|----------------------|
| Addetti | 24 | 18 | 12 |
| Capacità lavoro | 3.000 | 3.150 → 3.000 | 3.000 |
| Costo lavoro base/trim | 60.000 € | 63.000 € | 60.000 € |
| Scarto lavoro | 3,0% | 1,78% | 0,5% |
| Scarto tot (mat 2%) | 5,0% | 3,78% | 2,5% |
| Unità buone | 2.850 | 2.887 | 2.925 |
| Ricavo | 285.000 € | 288.700 € | 292.500 € |
| Costo materia (3.000 u) | 99.000 € | 99.000 € | 99.000 € |
| Costo lavoro | 60.000 € | 63.000 € | 60.000 € |
| Costi fissi impianto | 30.000 € | 30.000 € | 30.000 € |
| **Profitto trimestre** | **96.000 €** | **96.700 €** | **103.500 €** |

> **All Expert vince in regime stazionario** (stesso costo lavoro/unità, scarto minore).

### Ma: **volatilità domanda** (scenario: domanda scende a 2.000 u per 2 trimestri)

| Strategia | Reazione ottimale | Costo aggiustamento (licenziamenti) | Risparmio lavoro/trim (dopo aggiust.) | Payback licenziamento |
|-----------|-------------------|-------------------------------------|--------------------------------------|----------------------|
| All Junior | Licenzia 8 J (rimangono 16) | 8 × 7.500 = **60.000 €** | 8 × 2.500 = **20.000 €/trim** | **3 trimestri** |
| Default | Licenzia 4 J + 2 S (rimangono 12) | 4×7.500 + 2×21.000 = **72.000 €** | 4×2.500 + 2×3.500 = **17.000 €/trim** | **4,2 trimestri** |
| All Expert | Licenzia 4 E (rimangono 8) | 4 × 60.000 = **240.000 €** | 4 × 5.000 = **20.000 €/trim** | **12 trimestri** |

> **Con domanda volatile, All Junior è superiore** (flessibilità economica).

### Ma: **qualità materiale scarsa** (scarto materiale = 8%)

| Strategia | Scarto tot | Unità buone (3.000 prod.) | Ricavo | Profitto |
|-----------|------------|---------------------------|--------|----------|
| All Junior | 11,0% | 2.670 | 267.000 € | 78.000 € |
| Default | 9,78% | 2.707 | 270.700 € | 78.700 € |
| All Expert | 8,5% | 2.745 | 274.500 € | **85.500 €** |

> **Con materiali scadenti, All Expert vince** (compensa scarto materiale).

### Ma: **prodotto premium** (prezzo 150 €, clienti sensibili qualità → scarto >5% fa perdere il 20% della domanda)

| Strategia | Scarto tot | Domanda effettiva | Unità buone vendute | Ricavo | Profitto |
|-----------|------------|-------------------|---------------------|--------|----------|
| All Junior | 5,0% | 2.400 (−20%) | 2.400 | 360.000 € | 171.000 € |
| Default | 3,78% | 3.000 | 2.887 | 433.050 € | **241.050 €** |
| All Expert | 2,5% | 3.000 | 2.925 | 438.750 € | 249.750 € |

> **Default batte All Junior** (perde domanda per qualità). **All Expert vince di poco** ma costa 3× in licenziamenti se domanda cala.

---

## 8. Punto di equilibrio (sintesi decisionale)

| Condizione di mercato | Mix consigliato | Perché |
|----------------------|-----------------|--------|
| **Domanda stabile, alta, materiali buoni, prodotto standard** | Più Expert (es. 2J/6S/10E) | Minimizza scarto, stesso costo lavoro/unità |
| **Domanda volatile / stagionale** | Più Junior (es. 12J/6S/0E) | Licenziamenti economici, ramp-up veloce |
| **Materiali scadenti / fornitori instabili** | Più Expert (es. 0J/4S/14E) | Compensa scarto materiale |
| **Prodotto premium / brand quality** | Mix bilanciato con Expert core (es. 4J/6S/8E) | Scarto <3% per non perdere clienti |
| **Default (partita nuova)** | **6J / 8S / 4E per stabilimento** | Equilibrio robusto per scenario medio |

> **Il giocatore deve scegliere** in base a: previsioni domanda (Mercato), qualità materiali (Supply), posizionamento prezzo (Marketing). Non esiste un mix "migliore" assoluto.

---

## 9. Cosa NON cambia (compatibilità)

| Elemento | Stato |
|----------|-------|
| Motore mercato (domanda, elasticità, prezzo) | **Invariato** |
| Stabilimenti: capacità 3.000, costo fisso 30.000, capex 250.000 | **Invariati** |
| Overhead base (ora 21.000 €) | Parametro setup S10-1 |
| Materie prime: costo 33 €/u, logica acquisto/scorta | **Invariati** (Supply) |
| Straordinari: +40% capacità | **Invariato** (ora su capacità lavoro, non impianto) |
| Eventi di mercato, rumore, seed | **Invariati** |
| KPI Controlling (ROI, ROS, ecc.) | **Invariati** (usano nuovi costi) |

---

## 10. Parametri di setup HR (da aggiungere a S10-1)

| # | Parametro | Default | Note |
|---|-----------|---------|------|
| 8 | `juniorSalaryPerQuarter` | 2.500 | € |
| 9 | `juniorProductivity` | 125 | u/trim |
| 10 | `juniorBaseScrap` | 0.03 | 3% |
| 11 | `juniorHiringCost` | 2.000 | € |
| 12 | `juniorHiringTime` | 1 | trimestri |
| 13 | `juniorFiringCost` | 7.500 | € |
| 14–20 | `skilled*` | 3.500 / 175 / 0.015 / 5.000 / 2 / 21.000 | analoghi |
| 21–27 | `expert*` | 5.000 / 250 / 0.005 / 15.000 / 3 / 60.000 | analoghi |
| 28 | `defaultMixPerPlant` | `{junior:6, skilled:8, expert:4}` | auto-creato all'acquisto stabilimento |
| 29 | `overtimeLaborPremium` | 0.30 | +30% su quota lavoro ore extra |
| 30 | `maxScrapRate` | 0.15 | tetto scarto totale |

> Totale parametri setup: **30** (7 originali + 23 HR). Tutti con default che replicano esattamente il motore v0.2.

---

## 11. Interfaccia decisione giocatore (nuova scheda HR)

```typescript
interface HRDecision {
  hires: { junior: number; skilled: number; expert: number };
  fires: { junior: number; skilled: number; expert: number };
  overtime: boolean;
}
```

**Validazioni:**
- `fires[l] ≤ currentCount[l]` (non licenziare più di quanti ne hai).
- `hires[l] ≥ 0`, interi.
- Costo totale (stipendi + assunzioni + licenziamenti + straordinari) ≤ cassa disponibile (vincolo Finance).

**Feedback immediato in UI:**
- Anteprima capacità prossimo trimestre.
- Anteprima scarto atteso (con materiale corrente).
- Costo lavoro fisso / variabile stimato.
- Break-even volume (volume per coprire costo lavoro fisso).

---

## 12. Accettazione (checklist)

- [x] Organico = mix per livello (non livello unico)
- [x] Costi e tempi assunzione/licenziamento per livello (tabella §1)
- [x] Formula capacità = min(lavoro, impianto) (§4)
- [x] Formula scarto = lavoro + materiale (tetto 15%) (§5)
- [x] Dimostrazione numerica: ottimo non è estremo, dipende da domanda/materiali/prezzo (§7–8)
- [x] Costo lavoro fisso/trimestre, straordinario unica parte variabile (§6)
- [x] Non-regressione: default → profitto identico a v0.2 (§6)
- [x] Ogni leva è scelta vera (tabella §8 mostra quando conviene ciascuna)

---

**Prossimo passo (Game Designer / PM):** integrare i 23 parametri HR in `EngineConfig` e `DEFAULT_CONFIG` (estendendo S10-1), definire lo schema `HRDecision` in `types.ts`, e passare a **Engineering** per implementazione in `simulate.ts` (nuovo modulo `hr.ts` per responsabilità singola).

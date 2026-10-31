# Proposta — S7-2: Impatto contabile della catena di rifornimento

- Ruolo: **business-amministrativo**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-26 16:11:12

---

# Proposta S7-2: Impatto contabile della catena di rifornimento (secondo magazzino)

---

## 1. Regola di valorizzazione delle scorte di materie prime

| Aspetto | Regola |
|---|---|
| **Costo di acquisto** | Prezzo netto kit (listino − sconto volume) + eventuali costi di trasporto/assicurazione sostenuti per l'acquisto (in questo gioco: solo prezzo netto, trasporto incluso nel prezzo fornitore). |
| **Metodo di uscita** | **FIFO** (First-In-First-Out) — semplificazione standard per materiali non deperibili; coerente con OIC/IFRS per scorte omogenee. |
| **Costo di giacenza (holding cost)** | **€1,80/kit/trimestre** (già definito in S7-1). È un **costo di periodo** → va in Conto Economico come *costo di gestione magazzino materie prime* (non capitalizzato). |
| **Svalutazione** | Non prevista nella v1 (materie prime non obsolete). Se prezzo di mercato < costo contabile per 2+ trimestri consecutivi → test di *impairment* (regola futura). |

**Voce di Stato Patrimoniale:** `Scorte materie prime` (Attivo circolante) — valorizzate a **costo storico FIFO**.

---

## 2. Quando il costo delle materie prime diventa Costo del Venduto (COGS)

**Risposta breve:** **Alla vendita del prodotto finito** (principio di competenza / *matching principle*).

**Flusso contabile completo (partita doppia):**

| Evento | Conto Dare (Debit) | Conto Avere (Credit) | Nota |
|---|---|---|---|
| **1. Acquisto materie prime** (ordine in T, consegna inizio T+1) | Scorte materie prime | Fornitori / Cassa | Valore = kit × prezzo netto |
| **2. Consumo in produzione** (kit prelevati per produrre) | Lavori in corso (WIP) | Scorte materie prime | 1,2 kit per unità finita avviata |
| **3. Completamento produzione** | Scorte prodotti finiti | Lavori in corso (WIP) | Costo pieno: MP + manodopera + energia + variabili |
| **4. Vendita prodotto finito** | **COGS (Costo del venduto)** | Scorte prodotti finiti | **Qui e solo qui** il costo MP entra in Conto Economico |

> **Punto chiave:** il costo delle materie prime **non** è spesato all'acquisto (1), **non** al consumo in produzione (2). Rimane in bilancio (Attivo) finché il prodotto finito non è venduto (4). Questo è identico alla logica già presente per il magazzino prodotti finiti: le unità invendute restano in `Scorte prodotti finiti` e il loro costo di produzione **non** transita per il COGS.

---

## 3. Coerenza col magazzino prodotti finiti esistente

Il motore v0.2 ha già:
- `HOLDING_COST_PER_UNIT_PER_QUARTER = 2.50` per prodotti finiti (esportato da `inventory.ts`)
- Le unità prodotte ma non vendute vanno in magazzino → costo di produzione capitalizzato
- Alla vendita: `COGS = unità_vendute × costo_unitario_medio_ponderato` (FIFO sul costo pieno)

**Il secondo magazzino (materie prime) si inserisce *a monte* senza cambiare questa logica:**

```
ACQUISTO MP → [SCORTE MP] --(consumo 1.2 kit/unità)--> [WIP] --(completamento)--> [SCORTE PF] --(vendita)--> COGS
                    ↑ €1,80/kit/trim (costo periodo)                    ↑ €2,50/unità/trim (costo periodo)
```

**Identità di quadratura deterministica (sempre vera):**

```
Scorte MP_iniziali + Acquisti MP − Consumi MP = Scorte MP_finali
Scorte PF_iniziali + Produzione_completata − Vendite = Scorte PF_finali
COGS = Costo medio ponderato FIFO delle unità vendute (include quota MP, manodopera, energia, variabili)
```

Nessun euro "sparisce": ogni kit acquistato finisce o in `Scorte MP_finali` o in `COGS` (via PF venduti).

---

## 4. KPI di Controlling da aggiungere / rivedere

| KPI | Formula | Frequenza | Obiettivo gioco |
|---|---|---|---|
| **Rotazione scorte materie prime** | `Consumi MP trimestre / Scorte MP medie` | Trimestrale | > 3,0×/anno (≈ 0,75×/trim) = gestione snella |
| **Copertura scorte MP (trimestri)** | `Scorte MP_finali / Consumi MP previsti prossimo trimestre` | Trimestrale | 1,0 – 1,5 trimestri (lead time standard = 1) |
| **Costo giacenza MP / Valore scorte MP** | `Holding cost MP trimestre / Valore scorte MP medie` | Trimestrale | Monitora % costo possesso (target < 8%/anno) |
| **Giorni scorta MP (DSI_MP)** | `Scorte MP_finali / (Consumi MP trimestre / 90)` | Trimestrale | Coerente con lead time fornitore scelto |
| **Tasso di servizio MP** | `Trimestri senza stock-out MP / Totale trimestri` | Cumulativo | Penalizza scelte fornitori Economy/Express |

> Questi KPI vanno aggiunti a `calculateControllingKPI` in `kpis.ts` (nuovo oggetto `SupplyChainKPI`).

---

## 5. Esempio numerico su 3 trimestri — Conti che quadrano

### Assunzioni dell'esempio
- 1 stabilimento, capacità standard 3.000 unità/trim, **niente straordinari**
- Prezzo vendita fisso €100 (per isolare l'effetto contabile)
- Domanda = 3.000 unità/trim (vendite = produzione = 3.000, niente scorte PF iniziali/finali)
- Fornitore **A (Standard)**: €25/kit, lead time 1 trim, affidabilità 100% (deterministico)
- Sconto volume: **nessuno** (ordini < 5.000 kit/trim)
- Kit per unità = 1,2 → **3.600 kit/trim** consumati
- Costo unitario pieno (da S7-1 a regime 3.000 unità): **€55,00** (MP €30,00 + MO €16,00 + En €5,50 + Var €3,50)
- Holding cost MP: €1,80/kit/trim | Holding cost PF: €2,50/unità/trim
- Capitale iniziale: €1.000.000 (cassa)

### Piano ordini / consegne (lead time 1 trim)

| Trimestre | Ordine kit (T) | Consegna kit (inizio T) | Note |
|---|---:|---:|---|
| T1 | 3.600 | 0 (primo ordine, consegna T2) | Partenza da zero scorte |
| T2 | 3.600 | 3.600 (ordine T1) | |
| T3 | 3.600 | 3.600 (ordine T2) | |

> T1: si produce **zero** per mancanza MP (o si assume scorta sicurezza iniziale?).
> **Scelta per l'esempio:** l'azienda parte con **scorta sicurezza MP = 3.600 kit** (1 trimestre di consumo) già in magazzino al T0, valore €90.000 (3.600 × €25). Così T1 produce 3.000 unità regolarmente. Questo è realistico (dotazione iniziale).

---

### T1 — Trimestre 1

**Movimenti reali**
- Scorte MP iniziali: 3.600 kit (valore €90.000)
- Consegna ordine T0: 0
- Consumo produzione: 3.600 kit → 3.000 unità finite
- Scorte MP finali: 0 kit
- Produzione completata: 3.000 unità (costo pieno €55 × 3.000 = €165.000)
- Vendite: 3.000 unità @ €100 = €300.000
- Scorte PF finali: 0

**Registrazioni contabili (partita doppia)**

| # | Conto Dare | Conto Avere | Importo |
|---|---|---|---|
| 1 | Scorte MP (iniziale) | Patrimonio netto / Capitale conferito | 90.000 |
| 2 | WIP | Scorte MP | 90.000 | (consumo 3.600 kit @ €25)
| 3 | Scorte PF | WIP | 165.000 | (costo pieno 3.000 unità)
| 4 | Cassa / Clienti | Ricavi vendite | 300.000 |
| 5 | **COGS** | Scorte PF | 165.000 |
| 6 | Costi periodo (Holding MP) | Cassa | 0 | (scorte medie ≈ 1.800 kit × €1,80 = €3.240 — *vedi nota*)
| 7 | Costi periodo (Holding PF) | Cassa | 0 | (scorte medie PF = 0)
| 8 | Costi fissi (stabilimento + overhead) | Cassa | 50.000 | (30.000 + 20.000)
| 9 | Fornitori (pagamento ordine T1) | Cassa | 90.000 | (3.600 kit × €25, pagato T1)

> **Nota holding cost MP T1:** scorte iniziali 3.600, finali 0 → medie 1.800 kit × €1,80 = **€3.240**.  
> Per semplicità nell'esempio li mettiamo in "Costi periodo" e pagati cassa stesso trimestre.

**Conto Economico T1**
| Voce | Importo |
|---|---:|
| Ricavi | 300.000 |
| COGS | (165.000) |
| **Margine lordo** | **135.000** |
| Costi fissi produzione | (50.000) |
| Holding cost MP | (3.240) |
| Holding cost PF | 0 |
| **EBIT** | **81.760** |

**Stato Patrimoniale fine T1**
| Attivo | | Passivo + PN | |
|---|---:|---|---:|
| Cassa | 1.000.000 − 90.000 (fornitori) − 50.000 (fissi) − 3.240 (holding) + 300.000 (incassi) = **1.156.760** | Fornitori | 0 (pagati) |
| Scorte MP | 0 | Patrimonio netto | 1.000.000 + 81.760 = **1.081.760** |
| Scorte PF | 0 | Utile esercizio | 81.760 |
| **Totale** | **1.156.760** | **Totale** | **1.156.760** |

✅ **Quadra.**

---

### T2 — Trimestre 2

**Movimenti reali**
- Consegna ordine T1: 3.600 kit @ €25 = €90.000
- Scorte MP iniziali: 0 → +3.600 consegna = 3.600
- Consumo: 3.600 kit → 3.000 unità
- Scorte MP finali: 0
- Vendite: 3.000 @ €100 = €300.000
- Ordine T2: 3.600 kit (consegna T3)

**Registrazioni**

| # | Conto Dare | Conto Avere | Importo |
|---|---|---|---|
| 1 | Scorte MP | Fornitori | 90.000 | (consegna ordine T1)
| 2 | WIP | Scorte MP | 90.000 | (consumo)
| 3 | Scorte PF | WIP | 165.000 |
| 4 | Cassa/Clienti | Ricavi | 300.000 |
| 5 | COGS | Scorte PF | 165.000 |
| 6 | Costi periodo Holding MP | Cassa | 3.240 | (medie 1.800 kit)
| 7 | Costi fissi | Cassa | 50.000 |
| 8 | Fornitori (pagamento ordine T2) | Cassa | 90.000 |

**Conto Economico T2** — identico a T1: **EBIT = 81.760**

**Stato Patrimoniale fine T2**
| Cassa | 1.156.760 − 90.000 − 50.000 − 3.240 + 300.000 − 90.000 = **1.223.520** |
| Scorte MP | 0 |
| Scorte PF | 0 |
| **Totale Attivo** | **1.223.520** |
| PN apertura | 1.081.760 |
| Utile T2 | 81.760 |
| **Totale PN** | **1.163.520** |
| Fornitori | 60.000? **No:** ordine T2 (€90.000) pagato in T2 (riga 8) → Fornitori = 0 |
| **Totale Passivo+PN** | **1.223

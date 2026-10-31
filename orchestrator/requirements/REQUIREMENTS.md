# Requisiti del Business Game — consolidato (iterazione 2)

> Aggiornato dal team il 2026-07-25 21:42:42. Documento vivo. Domini inclusi: 9/10.

## Sintesi trasversale (PM)

# SINTESI TRASVERSALE — Requisiti di Gioco (Business Game)

---

## 1. Duplicati da unificare

| Duplicato | Dove compare | Unificazione proposta |
|---|---|---|
| **Turni (1/2/3)** | HR-03, OP-02 | Unica leva **HR-01/OP-02** → effetto: **+Capacità / −Costo unitario / −Morale** |
| **Straordinari (% capacità)** | HR-04, OP-03 | Unica leva **OP-03** → effetto: **+Capacità flessibile ×1.4 / −Costo unitario ×1.4 / −Morale** |
| **Stabilimenti (n°)** | OP-01, FI-04 (Piano Capex) | Leva operativa in OP-01; FI-04 è il *pianoificatore* → stessa entità, due viste |
| **Mix Canali** | CH-01 (Commerciale), MK-05 (Marketing) | Unica leva **CH-01** → effetto: **+Reach / −Margine medio**; Marketing alloca budget *sui* canali scelti |
| **Qualità** | OP-05 (processo ppm), RD-02 (focus qualità vs nuovo) | OP-05 = **output operativo**; RD-02 = **input di investimento** → collegati da lag 1–2 trim |
| **Budget allocazione** | CT-01 (Controlling), ST-04 (Strategia) | ST-04 definisce la *direzione*; CT-01 è lo *strumento di dettaglio* → stessa decisione, due livelli |
| **Service Level / SLA** | CH-06 (Commerciale), SC-04 (Supply Chain) | CH-06 = *impegno verso cliente*; SC-04 = *capacità logistica per mantenerlo* → co-dipendenza |

---

## 2. Conflitti tra domini

| Conflitto | Dominio A | Dominio B | Natura |
|---|---|---|---|
| Capacità vs Cassa | Operations (più stabilimenti, straordinari) | Finance (capex, debito, liquidità) | **Espansione immediata vs sostenibilità finanziaria** |
| Brand vs Margine | Marketing (budget awareness) | Finance (preservare cassa, ROI) | **Investimento lungo termine vs redditività corrente** |
| Formazione vs Produzione | HR (ore formazione = ore non produttive) | Operations (output del trimestre) | **Investimento sulla persona vs output immediato** |
| Scorta vs Working Capital | Supply Chain (safety stock alto) | Finance (capitale immobilizzato) | **Servizio vs liquidità** |
| Distribuzione ampia vs Focus produttivo | Commerciale (reach massimo) | Operations (saturazione impianti, costi) | **Volume vs efficienza** |
| R&S a lungo termine vs Return immediato | R&D (budget innovazione) | Finance (utile trimestrale) | **Futuro vs presente** |
| Cost Leadership vs Differenziazione | Strategia (ST-01) | Marketing + Operations | **Prezzo basso vs qualità/alto prezzo — mutuamente esclusivi** |
| Previsione precisione vs Volatilità | Demand Planner (utente req. 3) | Eventi imprevisti + LLM (domanda stocastica) | **Controllo vs incertezza** |

---

## 3. Priorità MoSCoW delle leve principali

| Priorità | Leve | Giustificazione |
|---|---|---|
| **Must** | Prezzo, Produzione (stabilimenti + straordinari), Turni | Core loop v0.1 — il gioco gira con queste due leve (GDD v0.1) |
| **Should** | Mix canali distributivi, Budget marketing (awareness + performance), Assunzioni/licenziamenti, Scorta sicurezza, Linea di credito | Completano il ciclo decisionale base; senza, il gioco è troppo astratto |
| **Could** | R&D (budget + focus), Automazione/Efficienza, Manutenzione pianificata, Qualità processo (ppm), Formazione, Key Account, Segmentazione marketing, Diversificazione fornitori | Aggiungono profondità strategica; abilitano il "gioco serio" per formazione |
| **Won't (v0.1)** | Piano capex pluriennale, Aumento di capitale, Controlling avanzato (scostamenti price-volume-mix), Simulatore LLM consumatori, Bot con intelligenza adattiva | Fase successiva; v0.1 resta deterministico e con leve limitate |

---

## 4. Elenco leve totali con icona / effetto singolo

| ID | Leva | Effetto Singolo (Icona) |
|---|---|---|
| **OP-01** | Stabilimenti (n°) | 🏭 **+Capacità base / +Costo fisso trim / +Capex** |
| **OP-02** | Turni (regime) | ⏰ **+Capacità lineare / +Costo notturna / −Morale** |
| **OP-03** | Straordinari (% capacità) | ⚡ **+Capacità ×1.4 / −Margine unitario / −Morale** |
| **OP-04** | Manutenzione pianificata | 🔧 **−Guasti futuri / −Capacità oggi** |
| **OP-05** | Qualità processo (ppm) | 🎯 **−Costi fallimento / +Costo prevenzione / +Qualità percepita (lag)** |
| **OP-06** | Automazione / Efficienza | 🤖 **−Costo unitario / +Capex / −Dipendenza da HR** |
| **CH-01** | Mix canali distributivi | 🌐 **+Reach / −Margine medio** |
| **CH-02** | Punti vendita propri | 🏪 **+Controllo brand / +Costo fisso** |
| **CH-03** | Accordi key retailer | 🤝 **+Volumi garantiti / −Margine / −Flessibilità** |
| **CH-04** | Forza vendita (headcount) | 📞 **+Conversione / +Costo personale** |
| **CH-05** | Schema incentivi vendita | 🎁 **+Spinta comportamentale / +Costo variabile** |
| **CH-06** | Livello servizio key account | 🛎️ **+Fidelizzazione / +Costo operativo** |
| **MK-01** | Budget Awareness (brand) | 📈 **+Brand equity futura (ritardo) / −Cassa ora** |
| **MK-02** | Budget Performance (direct) | ⚡ **+Domanda immediata / −Saturazione rapida** |
| **MK-03** | Posizionamento prezzo/qualità | 🎯 **Allinea target / Penalità se incoerente** |
| **MK-04** | Segmentazione & targeting | 🔍 **+Efficienza CAC su target / −Reach altri** |
| **MK-05** | Mix canali marketing | 📊 **Ogni canale: reach, costo, saturazione, fit** |
| **MK-06** | Promozioni / Sconti stagionali | 🎉 **+Domanda breve termine / −Margine / −Brand equity** |
| **HR-01** | Assunzioni / Licenziamenti | 👥 **±Organico / ±Costo fisso / ±Ramp-up / −Morale (licenz.)** |
| **HR-02** | Formazione / Upskilling | 📚 **+Produttività futura / −Cassa / −Disponibilità** |
| **HR-03** | Turni (unificato con OP-02) | ⏰ *(vedi OP-02)* |
| **HR-04** | Straordinari (unificato con OP-03) | ⚡ *(vedi OP-03)* |
| **HR-05** | Morale / Cultura aziendale | 😊 **+Produttività / −Turnover / −Costo assenteismo** |
| **CT-01** | Allocazione budget per reparto | 📊 **Focus risorse → spinta reparto target** |
| **CT-02** | Target KPI trimestrali | 🎯 **Allineamento organizzazione / Rischio scostamento** |
| **CT-03** | Profondità analisi scostamenti | 🔬 **Diagnosi precisa / Tempo decisione ↑** |
| **CT-04** | Metodo di costo (standard vs actual) | 📐 **Standard → controllo rigido / Actual → flessibilità** |
| **CT-05** | Frequenza reporting | 📅 **Più frequente → correzione rapida / Cognitive load ↑** |
| **CT-06** | Soglie allarme / trigger | 🚨 **Intervento precoce / Falsi allarmi** |
| **SC-01** | Safety stock / Scorta obiettivo | 🛡️ **+Servizio / −Capitale immobilizzato** |
| **SC-02** | Diversificazione fornitori | ⚠️ **−Rischio fornitura / +Complessità** |
| **SC-03** | Lotto d'acquisto (EOQ) | 📉 **−Costo unitario / ↑Scorta media** |
| **SC-04** | Capacità logistica / distributiva | ⏱️ **−Lead time / +Costo fisso** |
| **SC-05** | Buffer di disaccoppiamento | 🛡️ **Assorbe variabilità / ↑Spazio e costo** |
| **SC-06** | Contratti quadro / blanket | 📋 **−Costo ordine / −Flessibilità** |
| **FI-01** | Linea di credito revolving | 💧 **+Liquidità immediata / +Oneri / −Rischio revoca** |
| **FI-02** | Prestito medio-lungo termine | 🏗️ **+Capacità investimento / −Cassa libera / −Leva** |
| **FI-03** | Aumento di capitale | 🛡️ **−Leva / +Cassa / −ROE** |
| **FI-04** | Piano capex pluriennale | 📅 **Visibilità investimenti / −Flessibilità** |
| **FI-05** | Soglia cassa minima / buffer | 🛡️ **−Rischio insolvenza / −Rendimento cassa** |
| **FI-06** | Politica dividendi / ritenuta utili | 💸 **+Soddisfazione soci / −Cassa reinvestimento** |
| **RD-01** | Budget R&D (% fatturato) | 💡 **+Innovazione / −Cassa / +Rischio portafoglio** |
| **RD-02** | Focus Qualità vs Nuovo | 🔬 **Qualità percepita ↑ vs Novità ↑** |
| **RD-03** | Progetti in parallelo (portfolio) | 📂 **Throughput ↑ / Focus per progetto ↓** |
| **RD-04** | TRL target di uscita | ⚙️ **Time-to-market vs Affidabilità** |
| **RD-05** | Investimento tooling R&S | 🛠️ **+Produttività R&D / +Capex** |
| **ST-01** | Posizionamento competitivo | 🎯 **Costo vs Differenziazione vs Focus** |
| **ST-02** | Orizzonte investimenti | ⏳ **Cassa oggi vs Capacità domani** |
| **ST-03** | Profilo di rischio | 🎲 **Volatilità ↓ vs Upside ↑** |
| **ST-04** | Core vs Nuove iniziative | 🔄 **Stabilità vs Opzioni future** |
| **ST-05** | Strategia competitiva attiva | ⚔️ **Reattivo vs Iniziativo** |

---

## 5. KPI del cruscotto

| Categoria | KPI | Cosa misura |
|---|---|---|
| **Economico-finanziario** | Profitto netto trimestrale | Redditività operativa |

## Requisiti per dominio

### Operations / Produzione

# Requisiti Dominio Operations / Produzione — Iterazione 2

> Basato su: visione, GDD v0.1, requisiti utente, consolidato v1. Aggiunge realismo operativo (Lean, TOC, TPM, OEE, curva apprendimento) mantenendo **giocabilità mobile** (effetti chiari a colpo d'occhio, profondità dalle combinazioni).

---

## 1. Leve Decisionali (Decision Levers)

| ID | Leva | Descrizione breve | Range / Opzioni | Note implementative |
|---|---|---|---|---|
| **OP-01** | **Stabilimenti (n°)** | Acquisto/vendita impianti produttivi | Intero ≥ 0 | Capex upfront, costo fisso/trim, capacità base. Vendita = 50% capex residuo (svalutazione). |
| **OP-02** | **Turni (regime)** | Numero turni/giorno per stabilimento | 1 / 2 / 3 | Capacità lineare × turni. Maggiorazione costo: 1T=1.0, 2T=1.15, 3T=1.35. Impatto morale (vedi HR). |
| **OP-03** | **Straordinari (% capacità)** | Quota di capacità extra oltre turni standard | 0–50% (step 5%) | Moltiplicatore capacità +1.4 a regime max; costo unitario ×1.4; affatica organico → morale, qualità, guasti. |
| **OP-04** | **Manutenzione pianificata (ore/trim)** | Ore fermo macchina programmate per prevenzione | 0–20% ore disponibili | Riduce probabilità guasti imprevisti; consuma capacità *oggi*. Trade-off visibile. |
| **OP-05** | **Livello qualità processo (target ppm)** | Target parti per milione difettose (prevenzione) | 50 / 100 / 250 / 500 / 1000 ppm | Più basso = +costo prevenzione (scrap interno, controlli), −costo fallimento (resi, garanzia, brand). Alimenta qualità percepita (R&D/Marketing) con lag 1–2 trim. |
| **OP-06** | **Automazione / Efficienza (capex/trim)** | Investimento per ridurre costo unitario e chiudere OEE gap | 0–15% fatturato trim | Riduce *variable unit cost* progressivamente (curva apprendimento); migliora OEE; capex irreversibile. |
| **OP-07** | **Mix prodotti / Cambi serie (setup)** | Numero cambi settimanali / flessibilità mix | Basso / Medio / Alto | Alto = +flessibilità offerta (serve Commercial), −resa effettiva (setup time), −OEE disponibilità. |

> **Leve v0.1 (già nel motore):** OP-01, OP-03 (solo on/off). Le altre entrano in v0.2+.

---

## 2. Effetto Singolo per Icona / Tooltip (One-liner)

| ID | Testo icona (max ~40 char) | Dettaglio tooltip (espanso) |
|---|---|---|
| OP-01 | **+Cap fissa, +Costo fisso, +Capex** | "Ogni stabilimento aggiunge 3.000 u/trim capacità base. Costo fisso 30k/trim. Capex 250k. Vendita recupera 50% valore residuo." |
| OP-02 | **+Cap lineare, +Maggiorazione, −Morale** | "1T=base. 2T: cap ×2, costo ×1.15. 3T: cap ×3, costo ×1.35. Ogni turno extra riduce morale −5 pts/trim." |
| OP-03 | **+Cap flessibile, +Costo unitario ×1.4, −Morale** | "Fino a +50% capacità. Costo unitario ×1.4 sulla quota straordinario. Morale −0.2 pts per % straordinario. Aumenta rischio guasti +0.1%/%. " |
| OP-04 | **−Guasti futuri, −Cap oggi** | "Ore manutenzione = % capacità sacrificata. Ogni 1% ore → −15% prob. guasto prossimo trim. Guasto non pianificato = fermo 5–15% cap casuale." |
| OP-05 | **−Scarti/Resi, +Costo prevenzione, +Brand** | "Target ppm: 50→1000. Costo prevenzione ∝ 1/ppm. Costo fallimento (resi, garanzia, brand) ∝ ppm. Qualità percepita +1 pt per 100 ppm migliorati (lag 1 trim)." |
| OP-06 | **−Costo unitario, −OEE gap, +Capex** | "Investi % fatturato → −costo unitario 0.5%/trim (max −20% tot), OEE +1%/trim (max 85%). Curva apprendimento: primi 2 trim rendimento dimezzato." |
| OP-07 | **+Flessibilità, −Resa, −OEE disp.** | "Basso: 1 cambio/set, resa 98%. Medio: 2 camb, resa 95%. Alto: 4 camb, resa 90%. Serve per servire mix canali Commercial." |

---

## 3. KPI Operativi (Dashboard giocatore)

| KPI | Formula / Fonte | Target "sano" | Uso decisionale |
|---|---|---|---|
| **Saturazione impianti** | Produzione effettiva / Capacità teorica (turni+straord) | 85–95% | <80% = spreco capex; >95% = rischio colli bottiglia, guasti, lead time ↑ |
| **OEE (Overall Equipment Effectiveness)** | Disponibilità × Prestazione × Qualità | >75% (World Class >85%) | Decomponibile: disp. (guasti/setup), perf. (velocità), qual. (ppm). Guida OP-04, OP-06, OP-07. |
| **Costo unitario totale** | (Costo variabile + Costo fisso ripartito + Straordinari + Qualità) / Unità buone | < RefCost × 0.9 | Driver prezzo (Commerciale) e margine (Finance). |
| **PPM difettosi (processo)** | Difetti interni + Difetti campo / Unità prodotte × 1M | ≤ Target OP-05 | Input qualità percepita (Marketing/R&D), costi garanzia (Finance). |
| **Lead time produttivo (giorni)** | WIP / Throughput medio (Little's Law) | < 10 gg | Aumenta con saturazione >90% e cambi serie (OP-07). Impatta service level (Supply Chain). |
| **Costo manutenzione / Valore impianti** | (Pianificata + Imprevista) / Capex residuo | 2–4% / anno | Segnala sotto/sovra-manutenzione. |
| **Capacità netta disponibile** | Cap teorica × (1 − % manutenzione) × (1 − % guasti) × OEE | — | Vincolo duro per Commercial (promesse consegna). |

---

## 4. Dinamiche Realistiche / Non-Linearità (Motore)

| Dinamica | Regola sintetica | Parametri chiave (tunabili) |
|---|---|---|
| **Rendimenti decrescenti straordinari** | Capacità extra = min(richiesta, 50% cap base) × (1 − 0.005 × %straord²) | Coeff. decrescita 0.005 |
| **Colli di bottiglia (TOC)** | Se una risorsa (es. reparto verniciatura) satura >90%, tutta la linea rallenta: throughput = min(capacità risorse) | Definire 1–2 risorse critiche per prodotto |
| **Curva apprendimento automazione** | Risparmio unitario trim *t* = investimento_cumulato × 0.005 × (1 − 0.5^t) | Max −20% costo; half-life 2 trim |
| **Trade-off qualità/velocità** | Se OEE prestazione >95% → ppm ×1.2 per ogni +1% prestazione | Penalità qualità per spinta velocità |
| **Guasti stocastici (Weibull)** | Prob. guasto/trim = base × (1 − %manutenzione)^1.5 × (1 + %straord/100) × età_impianto^1.2 | Base 5%/trim; età in anni |
| **Setup time / Mix** | Capacità netta = cap_teorica × (1 − %setup) ; %setup = 0.02 × cambi_settimana | 1 cambio = 2%, 4 cambi = 8% |
| **Effetto morale → qualità/guasti** | Morale < 50 → ppm ×1.5, prob. guasto ×1.3 | Morale gestito da HR, input qui |

---

## 5. Interazioni con Altri Domini (Cross-domain)

| Dominio | Interazione | Meccanica / Vincolo |
|---|---|---|
| **HR** | Organico minimo per turno/stabilimento | 1T: 20 add/imp; 2T: 35; 3T: 45. Se organico < min → capacità × (organico/min). Straordinari → affaticamento → morale HR. |
| **HR** | Formazione → efficienza / qualità | Ore formazione/trim → +0.2% OEE prestazione, −5 ppm (lag 1 trim). Costo HR. |
| **Supply Chain** | Materiali / Scorte → fermi linea | Se scorta critica < lead time fornitore → fermo produzione (capacità 0 quel giorno). KPI: *Stockout days*. |
| **Supply Chain** | Logistica inbound/outbound | Costo unitario logistica incluso in *unitCost*. Service level consegna clienti = f(lead time prod + logistica). |
| **Commerciale** | Promesse consegna / Mix | Commercial alloca volumi per canale → richiede mix flessibilità (OP-07). Se lead time > soglia → penalità vendite. |
| **Commerciale** | Resi / Garanzia | PPM campo (da OP-05) → % resi → costo Commercial (gestione) + costo Finance (rimborso) + brand Marketing. |
| **Marketing/R&D** | Qualità percepita | Qualità processo (ppm) → qualità percepita con lag 1–2 trim: *perceived_quality = max(0, 100 − ppm/100)* + bonus R&D. |
| **Finance** | Capex / Ammortamento / Cassa | OP-01, OP-06 = capex. Ammortamento lineare 10 anni → costo fisso/trim. Cash flow: capex esce subito, benefici diluiti. |
| **Finance** | Capitale circolante | WIP + Scorte finite + Crediti clienti (da Commercial) = capitale immobilizzato. KPI Finance: *Operating Cycle*. |
| **Controlling** | What-if / Budget | Controlling espone *standard cost* (baseline) vs *actual cost* (da Operations). Varianze: volume, mix, efficienza, prezzo materiali. |

---

## 6. Imprevisti / Eventi Tipici (Event Deck Operations)

| Evento | Trigger / Probabilità | Effetto immediato | Durata | Contromisure giocatore |
|---|---|---|---|---|
| **Guasto macchina critico** | Base 5%/trim × fattori (età, straord, manutenzione) | −30–50% capacità 1 stabilimento casuale | 1 trim (riparazione) | Manutenzione pianificata (OP-04), automazione (OP-06 riduce età effettiva) |
| **Difetto qualità sistemico** | Se ppm target > 500 E morale < 60 | Richiamo prodotto: −15% vendite trim, costo = 2× unitCost × unità vendute ultime 2 trim | 1 trim + strascico brand −10 pts | Target ppm basso (OP-05), formazione HR |
| **Sciopero / Assenteismo picco** | Morale < 40 OR straord > 30% per 2+ trim | −20% capacità tutti stabilimenti | 1 trim | Turni sostenibili, straord moderati, HR welfare |
| **Rottura fornitore critico** | Evento esterno (Supply Chain) | Fermo linea 5–15 gg se scorta < 2 sett | Variabile | Scorta sicurezza (Supply Chain), dual sourcing |
| **Nuova normativa sicurezza/ambiente** | Evento macro (1–2%/partita) | Capex obbligatorio 5–10% valore impianti / trim per 2 trim | 2 trim | Automazione (OP-06) può includere compliance |
| **Picco domanda imprevisto** | Evento mercato (Marketing/Commerciale) | Domanda +30–50% 1 trim | 1 trim | Straordinari (OP-03), flessibilità mix (OP-07), scorte (SC) |
| **Incidente sicurezza sul lavoro** | Se straord > 40% O morale < 30 | Fermo 1 stabilimento 1 trim, multa, morale −20 | 1 trim + indagine | Limiti straord, investimenti sicurezza (capex OP-06) |

> **Nota:** Eventi *positivi* (es. "Innovazione processo fortuita: −5% costo unitario gratis") bilanciano il mazzo. Probabilità regolata da setting host "Livello eventi".

---

## 7. Parametri Base (Tunabili per Bilanciamento)

| Parametro | Valore default | Range test |
|---|---|---|
| Plant capacity base | 3.000 u/trim | 2.000–5.000 |
| Plant fixed cost/trim | 30.000 € | 20k–50k |
| Plant capex | 250.000 € | 150k–400k |
| Turno 2 maggiorazione costo | 1.15 | 1.10–1.25 |
| Turno 3 maggiorazione costo | 1.35 | 1.25–1.50 |
| Straord max % cap | 50% | 30–80% |
| Straord unit cost mult | 1.40 | 1.30–1.60 |
| Straord morale penalty | 0.2 pts/% | 0.1–0.3 |
| Manutenzione efficacia (guasti) | −15% prob per 1% ore | 10–20% |
| Qualità prevenzione costo/ppm | Curva iperbolica | Tuning per prodotto |
| Automazione max risparmio | 20% unit cost | 15–30% |
| Automazione half-life | 2 trim | 1–4 |
| Setup % per cambio/settimana | 2% | 1–3% |
| Guasto base prob/trim | 5% | 3–8% |
| Età impianto esponente Weibull | 1.2 | 1.0–1.5 |

---

## 8. Note per Game Designer / PM (Decisioni aperte)

1. **Granularità stabilimenti**: 1 tipo generico vs tipologie per prodotto (es. lavatrice vs TV)? *Proposta: 1 tipo v0.2, specializzazione v1.0.*
2. **Vendita stabilimenti**: recupero 50% capex residuo è troppo generoso/penalizzante?

---

### Commerciale / Vendite

# Requisiti Dominio **Commerciale / Vendite** — Iterazione 2

> Raffinamento ed estensione dei requisiti CH-01÷CH-06 + MK-01÷MK-06.  
> Obiettivo: leve **giocabili**, **effetto singolo chiaro per icona**, **KPI misurabili**, **interazioni esplicite**, **imprevisti realistici**.

---

## 1. Leve Decisionali (Decision Levers)

| ID | Leva | Descrizione breve | Parametri giocatore | Effetto Singolo (Icona / Tooltip) |
|---|---|---|---|---|
| **CH-01** | **Mix Canali Distributivi** | % volumi allocati a: *Direct/Proprietario*, *Retail Partner*, *Online Marketplace*, *B2B/Key Account* | 4 slider (somma = 100%) | **Reach ↑ / Margine Medio ↓** — più retail/online = più clienti, meno €/unità |
| **CH-02** | **Rete Punti Vendita Propri** | Numero negozi *aperti/gestiti direttamente* (capex + opex) | Intero ≥ 0 (max = f(capitale)) | **Controllo ↑ / Costo Fisso ↑** — brand experience diretta, break-even alto |
| **CH-03** | **Accordi Key Retailer** | Numero *catene/retailer strategici* sotto contratto (esclusiva/volume) | Intero 0–5 (per segmento) | **Visibilità ↑ / Margine ↓ / Rischio Concentrazione ↑** — volumi garantiti, potere contrattuale retailer |
| **CH-04** | **Forza Vendita (Headcount)** | Numero *account manager / venditori* attivi (territorio + key account) | Intero ≥ 0 | **Conversione ↑ / Costo Personale ↑** — più contatti → più ordini chiusi |
| **CH-05** | **Schema Incentivi Vendita** | Mix *fisso / variabile (commissioni / bonus volume / bonus margine)* | % variabile 0–100%; tipo bonus: *volume* / *margine* / *misto* | **Spinta Comportamentale ↑ / Costo Variabile ↑** — allinea focus venditori (volume vs margine) |
| **CH-06** | **Livello Servizio Key Account** | Ore/mese dedicate + SLA (consegna, resi, co-marketing) per top 5–10 clienti | Livello: *Base / Standard / Premium* | **Retention ↑ / Costo Servizio ↑** — riduce churn grandi clienti, costa risorse |
| **CH-07** | **Prezzo di Listino (per canale)** | Prezzo base a cui ogni canale compra/applica markup | €/unità per canale (4 valori) | **Margine Unitario ↑ / Volume Canale ↓** — elasticità diversa per canale |
| **CH-08** | **Politica Sconti / Promozioni** | % sconto max autorizzato, soglie volume, fondi promozionali retailer | % max sconto; €/unità fondo promo | **Volume Breve ↑ / Margine Medio ↓ / Rischio Cannibalizzazione ↑** |
| **CH-09** | **Onboarding / Formazione Vendita** | Ore trimestrali formazione prodotto/tecniche/strumenti | Ore/addetto/trim (0–20) | **Effettività Venditore ↑ (ritardato 1T) / Costo Formazione ↑** |
| **CH-10** | **CRM / Strumenti Digitali** | Investimento tool (CRM, CPQ, lead scoring, portal B2B) | Livello: *Nessuno / Base / Avanzato / AI-driven* | **Produttività Vendita ↑ / Costo Fisso IT ↑ / Data Quality ↑** |

> **Nota:** CH-07 e CH-08 separano *prezzo listino* da *sconto reale* → il **prezzo netto** per canale = listino × (1 − sconto medio).  
> CH-09 e CH-10 sono leve *abilitanti* (effetto ritardato, cumulativo).

---

## 2. KPI Commerciali (Dashboard Giocatore)

| KPI | Formula / Definizione | Frequenza | Perché conta |
|---|---|---|---|
| **Quota di Mercato (Volume)** | Vendite giocatore / Domanda totale mercato | Trimestrale | Posizione competitiva |
| **Quota di Mercato (Valore)** | Ricavi giocatore / Ricavi totali mercato | Trimestrale | Potere di prezzo |
| **Tasso Conversione Lead→Ordine** | Ordini chiusi / Lead qualificati (per canale) | Trimestrale | Efficacia forza vendita |
| **ARPU / Prezzo Medio Netto** | Ricavi netti / Unità vendute | Trimestrale | Realizzazione prezzo |
| **Churn Rate Clienti Top 20** | Clienti top persi / Clienti top inizio periodo | Trimestrale | Salute key account |
| **Sell-through Retailer** | Vendite sell-out retailer / Stock consegnato | Trimestrale | Salute canale indiretto |
| **CAC (Customer Acquisition Cost)** | Costi commerciali (persone+marketing vendita) / Nuovi clienti | Trimestrale | Efficienza acquisizione |
| **CLV stimato** | Margine medio × vita media cliente × frequenza | Annuale (stima) | Valore lungo termine |
| **Concentrazione Ricavi Top 5** | % ricavi da top 5 clienti | Trimestrale | Rischio concentrazione |
| **Copertura Canale** | % potenziale mercato servito per canale | Trimestrale | Gap reach |

---

## 3. Interazioni con Altri Domini (Cross-Domain)

| Leva Commerciale | Dominio Impattato | Tipo Interazione | Regola / Effetto |
|---|---|---|---|
| **CH-01 Mix Canali** | **Operations** | Domanda per canale → piano produzione | Mix canali determina *profilo ordini* (lotti piccoli online, grandi B2B) → impatta setup/OEE |
| **CH-02 Punti Vendita Propri** | **Finance** | Capex + Opex fissi | Investimento iniziale €250k/negozio + €40k/trim opex; ammortamento 10 anni |
| **CH-03 Key Retailer** | **Supply Chain** | SLA consegna, penalità stock-out | Retailer richiede *fill-rate ≥ 98%*; mancato → penale 2% fatturato + rischio perdita contratto |
| **CH-04 Forza Vendita** | **HR** | Assunzioni, turnover, formazione | Headcount vendita = subset organico HR; turnover 15%/anno se incentivi bassi |
| **CH-05 Incentivi** | **Finance** | Costo variabile su vendite | Commissione % su *margine* o *fatturato*; impatta cassa al pagamento (lag 1 mese) |
| **CH-06 Servizio KA** | **Operations / Supply Chain** | Risorse dedicate (logistica, qualità) | Livello Premium richiede *slot produzione riservati* + *quality gate* dedicato |
| **CH-07 Prezzo Listino** | **Marketing** | Coerenza posizionamento | Se MK-03 = *Premium* e prezzo < refPrice −15% → penalità awareness −10% |
| **CH-08 Sconti/Promo** | **Marketing** | Cannibalizzazione campagne | Promo commerciale + campagna MK-06 sovrapposte → saturazione: efficacia −30% ciascuna |
| **CH-09 Formazione** | **HR** | Budget formazione condiviso | Ore formazione vendita contano su monte ore HR; sinergia se allineate a skill gap |
| **CH-10 CRM/Tool** | **IT / Amministrazione** | Capex software, integrazione dati | Livello *AI-driven* richiede *Data Lake* (costo IT) → abilita *lead scoring* (+15% conversione) |

---

## 4. Imprevisti / Eventi Tipici (Solo Commerciale)

| Evento | Trigger / Probabilità | Effetto Immediato | Opzioni Giocatore (Risposta) |
|---|---|---|---|
| **Perdita Key Account** | Casuale (2%/trim per KA) + se *Servizio KA < Standard* o *Fill-rate < 95%* | −15–25% ricavi; −1 canale B2B | (A) Riallocare volumi ad altri canali (B) Sconto aggressivo per recupero (C) Accettare perdita |
| **Guerra Prezzo Concorrente** | Se *Quota Mercato > 30%* + concorrente aggressivo (evento globale) | Elasticità prezzo effettiva ×1.5 per 2 trimestri | (A) Abbassare listino (B) Aumentare promo (C) Differenziare servizio (costo) |
| **Nuovo Entrante Online** | Evento globale (prob. 10%/anno) | −5% reach canale Online; −3% margine online | (A) Investire CH-10 CRM/Marketplace (B) Lanciare D2C (C) Alleanza retailer |
| **Scandalo Qualità Prodotto** | Se *Qualità Processo (OP-05) > 500 ppm* | −20% conversione tutti canali; −15% awareness | (A) Richiamo + costo (B) Campagna riparazione MK (C) Sconto profondo temporaneo |
| **Cambio Normativa Canale** | Evento globale (es. legge e-commerce, franchising) | Costo compliance +5% canale interessato; vincolo prezzo | (A) Adeguare processi (capex) (B) Ridurre presenza canale (C) Lobby (costo fisso) |
| **Boom Domanda Stagionale Imprevista** | Evento globale (meteo, trend social) | Domanda +30% per 1 trimestre; stock-out rischio | (A) Straordinari OP-03 (B) Allocare scorta SC (C) Rationing clienti (churn rischio) |
| **Talento Vendita Lascia Azienda** | Se *Incentivi CH-05 < mercato* o *Formazione CH-09 = 0* | −1 venditore top; −10% conversione canale assegnato | (A) Assunzione urgente (costo +50%) (B) Riassegnare portafoglio (C) Incentivare rimanenti |
| **Retailer Richiede Esclusiva** | Se *CH-03 ≥ 3* e *Sell-through > 85%* | Margine canale −8%; volume garantito +20% | (A) Accettare (B) Contropartita co-marketing (C) Rifiutare → rischio perdita contratto |

---

## 5. Dinamiche Sottostanti (per Game Designer / Motore)

### 5.1 Elasticità per Canale (base per simulazione domanda)
| Canale | Elasticità Prezzo Base | Sensibilità Servizio | Sensibilità Brand |
|---|---|---|---|
| Direct / Proprietary | −1.2 | Alta | Alta |
| Retail Partner | −1.8 | Media | Media |
| Online Marketplace | −2.5 | Bassa (logistica) | Bassa |
| B2B / Key Account | −0.8 | Molto Alta | Media |

> *Modificatori:* MK-03 (Posizionamento) e CH-06 (Servizio KA) spostano queste elasticità ±0.3.

### 5.2 Cannibalizzazione tra Canali
- Se *Direct* e *Retail* servono stesso bacino → **cannibalizzazione = 15–30%** del volume Direct sottratto a Retail (e viceversa).
- Mitigazione: **differenziazione assortimento/prezzo** (CH-07 per canale) o **esclusiva territoriale** (CH-03).

### 5.3 Curva Apprendimento Forza Vendita
- Nuovo assunto: produttività 50% → 100% in **3 trimestri** (accelerata da CH-09 Formazione).
- Turnover: **15%/anno base** − 0,5% per % variabile incentivi − 0,2% per ora formazione/trim.

### 5.4 Effetto Rete Punti Vendita (CH-02)
- Primo negozio: reach +5% mercato locale, costo fisso €40k/trim.
- Negozio *n-esimo*: reach marginale decresce (−10% per negozio), ma **brand awareness** cumulativa +0,5%/negozio (ritardato 2 trimestri).

---

## 6. Note di Bilanciamento / Playtesting

1. **CH-01 Mix Canali** è la leva *strategica* principale: cambia struttura costi/ricavi. Deve essere **visibile nel tab Simulazione** (break-even per canale).
2. **CH-03 Key Retailer** crea *trade-off esplicito*: volumi sicuri vs margine + rischio. Testare che la perdita di 1 KA sia **dolorosa ma non fatale** se diversificato.
3. **CH-05 Incentivi** deve far *sentire* la differenza tra spingere *volume* vs *margine*: KPI conversione vs ARPU.
4. **CH-08 Sconti** + **MK-06 Promo** sovrapposte → **saturazione**: comunicare chiaramente in UI (icona ⚠️ "Cannibalizzazione promo").
5. **Imprevisti** non devono essere solo negativi: aggiungere **eventi positivi** (es. *Retailer chiede espansione*, *Viral social → +30% online organic*).

---

## 7. Requisiti UI/UX (per Game Designer)

| Elemento | Requisito |
|---|---|
| **Tab Canali** | Matrice 4×4: Canale × (Volume %, Prezzo Netto, Margine %, Reach %) — modificabile in-line |
| **Tab Forza Vendita** | Slider headcount + selector incentivi + grafico *produttività per addetto* (trend 4 trim) |
| **Tab Key Account** | Lista top 10 clienti: % ricavi, churn risk (verde/giallo/rosso), livello servizio, azione rapida |
| **Simulazione Prezzo** | Curva domanda/offerta per canale con *punto break-even* e *profitto atteso* aggiornati real-time |
| **Alert Concentrazione** | Banner rosso se *Top 5 clienti > 50% ricavi* o *1 canale > 70% volumi* |
| **Log Eventi Commercial

---

### Marketing

# Requisiti Dominio Marketing — Business Game

## 1. Leve Decisionali (con Effetto Singolo per Icona/Tooltip)

| ID | Leva | Effetto Singolo (Icona) | Descrizione Estesa |
|----|------|-------------------------|-------------------|
| **MK-01** | **Budget Awareness** (brand building) | 📈 **+Awareness futura (ritardo 1-3T), −Cassa ora** | Investimento in brand equity: TV, OOH, sponsorship, PR. Effetto **cumulativo e ritardato** (curva a S). Rendimenti decrescenti oltre soglia di saturazione per canale. Alimenta "brand equity" che riduce elasticità prezzo e CAC futuri. |
| **MK-02** | **Budget Performance** (direct response) | ⚡ **+Domanda immediata, saturazione rapida** | Search, social paid, affiliate, retargeting. Conversione veloce (stesso trimestre), ma **saturazione esponenziale**: CPL sale, ROAS cala. Non costruisce brand equity. Ideale per picchi stagionali / lancio. |
| **MK-03** | **Posizionamento Prezzo/Qualità** | 🎯 **Allinea target; disallineamento → penalità domanda** | Scelta strategica: *Economy / Mainstream / Premium / Luxury*. Modifica **elasticità prezzo effettiva** e **segmenti raggiungibili**. Se prezzo di listino (Commerciale) incoerente → penalità −15/30% domanda + erosione brand equity. |
| **MK-04** | **Segmentazione & Targeting** | 🔍 **Focus → efficienza sui segmenti scelti, −reach altri** | Alloca % budget su 3-5 segmenti (es. Famiglie, Young Urban, Senior, B2B, Export). **Concentrazione** = CAC↓, conversione↑ sui target; **esclusione** = zero domanda segmenti non coperti. Richiede dati (ricerche) per sbloccare segmenti "nascosti". |
| **MK-05** | **Mix Canali Marketing** | 📊 **Ogni canale: reach, costo/contatto, saturazione, fit segmento** | Matrice canali condivisa con Commerciale: *TV, Digital, Social, Influencer, Retail Media, Events, PR, Email/CRM*. Ogni canale ha: **curva risposta** (Hill), **decadimento memoria**, **affinità segmenti**. Budget allocato → GRP/impression → awareness/consideration per segmento. |
| **MK-06** | **Campagna Promozionale Tattica** | 🏷️ **+Volume breve, −Margine unitario, −Brand equity se abusata** | Sconti, bundle, loyalty points, limited edition. Durata 1 trimestre. **Effetto pull** immediato su domanda (moltiplicatore 1.1-1.5x). Costo: margine ridotto + **brand equity -2% per promo consecutiva** (percezione "scontista"). |
| **MK-07** | **Ricerca Mercato / Consumer Insight** | 🔬 **Sblocca segmenti nascosti, affina elasticità, −Cassa** | Spend fissa/trimestre per: *sizing segmenti, price sensitivity per segmento, concept test, brand tracker*. Output: **precisione previsioni ↑**, **targeting efficiente**, **early warning trend**. Senza ricerca: segmenti "unknown" = targeting cieco. |
| **MK-08** | **CRM & Retention Program** | ♻️ **CLV ↑, CAC ↓ nel tempo, −Cassa ricorrente** | Loyalty tier, email automation, win-back, referral. Richiede base clienti minima. Effetto **cumulativo**: retention rate +0.5-2%/T, frequenza acquisto ↑. Costo fisso + variabile per cliente attivo. |
| **MK-09** | **Product Marketing / Launch Support** | 🚀 **Accelera adozione nuovo prodotto, −Time-to-revenue** | Budget dedicato al lancio (teaser, demo, seed, press kit). Moltiplica **awareness iniziale** nuovo SKU (x2-3 vs organico). Sinergia obbligatoria con R&D (product ready) e Commerciale (trade load-in). |

---

## 2. KPI di Marketing (Dashboard Giocatore)

| KPI | Formula / Logica | Frequenza | Uso Decisionale |
|-----|------------------|-----------|-----------------|
| **Brand Equity Index** (0-100) | Media ponderata: Awareness (30%), Consideration (25%), Preference (25%), Loyalty (20%) | Trimestrale | Driver elastictà prezzo, CAC, premium price acceptance |
| **Awareness Totale / per Segmento** | Stock variabile: `Aw_t = Aw_t-1 × (1-decay) + Σ(GRP_c × reach_c × affinità_s)` | Trimestrale | Input domanda potenziale |
| **CAC Blended** | `Totale Spesa Marketing (Aw+Perf+Promo+CRM) / Nuovi Clienti Acquisiti` | Trimestrale | Efficienza acquisizione; target < CLV/3 |
| **CAC per Canale / per Segmento** | Breakdown per allocazione budget | Trimestrale | Ottimizzazione mix |
| **ROAS Performance** | `Ricavi attribuiti Performance / Spesa Performance` | Trimestrale | Soglia stop/continue (es. ROAS < 1.5 → taglia) |
| **Share of Voice (SoV)** | `GRP Propri / Σ GRP Competitor` per canale | Trimestrale | Difesa posizione; SoV > SoM → crescita quota |
| **Marketing Contribution Margin** | `Margine Lordo generato da domanda marketing - Spesa Marketing` | Trimestrale | Accountability finanziaria |
| **NPS / Brand Sentiment** | Derivato da Brand Equity + eventi + quality gap | Trimestrale | Early warning crisi |
| **Pipeline Domanda Futura** | `Awareness × Consideration × Intent × Conversione attesa` | Trimestrale | Input Demand Planner |

---

## 3. Dinamiche Realistiche (Motore)

### 3.1 Brand Equity — Stock & Flow
```
BrandEquity_t = BrandEquity_t-1 × (1 - δ) 
              + α₁ × AwarenessInvestment_t-1 
              + α₂ × QualityGap_t-1          // R&D/Operations
              + α₃ × NPS_t-1
              - β × PromoAbuse_t
              + ε_shock                      // Eventi esterni
```
- **δ (decadimento naturale)**: 3-5%/trimestre se zero investimenti awareness
- **Ritardo**: Awareness investment → BrandEquity con lag 1-3T (curva distribuita)
- **Soglia critica**: BrandEquity < 30 → "commodity trap" (elasticità prezzo ×1.5, CAC ×2)

### 3.2 Curva Risposta Canale (Hill / S-shape)
```
Risposta_c = MaxEffect_c × (Spend_c^γ) / (EC50_c^γ + Spend_c^γ)
```
- **γ (pendenza)**: 0.8-1.2 per canale
- **EC50**: spesa per 50% effetto max (diversa per canale/segmento)
- **Saturazione**: oltre 80% MaxEffect → ROI crolla

### 3.3 Domanda Generata per Segmento
```
Domanda_s = DimensioneMercato_s × Awareness_s × Consideration_s × Preference_s × Availability_s
```
- **Availability_s** = f(Commerciale: canali, stock, prezzo)
- **Preference_s** = f(BrandEquity, Posizionamento fit, QualityPerceived, PriceIndex)

### 3.4 Sinergie Cross-Funzionali
| Sinergia | Meccanica |
|----------|-----------|
| **MK ↔ R&D** | QualityPerceived (R&D) → α₂ in BrandEquity; Launch support (MK) → adozione R&D |
| **MK ↔ Commerciale** | Awareness → lead inbound; Trade promo (Com) + Consumer promo (MK) = moltiplicatore 1.3x se allineati |
| **MK ↔ Operations** | Stock-out → Promise breach → NPS↓, BrandEquity↓; Quality ppm → QualityPerceived |
| **MK ↔ Finance** | Budget cap = % fatturato o cassa minima; Capex brand (sponsorship pluriennale) vs Opex |
| **MK ↔ HR** | Employer branding (budget awareness %) → costo assunzione ↓, quality candidati ↑ |

---

## 4. Interazioni con Altri Reparti (Interfacce)

| Reparto | Input da Marketing | Output verso Marketing | Regole di Coerenza (Vincoli) |
|---------|-------------------|------------------------|------------------------------|
| **Commerciale** | Awareness/lead per canale, materiali promo, calendar lanci | Prezzo listino, allocazione volumi canali, sell-out data, feedback field | **Vincolo coerenza**: Posizionamento MK vs Prezzo Comm → se Δ > 20% → penalità domanda |
| **R&D** | Insight segmenti, concept test, requisiti launch | Product specs, quality perceived, pipeline lanci, time-to-market | **Launch readiness**: MK-09 attivabile solo se R&D "Launch Ready = true" |
| **Operations** | Forecast domanda per SKU/canale (da Demand Planner) | Capacità disponibile, stock, ppm qualità, lead time | **Stock-out penalty**: se fill-rate < 90% → BrandEquity -1%/T |
| **Finance** | Budget request (Aw/Perf/CRM/Research), ROI atteso | Cash available, budget approved, capex/opex split, WACC | **Cash guardrail**: se cassa < 3T overhead → auto-taglio Awareness -50% |
| **HR** | Employer branding budget %, employer value prop | Organico marketing, skill gap, costo formazione | **Skill constraint**: canali avanzati (es. Retail Media, Marketing Mix Modeling) richiedono skill specifiche |
| **Supply Chain** | Promo calendar, launch volumes | Fill rate, OTIF, costo logistica promo | **Promo ops**: volumi promo → picco domanda → serve capacity buffer |

---

## 5. Imprevisti / Eventi Tipici (Marketing-Specifici)

| Evento | Trigger | Impatto | Durata | Opzioni Giocatore |
|--------|---------|---------|--------|-------------------|
| **Campagna Virale Organica** | Random (p=3%/T) + BrandEquity>60 | Awareness +15% gratis, SoV +10% | 1T | Amplificare (budget performance) / Lasciare correre |
| **Crisi Reputazionale** | Random (p=2%/T) + se QualityGap>soglia o PromoAbuse>3T | BrandEquity -20%, NPS -30%, Domanda -25% | 2-4T | Crisis budget (extra awareness), price protection, quality fix |
| **Trend di Mercato Improvviso** | Random (p=5%/T) | Segmento "Emergente" +50% size, nuovi bisogni | 2-6T | Ricerca rapida (MK-07), redirect budget, launch SKU (R&D) |
| **Concorrente Aggressivo** | Se competitor spesa Aw > 2× media | SoV -15%, CAC +20%, elasticità prezzo +0.3 | 1-3T | Contro-spesa, differenziazione, promo difensiva |
| **Cambiamento Algoritmo Digital** | Random (p=4%/T) | Performance canali digital: CPL ±30%, reach ±25% | 1-2T | Rialloca mix canali, test nuovi formati |
| **Influencer Scandalo** | Se budget Influencer > soglia | BrandEquity -10%, Awareness -5% (negativa) | 1T | Taglia canale, crisis PR, shift budget |
| **Stagionalità Anomala** | Meteo/Eventi macro | Domanda segmenti specifici ±40% | 1T | Promo tattica (MK-06), riallocazione performance |
| **Nuovo Regolamento Adv** | Random (p=1%/T) | Canale limitato (es. no targeting minori, no cookie) | Permanente | Adattamento mix, first-party data (CRM) |

---

## 6. Parametri di Configurazione Partita (Host Settings)

| Parametro | Default | Range | Impatto Gameplay |
|-----------|---------|-------|------------------|
| **Budget Marketing Iniziale** | €200k | €50k-€1M | Velocità costruzione brand |
| **Decadimento Brand Equity (δ)** | 4%/T | 2-8%/T | Pressione reinvestimento |
| **Ritardo Awareness→Brand** | 2T | 1-4T | Orizzonte pianificazione |
| **Saturazione Media** | Media | Bassa/Alta | Spazio per spesa vs ROI |
| **Intensità Eventi Esterni** | Media | Nessuna/Alta | Volatilità domanda |
| **Numero Segmenti Attivi** | 3 | 2-5 | Complessità targeting |
| **Costo Ricerca Mercato** | €25k/T | €10-100k | Barriera informazione |

---

## 7. Note di Implementazione (per Game Designer / Engine)

1. **Stato persistente Marketing**: `BrandEquity`, `Awareness_per_segmento`, `Consideration_per_segmento`, `CRM_base`, `Promo_consecutive_count`, `Research_unlocked_segments[]`
2. **Ordine calcolo turno**: 
   - Input: Budget allocation, Posizionamento, Targeting, Promo flag
   - Calcolo GRP/Impression per canale → Awareness/Consideration per segmento
   - Aggiornamento BrandEquity (stock)
   - Calcolo Domanda potenziale per segmento → passa a Commerciale/Demand Planner
   - Applicazione eventi marketing
   - Output KPI
3. **Interfaccia Demand Planner**: Marketing fornisce `Domanda_Potenziale_Segmento` + `Confidence_Interval` (basato su ricerca fatta)
4. **Modalità Deterministica (v0.1)**: Eventi disattivati, curve risposta fisse, no LLM. Parametri esposti per bilanciamento.
5. **Estensione LLM (futuro)**: Consumer segments come agenti LLM che valutano `Price, Quality, Brand, Promo, Context` → scelta d'acquisto probabilistica.

---

## 8. Sintesi Leve per Icone UI (Tooltip "Una riga")

| Leva | Tooltip Icona |
|------|---------------|
| MK-01 Budget Awareness | **Costruisce brand nel medio termine: +domanda futura, -cassa ora, effetto ritardato 1-3 trimestri** |
| MK-02 Budget Performance | **Genera vendite subito: +domanda immediata, ma satura in fretta (ROAS cala). Non costruisce brand** |
| MK-03 Posizionamento | **Scegli chi sei (Economy→Luxury): allinea prezzo e target. Se incoerente → -domanda, -brand** |
| MK

---

### HR / Risorse Umane

# Requisiti Dominio HR — Business Game

> **Obiettivo:** Fornire al Game Designer + PM i requisiti completi del dominio HR (leve, effetto singolo per icona, KPI, interazioni, imprevisti).  
> **Principio:** Realismo giocabile — ogni leva ha **un effetto primario chiaro** (icona), la profondità nasce dalle **combinazioni** e dai **ritardi**.

---

## 1. Leve Decisionali HR — Tabella Maestra

| ID | Leva | Effetto Singolo (Icona / Tooltip) | Parametri decisionali (input giocatore) | Note implementative |
|---|---|---|---|---|
| **HR-01** | **Assunzioni / Licenziamenti** | **+Organico / −Organico  →  ±Costo fisso, ±Ramp-up** | `hires: number`, `layoffs: number` (per trimestre) | Ramp-up: neoassunti al 60% produttività Q1, 85% Q2, 100% Q3. Licenziamenti: costo una-tantum 3× mensilità + calo morale −15% residui. |
| **HR-02** | **Formazione / Upskilling** | **+Produttività futura  −Cassa ora  −Disponibilità** | `trainingHoursPerEmployee: 0–40`, `focus: "technical" \| "soft" \| "quality"` | Ore formazione = ore non produttive. Effetto: +1.5% produttività/trim per 10h/trim (technical), +0.8% qualità (quality), −5% turnover (soft). Decadimento −0.5%/trim se interrotta. |
| **HR-03** | **Turni (1 / 2 / 3)** | **+Capacità lineare  +Maggiorazione notturna  −Morale** | `shifts: 1 \| 2 \| 3` | 1 turno = base. 2 turni: +100% capacità, +15% costo/ora notturna, −5 morale. 3 turni: +200% capacità, +30% costo/ora notte/weekend, −12 morale, +8% assenteismo. Richiede organico minimo = capacità impianto × 1.2 × turni. |
| **HR-04** | **Straordinari (% capacità)** | **+Capacità flessibile  +Costo unitario ×1.4  −Morale** | `overtimePct: 0–40%` (su capacità standard) | Già in v0.1. Estensione HR: se `overtimePct > 20%` per 2+ trim consecutivi → burnout risk: +15% turnover, −10% produttività, +5% infortuni. |
| **HR-05** | **Salario Base + Incentivi** | **+Attrazione / Ritenzione  +Costo lavoro  +Spinta prestazione** | `baseSalaryIndex: 0.8–1.5` (vs mercato), `variablePct: 0–40%`, `kpiLinked: "volume" \| "quality" \| "margin"` | Salario base: indice 1.0 = mercato. <1.0 → turnover +20%/0.1 sotto. >1.0 → attrazione +15%/0.1 sopra. Variabile: se legata a volume → spinta produzione; se quality → −scarti; se margin → allineamento commerciale. Costo variabile pagato solo se target raggiunto. |
| **HR-06** | **Welfare / Clima / Engagement** | **+Engagement  −Turnover  −Assenteismo  +Costo fisso** | `welfareBudgetPerCapita: 0–5000€`, `initiatives: ["health","flex","canteen","trainingBudget","recognition"]` | Ogni 1000€/capita: engagement +3, turnover −2%, assenteismo −1%. Ritorni decrescenti oltre 3000€. Effetto visibile dopo 1 trim (clima), 2 trim (turnover). |
| **HR-07** | **Mix Competenze (Junior / Senior / Specialist)** | **+Flessibilità / Innovazione  +Costo medio  ±Curva apprendimento** | `mix: {juniorPct, seniorPct, specialistPct}` (somma 100%) | Junior: costo 0.7×, produttività 0.6×, apprendimento +3%/trim. Senior: costo 1.3×, produttività 1.2×, mentoring +1% produttività junior/trim. Specialist: costo 1.5×, abilitano qualità/innovazione, max 15% organico. |
| **HR-08** | **Employer Branding / Reclutamento Attivo** | **+Velocità assunzione  +Qualità candidati  +Costo reclutamento** | `recruitingIntensity: "low" \| "medium" \| "high"`, `channels: ["jobboard","headhunter","referral","university"]` | Low: 1 trim per assumere, qualità media. High: assunzione immediata, qualità +20%, costo 3×. Referral: −30% costo, +15% retention. University: solo junior, pipeline 2 trim. |

---

## 2. KPI HR (Dashboard Giocatore)

| KPI | Formula / Definizione | Target "sano" | Uso decisionale |
|---|---|---|---|
| **Produttività per addetto** | `unità prodotte / FTE effettivi` | > benchmark settore | Confronta con Operations OEE |
| **Costo del lavoro per unità** | `totale costo personale / unità vendute` | < 35% prezzo medio | Link a Controlling (break-even) |
| **Turnover rate** | `uscite volontarie / organico medio` | < 12%/anno (3%/trim) | Alto → costi reclutamento, perdita competenze |
| **Assenteismo** | `ore assenza / ore teoriche` | < 4% | Correlato a morale, straordinari, turni notturni |
| **Engagement / Morale** | Indice 0–100 (survey simulato) | > 70 | Driver produttività, qualità, innovazione |
| **Time-to-fill** | `giorni medi per coprire posizione` | < 45 gg | Dipende da Employer Branding, salario, mercato |
| **Costo assunzione** | `costo reclutamento + onboarding / assunzione` | < 5× stipendio mensile | Budget HR planning |
| **% Ore formazione** | `ore formazione / ore lavorate` | 3–5% | Leading indicator produttività futura |
| **Seniority Index** | `media anni esperienza ponderata` | 5–8 anni | Troppo basso = errori; troppo alto = rigidità/costo |
| **Infortuni / Safety Index** | `infortuni / 200k ore` | 0 | Spike se straordinari + turni notturni prolungati |

---

## 3. Interazioni con Altri Domini

| Dominio | Interazione | Meccanica / Vincolo |
|---|---|---|
| **Operations** | **Capacità reale = f(organico, turni, straordinari, competenze)** | `capacità_effettiva = impianti × capacità_base × turni × (1+overtime%) × produttività_media_HR`<br>Vincolo: `organico_minimo = capacità_impianto × 1.2 × turni` (se violato → −OEE, +infortuni) |
| **Operations** | **Qualità processo ← Formazione + Mix Seniority** | `ppm_difettosi = base_ppm × (1 − 0.015×ore_formazione_quality) × (1 − 0.1×senior_pct) × (1 + 0.2×overtime_pct)` |
| **Operations** | **Manutenzione ← Competenze tecniche** | Se `specialist_pct < 5%` o `formazione_technical < 10h/trim` → +30% guasti imprevisti |
| **Commerciale** | **Forza vendita = organico commerciale dedicato** | Leva `CH-04` (forza vendita n°) = subset organico HR con `specialist_pct` commerciale. Produttività vendita = f(formazione_soft, engagement, incentivi) |
| **Commerciale** | **Key Account / Servizio clienti ← Seniority + Formazione** | Retention clienti = f(senior_pct_commerciale, ore_formazione_soft, engagement) |
| **Marketing** | **Employer Branding ↔ Brand Awareness** | `recruitingIntensity: high` → +5% awareness (effetto halo). `MK-01 budget awareness` → −10% costo reclutamento (attrattività) |
| **Finance / Controlling** | **Costo del lavoro = voce principale P&L** | `costo_lavoro = organico × (base_salary × (1+variable_pct_raggiunto) + welfare + formazione_costo + straordinari + maggiorazioni_turni)`<br>Cash flow: salari pagati mese corrente, variabile trimestre successivo |
| **Finance** | **Capex assunzioni = onboarding + recruiting** | `capex_hr = assunzioni × (costo_reclutamento + 3×stipendio_mensile_onboarding)` |
| **R&D** | **Innovazione ← Specialist + Formazione tecnica** | `innovation_output = f(specialist_pct, ore_formazione_technical, engagement)` — alimenta pipeline R&D |
| **Supply Chain** | **Logistica / Magazzino ← Turni notturni + Organico** | Se 3 turni → serve organico logistica 24/7 (costo +30%). Straordinari produzione → straordinari logistica a cascata. |

---

## 4. Dinamiche Realistiche (Motore — non leve dirette)

| Dinamica | Descrizione | Parametri / Formule |
|---|---|---|
| **Curva di apprendimento (Ramp-up)** | Neoassunti: produttività 60% Q1, 85% Q2, 100% Q3. Accelerata da: senior mentoring (+5%/trim), formazione (+3%/trim per 10h). | `produttività_t = min(1.0, 0.6 + 0.25×t + 0.05×senior_pct + 0.03×training_hours/10)` |
| **Effetto morale su produttività** | Morale 0–100. Produttività × (0.85 + 0.15 × morale/100). Morale < 40 → rischio sciopero. | `morale_t = morale_t-1 + Δwelfare + Δsalary_index − 5×overtime_pct − 3×night_shifts − 10×layoffs_pct + 2×training_soft` |
| **Turnover endogeno** | `turnover_base = 8%/anno`. Modificatori: salary_index (<1.0: +20%/0.1), morale (<60: +15%), overtime>20%: +15%, welfare: −2%/1000€, engagement: −0.3%/punto. | `turnover_effettivo = turnover_base × moltiplicatori` |
| **Assenteismo** | Base 3%. +1% per turno notturno, +0.5% per 10% overtime, −0.5% per 1000€ welfare, +2% se morale < 50. | |
| **Burnout (rischio cumulativo)** | Se `overtime_pct > 20%` AND `morale < 60` per 2+ trim → `burnout_risk = 15% × trimestri_consecutivi × 5%`. Se trigger: −10% produttività, +20% turnover, +5% infortuni per 2 trim. | |
| **Perdita competenze (knowledge drain)** | Turnover > 15%/anno → `competenza_media × (1 − 0.5 × (turnover−0.15))`. Recuperabile solo con formazione + assunzioni senior. | |
| **Mercato del lavoro esterno** | Disponibilità candidati = f(ciclo economico, settore, employer branding). In boom: time-to-fill ×1.5, salary_index richiesto +0.15. In recessione: ×0.7, −0.1. | Evento esterno (vedi §5) |

---

## 5. Imprevisti / Eventi HR (Tipici)

| Evento | Trigger / Probabilità | Effetto immediato | Effetto duraturo | Contromisure giocatore |
|---|---|---|---|---|
| **Dimissioni figura chiave** | 2%/trim per senior/specialist | −1 specialist/senior immediato, −5% produttività area, −10 morale team | Knowledge drain se non sostituito in 1 trim | Employer branding high, salary_index >1.1, succession plan (formazione interna) |
| **Sciopero / Astensione** | Morale < 40 per 2 trim OR licenziamenti >10% organico | Produzione 0 per 1–3 giorni (0.5–1.5% trim), −15% morale residui | Reputazione −5% (reclutamento), possibile accordo salariale forzato | Welfare, engagement, no licenziamenti massivi, salario ≥ mercato |
| **Difficoltà reperimento (Talent shortage)** | Evento macro "Boom economico" + basso employer branding | Time-to-fill ×2, salary_index richiesto +0.2, qualità candidati −20% | 2–4 trimestri | Employer branding preventivo, referral, university pipeline, salario competitivo |
| **Epidemia / Assenteismo di massa** | 1%/trim (stagionale inverno +5%) | Assenteismo +15% per 1 trim, produzione −10% | Nessuno se gestito | Welfare health, flessibilità, scorta sicurezza Operations |
| **Infortunio grave / Safety incident** | Probabilità = f(overtime, night_shifts, formazione_technical bassa) | Costo diretto 50–200k€, −20 morale, ispezione → fermo 1–5 gg | Premio assicurativo +30% 4 trim, reputazione −10% | Formazione safety, limitare overtime/notte, specialist HSE |
| **Richiesta sindacale / Contrattazione** | Turnover alto + morale basso + no welfare | Richiesta: +10% salario OR +2000€ welfare OR riduzione turni | Se rifiutato → sciopero probabile; se accettato → costo fisso permanente | Engagement preventivo, welfare, comunicazione |
| **Nuova regolamentazione lavoro** | Evento macro "Regolazione" (5%/anno) | Es: straordinari max 20%, ferie +5gg, salario minimo +8% | Costo

---

### Controlling

# Requisiti Controlling — Iterazione 1

> **Ruolo:** Curatore del cruscotto, garante della coerenza numerica, abilitatore del *Decision Support* (Demand Planner + Tab Simulazione).  
> **Obiettivo:** Rendere i numeri **leggibili, azionabili e spiegabili** — il giocatore deve capire *perché* ha vinto/perso.

---

## 1. Leve Decisionali (azioni che il giocatore compie nel dominio Controlling)

| ID | Leva | Descrizione operativa | **Effetto Singolo (icona/tooltip)** |
|----|------|----------------------|--------------------------------------|
| **CT-01** | **Allocazione Budget per Reparto** | Distribuisce il budget discrezionale trimestrale tra Operations, Commerciale, Marketing, HR, R&D, Supply Chain. | **Focus risorse → spinta reparto target, fame altrove** |
| **CT-02** | **Definizione Target KPI** | Imposta i target trimestrali per: Margine Contribuzione %, EBITDA %, Break-even volume, Costo/Unità, Service Level, Capex/Revenue. | **Target sfidanti → allineamento + rischio scostamenti** |
| **CT-03** | **Profondità Analisi Scostamenti** | Sceglie granularità: *Solo totale* / *Per reparto* / *Per canale* / *Per prodotto* / *Price-Volume-Mix*. | **Più dettaglio → diagnosi precisa, tempo decisione ↑** |
| **CT-04** | **Metodo di Costo (Standard vs Actual)** | *Standard*: costi predefiniti, varianze evidenziate. *Actual*: costi reali, varianze assorbite. | **Standard → controllo rigido; Actual → flessibilità, meno visibilità cause** |
| **CT-05** | **Frequenza Reporting** | *Giornaliera (trimestrale)* / *Settimanale (mensile simulato)* / *Solo fine partita*. | **Più frequente → correzione rapida, cognitive load ↑** |
| **CT-06** | **Soglie Allarme / Trigger Automatici** | Definisce soglie per: Cash < 3Q overhead, Margine < X%, Scostamento > Y%, Capex > Z% Revenue. | **Soglie strette → prevenzione crisi, falsi allarmi ↑** |
| **CT-07** | **Metodo Valutazione Investimenti** | Sceglie criterio per approvare Capex: *Payback < N trimestri* / *NPV > 0 (WACC definito)* / *IRR > Hurdle* / *Strategico (no calcolo)*. | **Rigoroso → disciplina capitale; Flessibile → opportunismo** |
| **CT-08** | **Politica Transfer Pricing (multi-prodotto/fase 2+)** | Prezzo interno tra reparti/prodotti: *Costo standard + mark-up* / *Market price* / *Negoziale*. | **Allinea incentivi interni; distorsioni se mal calibrato** |

---

## 2. KPI / Output — **Il Cruscotto Controlling (di proprietà di questo dominio)**

> Il Controlling **produce e certifica** questi numeri; gli altri reparti li *consumono*.

| Area | KPI | Formula / Logica | Frequenza | Note per UI |
|------|-----|------------------|-----------|-------------|
| **Redditività** | **Margine di Contribuzione Totale** | Ricavi − Costi Variabili (diretti + variabili distribuzione) | Trimestrale | KPI principale tab Simulazione |
| | **Margine di Contribuzione %** | Margine Contribuzione / Ricavi | Trimestrale | Target CT-02 |
| | **EBITDA** | Margine Contribuzione − Costi Fissi (overhead, stabilimenti, marketing awareness, HR fissi) | Trimestrale | Vincitore = EBITDA cumulato |
| | **EBITDA %** | EBITDA / Ricavi | Trimestrale | |
| | **ROIC (Return on Invested Capital)** | NOPAT / (Capitale Circolante Netto + Immobilizzazioni Nette) | Trimestrale (da Q3) | Per fase Finance avanzata |
| **Soglia** | **Break-even Volume** | Costi Fissi Totali / Margine Contribuzione Unitario | Trimestrale | Visibile in Tab Simulazione |
| | **Break-even Revenue** | Break-even Volume × Prezzo | Trimestrale | |
| | **Margin of Safety %** | (Vendite Previste − Break-even) / Vendite Previste | Trimestrale | Colore: verde >20%, giallo 5-20%, rosso <5% |
| **Scostamenti (Variance Analysis)** | **Scostamento Prezzo (Price Variance)** | (Prezzo Actual − Prezzo Budget) × Volume Actual | Trimestrale | Drill-down: per canale/prodotto |
| | **Scostamento Volume (Volume Variance)** | (Volume Actual − Volume Budget) × Margine Unitario Budget | Trimestrale | |
| | **Scostamento Mix (Mix Variance)** | Effetto cambio mix canali/prodotti su margine medio | Trimestrale | Solo se granularità CT-03 ≥ canale |
| | **Scostamento Costo Variabile Unitario** | (Costo Unit Actual − Costo Unit Budget) × Volume Actual | Trimestrale | Split: Materiali / Lavoro / Energia / Logistica |
| | **Scostamento Costi Fissi** | Costi Fissi Actual − Costi Fissi Budget | Trimestrale | Per reparto (Ops, MKT, HR, G&A) |
| **Efficienza Operativa** | **Costo Unitario Totale** | (Costi Variabili Totali + Costi Fissi Totali) / Unità Vendute | Trimestrale | Benchmark vs competitor (anonimo) |
| | **OEE (Overall Equipment Effectiveness)** | Disponibilità × Performance × Qualità | Trimestrale | Da Operations, certificato da CT |
| | **Capacità Saturazione %** | Unità Prodotte / Capacità Teorica (stabilimenti × turni × straordinari) | Trimestrale | |
| | **Costo Qualità (COQ)** = Prevenzione + Valutazione + Fallimento Interno + Fallimento Esterno | Trimestrale | Link a OP-05 |
| **Capitale & Cassa** | **Capitale Circolante Netto** | Scorte + Crediti Clienti − Debiti Fornitori | Trimestrale | Da Supply Chain + Commerciale |
| | **Cash Conversion Cycle (giorni)** | DIO + DSO − DPO | Trimestrale | Fase 2+ |
| | **Free Cash Flow** | EBITDA − Tasse − Capex − ΔCapitale Circolante | Trimestrale | Per Finance (rimborso debito, dividendi) |
| | **Capex / Revenue %** | Investimenti Trimestre / Ricavi Trimestre | Trimestrale | Target CT-02 |
| **Organizzazione** | **Costo Personale / Revenue %** | (Stipendi + Straordinari + Formazione + Benefit) / Ricavi | Trimestrale | Da HR |
| | **Addetti per Milione Revenue** | Organico Totale / (Ricavi / 1M) | Trimestrale | Benchmark efficienza |

---

## 3. Interazioni con Altri Reparti (Input/Output)

| Reparto | **Riceve da Controlling** | **Invia a Controlling** | **Punto di Attrito / Trade-off** |
|---------|---------------------------|-------------------------|----------------------------------|
| **Operations** | Target costo/unità, saturazione target, budget manutenzione/qualità | Costi actual (materiali, lavoro, energia, manutenzione), OEE, scarti, capacità reale | Target aggressivi → taglio manutenzione → guasti futuri |
| **Commerciale** | Target prezzo medio, mix canale target, budget sconti/incentivi | Prezzi reali per canale, volumi per canale, sconti reali, crediti clienti (DSO) | Prezzo basso per volume → margine sotto target CT |
| **Marketing** | Budget awareness/performance, target CAC, posizionamento coerenza prezzo | Spesa actual, awareness generata, lead/campagna, saturazione canali | Awareness ritardata → scostamento budget vs risultato |
| **HR** | Budget organico, costo medio target, ore straordinario budget, formazione budget | Organico actual, costo lavoro actual, straordinari actual, turnover, morale | Assunzioni anticipate vs saturazione impianti |
| **Supply Chain** | Target scorte, service level target, budget logistica | Scorte actual, stockout, costo logistica, DPO, scarti inbound | Scorta alta → service level ↑ ma capitale immobilizzato ↑ |
| **R&D** | Budget progetti, target time-to-market, hurdle rate NPV | Avanzamento progetti, costi actual, lanci previsti, qualità percepita attesa | R&D lungo → cash burn oggi, margine domani |
| **Finance** | Forecast cassa, fabbisogno finanziario, covenant calcolati | Posizione cassa actual, debito, interessi, tasse, WACC | Capex approvati CT vs liquidità reale Finance |
| **Amministrazione** | Politiche contabili (standard/actual, ammortamenti, transfer pricing) | Dati contabili certificati, bilancio trimestrale, tax rate | Chiusura contabile → tempistica reporting CT |

---

## 4. Dinamiche Realistiche (Regole di Motore per Game Designer)

| Dinamica | Descrizione | Impatto Gioco |
|----------|-------------|---------------|
| **Ritardo Effetto Investimenti** | Capex stabilimenti/automazione: capacità disponibile da Q+1. Marketing awareness: domanda da Q+1 a Q+3. R&D: lancio prodotto da Q+3 a Q+6. | Il giocatore deve pianificare *oltre* il trimestre corrente. |
| **Costi Fissi vs Variabili** | Struttura costi: ~40% fissi (stabilimenti, overhead, HR base), ~60% variabili. Leva operativa alta → rischio break-even. | Prezzo basso + volume basso = perdita rapida. |
| **Curva di Apprendimento** | Nuovo stabilimento/turno: efficienza 80% Q1, 90% Q2, 100% Q3. Nuovo canale: reach 60% primo trimestre. | Espansione ha costi nascosti transitori. |
| **Saturazione Marketing** | Performance marketing: ROI decresce dopo soglia spesa/trimestre per canale. Awareness: effetto cumulativo ma decadimento 10%/trim se spesa=0. | Budget MKT non lineare; diversificazione canali premia. |
| **Effetto Mix su Margine Medio** | Canale Retail: margine 15%, volume alto. Canale Proprio: margine 35%, volume basso, costo fisso. Online: margine 25%, reach variabile. | Allocazione volumi (CH-01) sposta break-even significativamente. |
| **Qualità Processo → Qualità Percepita** | PPM difettosi (OP-05) alimenta qualità percepita con ritardo 2 trimestri. Qualità percepita modifica elasticità prezzo (−0.1 per livello qualità). | Investire in qualità = investire in pricing power futuro. |
| **Vincolo Coerenza Prezzo-Posizionamento** | Se Marketing posizionamento = *Premium* ma Prezzo < RefPrice × 0.8 → penalità domanda −15%. Se *Economy* ma Prezzo > RefPrice × 1.15 → penalità −10%. | Controlling segnala incoerenza nel cruscotto (alert CT-06). |

---

## 5. Imprevisti / Eventi Tipici (per Event Engine)

| Evento | Trigger / Probabilità | Effetto su KPI Controlling | Azione Giocatore (mitigazione) |
|--------|----------------------|----------------------------|--------------------------------|
| **Shock Costo Materie Prime** | Esogeno, intensità configurabile host | Costo unitario variabile +15-30%, Margine Contribuzione ↓, Break-even ↑ | Rinegozia fornitori (Supply Chain), alza prezzo (Commerciale), taglia costi fissi (Ops/HR) |
| **Crollo Domanda (−20-40%)** | Esogeno / ciclico | Volume ↓, Saturazione ↓, Costi fissi/unit ↑, Cash flow ↓ | Straordinari=0, riduci turni, marketing performance per stimolare, cash preservation |
| **Boom Domanda (+30-50%)** | Esogeno / trend | Volume ↑, Saturazione → 100%, Straordinari costosi, Stockout risk | Attiva straordinari, valuta 3° turno, capex accelerato, allocazione canali marginali |
| **Guasto Impianto Maggiore** | Probabilità ∝ (1 − Manutenzione pianificata / target) | Capacità −30-50% per 1-2Q, Costo riparazione capex, Scostamento volume negativo | Manutenzione preventiva (OP-04), scorta sicurezza (SC), assicurazione (Finance) |
| **Richiamo Prodotto / Scandalo Qualità** | Probabilità ∝ PPM difettosi accumulati | Costo fallimento esterno ↑↑, Qualità percepita −2 livelli, Domanda −20% persistente | Investimento qualità processo (OP-05), crisi marketing, accantonamento rischi (Admin) |
| **Cambio Normativo (es. salario minimo, emissioni)** | Esogeno, preavviso 1Q | Costo lavoro fisso ↑, o Capex conformità richiesto | Pianificazione HR, automazione (OP-06), lobbying (non modellato) |
| **Default Key Retailer** | Probabilità ∝ concentrazione canale (CH-03) | Crediti inesigibili ↑, Volume canale → 0, Cash flow shock | Diversificazione canali (CH-01), assicurazione crediti, factoring (Finance) |
| **Errore Previsione (Bias Giocatore)** | Endogeno: se Demand Planner stima > Actual +20% per 2Q consecutivi | Scorte ↑, Capitale circolante ↑, Costo stoccaggio ↑, Obsolescenza rischio | Migliorare strumenti Planner, ridurre safety stock, rivedere CT-03 granularità |
| **Opportunità Acquisizione Tech / Licenza** | Evento raro, positivo | Capex una tantum, −Costo unitario futuro −10%, +Qualità | Valutazione NPV (CT-07), finanziamento (Finance), timing lancio (R&D) |

---

## 6. Requisiti per **Demand Planner** & **Tab Simulazione** (Decision Support)

> Controlling **definisce i requisiti funzionali** di questi strumenti; Game Designer li implementa.

### Demand Planner — Requisiti Minimi
| Funzione | Descrizione |
|----------|-------------|
| **Storico Vendite** | Ultimi 8 trimestri: volume, prezzo medio, per canale, per competitor (anonimo) |
| **Trend Decomposto** | Trend lineare + stagionalità (se prodotto stagionale) + residuo |
| **Elasticità Implicita** | Calcolata da storico: %ΔVolume / %ΔPrezzo (ultimi 4Q) |
| **Scenario "What-if"** |

---

### Supply Chain

# Requisiti Dominio — Supply Chain

> **Obiettivo:** Fornire leve, effetti singoli (per icone/tooltip), KPI, interazioni e imprevisti realistici ma giocabili.  
> **Framework di riferimento:** SCOR (Plan/Source/Make/Deliver/Return), APICS/CPIM, EOQ, Safety Stock, Bullwhip, S&OP.

---

## 1. Leve Decisionali (Decision Levers)

| ID | Leva | Descrizione breve | Parametri giocatore | Effetto Singolo (Icona / Tooltip) |
|----|------|-------------------|---------------------|-----------------------------------|
| **SC-01** | **Livello Scorta Obiettivo / Safety Stock** | Unità target di scorta finale trimestre (copre domanda + variabilità lead time) | `targetStockUnits` (intero) | **🛡️ Servizio ↑ / 💰 Capitale immobilizzato ↑ / 📦 Costo stoccaggio ↑** |
| **SC-02** | **Diversificazione Fornitori** | Numero fornitori qualificati + % volume sul primario | `supplierCount` (1–4), `primaryShare%` (50–100) | **⚠️ Rischio fornitura ↓ / 🤝 Potere negoziale ↑ / 📋 Complessità gestione ↑** |
| **SC-03** | **Lotto d'Acquisto (EOQ / MOQ)** | Quantità standard per ordine fornitore | `orderQty` (multiplo MOQ fornitore) | **📉 Costo ordine/unitario ↓ / 📦 Scorta media ↑ / 🔄 Flessibilità riordino ↓** |
| **SC-04** | **Capacità Logistica / Distributiva** | Slot consegna/trimestre (propria o 3PL) | `logisticsSlots` (intero), `ownVs3PL%` | **⏱️ Lead time consegna ↓ / 💰 Costo fisso ↑ / 🌍 Reach geografico ↑** |
| **SC-05** | **Buffer di Disaccoppiamento** | Scorta strategica a monte produzione (decoupling) | `decouplingBufferUnits` | **🛡️ Assorbe variabilità domanda/fornitura ↑ / 📦 Spazio & costo ↑ / ⚙️ OEE protetto ↑** |
| **SC-06** | **Contratti Quadro / Blanket Order** | Volume impegnato annuo per sconto prezzo | `committedVolumeAnnual`, `contractDurationQ` | **💲 Prezzo materia prima bloccato ↓ / 🔒 Vincolo volumi ↑ / 🗑️ Rischio obsolescenza ↑** |
| **SC-07** | **Modalità Trasporto** | Mix: camion (FTL/LTL), treno, mare, aereo | `% per modalità` | **⚖️ Costo/unitario ↔️ Lead time ↔️ Affidabilità ↔️ Emissioni (CSR)** |
| **SC-08** | **Politica Riordino (R, s, S / Kanban)** | Parametri: punto riordino `s`, livello max `S`, revisione `R` | `reorderPoint`, `maxLevel`, `reviewPeriodQ` | **🤖 Automazione riordini ↑ / 📉 Stockout rischio ↓ / 📊 Visibilità scorta ↑** |
| **SC-09** | **Qualità Ingresso (IQC / Vendor Rating)** | % lotti ispezionati, soglia ppm accettabile | `inspectionRate%`, `acceptPPM` | **🔍 Difetti in produzione ↓ / ⏱️ Lead time ingresso ↑ / 💰 Costo controllo ↑** |
| **SC-10** | **Scorta Anticipata Stagionale (Pre-build)** | Build-up scorta prima picco domanda noto | `prebuildUnits`, `targetQuarter` | **📈 Servizio picco ↑ / 💰 Capitale anticipato ↑ / 🗑️ Rischio invenduto se domanda < attesa** |

---

## 2. KPI di Dominio (Dashboard Supply Chain)

| KPI | Formula / Definizione | Target "sano" | Colore soglia |
|-----|----------------------|---------------|---------------|
| **Fill Rate / Livello Servizio** | `Unità consegnate in tempo / Unità ordinate clienti` | ≥ 95% | 🟢 ≥95% 🟡 90-95% 🔴 <90% |
| **Rotazione Scorte (Inventory Turns)** | `COGS trimestre / Valore scorta media` | 4–8×/anno (dipende settore) | 🟢 4-8 🟡 2-4 o >10 🔴 <2 |
| **Giorni Scorta (Days of Supply)** | `Scorta finale / (Domanda prevista prossimo trimestre / 90)` | 30–60 gg | 🟢 30-60 🟡 15-30 o >90 🔴 <15 |
| **Lead Time Fornitura Medio** | `Media ponderata (giorni ordine→consegna) per fornitore` | ≤ lead time contrattuale | 🟢 ≤ contratto 🟡 +10-20% 🔴 >+20% |
| **Costo Logistico / Fatturato** | `(Trasporto + Magazzino + Imballo + Pers. logistica) / Ricavi` | ≤ 5-8% | 🟢 ≤5% 🟡 5-8% 🔴 >8% |
| **Costo Rotture Stock (Stockout Cost)** | `Unità perse × (Margine unitario + Costo recupero cliente)` | Minimizzare | KPI monetario, trend ↓ |
| **OTIF (On Time In Full)** | `Ordini consegnati interi e in tempo / Totali ordini` | ≥ 90% | 🟢 ≥90% 🟡 80-90% 🔴 <80% |
| **Capitale Circolante Supply Chain** | `Scorte + Crediti fornitori - Debiti fornitori` | Monitorare trend | KPI monetario |
| **Bullwhip Index** | `Var(ordini a fornitori) / Var(domanda clienti)` | → 1.0 (ideale) | 🟢 0.8-1.2 🟡 1.2-2.0 🔴 >2.0 |
| **Vendor Reliability** | `% consegne fornitore in tempo & complete` | ≥ 95% per fornitore critico | Per fornitore |

---

## 3. Interazioni con Altri Reparti (Cross-Domain)

| Da Supply Chain → A | Interazione (Meccanica di gioco) | Leva/Parametro coinvolta |
|---------------------|----------------------------------|--------------------------|
| **Operations** | Materiali disponibili per produzione = `min(scorta apertura + arrivi pianificati, fabbisogno MP)` | SC-01, SC-02, SC-03, SC-05, SC-09 |
| **Operations** | Ritardo/qualità MP → fermi linea, scarti, retrofit | SC-02 (affidabilità), SC-09 (IQC) |
| **Commerciale** | Disponibilità a vendere (ATP) = `scorta + produzione pianificata - ordini confermati` | SC-01, SC-04, SC-05 |
| **Commerciale** | Lead time consegna cliente = `lead time produzione + lead time logistica (SC-04)` | SC-04, SC-07 |
| **Commerciale** | Servizio promesso (SLA) → impatta fill rate reale | SC-01, SC-05 |
| **Marketing** | Lancio promo/picco domanda → richiede pre-build (SC-10) o buffer extra | SC-10, SC-05 |
| **Marketing** | Nuovo canale (es. e-commerce) → richiede capacità logistica dedicata (SC-04) | SC-04, SC-07 |
| **Finance / Amministrativo** | Valore scorte = capitale immobilizzato (balance sheet) | SC-01, SC-03, SC-05, SC-10 |
| **Finance** | Debiti fornitori (DPO) = funzione termini pagamento negoziati con SC-02, SC-06 | SC-02, SC-06 |
| **Finance** | Costi logistici variabili/fissi → P&L | SC-04, SC-07 |
| **HR** | Personale magazzino/logistica = funzione volumi gestiti (SC-04) | SC-04 |
| **R&D** | Nuovo componente → qualifica fornitore (SC-02), MOQ iniziale (SC-03), IQC (SC-09) | SC-02, SC-03, SC-09 |

---

## 4. Imprevisti / Eventi Tipici (Supply Chain Shocks)

| ID | Evento | Trigger / Probabilità | Impatto Meccanico | Durata | Contromisure Leve |
|----|--------|----------------------|-------------------|--------|-------------------|
| **EV-SC-01** | **Ritardo Fornitore Principale** | Casuale (base 5%/trim) + se `supplierCount=1` ×3 | Lead time fornitore ×2–3; arrivi posticipati | 1–2 trim | SC-02 (diversificazione), SC-05 (buffer), SC-10 (pre-build) |
| **EV-SC-02** | **Default / Uscita Fornitore** | Se `vendorRating < soglia` o evento macro | Fornitore rimosso; ordini aperti persi; riqualifica 2–3 trim | Permanente | SC-02 (multi-sourcing), SC-06 (contratti quadro) |
| **EV-SC-03** | **Shock Prezzo Materia Prima** | Evento macro (commodity, energia, FX) | Costo unitario MP +15–50% immediato | 1–4 trim | SC-06 (blanket price lock), SC-02 (negoziazione), SC-03 (lotti maggiori) |
| **EV-SC-04** | **Interruzione Logistica** (porto, sciopero, meteo) | Stagionale + evento macro | Slot consegna (SC-04) -30–50%; lead time +5–15 gg | 1 trim | SC-04 (capacità extra/3PL), SC-07 (modalità alternative), SC-05 (buffer) |
| **EV-SC-05** | **Lotto Difettoso Fornitore** | Se `inspectionRate%` basso o `vendorRating` basso | Scarti produzione ↑; fermo linea se JIT; richiamo se già spedito | 1 trim | SC-09 (IQC), SC-02 (fornitore backup), SC-05 (buffer) |
| **EV-SC-06** | **Bullwhip Amplificato** | Se `orderQty` grande (SC-03) + `reviewPeriodQ` lungo + domanda variabile | Ordini a fornitore oscillano ±2× domanda reale; scorte a sawtooth | Fino a correzione policy | SC-08 (kanban/R,s,S), SC-01 (safety stock dinamico), S&OP allineato |
| **EV-SC-07** | **Obsolescenza / Scadenza Scorta** | Se `daysOfSupply > 120` o cambio prodotto (R&D) | Svalutazione scorta -30–100% valore; costo smaltimento | Immediato | SC-01 (target stock allineato), SC-10 (pre-build limitato), SC-06 (vincolo volumi) |
| **EV-SC-08** | **Aumento Costo Trasporto** (carburante, capacity crunch) | Evento macro / stagionale | Costo/unitario logistica (SC-07) +20–80% | 1–3 trim | SC-07 (modal shift), SC-04 (consolidamento), SC-03 (lotti maggiori) |
| **EV-SC-09** | **Nuova Regolamentazione / Dogana** | Evento macro (trade war, ESG) | Lead time import +5–10 gg; costi compliance; possibile dazio | Permanente | SC-02 (near-shoring), SC-04 (magazzino doganale), SC-06 (contratti) |
| **EV-SC-10** | **Opportunità: Sconto Volume Spot** | Casuale (2–3%/trim) se `cash` disponibile | Acquisto extra a -10–20% prezzo standard; vincolo volume minimo | One-shot | SC-03 (flessibilità lotto), SC-01 (spazio magazzino), Finance (cassa) |

---

## 5. Note di Implementazione (per Game Designer / Engine)

### 5.1 Formula Safety Stock (suggerita, opzionale v1.0)
```
SafetyStock = Z * σ_demand * sqrt(LT) + Z * μ_demand * σ_LT
Z = 1.65 (95% service) o 2.0 (97.5%)
σ_demand = deviazione standard domanda storica (ultimi 4 trim)
LT = lead time medio fornitore (giorni/90)
σ_LT = variabilità lead time
```
> **Giocabilità:** Il giocatore imposta `targetStockUnits` direttamente; il motore calcola `impliedServiceLevel` per tooltip.

### 5.2 EOQ (Economic Order Quantity) — riferimento per tooltip SC-03
```
EOQ = sqrt(2 * DomandaAnnuale * CostoOrdine / CostoPossessoUnitarioAnno)
CostoPossessoUnitarioAnno = CostoUnitarioMP * TassoPossesso% (es. 15-25%)
```
> Mostrare al giocatore: "EOQ suggerito: X unità" → lui decide `orderQty`.

### 5.3 Bullwhip — meccanica semplificata
Se `reviewPeriodQ > 1` **E** `orderQty > domandaMediaTrim * 1.5` **E** `demandVariability > 20%`  
→ `bullwhipIndex` sale → ordini a fornitore = `domandaReale * (1 + bullwhipIndex * noise)`.

### 5.4 S&OP (Sales & Operations Planning) — vincolo trasversale
Ogni trimestre il motore confronta:
- **Domanda prevista** (Commerciale/Marketing) → `forecastDemand`
- **Piano produzione** (Operations) → `productionPlan`
- **Piano approvvigionamento** (Supply Chain) → `supplyPlan = arrivi MP + scorta apertura`

**Gap** → genera alert / penalità:
- `supplyPlan < productionPlan` → fermi linea, straordinari forzati
- `productionPlan < forecastDemand` → stockout, fill rate

---

### Finance / Tesoreria

# Requisiti Dominio: Finance / Tesoreria

> Versione: iterazione 2 — allineata al consolidato v1 e al GDD v0.1.  
> Obiettivo: fornire leve **giocabili**, **chiare nell'effetto singolo** (icona/tooltip), con KPI, interazioni e imprevisti realistici ma bilanciati.

---

## 1. Leve Decisionali (Decision Levers)

| ID | Leva | Descrizione breve | **Effetto Singolo (Icona / Tooltip)** |
|----|------|-------------------|----------------------------------------|
| **FI-01** | **Linea di credito revolving** (breve, es. 3–12 mesi) | Attiva/estende un fido cassa per coprire fabbisogno ciclico. | **💧 +Liquidità immediata / 📈 +Oneri finanziari variabili / ⚠️ Rischio revoca se covenants violati** |
| **FI-02** | **Prestito a medio-lungo termine** (3–7 anni) | Finanzia capex (stabilimenti, R&S, automazione) con rata costante. | **🏗️ +Capacità investimento / 🔒 Tasso fisso (sicurezza) / ⛓️ Leva finanziaria ↑ / 📉 Cassa vincolata a rate** |
| **FI-03** | **Aumento di capitale** (nuovi soci / reinvestimento utili) | Immette equity fresco; diluisce soci esistenti se esterno. | **🛡️ -Leva (D/E) / 💰 +Cassa senza oneri / 📉 ROE diluito / ⏳ Tempi lunghi (1 trim. min.)** |
| **FI-04** | **Piano Capex pluriennale** (impegno vincolante) | Programma acquisti stabilimenti/automazione/R&S su 2–4 trimestri. | **📅 Investimenti pianificati / 🔒 Capex "prenotato" / ⚠️ Penale se annullato / 📊 Visibilità per Operations/R&D** |
| **FI-05** | **Soglia cassa minima / Buffer di sicurezza** | Imposta il livello sotto cui scattano alert/azioni automatiche (es. drawdown fido). | **🛡️ -Rischio insolvenza / 💸 -Rendimento cassa ferma / 🎯 Target: 1.5–3× overhead/trim** |
| **FI-06** | **Politica dividendi / Ritenuta utili** | % utile netto distribuito vs reinvestito. | **🤝 Fiducia soci ↑ / 📈 Prezzo azioni (se quotati) / 💰 -Cassa per crescita / 📉 Leva ↑ se distribuisci troppo** |
| **FI-07** | **Rinegoziazione debito / Refinancing** | Sostituisce debito costoso con nuovo debito (costo: fee + tempo). | **📉 -Oneri futuri / 💸 Fee una tantum / ⏳ 1 trim. per chiudere / 🎲 Successo dipende da rating** |
| **FI-08** | **Gestione crediti clienti (DSO target)** | Pressione incasso / sconto cassa / factoring. | **⚡ +Cassa veloce / 📉 -Margine (sconto/factoring) / 😠 Rischio tensioni commerciali** |
| **FI-09** | **Gestione debiti fornitori (DPO target)** | Allunga pagamenti / sconto cassa fornitore. | **💧 +Cassa / 🤝 -Relazione fornitore / ⚠️ Rischio supply disruption / 💰 +Margine se sconto cassa** |

> **Nota v0.1**: Per lo *walking skeleton* (solo Prezzo + Produzione), **FI-01, FI-02, FI-05** sono *Must*; le altre *Should/Could*.

---

## 2. KPI di Dominio (Finance Dashboard)

| KPI | Formula (semplificata) | Target / Soglie | Colore UI |
|-----|------------------------|-----------------|-----------|
| **Cassa / Liquidità** | Cassa + Fido non utilizzato | > 1.5 × overhead/trim | 🟢/🟡/🔴 |
| **Leva Finanziaria (D/E)** | Debito netto / Patrimonio netto | < 2.0 (settore manifatturiero) | 🟢 <1.5 🟡 1.5–2.5 🔴 >2.5 |
| **Debito / EBITDA** | Debito netto / EBITDA (ultimi 4 trim.) | < 3.0x | 🟢 <2 🟡 2–3.5 🔴 >3.5 |
| **Interest Coverage** | EBIT / Oneri finanziari | > 4.0x | 🟢 >6 🟡 3–6 🔴 <3 |
| **Cash Conversion Cycle** | DSO + DIO – DPO | < 60 gg (benchmark) | 🟢 <45 🟡 45–75 🔴 >75 |
| **Free Cash Flow Yield** | FCF / Enterprise Value | > 8% | 🟢 >12% 🟡 5–12% 🔴 <5% |
| **Rating Implicito** | Funzione (Leva, Coverage, Trend cassa) | AAA → D | Usato per costo debito nuovo |
| **ROE** | Utile netto / Patrimonio netto medio | > WACC + 2% | 🟢 >15% 🟡 8–15% 🔴 <8% |

> **Meccanica gioco**: il **Rating Implicito** determina lo *spread* sul costo del debito nuovo (vedi tabella sotto).

---

## 3. Costo del Debito & Rating (Meccanica Core)

| Rating | Spread su tasso base | Prob. revoca fido | Note |
|--------|---------------------|-------------------|------|
| AAA–AA | +0.5% | 0% | Accesso illimitato |
| A–BBB | +1.0–1.5% | 0% | Standard |
| BB | +2.5% | 5%/trim se cassa < soglia | "High yield" |
| B | +4.0% | 15%/trim | Accesso solo fido breve |
| CCC–D | +6.0% / chiusura | 40%/trim | Quasi default |

> **Tasso base** = parametro di partita (es. 3%/anno = 0.75%/trim).  
> **Costo debito effettivo** = tasso base + spread(rating) + fee una tantum (0.2–0.5%).

---

## 4. Interazioni con Altri Domini

| Dominio | Interazione | Meccanica / Vincolo |
|---------|-------------|---------------------|
| **Operations** | Capex stabilimenti / automazione | FI-04 (Piano Capex) *prenota* cassa; OP-01/06 *richiedono* approvazione Finance. Se cassa < capex → **blocco** o **drawdown automatico fido** (costo + spread). |
| **HR** | Costo lavoro, assunzioni, formazione | Finance valida *budget personale* trimestrale. Se cassa bassa → **vincolo assunzioni** (soft cap). Straordinari (OP-03) = costo variabile → impatta FCF. |
| **Commerciale / Canali** | DSO, sconto cassa, factoring | FI-08 (DSO target) ↔ CH-01/03/04. Sconto cassa 2%/10gg → -2% margine, -15gg DSO. Factoring → -1.5% margine, DSO≈0. |
| **Marketing** | Budget awareness/performance | MK-01/02 = cash-out immediato, payback 1–3 trim. Finance impone **plafond marketing** = % fatturato o % cassa libera. |
| **R&D** | Pipeline, brevetti, lanci | R&D = capex o opex (scelta contabile). Finance valida *business case* (NPV/IRR) prima di sbloccare budget. |
| **Supply Chain** | DPO, scorta, fornitori | FI-09 (DPO target) ↔ SC-02/03. Allungare DPO > 60gg → rischio *stockout* o *penale fornitore*. |
| **Controlling** | What-if, budget, variance | Fornisce *driver* per simulazione (tab "Simulazione"): break-even, sensitività prezzo/volume, ripartizione costi su prezzo. |
| **Amministrazione** | Politiche contabili, tasse | Scelta *capex vs opex* per R&D/manutenzione → impatta EBIT, tasse, FCF. Ammortamenti = cassa non uscita ma costo contabile. |

---

## 5. Imprevisti / Eventi Finanziari (Event Deck)

| Evento | Trigger / Probabilità | Effetto | Contromisure giocatore |
|--------|----------------------|---------|------------------------|
| **Stretta creditizia** | Esogena (livello eventi "alto") o rating < BB | Spread +1.5%, fido ridotto -30%, nuovi prestiti solo < 12 mesi | Avere buffer cassa, ridurre leva *prima*, diversificare fonti |
| **Rialzo tassi base** | Macro (1–2×/partita) | Tasso base +0.5–1.0% → oneri su debito variabile ↑ | FI-02 a tasso fisso, FI-07 refinancing preventivo |
| **Richiesta rientro fido** | Cassa < soglia per 2 trim. consecutivi | Revoca 20–50% fido revolving | FI-05 buffer alto, FI-03 aumento capitale, FI-08 incasso aggressivo |
| **Covenants breach** | D/E > 3.0 o Interest Coverage < 2.0 | Penale 1% debito, rating -1 notch, blocco nuovi prestiti | Monitoraggio KPI, FI-06 ritenuta utili, FI-01 riduzione fido volontaria |
| **Opportunity: emissione bond** | Rating ≥ BBB, cassa > 2× overhead | Accesso debito 5–7 anni a spread -0.5% vs banche | Preparare piano capex (FI-04) credibile |
| **Fornitore chiave offre sconto cassa** | Casuale (5%/trim) | -2% costo acquisti se paghi a 10gg | Valutare DPO vs margine (FI-09) |
| **Cliente chiave ritarda pagamento** | Casuale (8%/trim) | DSO +15–30gg, cassa -5–15% fatturato | Factoring (FI-08), fido revolving, assicurazione crediti |
| **Agevolazione fiscale / Credito d'imposta** | Casuale (3%/trim) o policy | -10–20% tasse trimestre / +cassa capex R&D | Piano R&D attivo (RD-01), capex eleggibile |
| **Crisi valutaria (se export)** | Macro + export > 30% fatturato | Margine export -5–15% | Hedging (FI-07 futuro), diversificare mercati |

---

## 6. Parametri di Partita Configurabili (Host Settings)

| Parametro | Default | Range | Impatto |
|-----------|---------|-------|---------|
| Capitale iniziale | €1.000.000 | 500k – 5M | Cassa partenza, leva iniziale |
| Tasso base annuo | 3.0% | 1.0% – 8.0% | Costo debito, attrattiva equity |
| Spread rating (curva) | Tabella standard | ±50% | Durezza finanziaria |
| Overhead/trim | €20.000 | 10k – 100k | Break-even, cassa minima |
| Plant Capex | €250.000 | 150k – 500k | Intensità capitale |
| Livello eventi finanziari | Medio | Basso / Medio / Alto | Frequenza/impatto imprevisti |
| Covenants standard | D/E ≤ 2.5, IC ≥ 3.0 | Personalizzabili | Vincoli operativi |

---

## 7. Note di Bilanciamento & Playtesting

1. **Leva vs Rischio**: Il debito *deve* essere vantaggioso (ROI > costo) ma pericoloso se mercato gira. Testare: *partita vinta con D/E 1.5 vs 3.0*.
2. **Tempistiche**: Aumento capitale = 1 trim. attesa → non "salva" crisi immediata. Fido = istantaneo ma costoso.
3. **Rating come feedback**: Visibile ogni trimestre → giocatore *vede* le conseguenze delle scelte.
4. **Semplificazione v0.1**: Solo FI-01, FI-02, FI-05, FI-06 (dividendi fissi 30%). Rating = 3 fasce (Sano / Attenzione / Critico).
5. **Bot Finance**: I bot mantengono D/E 1.0–1.5, cassa 2× overhead, non usano factoring, rifinanziano proattivamente.

---

## 8. Checklist Integrazione (per Game Designer / PM)

- [ ] Leve FI-01..09 mappate su **UI Tab Finanza** (icone + tooltip = "Effetto Singolo").
- [ ] KPI calcolati *dopo* risoluzione mercato/operazioni, *prima* chiusura trimestre.
- [ ] Eventi finanziari pescati da **Event Deck** condiviso (parametro "livello eventi").
- [ ] Rating → spread → costo debito nuovo: **formula deterministica** v0.1, stocastica v1.0.
- [ ] Interazioni: **validazione incrociata** (es. Operations richiede capex → Finance approva/rifiuta → log visibile).
- [ ] Tab **Simulazione** (requisito utente #4): include *break-even*, *sensitività prezzo/volume*, *ripartizione costi su prezzo* → driver da Controlling/Finance.

---

> **Prossimo step**: Game Designer integra queste leve nel **Tab Finanza** e nel **Turno di Gioco** (fase decisione → risoluzione → reporting). Controlling fornisce i *what-if* per il Tab Simulazione.

---

### R&D / Prodotto

# Requisiti Dominio R&D / Sviluppo Prodotto — Iterazione corrente

> **Obiettivo:** Fornire i requisiti di gioco per il dominio R&D (leve, effetto singolo per icona, KPI, interazioni, imprevisti, dinamiche di incertezza).  
> **Priorità MoSCoW attuale:** *Could* (v1.0+) — il core loop v0.1 gira senza, ma la profondità strategica ne dipende.

---

## 1. Leve Decisionali (Decision Levers)

| ID | Leva | Descrizione operativa | **Effetto Singolo (Icona / Tooltip)** |
|----|------|----------------------|----------------------------------------|
| **RD-01** | **Budget R&S (% fatturato o €/trim)** | Importo allocato al portafoglio progetti (ricerca base + sviluppo applicato). | **Innovazione ↑ / Cassa ↓ / Rischio portafoglio ↑** |
| **RD-02** | **Focus Qualità vs Nuovo** | Slider 0–100: % budget a *miglioramento continuo* (qualità, cost-down, affidabilità) vs *innovazione radicale* (nuove piattaforme, tech breakthrough). | **Qualità percepita ↑ / Time-to-market nuovi ↓** (se sposta su qualità) — **Novità ↑ / Rischio flop ↑** (se sposta su radicale) |
| **RD-03** | **Numero progetti in parallelo (Portfolio size)** | Quanti progetti Stage-Gate si tengono aperti simultaneamente (gate 1–5). | **Throughput idee ↑ / Focus per progetto ↓ / Overhead gestione ↑** |
| **RD-04** | **Livello target TRL di uscita** | Soglia Technology Readiness Level richiesta per passare a Operations (es. TRL 6 vs TRL 8). | **Time-to-market ↓ / Rischio producibilità ↑** (TRL basso) — **Time-to-market ↑ / Affidabilità lancio ↑** (TRL alto) |
| **RD-05** | **Investimento Tooling/Metodi (Design Thinking, QFD, simulazione CAE, gemello digitale)** | Capex/opex per alzare la *produttività R&S* (ridurre cicli, alzare tasso successo). | **Produttività R&S ↑ / Costo fisso ↑ / Effetto ritardato 2–4 trim** |
| **RD-06** | **Lancio Nuovo Prodotto (Go/No-Go + timing)** | Decisione discreta: quando rilasciare il progetto completato al mercato (allineato a Marketing/Commerciale). | **Ricavi nuovi ↑ / Cannibalizzazione vecchi ↑ / Costi lancio (ramp-up) ↑** |
| **RD-07** | **Brevetto / IP Protection (opzionale v1.1)** | Budget per deposito e difesa brevetti. | **Barriera competitor ↑ / Costo legale ↑ / Valore uscita ↑** |

> **Nota UX:** Ogni leva ha **un solo effetto primario** (la frase in grassetto) da mostrare nell'icona/tooltip. Gli effetti secondari emergono dalla simulazione.

---

## 2. KPI di Dominio (Dashboard R&D)

| KPI | Formula / Definizione | Target / Benchmark | Frequenza aggiornamento |
|-----|----------------------|-------------------|------------------------|
| **% Fatturato da prodotti < 3 anni** | Ricavi prodotti lanciati ≤ 12 trim / Ricavi totali | > 30% (leader), 15–30% (follower) | Trimestrale |
| **Tasso successo progetti (Gate 5 → Lancio)** | Progetti lanciati / Progetti entrati in Gate 1 (coorte 4 trim) | 20–35% tipico manifatturiero | Trimestrale (rolling 4Q) |
| **Time-to-market medio (Idea → Lancio)** | Media trimestri da Gate 1 a Go-to-market per coorte | 4–8 trim (incrementale), 8–16 (radicale) | Trimestrale |
| **Qualità percepita (indice 0–100)** | Survey simulato + ppm difettosi pesati + feature gap vs competitor | > 75 premium, 60–75 standard | Trimestrale |
| **R&D Productivity Index** | (Valore progetti lanciati × prob. successo) / Budget R&S trim | > 1.5 sano, < 1 allarme | Trimestrale |
| **Portfolio Health** | % progetti on-track per timeline/budget vs totali attivi | > 70% verde | Settimanale (turno) |
| **Obsolescenza media gamma** | Età media ponderata per fatturato dei prodotti attivi | < 4 trim fresco, > 8 invecchiato | Trimestrale |

---

## 3. Dinamiche Realistiche / Meccaniche Core (per Game Designer + Engine)

### 3.1 Funnel Stage-Gate (stato persistente per progetto)
```
Gate 1: Idea Screening          → costo basso, alta mortalità (60–80% scartati)
Gate 2: Concept & Business Case → costo medio, validazione mercato/tecnica
Gate 3: Sviluppo (Design/Proto) → costo alto, rischio tecnico (TRL 4→6)
Gate 4: Validazione (Pilot/TT)  → costo molto alto, rischio producibilità
Gate 5: Lancio (Ramp-up)        → capex tooling, marketing, supply chain
```
- **Durata media per gate:** 1–2 trim (configurabile per tipo progetto).
- **Budget per gate:** % del budget totale progetto (es. 5/10/30/35/20).
- **Decisione giocatore:** *Continue / Kill / Recycle / Fast-track* a ogni gate.

### 3.2 Incertezza & Tasso di Successo (non deterministico)
- Ogni progetto ha **probabilità di successo per gate** (p1…p5) funzione di:
  - **Novità tecnologica** (radicale = p più basse)
  - **Competenze accumulate** (learning curve: +2% p per progetto simile completato)
  - **Tooling/Metodi** (RD-05 alza p di 5–15 pp nel tempo)
  - **Focus Qualità** (RD-02 su qualità alza p Gate 3–4, abbassa p Gate 1–2 per radicale)
- **Meccanica:** al processing del turno, ogni progetto tira un dado pesato → *avanza / slitta 1 trim / fallisce*.
- **Output visibile:** giocatore vede *probabilità stimata* (non certezza) → gestione rischio portafoglio.

### 3.3 Obsolescenza & Cannibalizzazione
- Ogni prodotto ha **curva vita** (introduzione → crescita → maturità → declino).
- **Nuovo lancio** sposta domanda: *cannibalizzazione* (0–60% a seconda similarità) + *espansione mercato* (nuovi segmenti).
- **Qualità percepita** decade se non c'è RD-02 su miglioramento continuo (−2–3 pts/trim per prodotto senza investimenti).

### 3.4 Sinergia Qualità Processo ↔ Qualità Percepita
- **Operations (OP-05 ppm)** alimenta *affidabilità reale* → con ritardo 1–2 trim diventa *qualità percepita*.
- **R&D (RD-02 focus qualità)** alza *qualità percepita* direttamente (design robusto, materiali) + riduce ppm target per Operations.
- **KPI incrociato:** *Quality Gap = Qualità Percepita − Affidabilità Reale* → se > 15 pts → rischio reclami/richiami.

---

## 4. Interazioni con Altri Domini (Cross-Functional)

| Dominio | Punto di Contatto | Regola / Vincolo / Sinergia |
|---------|-------------------|----------------------------|
| **Marketing** | *Posizionamento (MK-03)* ↔ *Roadmap R&D* | Se Marketing dichiara "Premium", R&D deve consegnare TRL ≥ 7 + feature differenzianti → altrimenti penalità domanda −15%. |
| **Marketing** | *Budget Awareness (MK-01)* ↔ *Lancio (RD-06)* | Awareness pre-lancio (2 trim prima) alza *prob. successo lancio* ×1.2; senza → −30% vendite primo trim. |
| **Commerciale** | *Prezzo (PR-01)* ↔ *Costo target R&D* | R&D riceve *cost target* = Prezzo × (1 − target margin) − costo produzione stimato. Se manca target → margin compression. |
| **Commerciale** | *Canali (CH-01)* ↔ *Packaging/Varianti* | Canali online richiedono varianti "e-commerce ready" (packaging, SKU) → task R&D extra 0.5 trim. |
| **Operations** | *Producibilità (TRL 7–8)* ↔ *Gate 4* | Se R&D esce a TRL < 7 → Operations paga *costo industrializzazione* +20% e *ramp-up* +2 trim. |
| **Operations** | *Qualità processo (OP-05)* ↔ *Qualità percepita* | Flusso bidirezionale: ppm reali → perceived quality (ritardo 1–2Q); target ppm da R&D → costo prevenzione Operations. |
| **HR** | *Competenze/Ricercatori* ↔ *Produttività R&S* | Organico R&D (assunzioni HR) × skill mix determina *capacità parallela progetti* (RD-03 max). Turnover > 15% → −10% p successo. |
| **Finance** | *Capex R&D (RD-01, RD-05)* ↔ *Cash flow* | Investimenti R&D capitalizzabili (parte) vs spesati → impatto EBIT vs Cash. Finance può imporre *cap R&D % fatturato*. |
| **Supply Chain** | *Nuovi materiali/fornitori* ↔ *Gate 3* | Progetti con nuovi fornitori → risk gate 3 +15% fallimento; richiede *qualifica fornitore* (SC task parallelo). |

---

## 5. Imprevisti / Eventi Tipici (Event Deck R&D)

| Evento | Trigger / Probabilità | Effetto Meccanico | Opzioni Giocatore (scelta a turno) |
|--------|----------------------|-------------------|-----------------------------------|
| **Breakthrough Tecnologico** | 5%/trim se budget ricerca base > 15% R&D | Un progetto in Gate 2–3 salta a Gate 4, TRL +2, costo residuo −30% | *Accelerare* (lancio −1 trim) / *Allargare* (derivare 2 varianti) / *Brevetto* (costo +, barriera +) |
| **Flop Progetto Chiave** | 8%/trim per progetto in Gate 3–4 (sale se radicale) | Progetto fallisce, sunk cost perso, team "demoralizzato" −10% produttività 2 trim | *Kill & Learn* (recupera 10% budget come knowledge) / *Pivot* (riusa 30% asset in nuovo progetto, +1 trim) |
| **Mossa Competitor (Lancio Anticipato)** | Evento globale, 10%/trim | Competitor lancia prodotto simile: *finestra mercato* −2 trim, cannibalizzazione +20% | *Fast-track* (costo +25%, rischio qualità +) / *Differenziare* (cambio feature, +1 trim) / *Price War* (sconto lancio, margin −) |
| **Scarsità Componente Critica** | 7%/trim se nuovi materiali/fornitori | Gate 3–4 bloccati 1–2 trim per progetti dipendenti | *Ridisegno* (costo R&D +, tempo +1 trim) / *Spot Buy* (costo unitario +40% 2 trim) / *Accetta Ritardo* |
| **Turnover Chiave (Senior Researcher)** | 4%/trim, sale se HR morale basso o straordinari alti | Progetti attivi −15% p successo 1 trim, knowledge loss | *Contro-offerta* (costo +) / *Promuovi Junior* (rischio p successo −) / *Esternalizza* (costo +, IP risk) |
| **Cambiamento Normativo/Standard** | 3%/trim (settore regolato) | Requisiti nuovi → tutti progetti Gate 1–3: *rework* 1 trim, costo +10% | *Adegua Tutti* (costo alto) / *Seleziona* (kill progetti non strategici) / *Lobby/Rinvio* (prob. 30% successo, costo legale) |
| **Insight Cliente (Voice of Customer)** | 6%/trim se MK-01 Awareness > soglia | Nuovo bisogno emerso → *opzione* nuovo progetto Gate 1 con p successo +10% | *Avvia Subito* (budget +) / *Parcheggia* (backlog) / *Ignora* (rischio obsolescenza +) |

> **Nota:** Gli eventi sono **globali o per giocatore** (configurabile). Hanno sempre **scelte significative** (trade-off), non solo "subisci".

---

## 6. Parametri di Configurazione Partita (Host Settings → R&D)

| Parametro | Default | Range | Impatto |
|-----------|---------|-------|---------|
| **Durata media Gate (trim)** | [1,1,2,2,1] | 1–3 per gate | Velocità innovazione |
| **Tasso successo base per gate** | [0.4, 0.6, 0.5, 0.7, 0.85] | 0.2–0.9 | Difficoltà innovazione |
| **Penalità radicale (moltiplicatore p successo)** | 0.6 | 0.3–0.9 | Rischio innovazione radicale |
| **Learning curve % per progetto simile** | +2% | 0–5% | Vantaggio esperienza |
| **Ritardo qualità percepita da ppm (trim)** | 2 | 1–4 | Sincronia Ops↔R&D |
| **Cannibalizzazione base nuovo/vecchio** | 30% | 10–60% | Gestione portfolio |
| **Eventi R&D attivi** | Sì | On/Off | Variabilità |
| **Intensità eventi** | Media | Bassa/Alta | Frequenza/impatto |

---

## 7. Requisiti Non Funzionali / Implementativi (per Engine)

1. **Stato persistente progetti:** Ogni progetto = oggetto con `{id, tipo, gate, trim_al_gate, budget_speso, p_successo_stimata, team_assegnato, fornitori_coinvolti, ip_status}`.
2. **Determinismo opzionale:** Seed per generatore casuale → *modalità test* riproducibile (tutti i dadi noti).
3. **Interfaccia domanda LLM (futuro):** `getConsumerInterest(productConcept, price, positioning, context) → {purchaseIntent, featureImportance, priceSensitivity}` — R&D usa per *Gate 2 Business Case validation*.
4. **Event bus:** R&D pubblica `ProjectAdvanced`, `ProjectFailed`, `NewProductLaunched` → Marketing/Commerciale/Operations si sottoscrivono.
5. **Audit trail:** Ogni decisione (Go/Kill/Fast-track) loggata con contesto (p successo, budget, gate) → *post-mortem* fine partita.

---

## 8. Checklist Prontezza per Game Designer + PM

- [x] Leve con **effetto singolo** per icona (7 leve)
- [x] KPI misurabili e bilanciabili (7 KPI)
- [x] Meccanica **incertezza** esplicita (Stage-Gate + tasso successo stocastico)
- [x] **Interazioni** bidirezionali con 6 domini (vin

---

### Strategia / Direzione

# Requisiti Dominio **Strategia / Direzione Generale** (CEO)

> Sintesi strategica che dà coerenza ai requisiti dei reparti. Non duplica leve operative (già in Operations, Commerciale, Marketing, HR, Finance, R&D, Supply Chain), ma definisce **leve di indirizzo**, **condizioni di vittoria**, **trade-off sistemici**, **scenario competitivo** e **imprevisti strategici**.

---

## 1. Leve Strategiche (indirizzo, non esecuzione)

| ID | Leva Strategica | Effetto Singolo (icona/tooltip) | Descrizione breve |
|---|---|---|---|
| **ST-01** | **Posizionamento Competitivo** (Costo / Differenziazione / Focus) | **Target ↔️ Margine ↔️ Rischio** | Sceglie la strategia generica (Porter). Vincola coerenza Prezzo/Qualità/Marketing/Canali. Cambio = costo riorganizzazione + 1 trimestre transizione. |
| **ST-02** | **Orizzonte Investimenti** (Breve / Medio / Lungo) | **Cassa oggi ↔️ Capacità domani** | Definisce % capex su fatturato vs distribuzione dividendi/riduzione debito. Impatta Finance (leva debito), Operations (stabilimenti), R&D (pipeline). |
| **ST-03** | **Profilo di Rischio** (Conservativo / Bilanciato / Aggressivo) | **Volatilità utili ↔️ Upside potenziale** | Modifica soglie allarme cassa, leva finanziaria max, % budget R&D, scorta sicurezza. Usato anche per calibrare bot. |
| **ST-04** | **Allocazione Risorse Core vs Nuove Iniziative** | **Core business ↔️ Opzioni future** | Split budget/risorse tra business attuale e esplorazione (nuovi segmenti, prodotti, canali). Alimenta R&D pipeline e Marketing segmentazione. |
| **ST-05** | **Strategia Competitiva Attiva** (Price War / Differenziazione / Niching / Attesa) | **Reazione ↔️ Iniziativa** | Modalità di risposta ai mover competitor: segue prezzo, alza qualità, presidia nicchia, accumula cassa. Imposta regole di ingaggio per Commerciale/Marketing. |

> **Nota:** Le leve ST-01…05 sono **decisioni di alto livello** (una per turno o ogni 2-3 turni). Si traducono in **vincoli/obiettivi** per le leve operative dei reparti (es. ST-01 = "Premium" → vincolo Prezzo ≥ refPrice, Quality target alto, Marketing awareness su segmenti high-end).

---

## 2. Condizione di Vittoria & KPI Strategici

| KPI Strategico | Formula / Fonte | Ruolo nel gioco |
|---|---|---|
| **Profitto Cumulato (PC)** | Σ EBIT trimestrali − tasse − interessi | **Condizione di vittoria primaria** (v0.1: 8 trimestri, PC max vince). |
| **ROIC Medio** | NOPAT medio / Capitale investito medio | Misura efficienza capitale; tie-break se PC pari. |
| **Quota di Mercato Finale** | Vendite ultime 4 trimestri / Domanda totale | Indica posizione competitiva; bonus reputazione per partite successive. |
| **Solidità Finanziaria** | (Cassa + Crediti − Debiti breve) / Fatturato | Vincolo sopravvivenza: se < soglia → risk of default (evento imprevisto). |
| **Indice Coerenza Strategica** | Media allineamento Prezzo/Qualità/Canali/Marketing vs ST-01 | Penalizza/premia domanda se disallineato (vedi conflitto Commerciale vs Marketing). |
| **Valore Opzioni Reali** | Valore atteso pipeline R&D + canali in sviluppo | KPI "lungo" per partite estese; non usato in v0.1. |

---

## 3. Trade-off Sistemici (Tensioni Chiave da Bilanciare)

| Tensione | Leve in conflitto | Meccanica di bilanciamento |
|---|---|---|
| **Crescita vs Redditività** | Prezzo basso (volume) vs Prezzo alto (margine) | Elasticità prezzo 1.8: volume cresce < proporzionale a sconto. Break-even visibile in Simulazione. |
| **Investimento vs Liquidità** | Capex stabilimenti/R&D vs Cassa/Overhead | Vincolo: Debito ≤ 2.5× EBITDA rolling 4Q; alert a 2.0×. |
| **Efficienza vs Flessibilità** | Automazione (costo fisso alto, variabile basso) vs Straordinari/Turni (costo variabile) | OEE gap: automazione riduce gap ma alza breakeven volume. |
| **Qualità Processo vs Qualità Percepita** | OP-05 (ppm) vs RD-02 (focus qualità) | Ritardo 2-3 trimestri: qualità processo alimenta percepita. Disallineamento = spreco. |
| **Concentrazione vs Diversificazione Canali** | Key Retailer (volume, margine basso) vs Propri/Online (margine, controllo) | Rischio concentrazione: se >40% su 1 canale → evento "perdita key account" più probabile. |
| **Breve vs Lungo Termine** | Marketing Performance (domanda immediata) vs Awareness (domanda ritardata) | Saturazione performance: ROI decresce >30% budget su performance. |

---

## 4. Scenario Competitivo & Interazioni Giocatori

| Elemento | Regola / Dinamica |
|---|---|
| **Mercato condiviso** | Domanda totale 10.000 unità/trimestre (v0.1), allocata per **attrattività** = (refPrice/prezzo)^elasticità. Somma quote = 100%. |
| **Visibilità mosse** | A fine turno: **prezzo, capacità dichiarata, spesa marketing aggregata** visibili a tutti. Capex, R&D, dettagli HR **nascosti** (solo trend). |
| **Reazione competitiva** | Se un player taglia prezzo >10% vs media → **effetto emulazione**: elasticità effettiva sale +0.2 per tutti (guerra prezzi). |
| **Barriere uscita/entrata** | Capex stabilimenti irreversibile (valore residuo 30%). Nuovi entrant (bot) partono con 1 stabilimento, capitale ridotto. |
| **Informazione asimmetrica** | Demand Planner stima domanda **totale**, non per competitor. Stima migliorata da Marketing Awareness + storico. |
| **Bot (simulatori)** | 4 giocatori minimi. Bot usano **euristiche** basate su ST-01…03 assegnati a caso (Costo/Bilanciato/Premium/Nicchia). Leggermente sub-ottimali: ritardo 1 turno reazione, no what-if avanzato. |

---

## 5. Imprevisti Strategici (Eventi Ambientali — valgono per TUTTI)

| ID | Evento | Probabilità base | Impatto sistemico | Parametro host "Livello eventi" |
|---|---|---|---|---|
| **EV-01** | **Shock Domanda** (±20-30% totalDemand 1-2 trimestri) | 15%/trim | Tutti: capacità inutilizzata o vendite perse. Chi ha flessibilità (straordinari, scorta) guadagna. |
| **EV-02** | **Crisi Materie Prime** (+15-25% unitCost) | 10%/trim | Operations/Finance: margine compresso. Automazione/qualità processo attenuano. |
| **EV-03** | **Cambio Normativo** (nuovo standard qualità/ambiente) | 8%/trim | Capex obbligatorio 1-2 trimestri per conformità. Penalizza chi ha impianti vecchi. |
| **EV-04** | **Nuovo Entrante Aggressivo** (bot extra, prezzo -15%, 4 trimestri) | 5%/partita | Guerra prezzi: elasticità +0.3 per tutti. Esce se share <5% per 2 trimestri. |
| **EV-05** | **Trend Consumi** (spostamento preferenze segmento) | 12%/trim | Segmento target cresce/calà 20%. Premia chi ha Segmentazione Target (MK-04) allineata. |
| **EV-06** | **Crisi Finanziaria Sistema** (costo debito +2-3pp, credito stretto) | 6%/trim | Finance: rifinanziamento difficile. Chi ha cassa/low leverage avvantaggiato. |
| **EV-07** | **Innovazione Disruptive** (nuovo standard prodotto, R&D azzera pipeline non allineata) | 3%/partita | R&D: pipeline non coerente = sunk cost. Chi investe in "esplorazione" (ST-04) ha opzioni. |
| **EV-08** | **Boom Economico** (domanda +15%, costo lavoro +10%) | 10%/trim | HR/Operations: straordinari costosi, assunzioni lente. Automazione premia. |

> **Calibrazione host:** "Livello eventi" = moltiplicatore probabilità (0.5 = basso, 1 = standard, 2 = alto). Intensità impatto scala con √moltiplicatore.

---

## 6. Interfaccia verso Reparti (Cosa riceve / Cosa impone)

| Reparto | Input da Strategia (vincoli/obiettivi) | Output verso Strategia (KPI/alert) |
|---|---|---|
| **Operations** | Target capacità, max capex/trimestre, profilo rischio guasti | Capacità reale, OEE, costi unitari, ppm, capex speso |
| **Commerciale** | Vincolo prezzo min/max per posizionamento, target canali | Prezzo realizzato, volumi per canale, marginalità canale, key account risk |
| **Marketing** | Budget totale, split awareness/performance, segmenti target | Awareness per segmento, ROI canali, saturazione, brand index |
| **HR** | Organico target, budget formazione, policy straordinari/turni | Organico effettivo, turnover, morale, produttività/ore, costo lavoro |
| **Finance** | Leva max, soglia cassa minima, politica dividendi | Cassa, debito, EBITDA, ROIC, cash flow, covenant status |
| **R&D** | Budget % fatturato, focus (processo/prodotto/radicale), n. progetti paralleli | Pipeline, time-to-market, brevetti, qualità percepita contributo |
| **Supply Chain** | Livello servizio target, scorta sicurezza max, fornitori single/dual | Service level, giorni scorta, costo acquisto, rischio fornitura |

---

## 7. Priorità di Implementazione (MoSCoW per Dominio Strategia)

| Priorità | Elemento | Note |
|---|---|---|
| **Must** | ST-01 Posizionamento (3 opzioni), Condizione vittoria Profitto Cumulato, Trade-off Crescita/Redditività visibile in Simulazione, Eventi EV-01, EV-02, EV-05 | Core loop strategico v0.1+v1.0 |
| **Should** | ST-02 Orizzonte Investimenti, ST-03 Profilo Rischio, KPI ROIC/Solidità/Coerenza, Eventi EV-03, EV-04, EV-06, Visibilità mosse competitor (prezzo, capacità, marketing agg.) | Profondità strategica v1.0 |
| **Could** | ST-04 Allocazione Core/Nuove, ST-05 Strategia Competitiva Attiva, Valore Opzioni Reali, Eventi EV-07, EV-08, Informazione asimmetrica Demand Planner | Partite lunghe / modalità avanzata |
| **Won't (v0.1)** | Acquisizioni, Alleanze, Multi-mercato geografico, LLM-driven demand come fornitore domanda | Fuori scope v1.0 |

---

## 8. Note per Game Designer / PM

1. **Simulazione Tab** deve mostrare **break-even volume** e **sensibilità prezzo↔volume** dato il posizionamento scelto (ST-01). È il ponte tra Strategia e decisioni operative.
2. **Demand Planner**: la stima domanda totale è **input strategico**; la ripartizione per competitor è **output simulazione**. Il giocatore vede storico quote + prezzi competitor → stima propria quota.
3. **Bot**: assegnare a ciascun bot un **tripletta (ST-01, ST-02, ST-03)** all'ingresso. Comportamento = euristica coerente + rumore ±10% su leve operative.
4. **Eventi**: implementare come **modificatori temporanei** su parametri base (totalDemand, unitCost, elasticità, costo debito). Durata 1-4 trimestri. Notifica all'inizio turno "Evento attivo: …".
5. **Coerenza Strategica**: calcolo semplice → penalità lineare su domanda se Prezzo/Qualità/Canali/Marketing fuori range per ST-01 scelto. Es. Premium + prezzo < 0.9×refPrice → domanda ×0.85.

---

**Prossimo step suggerito:** validare con Game Designer la **formula coerenza strategica** e i **range vincolanti** per ogni posizionamento (Costo / Differenziazione / Focus), così da rendere i trade-off tangibili nel Tab Simulazione.

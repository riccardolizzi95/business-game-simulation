# Proposta — T-001: Progettare la suddivisione della UI in sezioni

- Ruolo: **designer-ux**
- Provider/modello: `openrouter:nvidia/nemotron-3-ultra-550b-a55b:free`
- Generata: 2026-07-25 10:53:36

---

# Proposta T-001: Navigazione a Sezioni (Mobile-First)

---

## 1. Sezioni & Contenuti

| Tab (Icona) | Sezione | Contenuto Principale | Azioni Primarie |
|-------------|---------|---------------------|-----------------|
| 📊 **Cruscotto** | KPI sintetici, stato turno, alert | • Cash, Margine, Quota mercato, Soddisfazione clienti<br>• Turno corrente / Totale turni<br>• Alert critici (es. cash < soglia, stock out) | → Vai a Decisioni (CTA principale)<br>→ Dettaglio KPI (tap card) |
| 🎯 **Decisioni** | Input leve strategiche | • Prezzo prodotto (slider + input numerico)<br>• Budget Marketing (slider)<br>• Capacità produttiva (stepper)<br>• R&S / Qualità (toggle + importo)<br>• **Riepilogo impatto stimato** (anteprima) | **Conferma turno** (bottom sticky)<br>Reset bozza |
| 🏪 **Mercato** | Contesto competitivo | • Tabella competitor (Prezzo, Quota, Marketing stimato)<br>• Grafico andamento domanda (ultimi 5 turni)<br>• Eventi di mercato (news card) | Filtro turno<br>Dettaglio competitor (modal) |
| 🏆 **Classifica** | Ranking multiplayer | • Podio (top 3) + posizione giocatore<br>• Lista paginata (Nome, Cash, Quota, Trend)<br>• Filtro: Globale / Amici / Gruppo | Condividi risultato<br>Invita amici |

---

## 2. Schema di Navigazione

```
┌─────────────────────────────────────┐
│  Header: Logo + Turno X/Y + Cash    │  ← Sempre visibile (sticky top)
├─────────────────────────────────────┤
│                                     │
│        CONTENUTO SEZIONE            │  ← Scrollabile, safe-area bottom
│                                     │
├─────────────────────────────────────┤
│  [📊]  [🎯]  [🏪]  [🏆]             │  ← Tab Bar fissa (safe-area inset)
│  Crusc  Decis  Merc  Class          │     Altezza: 56dp + safe-bottom
└─────────────────────────────────────┘
```

**Principi mobile:**
- **Tab bar sempre visibile** (no hamburger): 4 sezioni = cognitive load basso
- **Header sticky** con info critiche (turno, cash) → zero tap per contesto
- **CTA primaria sticky in Decisioni** ("Conferma turno") → thumb zone
- **Swipe orizzontale tra tab** opzionale (gesture secondaria)
- **Stato attivo**: icona filled + label bold + accent color

---

## 3. Wireframe Testuali

### 3.1 CRUSCOTTO (Dashboard)

```
┌─────────────────────────────────────┐
│  🏢 Business Game        Turno 3/10 │
│  💰 Cash: € 1.245.000  ▲ +12%       │
├─────────────────────────────────────┤
│  ⚠️  ATTENZIONE: Stock < 10%        │  ← Alert banner (rosso, dismissible)
├─────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐    │
│  │ 📈 MARGINE  │ │ 🎯 QUOTA    │    │  ← KPI Cards (tap → dettaglio)
│  │   23.4%     │ │   18.2%     │    │
│  │   ▲ +2.1pp  │ │   ▼ -0.5pp  │    │
│  └─────────────┘ └─────────────┘    │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ 😊 SATISF.  │ │ 📦 STOCK    │    │
│  │   4.2 / 5   │ │   67%       │    │
│  │   ▲ +0.3    │ │   ⚠️ Basso  │    │
│  └─────────────┘ └─────────────┘    │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │  📊 ANDAMENTO CASH (sparkline)│  │  ← Mini-chart ultimi 5 turni
│  │  ▁▂▃▅▆▇█▇▆▅▃▂▁                │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  [ 🎯 VAI ALLE DECISIONI ]          │  ← Primary CTA (full-width, sticky)
└─────────────────────────────────────┘
│  [📊]  [🎯]  [🏪]  [🏆]             │
│  Crusc  Decis  Merc  Class          │
└─────────────────────────────────────┘
```

### 3.2 DECISIONI (Input Turno)

```
┌─────────────────────────────────────┐
│  🏢 Business Game        Turno 3/10 │
│  💰 Cash: € 1.245.000               │
├─────────────────────────────────────┤
│  🎯 DECISIONI TURNO 3               │
│  ┌───────────────────────────────┐  │
│  │ 💲 PREZZO UNITARIO            │  │
│  │ € 45 ────────●────── € 85     │  │  ← Slider + input numerico
│  │      Attuale: € 62            │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 📢 BUDGET MARKET

# 08 — Team di agenti riutilizzabile tra progetti (visione)

> 🌟 **Visione a tendere.** Oggi il team vive dentro questo progetto. L'obiettivo è farlo
> diventare una **squadra vera e riutilizzabile** su più progetti. Ci arriviamo per gradi.

## Obiettivo
Una squadra di agenti (PM, architetto, backend, frontend, tester, designer, …) che:
1. **Si ricicla su più progetti** — non la ricreiamo ogni volta.
2. Ha **competenze condivise** e **impara da tutti i progetti** (una memoria che cresce).
3. Mantiene una **compartimentazione per progetto**: ciò che fa e vede su un progetto resta
   separato dagli altri (contesto, dati, segreti isolati).

## Architettura target: 3 livelli
```
┌─────────────────────────────────────────────────────────────┐
│  1. CORE DEL RUOLO (condiviso, globale)                      │
│     competenze durature: "come lavora un architetto", ecc.   │
│     → vive fuori dal singolo progetto (es. ~/.claude o repo  │
│       "agent-team" dedicato)                                 │
├─────────────────────────────────────────────────────────────┤
│  2. KNOWLEDGE BASE CONDIVISA (cross-progetto)                │
│     lezioni apprese, pattern, errori da non ripetere,        │
│     convenzioni riutilizzabili → "l'apprendimento" del team  │
├─────────────────────────────────────────────────────────────┤
│  3. OVERLAY DI PROGETTO (isolato, per-progetto)              │
│     contesto specifico (questo Business Game), board, dati,  │
│     segreti, proposte → NON esce dal progetto                │
└─────────────────────────────────────────────────────────────┘
Persona effettiva = CORE (1) + KNOWLEDGE (2) + OVERLAY (3)
```

## Compartimentazione (sicurezza e isolamento)
- Segreti, dati e proposte di un progetto **non** sono accessibili da un altro.
- La knowledge base condivisa contiene **lezioni generalizzate**, mai dati sensibili di un
  cliente/progetto specifico. Regola: si condivide il *come*, non il *cosa* riservato.

## Come ci arriviamo (passi realistici)
1. **Ora:** separare, nei file `.claude/agents/*.md`, il **core del ruolo** (competenze
   generali) dall'**overlay di progetto** (specificità Business Game). Oggi sono mischiati.
2. Creare un repo/cartella **`agent-team` condiviso** con i core dei ruoli + la knowledge base.
3. Definire il formato delle **"lezioni apprese"** (una lezione = problema → soluzione →
   quando si applica), scritte dagli agenti a fine task e raccolte nella KB condivisa.
4. Far sì che l'orchestratore componga la persona da: core condiviso + KB rilevante + overlay.
5. Rendere l'orchestratore **multi-progetto** (una board per progetto, KB comune).

## Stato attuale vs target
- **Oggi:** ruoli e orchestratore vivono solo qui; le persona sono già in file separati e
  riusate sia dai subagent Claude sia dall'orchestratore (buona base).
- **Manca:** estrazione del core condiviso, knowledge base cross-progetto, meccanismo di
  "apprendimento" (lezioni), isolamento formale per progetto.

> Nota: teniamo questa visione allineata con `docs/03-team-agenti.md` (stato reale) e con
> l'orchestratore (`orchestrator/`). È un'evoluzione, non una riscrittura.

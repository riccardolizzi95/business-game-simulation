# Autonomia locale del team di agenti

Come tenere il team attivo **sul tuo Mac**, senza cloud. Due meccanismi complementari.

## 1. Mentre sviluppi — Daemon locale
Un programma che gira in un terminale e tiene vivi gli agenti: ogni ciclo processa in
**parallelo** i task `todo` della board (genera proposte) e, una volta al giorno, esegue il
Model Curator.

**Imposta la chiave UNA volta sola** creando un file `.env` nella radice del progetto
(è ignorato da git, la chiave non finisce mai nel repo):
```bash
cd /path/to/business-game   # la cartella del progetto
cat > .env <<'ENV'
ORCH_MODE=live
OPENROUTER_API_KEY=sk-or-v1-...la-tua-chiave...
ENV
```
Poi basta lanciare, senza più `export`:
```bash
python3 orchestrator/daemon.py             # Ctrl-C per fermarlo
```
(In alternativa puoi ancora usare gli `export` a mano; l'ambiente reale ha la precedenza sul `.env`.)
Opzioni utili:
- `ORCH_DAEMON_POLL=300` secondi tra un ciclo e l'altro (default 5 min).
- `ORCH_MAX_PARALLEL=3` task in parallelo per ondata.
- Senza `ORCH_MODE=live`/chiave, gira in **dry-run** (mock, gratis) — utile per provarlo.

Il daemon non fa nulla di distruttivo: genera **proposte** (da revisionare) e aggiorna i
modelli tracciando tutto. Quando non ci sono task `todo`, resta in attesa senza sporcare i log.

## 2. Sempre (anche quando non sviluppi) — Curator giornaliero via launchd
Perché l'infrastruttura non "decada", il **solo** Model Curator deve girare ogni giorno anche
a daemon spento. Su macOS si usa un LaunchAgent (`launchd`).

Installazione (una tantum — i comandi li lanci **tu**):
```bash
cd /path/to/business-game   # la cartella del progetto
chmod +x orchestrator/launchd/run-curator.sh
cp orchestrator/launchd/com.businessgame.model-curator.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.businessgame.model-curator.plist
# prova subito (facoltativo):
launchctl start com.businessgame.model-curator
```
- Gira ogni giorno alle **09:00**; se il Mac è spento/dormiente, launchd esegue il job mancato
  al risveglio. (Modifica l'orario nel `.plist`, poi `unload`+`load` per applicare.)
- Log in `orchestrator/curator-cron.log`.
- Il curator committa da solo? No: qui **modifica i file** (models.json, MODEL-WATCH,
  NOTIFICATIONS) ma **non** fa commit/push. Al prossimo avvio di Claude ("leggi il progetto")
  vedrai gli avvisi e potremo committare. In futuro possiamo aggiungere l'auto-commit.

Per disinstallare:
```bash
launchctl unload ~/Library/LaunchAgents/com.businessgame.model-curator.plist
rm ~/Library/LaunchAgents/com.businessgame.model-curator.plist
```

## ⚠️ Standby del Mac e task lunghi (`caffeinate`)
Quando il Mac va in **standby/sleep**, i processi in corso (es. una lunga raccolta requisiti)
vengono **sospesi** e la rete cade → il task si blocca. Per evitarlo su macOS c'è il comando
nativo **`caffeinate`**:
```bash
# tieni sveglio il Mac per tutta la durata di un comando lungo:
caffeinate -i python3 orchestrator/requirements.py

# oppure, tieni sveglio finché finisce un processo già avviato (per PID):
caffeinate -i -w <PID>
```
- `-i` previene lo sleep **da inattività** (il caso più comune).
- ⚠️ **Chiudere il coperchio** di un MacBook lo manda comunque in sleep (a meno di clamshell con
  alimentazione + monitor esterno). Per run lunghi non presidiati: **coperchio aperto + a
  corrente**. In alternativa, System Settings → Batteria/Alimentatore → "impedisci sospensione".

## E il cloud?
Per ora **non serve**: teniamo tutto locale. Se un giorno vorrai che gli agenti girino anche a
Mac spento, i workflow GitHub Actions (`.github/workflows/`) fanno la stessa cosa in cloud
(vedi ADR-0005). Restano pronti ma non obbligatori.

## Riepilogo
| Cosa | Quando | Comando |
|---|---|---|
| Team attivo (parallelo) | mentre sviluppi | `python3 orchestrator/daemon.py` |
| Curator giornaliero | sempre | LaunchAgent `launchd` (vedi sopra) |
| Un giro singolo manuale | a richiesta | `python3 orchestrator/run.py` |
| Controllo modelli manuale | a richiesta | `python3 orchestrator/curator.py --check` |

#!/bin/zsh
# Wrapper per launchd/cron: esegue il Model Curator dalla root del progetto.
# Usa una login shell (il .plist chiama `zsh -lc`) così `python3` è nel PATH.
cd "$(dirname "$0")/../.." || exit 1
exec python3 orchestrator/curator.py >> orchestrator/curator-cron.log 2>&1

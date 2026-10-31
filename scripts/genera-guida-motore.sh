#!/usr/bin/env bash
# Genera la versione stampabile (HTML A4 + PDF) della guida al motore.
#
# Non serve installare LaTeX: si usa pandoc per l'HTML e Chrome in modalita' headless per il PDF,
# che rispetta il CSS di stampa (@page A4). Rigenerare dopo ogni modifica al markdown.
set -euo pipefail
cd "$(dirname "$0")/.."

SORGENTE="docs/16-come-funziona-il-motore.md"
USCITA="docs/stampa"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$USCITA"
pandoc "$SORGENTE" -f gfm -t html5 --standalone --embed-resources \
  --css "docs/stampa/stampa.css" \
  --metadata title="Business Game — Come funziona il motore" \
  -o "$USCITA/come-funziona-il-motore.html"

if [ -x "$CHROME" ]; then
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="$PWD/$USCITA/come-funziona-il-motore.pdf" \
    "file://$PWD/$USCITA/come-funziona-il-motore.html" 2>/dev/null || true
  echo "Fatto: $USCITA/come-funziona-il-motore.pdf"
else
  echo "Chrome non trovato: generato solo l'HTML (stampabile dal browser con Cmd+P)."
fi

#!/usr/bin/env bash
# Barrierefreiheits-Supertest mit einem Befehl:
#   ./supertest.sh                         Demo-Seiten prüfen
#   ./supertest.sh https://www.example.de  eigene Website prüfen
# Installiert beim ersten Mal die Pakete und Chromium, öffnet am Ende reports/bericht.html.
set -uo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm ci
npx playwright install chromium >/dev/null 2>&1 || npx playwright install chromium
[ -n "${1:-}" ] && export BASE_URL="$1"
npm run supertest
status=$?
if [ -f reports/bericht.html ]; then
  echo "Bericht: $(pwd)/reports/bericht.html"
  (command -v xdg-open >/dev/null && xdg-open reports/bericht.html >/dev/null 2>&1) || \
  (command -v open >/dev/null && open reports/bericht.html) || true
fi
exit $status

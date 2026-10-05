#!/usr/bin/env bash
# Scenarios 6 et 7 : requetes continues sur les deux services routes pendant
# <secondes>, puis bilan des codes HTTP et des versions vues.
# A lancer sur une machine qui resout nebula.local (ex. la VM registry).
#   ./scripts/charge.sh 120
set -euo pipefail
D=${1:-120}; H=${HOST:-nebula.local}
OUT=$(mktemp); END=$(( $(date +%s) + D ))
while [ "$(date +%s)" -lt "$END" ]; do
  for u in /api/health /api/comptes/1; do
    r=$(curl -s -m 3 -w " %{http_code}" "http://$H$u" || true)
    v=$(echo "$r" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
    echo "$u ${r##* } $v" >> "$OUT"
  done
done
echo "== $(wc -l < "$OUT") requetes (route, code HTTP)"
awk '{print $1, $2}' "$OUT" | sort | uniq -c
echo "== versions vues sur /api/health"
grep '^/api/health 200' "$OUT" | awk '{print $3}' | sort | uniq -c
rm -f "$OUT"

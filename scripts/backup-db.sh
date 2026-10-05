#!/usr/bin/env bash
# A lancer sur le noeud de donnees (swarm-3), dans le depot clone.
# Sauvegarde de la base : dump depuis le conteneur db dans backups/
# (ignore par git).
#   ./scripts/backup-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
F="backups/nebula-$(date +%Y%m%d-%H%M%S).dump"
docker exec "$(docker ps -q -f name=nebula_db)" pg_dump -U nebula -d nebula -Fc > "$F"
[ -s "$F" ] || { rm -f "$F"; echo "sauvegarde vide : echec" >&2; exit 1; }
echo "$F ($(wc -c < "$F" | tr -d ' ') octets)"

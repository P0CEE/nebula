#!/usr/bin/env bash
# Sauvegarde de la base : dump depuis le conteneur db, rapatrie sur ce poste
# (hors du noeud de donnees) dans backups/ (ignore par git).
#   ./scripts/backup-db.sh [hote-ssh-du-noeud-de-donnees]
set -euo pipefail
cd "$(dirname "$0")/.."
H=${1:-swarm-3}
mkdir -p backups
F="backups/nebula-$(date +%Y%m%d-%H%M%S).dump"
ssh "$H" 'docker exec $(docker ps -q -f name=nebula_db) pg_dump -U nebula -d nebula -Fc' > "$F"
[ -s "$F" ] || { rm -f "$F"; echo "sauvegarde vide : echec" >&2; exit 1; }
echo "$F ($(wc -c < "$F" | tr -d ' ') octets)"

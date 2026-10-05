#!/usr/bin/env bash
# Sauvegarde de la base : dump depuis le conteneur db (contexte Docker
# nebula-data = swarm-3), rapatrie sur ce poste dans backups/ (ignore par git).
#   ./scripts/backup-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula-data}
mkdir -p backups
F="backups/nebula-$(date +%Y%m%d-%H%M%S).dump"
docker exec "$(docker ps -q -f name=nebula_db)" pg_dump -U nebula -d nebula -Fc > "$F"
[ -s "$F" ] || { rm -f "$F"; echo "sauvegarde vide : echec" >&2; exit 1; }
echo "$F ($(wc -c < "$F" | tr -d ' ') octets)"

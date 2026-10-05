#!/usr/bin/env bash
# Restaure une sauvegarde de backup-db.sh (contexte Docker nebula-data =
# swarm-3) : remplace le contenu actuel (--clean), en une seule transaction.
#   ./scripts/restore-db.sh backups/nebula-AAAAMMJJ-HHMMSS.dump
set -euo pipefail
F=${1:?usage: restore-db.sh <fichier.dump>}
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula-data}
[ -s "$F" ] || { echo "fichier introuvable ou vide : $F" >&2; exit 1; }
docker exec -i "$(docker ps -q -f name=nebula_db)" \
  pg_restore -U nebula -d nebula --clean --if-exists --single-transaction < "$F"
echo "restauration de $F terminee"

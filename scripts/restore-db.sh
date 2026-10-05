#!/usr/bin/env bash
# A lancer sur le noeud de donnees (swarm-3), dans le depot clone.
# Restaure une sauvegarde de backup-db.sh : remplace le contenu actuel
# (--clean), en une seule transaction.
#   ./scripts/restore-db.sh backups/nebula-AAAAMMJJ-HHMMSS.dump
set -euo pipefail
F=${1:?usage: restore-db.sh <fichier.dump>}
[ -s "$F" ] || { echo "fichier introuvable ou vide : $F" >&2; exit 1; }
docker exec -i "$(docker ps -q -f name=nebula_db)" \
  pg_restore -U nebula -d nebula --clean --if-exists --single-transaction < "$F"
echo "restauration de $F terminee"

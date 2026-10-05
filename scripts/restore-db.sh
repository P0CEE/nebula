#!/usr/bin/env bash
# Restauration de la base depuis une sauvegarde de backup-db.sh.
# Remplace le contenu actuel (--clean), en une seule transaction.
#   ./scripts/restore-db.sh backups/nebula-AAAAMMJJ-HHMMSS.dump [hote-ssh]
set -euo pipefail
F=${1:?usage: restore-db.sh <fichier.dump> [hote-ssh]}
H=${2:-swarm-3}
[ -s "$F" ] || { echo "fichier introuvable ou vide : $F" >&2; exit 1; }
ssh "$H" 'docker exec -i $(docker ps -q -f name=nebula_db) pg_restore -U nebula -d nebula --clean --if-exists --single-transaction' < "$F"
echo "restauration de $F terminee"

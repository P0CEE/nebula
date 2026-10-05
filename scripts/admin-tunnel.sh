#!/usr/bin/env bash
# Tableau de bord Traefik : non publie, accessible seulement par tunnel SSH
# vers le manager (acces restreint), puis mot de passe (utilisateur admin).
#   ./scripts/admin-tunnel.sh [hote-ssh-du-manager]
#   -> http://localhost:8088/dashboard/
set -euo pipefail
M=${1:-swarm-1}

# Traefik ecoute sur :8080 dans son conteneur ; le manager l'atteint par
# l'adresse du conteneur sur docker_gwbridge.
IP=$(ssh "$M" 'c=$(docker ps -q -f name=edge_traefik); docker network inspect docker_gwbridge -f "{{range \$k,\$v := .Containers}}{{if eq (slice \$k 0 12) \"$c\"}}{{\$v.IPv4Address}}{{end}}{{end}}"' | cut -d/ -f1)
[ -n "$IP" ] || { echo "Traefik introuvable sur $M" >&2; exit 1; }

echo "Tableau de bord : http://localhost:8088/dashboard/ (Ctrl+C pour fermer)"
exec ssh -N -o ExitOnForwardFailure=yes -L "8088:$IP:8080" "$M"

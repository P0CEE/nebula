#!/usr/bin/env bash
# Deploie ou met a jour edge puis nebula sur le cluster (contexte Docker
# nebula = manager swarm-1). Sert au deploiement initial, aux mises a jour et
# au retour arriere (redeployer l'ancien tag).
#   ./scripts/deploy.sh v2
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=${1:?usage: deploy.sh <tag-image>}
REGISTRY=${REGISTRY:-10.96.252.20:5000}
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula}

# edge cree edge_public ; juste apres un 'stack rm', le reseau peut encore
# etre en cours de suppression : on reessaie.
for i in $(seq 1 10); do
  docker stack deploy -d -c swarm/stack.edge.yml edge >/dev/null 2>&1 && break
  sleep 3
done
REGISTRY=$REGISTRY TAG=$TAG docker stack deploy -d --with-registry-auth \
  -c swarm/stack.nebula.todo.yml nebula
echo "deploye : $TAG ($(git rev-parse --short HEAD)). Suivi : docker service ls"

#!/usr/bin/env bash
# Deploie (ou met a jour) edge puis nebula sur le cluster, depuis le commit
# courant. Sert au deploiement initial, aux mises a jour et au retour arriere.
#   ./scripts/deploy.sh v2
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=${1:?usage: deploy.sh <tag-image>}
M=${MANAGER:-swarm-1}
REGISTRY=${REGISTRY:-10.96.252.20:5000}

git archive HEAD | ssh "$M" 'rm -rf ~/nebula && mkdir ~/nebula && tar -xf - -C ~/nebula'
ssh "$M" "cd ~/nebula
  # edge cree edge_public ; juste apres un 'stack rm', le reseau peut encore
  # etre en cours de suppression : on reessaie.
  for i in \$(seq 1 10); do docker stack deploy -d -c swarm/stack.edge.yml edge >/dev/null 2>&1 && break; sleep 3; done
  REGISTRY=$REGISTRY TAG=$TAG docker stack deploy -d --with-registry-auth \
    -c swarm/stack.nebula.todo.yml nebula"
echo "deploye : $TAG. Suivi : ssh $M docker service ls"

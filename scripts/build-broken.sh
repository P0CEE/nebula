#!/usr/bin/env bash
# Scenario 8 : fabrique une version defectueuse d'un service (le processus
# s'arrete au demarrage) et la pousse sous le tag <base>-casse.
# Construit sur le moteur Docker de la VM registry (contexte nebula-registry).
#   ./scripts/build-broken.sh comptes v2
set -euo pipefail
REGISTRY=${REGISTRY:-10.96.252.20:5000}
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula-registry}
S=${1:-comptes}; BASE=${2:-v2}
IMG="$REGISTRY/nebula-$S"
printf 'FROM %s:%s\nCMD ["node", "-e", "console.error(\\"version defectueuse\\"); process.exit(1)"]\n' "$IMG" "$BASE" \
  | docker build -q -t "$IMG:$BASE-casse" -
docker push -q "$IMG:$BASE-casse"
echo "pousse : $IMG:$BASE-casse"

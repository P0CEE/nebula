#!/usr/bin/env bash
# Construit les trois services sur le moteur Docker de la VM registry
# (contexte nebula-registry, amd64 comme le cluster) et les pousse, avec deux
# tags : la version (v2) et l'empreinte du commit (v2-3f9c2ab).
#   ./scripts/build-push.sh v2
set -euo pipefail
cd "$(dirname "$0")/.."
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula-registry}
[ -z "$(git status --porcelain)" ] || { echo "arbre git modifie : commitez d'abord" >&2; exit 1; }
REGISTRY=${REGISTRY:-10.96.252.20:5000}
TAG=${1:-v1}
SHA=$(git rev-parse --short HEAD)

for s in comptes publications worker-medias; do
  IMG="$REGISTRY/nebula-$s"
  echo "== $IMG:$TAG + $IMG:$TAG-$SHA"
  docker build --build-arg "APP_VERSION=$TAG" \
    --label "org.opencontainers.image.version=$TAG" \
    --label "org.opencontainers.image.revision=$SHA" \
    -t "$IMG:$TAG" -t "$IMG:$TAG-$SHA" "./services/$s"
  docker push "$IMG:$TAG"
  docker push "$IMG:$TAG-$SHA"
done
echo
echo "Tags pousses. Rappel : jamais 'latest' sur un cluster."

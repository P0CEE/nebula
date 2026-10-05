#!/usr/bin/env bash
# Construit les trois services et les pousse dans votre registry, avec deux
# tags : la version (v2) et l'empreinte du commit (v2-3f9c2ab).
#   REGISTRY=10.96.252.20:5000 ./scripts/build-push.sh v2
# Hors depot git (archive), passer l'empreinte : GIT_SHA=3f9c2ab ...
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1
REGISTRY=${REGISTRY:-registry.local:5000}
TAG=${1:-v1}
SHA=${GIT_SHA:-$(git rev-parse --short HEAD)}

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

#!/usr/bin/env bash
# Construit et publie une version a partir du commit courant, sur la VM
# registry (amd64, comme le cluster). Tags : <version> et <version>-<sha>.
#   ./scripts/release.sh v3
set -euo pipefail
cd "$(dirname "$0")/.."
TAG=${1:?usage: release.sh <version>}
[ -z "$(git status --porcelain)" ] || { echo "arbre git modifie : commitez d'abord" >&2; exit 1; }
SHA=$(git rev-parse --short HEAD)
git archive HEAD | ssh registry 'rm -rf ~/nebula-build && mkdir ~/nebula-build && tar -xf - -C ~/nebula-build'
ssh registry "cd ~/nebula-build && GIT_SHA=$SHA REGISTRY=10.96.252.20:5000 ./scripts/build-push.sh $TAG"

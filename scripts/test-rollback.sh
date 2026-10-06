#!/usr/bin/env bash
# Scenario 8 : deploie une version defectueuse et chronometre le retour arriere
# automatique. Prealable : ./scripts/build-broken.sh <service> <version>
#   ./scripts/test-rollback.sh comptes v3
set -euo pipefail
export DOCKER_CONTEXT=${DOCKER_CONTEXT:-nebula}
S=nebula_${1:-comptes}; BAD=10.96.252.20:5000/nebula-${1:-comptes}:${2:-v3}-casse

echo "image avant : $(docker service inspect -f '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$S" | cut -d@ -f1)"
T0=$(date +%s); echo "deploiement de $BAD a $(date +%T)"
docker service update -d --with-registry-auth --image "$BAD" "$S" >/dev/null
TR=
while :; do
  st=$(docker service inspect -f '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{end}}' "$S")
  case "$st" in
    rollback_started) [ -z "$TR" ] && TR=$(date +%s) && echo "echec detecte, retour arriere lance a t+$((TR - T0))s" ;;
    rollback_completed) echo "retour arriere termine a t+$(( $(date +%s) - T0 ))s"; break ;;
    paused|rollback_paused) echo "etat : $st (intervention necessaire)"; break ;;
  esac
  [ $(( $(date +%s) - T0 )) -gt 300 ] && { echo "delai depasse (etat : $st)"; break; }
  sleep 1
done
echo "image apres : $(docker service inspect -f '{{.Spec.TaskTemplate.ContainerSpec.Image}}' "$S" | cut -d@ -f1)"
docker service ps "$S" --format '{{.Name}} {{.Image}} {{.CurrentState}} {{.Error}}' | grep casse | head -2

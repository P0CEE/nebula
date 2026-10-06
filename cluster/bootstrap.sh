#!/usr/bin/env bash
# Prepare les VM creees par create-vms.py : Docker, registry authentifie,
# cluster Swarm (1 manager + 2 workers), etiquette du noeud de donnees,
# secrets, certificat HTTPS, redirection du routeur, contextes Docker du poste.
# Idempotent : peut etre relance sans risque.
#   ./cluster/bootstrap.sh
# Prerequis : hotes SSH lab-router, swarm-1..3, registry ; docker et mkcert
# sur le poste (mkcert -install fait une fois).
set -euo pipefail
MANAGER=swarm-1; MANAGER_IP=10.96.252.11
WORKERS=(swarm-2 swarm-3); DATA_NODE=swarm-3
REGISTRY_HOST=registry; REGISTRY=10.96.252.20:5000

# Identifiants generes une fois dans .secrets/ (ignore par git, jamais pousse).
CREDS="$(cd "$(dirname "$0")/.." && pwd)/.secrets"
mkdir -p "$CREDS" && chmod 700 "$CREDS"
for f in registry-password admin-password portainer-password; do
  [ -s "$CREDS/$f" ] || (umask 077; openssl rand -hex 16 > "$CREDS/$f")
done

DAEMON_JSON="{\"insecure-registries\": [\"$REGISTRY\"], \"registry-mirrors\": [\"https://mirror.gcr.io\"]}"

echo "== Docker"
for h in "$MANAGER" "${WORKERS[@]}" "$REGISTRY_HOST"; do
  ssh "$h" "DAEMON_JSON='$DAEMON_JSON' bash -s" <<'EOF'
set -e
sudo cloud-init status --wait >/dev/null || true
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sudo sh >/dev/null
sudo usermod -aG docker "$USER"
# Registry en HTTP sur le LAN + miroir Docker Hub (limite de debit 429).
if [ "$(sudo cat /etc/docker/daemon.json 2>/dev/null)" != "$DAEMON_JSON" ]; then
  echo "$DAEMON_JSON" | sudo tee /etc/docker/daemon.json >/dev/null
  sudo systemctl restart docker
fi
echo "  $(hostname): $(sudo docker --version)"
EOF
done

echo "== Registry (hors cluster, authentifie)"
ssh "$REGISTRY_HOST" 'read -r P; set -e
sudo mkdir -p /opt/registry
[ -s /opt/registry/htpasswd ] || docker run --rm -q --entrypoint htpasswd httpd:2-alpine -Bbn nebula "$P" | sudo tee /opt/registry/htpasswd >/dev/null
if ! docker inspect registry -f "{{.Config.Env}}" 2>/dev/null | grep -q REGISTRY_AUTH=htpasswd; then
  docker rm -f registry >/dev/null 2>&1 || true
  docker run -d --name registry --restart=always -p 5000:5000 \
    -v registry_data:/var/lib/registry -v /opt/registry:/auth:ro \
    -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=nebula \
    -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:3 >/dev/null
fi
echo "  registry: $(docker ps -f name=registry --format "{{.Image}} {{.Status}}")"' < "$CREDS/registry-password"

echo "== Contextes Docker du poste (exploitation a distance, rien sur les serveurs)"
for c in nebula:swarm-1 nebula-data:swarm-3 nebula-registry:registry; do
  docker context inspect "${c%%:*}" >/dev/null 2>&1 || docker context create "${c%%:*}" --docker "host=ssh://${c#*:}" >/dev/null
done
# Identifiants du registry stockes cote poste (trousseau), transmis aux noeuds
# par 'stack deploy --with-registry-auth'.
docker --context nebula login "$REGISTRY" -u nebula --password-stdin < "$CREDS/registry-password" >/dev/null
echo "  contextes nebula, nebula-data, nebula-registry ; connecte au registry"

echo "== Cluster Swarm"
ssh "$MANAGER" "docker info -f '{{.Swarm.LocalNodeState}}' | grep -qx active || docker swarm init --advertise-addr $MANAGER_IP >/dev/null"
TOKEN=$(ssh "$MANAGER" docker swarm join-token -q worker)
for w in "${WORKERS[@]}"; do
  ssh "$w" "docker info -f '{{.Swarm.LocalNodeState}}' | grep -qx active || docker swarm join --token $TOKEN $MANAGER_IP:2377 >/dev/null"
done
ssh "$MANAGER" "docker node update --label-add nebula.data=true $DATA_NODE >/dev/null"

echo "== Routeur : port 443 du WAN -> cluster (nebula.test, traefik., rabbitmq.)"
ssh lab-router "uci -q get firewall.nebula_https >/dev/null || {
  uci set firewall.nebula_https=redirect
  uci set firewall.nebula_https.name=nebula-https
  uci set firewall.nebula_https.src=wan
  uci set firewall.nebula_https.src_dport=443
  uci set firewall.nebula_https.dest=lan
  uci set firewall.nebula_https.dest_ip=$MANAGER_IP
  uci set firewall.nebula_https.dest_port=443
  uci set firewall.nebula_https.proto=tcp
  uci set firewall.nebula_https.target=DNAT
  uci commit firewall && /etc/init.d/firewall reload
}"

echo "== Secrets (generes sur le manager, jamais affiches)"
ssh "$MANAGER" 'bash -s' <<'EOF'
set -e
absent() { ! docker secret inspect "$1" >/dev/null 2>&1; }
for s in nebula_db_password nebula_cache_password; do
  absent "$s" && openssl rand -hex 24 | tr -d '\n' | docker secret create "$s" - >/dev/null
done
if absent nebula_bus_password; then
  P=$(openssl rand -hex 24)
  printf %s "$P" | docker secret create nebula_bus_password - >/dev/null
  # Definitions RabbitMQ : utilisateur nebula + hash sha256 sale du mot de passe.
  H=$(printf %s "$P" | python3 -c 'import os,hashlib,base64,sys;p=sys.stdin.buffer.read();s=os.urandom(4);print(base64.b64encode(s+hashlib.sha256(s+p).digest()).decode())')
  printf '{"vhosts":[{"name":"/"}],"users":[{"name":"nebula","password_hash":"%s","hashing_algorithm":"rabbit_password_hashing_sha256","tags":["administrator"]}],"permissions":[{"user":"nebula","vhost":"/","configure":".*","write":".*","read":".*"}]}\n' "$H" \
    | docker secret create nebula_bus_users - >/dev/null
fi
true
EOF
ssh "$MANAGER" 'read -r P; docker secret inspect edge_admin_htpasswd >/dev/null 2>&1 || printf "admin:%s\n" "$(printf %s "$P" | openssl passwd -apr1 -stdin)" | docker secret create edge_admin_htpasswd - >/dev/null' < "$CREDS/admin-password"

docker --context nebula secret inspect portainer_admin_password >/dev/null 2>&1 || docker --context nebula secret create portainer_admin_password "$CREDS/portainer-password" >/dev/null

# Certificat HTTPS (autorite locale mkcert) : nebula.test et *.nebula.test.
mkdir -p "$CREDS/tls"
[ -s "$CREDS/tls/nebula.pem" ] && openssl x509 -in "$CREDS/tls/nebula.pem" -noout -ext subjectAltName | grep -q "nebula.test" || mkcert -cert-file "$CREDS/tls/nebula.pem" -key-file "$CREDS/tls/nebula-key.pem" nebula.test "*.nebula.test" 2>/dev/null
docker --context nebula secret inspect edge_tls_cert >/dev/null 2>&1 || docker --context nebula secret create edge_tls_cert "$CREDS/tls/nebula.pem" >/dev/null
docker --context nebula secret inspect edge_tls_key >/dev/null 2>&1 || docker --context nebula secret create edge_tls_key "$CREDS/tls/nebula-key.pem" >/dev/null

docker --context nebula node ls
docker --context nebula secret ls --format "  secret: {{.Name}}"


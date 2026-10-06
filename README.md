# Nebula

Reseau social minimal deploye sur un cluster Docker Swarm de trois VM
(1 manager, 2 workers) + une VM registry a cote du cluster.

- Exploitation, quel script lancer et ou : [docs/exploitation.md](docs/exploitation.md)
- Architecture, fonctionnement, questions : [docs/architecture.md](docs/architecture.md)
- Schema du cluster : [docs/schema-reseau.md](docs/schema-reseau.md)

```
cluster/   creation des VM (Proxmox) et bootstrap du cluster
swarm/     stacks : edge (Traefik), nebula (7 services + relais admin RabbitMQ), portainer
scripts/   build, deploiement, sauvegarde/restauration, tests
services/  comptes, publications, worker-medias (Node.js)
db/        schema initial Postgres
```

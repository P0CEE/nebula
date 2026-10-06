# Schema du cluster Swarm

Version image : [schema-reseau.png](schema-reseau.png).

Pointilles : reseau `edge_public`. Traits pleins : reseau `nebula_internal` (`internal: true`, sans sortie Internet).

```mermaid
flowchart TB
  subgraph swarm["Cluster Swarm : 1 manager + 2 workers (2377/tcp, 7946/tcp+udp, 4789/udp)"]
    direction TB
    ingress(("port 443 (HTTPS)<br/>SEUL port publie"))

    subgraph s1["swarm-1 10.96.252.11 - manager"]
      traefik["edge_traefik :443<br/>nebula.test<br/>traefik.nebula.test (mdp)"]
      portainer["portainer<br/>portainer.nebula.test (mdp)<br/>+ 1 agent par noeud"]
    end
    subgraph s12["swarm-1 + swarm-2 (nebula.data != true)"]
      comptes["comptes x3"]
      publications["publications x3"]
      worker["worker-medias x3<br/>vol. traces (par noeud)"]
      busadmin["bus-admin (relais)<br/>rabbitmq.nebula.test -> bus:15672"]
    end
    subgraph s3["swarm-3 10.96.252.13 - nebula.data=true"]
      db[("db Postgres 18<br/>vol. db_data")]
      bus[("bus RabbitMQ 4<br/>vol. bus_data")]
    end
    cache["cache Redis<br/>tmpfs"]
  end

  ingress --> traefik
  traefik -. "/api/comptes" .-> comptes
  traefik -. "/api/publications, /api/fil, /api/health" .-> publications
  traefik -. "rabbitmq.nebula.test" .-> busadmin
  traefik -. "portainer.nebula.test" .-> portainer

  comptes --> db
  publications --> comptes
  publications --> db
  publications --> cache
  publications -- "evenement" --> bus
  bus -- "file publications<br/>(erreurs -> publications.erreurs)" --> worker
  busadmin -- ":15672 seulement" --> bus
```

| Reseau | Membres | Joignable depuis |
|---|---|---|
| `edge_public` (overlay) | traefik, comptes, publications, bus-admin, portainer | Traefik uniquement |
| `nebula_internal` (overlay, `internal: true`) | comptes, publications, worker, db, bus, cache, bus-admin | services internes ; aucune sortie Internet |
| `portainer_agent` (overlay) | portainer, agents | Portainer uniquement |
| Port publie | 443 HTTPS (Traefik, routing mesh) | sur les 3 noeuds |

# Schema reseau Nebula

Version image : [schema-reseau.png](schema-reseau.png).

Pointilles : reseau `edge_public`. Traits pleins : reseau `nebula_internal` (`internal: true`, sans sortie Internet).

```mermaid
flowchart TB
  admin["Poste admin<br/>(NetBird)"]
  subgraph ecole["Reseau ecole"]
    pve["Proxmox 10.255.0.224"]
    router["Routeur OpenWRT<br/>WAN 10.210.0.33<br/>LAN 10.96.252.254"]
  end
  admin -- "VPN NetBird" --> router
  admin -- "API Proxmox" --> pve

  subgraph lan["LAN 10.96.252.0/24 (vn1020)"]
    registry["VM registry 10.96.252.20<br/>registry:3 :5000 (htpasswd)<br/>HORS cluster"]

    subgraph swarm["Cluster Swarm : 2377/tcp, 7946/tcp+udp, 4789/udp entre noeuds"]
      direction TB
      ingress(("port 80<br/>SEUL port publie"))

      subgraph s1["swarm-1 10.96.252.11 - manager"]
        traefik["edge_traefik :80<br/>nebula.local, traefik.nebula.local (mdp)"]
      end
      subgraph s12["swarm-1 + swarm-2 (nebula.data != true)"]
        comptes["comptes x3"]
        publications["publications x3"]
        worker["worker-medias x3<br/>vol. traces (par noeud)"]
        busadmin["bus-admin (relais socat)<br/>rabbitmq.nebula.local -> bus:15672 seulement"]
      end
      subgraph s3["swarm-3 10.96.252.13 - nebula.data=true"]
        db[("db Postgres 18<br/>vol. db_data")]
        bus[("bus RabbitMQ 4<br/>vol. bus_data")]
      end
      cache["cache Redis<br/>tmpfs"]
    end
  end

  router -- "redirection WAN :80 -> 10.96.252.11:80" --> ingress
  ingress --> traefik

  %% pointilles = reseau edge_public ; traits pleins = reseau nebula_internal
  traefik -. "edge_public : /api/comptes" .-> comptes
  traefik -. "edge_public : /api/publications, /api/fil, /api/health" .-> publications
  traefik -. "edge_public : rabbitmq.nebula.local" .-> busadmin
  busadmin -- ":15672" --> bus

  comptes -- "nebula_internal" --> db
  publications --> comptes
  publications --> db
  publications --> cache
  publications -- "evenement" --> bus
  bus -- "file publications<br/>(erreurs -> publications.erreurs)" --> worker

  swarm -. "pull images (authentifie)" .-> registry
```

| Reseau | Membres | Joignable depuis |
|---|---|---|
| `edge_public` (overlay) | traefik, comptes, publications, bus-admin | Traefik uniquement |
| `nebula_internal` (overlay, `internal: true`) | comptes, publications, worker, db, bus, cache | services internes ; aucune sortie Internet |
| Port publie | 80 (Traefik, routing mesh) | tout le LAN, sur les 3 noeuds |
| Admin Traefik | traefik.nebula.local (port 80) | mot de passe (basic auth) |
| Admin RabbitMQ | rabbitmq.nebula.local via le relais bus-admin (15672 uniquement) | login RabbitMQ ; le bus reste hors de edge_public |

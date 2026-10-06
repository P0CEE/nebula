# Architecture : comprendre et repondre aux questions

Pour la partie questions de la soutenance. Les demonstrations sont dans
[soutenance.md](soutenance.md).

## L'architecture en une minute 

- **3 VM, 1 cluster Swarm** : swarm-1 dirige (manager), swarm-2 et swarm-3
  executent (workers). Une 4e VM, registry, est **a cote** du cluster : il faut
  pouvoir tirer les images meme quand le cluster redemarre.
- **Un seul point d'entree** : Traefik, seul port publie (443, HTTPS). Il route
  par nom et par chemin : `nebula.test/api/...` vers l'appli,
  `traefik.`, `rabbitmq.`, `portainer.nebula.test` vers les outils d'admin
  (tous proteges par mot de passe).
- **Services sans etat** (comptes, publications, worker-medias) : 3 instances
  chacun, sur swarm-1 et swarm-2, mis a jour une instance a la fois.
- **Services avec etat** (db Postgres, bus RabbitMQ) : 1 instance, **epingles**
  sur swarm-3 (etiquette `nebula.data=true`), car leurs volumes sont locaux a
  ce noeud. Le cache Redis est volatil (tmpfs), il peut aller n'importe ou.
- **Deux reseaux** : `edge_public` (Traefik et ce qu'il route) et
  `nebula_internal` (tout le reste, sans acces Internet). La base et le bus ne
  sont **que** sur le reseau interne : Traefik ne peut meme pas les nommer.
- **Secrets Swarm** pour tous les mots de passe ; rien en clair dans le depot.
- **Pilotage depuis le poste** par contextes Docker SSH (`nebula`,
  `nebula-data`, `nebula-registry`) : rien n'est installe sur les serveurs.

Schema : [schema-reseau.png](schema-reseau.png).

## Comment ca marche

**Une requete** `https://nebula.test/api/fil` : le routeur du lab redirige le
443 vers swarm-1 -> le routing mesh Swarm l'amene a Traefik -> Traefik lit ses
regles (labels des services) -> envoie a l'IP virtuelle du service
publications -> Swarm choisit une instance (repartition) -> publications lit
Redis (cache 30 s) ou Postgres.

**Une publication** : publications appelle comptes pour verifier l'auteur ->
ecrit en base -> depose un evenement dans RabbitMQ et repond tout de suite ->
un worker le consomme (1,5 s) et ecrit `publication-<id>.json` dans son volume.
Un message illisible part dans la file `publications.erreurs` (visible dans
l'interface RabbitMQ) au lieu d'etre perdu.

**Les sondes (healthchecks)** : chaque service a une sonde. Swarm n'envoie du
trafic qu'aux taches saines et remplace celles qui tombent. Pour publications
et le worker, la sonde exige aussi une connexion au bus : si RabbitMQ
redemarre, ils sont remplaces et se reconnectent.

**Une mise a jour** (`start-first`) : Swarm demarre la nouvelle instance,
attend qu'elle soit saine, puis arrete l'ancienne ; une instance a la fois,
10 s d'ecart, surveillance 30 s. Si la nouvelle ne devient jamais saine :
**retour arriere automatique** (`failure_action: rollback`).

**Les donnees** : volumes nommes `nebula_db_data` et `nebula_bus_data` sur
swarm-3. `docker stack rm` ne supprime pas les volumes : la donnee survit a
la destruction de la stack et au redemarrage des machines.

**Topologie (quorum)** : 1 manager + 2 workers. Avec 3 managers, le cluster
tolererait la perte d'un manager (quorum Raft 2 sur 3) ; avec 1 seul, si
swarm-1 tombe, plus aucune decision d'orchestration et plus de Traefik, mais
les conteneurs des workers continuent de tourner. Choix assume : plus simple,
et le sujet l'autorise. Limite a citer si on vous la demande.

## « Que se passe-t-il si cette ligne disparait ? »

| Ligne | Consequence |
|---|---|
| `constraints: [node.labels.nebula.data == true]` (db, bus) | la base peut demarrer sur un autre noeud, avec un volume vide : donnees « perdues » |
| `- db_data:/var/lib/postgresql` | base sans volume : tout est perdu a chaque redemarrage |
| `hostname: bus` | RabbitMQ change de nom a chaque tache et repart d'un repertoire vide : files et messages perdus |
| `order: stop-first` (deploy_data) | pas d'effet aujourd'hui (c'est le defaut), mais en start-first deux Postgres ecriraient le meme volume |
| `order: start-first` (deploy_app) | stop-first : courte coupure pendant chaque mise a jour |
| `failure_action: rollback` | une version cassee reste en echec (mise a jour en pause) au lieu de revenir seule |
| `internal: true` | le reseau interne retrouve un acces Internet ; base et bus restent invisibles de Traefik |
| `networks: [internal]` sur db/bus remplace par `public` | Traefik (et tout ce qui est sur edge_public) pourrait joindre la base |
| `traefik.swarm.lbswarm=true` | Traefik vise les IP des conteneurs : quelques erreurs 502 pendant les mises a jour |
| `--serversTransport.maxIdleConnsPerHost=-1` (edge) | connexions reutilisees : toutes les requetes vont a la meme instance, la repartition ne se voit plus |
| `healthcheck: *health_bus` | si le bus redemarre, workers et publications restent « sains » mais ne traitent plus rien |
| `secrets: [nebula_db_password]` (comptes) | comptes ne peut plus se connecter a la base : 500 / tache en echec |
| `resources: limits` | en cas de pic, le noyau tue des conteneurs au hasard (OOM) |
| `RUN mkdir -p /data && chown node:node /data` (Dockerfile worker) | volume neuf root:root : le worker ne peut rien ecrire (Permission denied) |
| `- { type: tmpfs, target: /data }` (cache) | un volume anonyme est cree a chaque nouvelle tache Redis |
| `--with-registry-auth` (deploy.sh) | les noeuds ne peuvent pas tirer les images du registry authentifie |

Regle d'or : un « je ne sais pas » vaut mieux qu'une explication inventee ;
on peut toujours verifier en direct (`docker service ps`, `docker service logs`).

## Questions frequentes

**C'est quoi une « instance » ?** Une copie en marche d'un service, donc un
conteneur. « publications x3 » = 3 conteneurs identiques, sur une ou plusieurs
machines ; Swarm repartit les requetes entre eux. Dans le vocabulaire Swarm,
une instance s'appelle une **tache** (task) : ce sont les cases du visualizer
Portainer.

**Ou est-il ecrit que swarm-3 stocke les donnees ?** En trois endroits qui
vont ensemble :
1. l'etiquette posee sur la machine (`cluster/bootstrap.sh`) :
   `docker node update --label-add nebula.data=true swarm-3` ;
2. la regle de placement de db et bus (`swarm/stack.nebula.todo.yml`, bloc
   `x-deploy-data`) : `constraints: [node.labels.nebula.data == true]` ;
3. leurs volumes (`db_data`, `bus_data`) : un volume Swarm est local a la
   machine ou tourne la tache, donc il est cree sur swarm-3 et y reste.
La regle inverse (`!= true`, bloc `x-deploy-app`) tient les services sans
etat a l'ecart de swarm-3.

**Et si swarm-3 tombe ?** Swarm n'a le droit de placer db et bus nulle part
ailleurs (contrainte) : ils restent en attente (`Pending`). C'est voulu, sinon
ils redemarreraient ailleurs avec un disque vide.
- Pendant la panne : plus de base ni de bus. Les ecritures et les lectures
  du fil echouent ; publications et worker, qui exigent une connexion au bus,
  sont redemarres en boucle par leur sonde. L'appli est indisponible.
- Rien n'est perdu : les volumes sont sur le disque de swarm-3.
- Au retour de swarm-3 : db et bus redemarrent avec leurs donnees, puis les
  autres services se reconnectent seuls (quelques minutes).
Le sujet l'assume : la haute disponibilite des donnees est hors perimetre
(« une seule instance de base, correctement placee et sauvegardee »). Pour
s'en passer il faudrait un stockage partage (NFS, Ceph) ou une base
repliquee. Filet de securite : `./scripts/backup-db.sh` garde une copie sur
le poste.

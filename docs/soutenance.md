# Soutenance : les 10 scenarios

Chaque scenario : ce que le prof veut voir, les etapes a taper, le resultat
attendu, la phrase a dire. Pour les questions sur l'architecture :
[architecture.md](architecture.md).

## Avant de commencer (une fois)

1. NetBird connecte.
2. Dans un terminal :
   ```bash
   cd ~/Developer/learning/nebula
   docker context use nebula
   docker node ls
   ```
   Tu dois voir 3 machines `Ready`. Toutes les commandes `docker` qui suivent
   parlent maintenant au cluster.
3. Dans le navigateur, ouvrir :
   - https://portainer.nebula.test > Swarm > Cluster visualizer
     (cocher « Only display running tasks »)
   - https://nebula.test/api/fil
4. Mots de passe : `pbcopy < .secrets/portainer-password` (utilisateur `admin`).

---

## Scenario 1 : les trois machines forment un seul cluster

**Le prof veut voir :** les 3 machines pretes, et celle qui dirige.

1. Taper :
   ```bash
   docker node ls
   ```

**Resultat attendu :** swarm-1 `Ready Active Leader`, swarm-2 et swarm-3 `Ready Active`.

**A dire :** « swarm-1 est le manager, il prend les decisions ; swarm-2 et swarm-3 executent. »

---

## Scenario 2 : arret puis redemarrage complet du cluster (~5 min)

**Le prof veut voir :** tout s'eteint, tout revient seul, les donnees sont intactes.

1. Noter le nombre de publications :
   ```bash
   docker --context nebula-data exec $(docker --context nebula-data ps -q -f name=nebula_db) psql -U nebula -d nebula -tAc "select count(*) from publications"
   ```
2. Eteindre les 3 machines (swarm-3, puis swarm-2, puis swarm-1) :
   ```bash
   ./cluster/power.py stop
   ```
3. Les rallumer :
   ```bash
   ./cluster/power.py start
   ```
4. Attendre ~1 min, puis relancer jusqu'a voir 3 machines `Ready` :
   ```bash
   docker node ls
   ```
5. Relancer jusqu'a voir tous les services a `N/N` (~3 min) :
   ```bash
   docker service ls
   ```
6. Refaire la commande de l'etape 1 : meme nombre. Ouvrir https://nebula.test/api/fil.

**Resultat attendu :** cluster reforme, services revenus, meme nombre de publications.

**A dire :** « On eteint les workers puis le manager. Au redemarrage, les machines ont des IP fixes et se reconnectent seules ; la base retrouve son volume sur swarm-3. »

---

## Scenario 3 : deploiement depuis zero (~1 min)

**Le prof veut voir :** on detruit tout et on redeploie avec une seule commande.

1. Tout detruire :
   ```bash
   docker stack rm nebula portainer edge
   ```
2. Attendre ~20 s, verifier que la liste est vide :
   ```bash
   docker service ls
   ```
3. Redeployer :
   ```bash
   ./scripts/deploy.sh v3
   ```
4. Relancer jusqu'a voir tous les services a `N/N` (~45 s) :
   ```bash
   docker service ls
   ```
5. Ouvrir https://nebula.test/api/fil : les publications d'avant sont toujours la.

**Resultat attendu :** tout revient, donnees intactes.

**A dire :** « `stack rm` ne supprime pas les volumes ni les secrets : la donnee survit, rien n'est a recreer. »

---

## Scenario 4 : controle de l'exposition

**Le prof veut voir :** un seul port repond depuis l'exterieur ; la base et le bus non.

1. Tester les ports :
   ```bash
   for p in 80 443 5432 5672 15672 6379 8080 9000; do nc -z -G 3 10.210.0.33 $p && echo "$p ouvert" || echo "$p ferme"; done
   ```
2. Voir quels services publient un port :
   ```bash
   docker service ls --format '{{.Name}} {{.Ports}}'
   ```

**Resultat attendu :** seul `443 ouvert` ; seul `edge_traefik` a un port (`*:443`).

**A dire :** « Seul Traefik est publie, en HTTPS. La base et le bus sont uniquement sur le reseau interne, sans port publie. »

---

## Scenario 5 : placement coherent

**Le prof veut voir :** la base sur la machine prevue, les services sans etat sur les autres, et la regle dans le fichier.

1. Voir ou tourne chaque instance :
   ```bash
   docker stack ps nebula -f desired-state=running --format '{{.Name}} -> {{.Node}}'
   ```
2. Montrer la regle :
   ```bash
   grep -n "nebula.data" swarm/stack.nebula.todo.yml
   ```
3. Montrer Portainer > Cluster visualizer.

**Resultat attendu :** `nebula_db` et `nebula_bus` sur swarm-3, le reste sur swarm-1 et swarm-2.

**A dire :** « swarm-3 porte l'etiquette `nebula.data=true` ; la base et le bus ne peuvent aller que la (`== true`), les autres jamais (`!= true`). »

---

## Scenario 6 : montee en charge d'un service sans etat

**Le prof veut voir :** plus d'instances, et la charge reellement repartie.

1. Passer publications de 3 a 6 instances :
   ```bash
   docker service scale nebula_publications=6
   ```
2. Envoyer 30 requetes et compter qui repond :
   ```bash
   for i in $(seq 30); do curl -s https://nebula.test/api/health; echo; done | grep -o '"host":"[^"]*"' | sort | uniq -c
   ```
3. Remettre 3 instances :
   ```bash
   docker service scale nebula_publications=3
   ```

**Resultat attendu :** 6 noms differents, environ 5 reponses chacun.

**A dire :** « Le champ host est le nom du conteneur qui a repondu : la charge se repartit entre les 6. »

---

## Scenario 7 : mise a jour sans interruption (~3 min)

**Le prof veut voir :** des requetes envoyees pendant la mise a jour qui aboutissent toutes.

1. Terminal 1, lancer 150 s de requetes continues :
   ```bash
   ssh registry 'bash -s 150' < scripts/charge.sh
   ```
2. Terminal 2, pendant ce temps, mettre a jour publications :
   ```bash
   docker service update --force nebula_publications
   ```
3. Attendre la fin du terminal 1 et lire le bilan.

**Resultat attendu :** que des codes `200`, aucun autre code.

**A dire :** « Mise a jour une instance a la fois ; la nouvelle demarre et doit etre saine avant qu'on arrete l'ancienne (start-first). »

---

## Scenario 8 : version defectueuse puis retour arriere (~1 min)

**Le prof veut voir :** l'echec constate, le retour arriere effectue et chronometre.

1. Lancer :
   ```bash
   ./scripts/test-rollback.sh comptes v3
   ```
2. Dans Portainer, decocher « Only display running tasks » : la tache rouge `v3-casse` est la preuve de l'echec.

**Resultat attendu :** `echec detecte ... t+13s`, `retour arriere termine ... t+43s`, image revenue a `v3`.

**A dire :** « La nouvelle version ne demarre pas, sa sonde echoue : Swarm annule seul la mise a jour (`failure_action: rollback`). »

---

## Scenario 9 : panne du plan de donnees

**Le prof veut voir :** apres arret et relance de la base, la donnee est toujours la.

1. Noter le nombre de publications :
   ```bash
   docker --context nebula-data exec $(docker --context nebula-data ps -q -f name=nebula_db) psql -U nebula -d nebula -tAc "select count(*) from publications"
   ```
2. Tuer la base :
   ```bash
   docker --context nebula-data kill $(docker --context nebula-data ps -q -f name=nebula_db)
   ```
3. Relancer jusqu'a voir une nouvelle tache `Running` (~15 s) :
   ```bash
   docker service ps nebula_db
   ```
4. Refaire la commande de l'etape 1 : meme nombre.

**Si le prof demande la restauration :**
```bash
./scripts/backup-db.sh                                   # affiche le fichier cree
./scripts/restore-db.sh backups/nebula-AAAAMMJJ-HHMMSS.dump
```

**A dire :** « Swarm relance la base sur swarm-3 ; elle retrouve son volume. En cas de corruption, on restaure la sauvegarde. »

---

## Scenario 10 : ajout d'un service imprevu (< 10 min)

**Le prof veut voir :** un 8e service ajoute et route, sans toucher aux autres.

1. Copier le modele (exemple avec `notifications`) :
   ```bash
   cp swarm/stack.exemple-service.yml swarm/stack.notifications.yml
   ```
2. Si le prof donne un autre nom ou une autre image : dans le fichier, remplacer
   `notifications` par le nom, l'image et le port demandes.
3. Deployer :
   ```bash
   docker stack deploy -c swarm/stack.notifications.yml notifications
   ```
4. Tester (~30 s plus tard) :
   ```bash
   curl -s https://nebula.test/api/notifications
   ```
5. Pour le retirer ensuite :
   ```bash
   docker stack rm notifications
   ```

**Resultat attendu :** le service repond sur sa route ; aucun autre fichier modifie.

**A dire :** « Traefik decouvre le service par ses labels, et il rejoint les reseaux existants : rien d'autre a modifier. »

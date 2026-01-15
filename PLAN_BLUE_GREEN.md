# Plan de déploiement Blue/Green

## Objectif

Mettre en place un déploiement **blue/green** pour l’application, afin de pouvoir :
- déployer une nouvelle version sans interruption de service ;
- basculer le trafic entre les environnements *blue* et *green* ;
- revenir rapidement à la version précédente en cas de problème.[1][2]

***

## Architecture

- Deux stacks applicatives :
    - **blue** : `backend-blue`, `frontend-blue`
    - **green** : `backend-green`, `frontend-green`
- Un proxy **Nginx** (`gym_proxy`) écoute sur le port 80 et route tout le trafic :
    - `/` → frontend actif
    - `/api/` → backend actif
- Le routage est contrôlé par un fichier monté dans le container :
    - `./proxy/active_upstream.conf` → `/etc/nginx/conf.d/active_upstream.conf`
- Les upstreams possibles :
    - `backend-blue:3000`, `backend-green:3000`
    - `frontend-blue:80`, `frontend-green:80`

Dans `proxy/nginx.conf` :

- Inclusion des upstreams actifs :

```nginx
include /etc/nginx/conf.d/active_upstream.conf;
```

- Utilisation des upstreams :

```nginx
location /      { proxy_pass http://frontend_active; }
location /api/  { proxy_pass http://backend_active; }
```

Dans les fichiers de mapping :

- `active_upstream.blue.conf` :

```nginx
upstream backend_active  { server backend-blue:3000; }
upstream frontend_active { server frontend-blue:80; }
```

- `active_upstream.green.conf` :

```nginx
upstream backend_active  { server backend-green:3000; }
upstream frontend_active { server frontend-green:80; }
```

***

## Gestion de l’état (couleur active)

L’état de la couleur actuellement en production est stocké **en dehors du repo**, dans un fichier persistant sur la machine du runner GitHub Actions.

- Dossier d’état (calculé depuis `${{ github.workspace }}`) :

```powershell
$stateRoot = Join-Path (Split-Path "${{ github.workspace }}") "_bluegreen_state"
$path = Join-Path $stateRoot "active_color"
```

- Première exécution : si le fichier n’existe pas → couleur initiale = `blue`.
- À chaque run de la CI, un step lit ce fichier pour déterminer :
    - `active` : couleur actuelle
    - `next` : couleur de déploiement (l’autre)

Exemple de logique :

```powershell
if (Test-Path $path) { $active = (Get-Content $path).Trim() }
else { $active = "blue" }

if ($active -eq "blue") { $next = "green" } else { $next = "blue" }
```

Après le déploiement et la bascule, le fichier est mis à jour avec `next`.

Ce mécanisme garantit la séquence :  
`blue → green → blue → green → ...` à chaque exécution de la CI.[3][4]

***

## Workflow de déploiement complet (CI sur main)

Déclenché automatiquement sur `main` (ex : merge de `develop` dans `main`).

### Étapes principales

1. **Build & push des images**
    - Construction et push des images backend et frontend avec le SHA courant.[5]

2. **Lecture de la couleur active et calcul de la couleur suivante**
    - Lecture du fichier d’état persistant (`active_color`).
    - Détermination de `next` : `blue` ou `green`.

3. **Déploiement sur la couleur inactive**
    - Si `next == blue` :
        - `docker compose --env-file .env -f docker-compose.base.yml -f docker-compose.blue.yml up -d`
    - Si `next == green` :
        - `docker compose --env-file .env -f docker-compose.base.yml -f docker-compose.green.yml up -d`
    - Les services `backend-next` et `frontend-next` sont démarrés avec les nouvelles images.[2][1]

4. **Bascule du proxy vers la nouvelle couleur**
    - Copie du fichier d’upstream correspondant :
        - `proxy/active_upstream.blue.conf` → `proxy/active_upstream.conf`
        - ou `proxy/active_upstream.green.conf` → `proxy/active_upstream.conf`
    - Reload de Nginx dans le container `gym_proxy` :
        - `docker exec gym_proxy nginx -s reload`

5. **Mise à jour de l’état**
    - Écriture de la nouvelle couleur (`next`) dans le fichier `active_color` persistant.

Résultat : la nouvelle version tourne sur la couleur `next`, et le trafic de production est immédiatement basculé dessus.[1][2]

***

## Workflow manuel de switch (rollback / bascule rapide)

Pour changer uniquement la couleur active **sans rebuild** (rollback ou test), un second workflow GitHub Actions est défini avec `workflow_dispatch`.[6][7][8]

### Objectif

- Basculer le trafic de **blue → green** ou **green → blue** en quelques secondes.
- Réutiliser le même fichier d’état et la même mécanique de proxy.

### Étapes

1. **Lecture de la couleur active**
    - Lecture de `active_color` dans le dossier d’état persistant.
    - Calcul de la couleur suivante (`next = autre couleur`).

2. **Switch Nginx**
    - Copie du bon `active_upstream.<next>.conf` vers `active_upstream.conf`.
    - `docker exec gym_proxy nginx -s reload`.

3. **Mise à jour de l’état**
    - Écriture de `next` dans `active_color`.

Ce workflow ne touche pas aux containers applicatifs (pas de rebuild ni redeploy), il ne fait que rerouter le trafic.[9][10][11]

***

## Scénarios typiques

### 1. Déploiement d’une nouvelle version

1. Merge `develop` → `main`.
2. Le workflow de déploiement complet :
    - déploie la nouvelle version sur la couleur inactive ;
    - bascule Nginx vers cette couleur ;
    - met à jour `active_color`.

### 2. Rollback rapide

1. Un problème est détecté sur la nouvelle version (par exemple sur `green`).
2. Lancer le workflow manuel de switch :
    - lit `active_color = green`,
    - calcule `next = blue`,
    - bascule Nginx vers blue,
    - met à jour `active_color = blue`.

Le trafic est à nouveau servi par l’ancienne version, sans rebuild ni redéploiement.[11][9]

### 3. Nouveau correctif

1. Correction faite sur `develop`.
2. Nouveau merge `develop` → `main`.
3. Le workflow complet lit `active_color = blue` → déploie la nouvelle version corrigée sur `green`, puis rebascule Nginx sur `green`.

On retrouve le cycle normal : blue = ancien, green = nouveau, avec possibilité de rollback immédiat via le workflow manuel.[10][2][1]

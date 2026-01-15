# CloudNativeApplicationCurse

[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=DylanAbz_CloudNativeApplicationCurse&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DylanAbz_CloudNativeApplicationCurse)
[![CI](https://github.com/DylanAbz/CloudNativeApplicationCurse/actions/workflows/ci.yml/badge.svg)](https://github.com/DylanAbz/CloudNativeApplicationCurse/actions/workflows/ci.yml)

This is a test to check husky and commitlint.

Prérequis : installer Gitleaks (via choco install gitleaks sous Windows, voir doc officielle).

### ✔ Règles Git utilisées

- Branches principales : `main`, `develop`
- Branches de feature : `feature/<nom>`
- PR obligatoire vers `develop`
- Pas de commit sur `main` ou `develop`

### ✔ Convention de commit

Exemples :

- `feat: ajout de l’authentification`
- `fix: correction de la connexion Postgres`
- `chore: mise à jour des dépendances NestJS`

### ✔ Hooks actifs

- `pre-commit` : lint front + back
- `commit-msg` : vérification commitlint


## 🚀 Lancer l’environnement avec Docker Compose

Prérequis : Docker Desktop installé (mode Linux).

Depuis la racine du projet :

```bash
docker compose up --build
```

- Frontend : http://localhost:8080
- Backend : http://localhost:3000
- Postgres : uniquement accessible depuis les conteneurs (service `postgres`).

## 📦 Images Docker publiées

Backend : `ghcr.io/dylanabz/cloudnative-backend:latest`  
Frontend : `ghcr.io/dylanabz/cloudnative-frontend:latest`


## 🧬 Conditions d’exécution du pipeline CI

- Nécessite un runner GitHub Actions **self-hosted** avec Docker installé.  
- Les jobs exécutés :
  - Lint frontend & backend
  - Build frontend & backend
  - Tests backend
  - Analyse SonarCloud
  - Build, smoke test (sans DB) et push des images Docker vers GHCR
- Secrets attendus dans le repo :
  - `SONAR_TOKEN` : token SonarCloud
  - `GITHUB_TOKEN` : fourni automatiquement par GitHub Actions pour pousser les images sur GHCR


## 🔄 Déploiement local automatisé

Le pipeline CI exécute automatiquement un stage **deploy** sur le runner local après un build réussi et le push des images Docker vers GHCR.

Workflow complet :
`lint → build → tests → build images → push GHCR → deploy`

Le job `deploy` :
- arrête les conteneurs existants via `docker compose down` (sans supprimer les volumes) ;
- récupère les dernières images buildées :
  - `ghcr.io/dylanabz/cloudnative-backend:<SHA>`
  - `ghcr.io/dylanabz/cloudnative-frontend:<SHA>`
- relance tout l’environnement avec `docker compose up -d`.

Conditions d’exécution :
- un runner GitHub Actions **self-hosted** actif avec Docker installé ;
- accès au registre GHCR via `GITHUB_TOKEN` (fourni par GitHub) ;
- le déploiement automatique est actif uniquement sur la branche `develop` (adapter ici si tu le mets sur `main`).

L’application est alors accessible après chaque pipeline complet :
- Frontend : http://localhost:8080
- Backend : http://localhost:3000


## 👁️ Monitoring et Observabilité 

Pour lancer la stack de monitoring (Prometheus, Grafana, Loki, Promtail), suivez ces étapes :

**Prérequis** : Assurez-vous que votre application principale (backend, frontend, postgres) est déjà en cours d'exécution via Docker Compose.

1.  **Lancer la stack de monitoring** :
    Depuis la racine du projet :
    ```bash
    docker compose -f docker-compose.monitoring.yml up -d
    ```
2.  **Accéder aux services de monitoring** :
    *   **Grafana** (dashboards, logs) : [http://localhost:3001](http://localhost:3001)
        *   Identifiants par défaut : `admin` / `admin` (vous serez invité à les changer à la première connexion).
    *   **Prometheus** (collecte de métriques) : [http://localhost:9090](http://localhost:9090)
        *   Vérifiez le statut des cibles (`Targets`) pour confirmer la bonne collecte des métriques.
    *   **Loki** (agrégateur de logs) : Accessible en interne sur `http://loki:3100` (utilisé par Grafana).

3.  **Arrêter la stack de monitoring** :
    ```bash
    docker compose -f docker-compose.monitoring.yml down
    ```

**Note importante** : Après toute modification du code du backend (par exemple, pour ajouter de nouvelles métriques), vous devez **reconstruire l'image Docker du backend** et redémarrer son conteneur pour que les changements soient pris en compte :
```bash
docker compose build backend # ou backend-blue, backend-green
docker compose up -d --force-recreate --no-deps backend # Adaptez le nom du service
```

## 🔵🟢 Stratégie de déploiement Blue/Green

L’application utilise une stratégie de déploiement **blue/green** pour éviter les interruptions de service et permettre un rollback très rapide.[1][2]

### Principe

- Deux environnements applicatifs sont présents en parallèle :
  - stack **blue** : `backend-blue` / `frontend-blue`
  - stack **green** : `backend-green` / `frontend-green`
- Un proxy Nginx (`gym_proxy`) écoute sur le port `80` et route tout le trafic vers **une seule couleur active à la fois** (blue *ou* green).[3][1]
- Le choix de la couleur active est piloté par la CI et stocké dans un fichier d’état persistant sur la machine du runner GitHub Actions (en dehors du repo).[4][5]


## 🌐 Fonctionnement du proxy Nginx

Le service `proxy` dans `docker-compose` :

```yaml
proxy:
  image: nginx:alpine
  container_name: gym_proxy
  ports:
    - "80:80"
  volumes:
    - ./proxy/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./proxy/active_upstream.conf:/etc/nginx/conf.d/active_upstream.conf:ro
  networks:
    - app-network
```

- `nginx.conf` inclut le fichier `active_upstream.conf` qui définit les upstreams “actifs” :[6][7]

```nginx
include /etc/nginx/conf.d/active_upstream.conf;

server {
  listen 80;

  location /      { proxy_pass http://frontend_active; }
  location /api/  { proxy_pass http://backend_active; }
}
```

- Les fichiers suivants définissent quel environnement est actif :

`proxy/active_upstream.blue.conf` :

```nginx
upstream backend_active  { server backend-blue:3000; }
upstream frontend_active { server frontend-blue:80; }
```

`proxy/active_upstream.green.conf` :

```nginx
upstream backend_active  { server backend-green:3000; }
upstream frontend_active { server frontend-green:80; }
```

- La CI copie l’un de ces fichiers vers `proxy/active_upstream.conf` puis exécute :

```bash
docker exec gym_proxy nginx -s reload
```

Ce reload applique immédiatement la nouvelle couleur sans redémarrer Nginx ni interrompre les connexions.[8][9]


## ⚙ Conditions d’activation du Blue/Green

La logique blue/green repose sur **deux workflows GitHub Actions** exécutés sur un runner self-hosted avec Docker :[10][11]

### 1. Workflow de déploiement complet (sur `main`)

Déclenché automatiquement sur la branche `main` (merge de `develop` → `main`) :

- Lit la couleur active dans un fichier d’état persistant (en dehors du repo, dérivé de `${{ github.workspace }}`).
- Calcule la couleur suivante :
  - si `active = blue` → `next = green`
  - si `active = green` → `next = blue`
- Déploie la nouvelle version sur la couleur **inactive** (blue ou green) via `docker compose` avec les fichiers `docker-compose.base.yml` + `docker-compose.<color>.yml`.
- Copie `proxy/active_upstream.<next>.conf` vers `proxy/active_upstream.conf`.
- Recharge Nginx dans `gym_proxy` (`nginx -s reload`).
- Met à jour le fichier d’état avec la nouvelle couleur (`active_color = next`).[1][4]

Conditions pour que ce workflow tourne correctement :

- Runner GitHub Actions **self-hosted** avec Docker.
- Images backend / frontend disponibles sur GHCR (`ghcr.io/dylanabz/...:<SHA>`).
- Fichiers `proxy/active_upstream.blue.conf` et `proxy/active_upstream.green.conf` présents et valides.

### 2. Workflow manuel de switch (rollback / bascule rapide)

Un second workflow, déclenché manuellement via `workflow_dispatch` dans l’onglet **Actions**, permet de **changer uniquement la couleur active** sans rebuild :[11][12][13]

- Lit la couleur actuelle depuis le fichier d’état persistant.
- Calcule la couleur inverse (blue ↔ green).
- Copie `proxy/active_upstream.<next>.conf` vers `proxy/active_upstream.conf`.
- Recharge Nginx dans `gym_proxy`.
- Met à jour l’état avec la nouvelle couleur.

Ce workflow est utilisé pour :

- **Rollback** rapide en cas de bug (revenir sur l’ancienne couleur).
- **Test** de la bascule blue/green sans relancer tout le pipeline CI.[14][15]

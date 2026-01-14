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

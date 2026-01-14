# scripts/deploy.ps1
param(
  [string]$Sha
)

Write-Host "=== Déploiement local avec SHA $Sha ==="

# 1. Arrêt propre des conteneurs (sans supprimer les volumes)
docker compose down

# 2. Pull des images depuis GHCR
docker pull ghcr.io/dylanabz/cloudnative-backend:$Sha
docker pull ghcr.io/dylanabz/cloudnative-frontend:$Sha

# 3. Relance de l'environnement complet
docker compose up -d

Write-Host "=== Déploiement terminé, services relancés ==="

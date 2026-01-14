param(
  [string]$Sha
)

Write-Host "=== Déploiement local avec SHA $Sha ==="

# 1. Arrêt propre des conteneurs (en prenant les variables du .env généré)
docker compose --env-file .env down

# 2. Pull des images depuis GHCR
docker pull ghcr.io/dylanabz/cloudnative-backend:$Sha
docker pull ghcr.io/dylanabz/cloudnative-frontend:$Sha

# 3. Relance de l'environnement complet
docker compose --env-file .env up -d

Write-Host "=== Déploiement terminé, services relancés ==="

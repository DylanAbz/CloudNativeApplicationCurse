# CloudNativeApplicationCurse

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
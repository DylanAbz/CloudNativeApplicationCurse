# Monitoring & Observabilité

Ce document décrit l'architecture de monitoring et d'observabilité mise en place pour notre application conteneurisée.

## 1. Rôle des Composants

La stack de monitoring est composée de plusieurs outils open-source qui interagissent pour collecter, stocker et visualiser des données sur l'état de notre système.

- **Prometheus** : C'est une base de données de séries temporelles qui collecte des **métriques** en "scrapant" (interrogeant) des points d'accès HTTP sur les applications et services. Il est responsable de stocker les données numériques comme l'utilisation du CPU, la mémoire, le nombre de requêtes HTTP, etc.

- **Grafana** : C'est l'outil de **visualisation**. Il se connecte à différentes sources de données (comme Prometheus pour les métriques et Loki pour les logs) pour créer des dashboards interactifs. Grafana nous permet de voir l'état de notre système en un coup d'œil grâce à des graphiques, des jauges et des alertes.

- **Loki** : C'est un système d'agrégation de **logs** inspiré par Prometheus. Contrairement à d'autres systèmes, Loki n'indexe pas le contenu complet des logs, mais seulement un ensemble de métadonnées (labels). Cela le rend très efficace et peu coûteux en stockage. Il est conçu pour fonctionner parfaitement avec Grafana et Promtail.

- **Promtail** : C'est l'agent de collecte des logs. Son rôle est de découvrir des cibles (comme les conteneurs Docker), d'extraire les logs, d'y attacher des labels, et de les envoyer à Loki.

## 2. Architecture Globale

Le flux des données est le suivant :

1.  **Métriques** :
    - Notre backend NestJS expose un endpoint `/metrics`.
    - Prometheus est configuré pour interroger (scraper) ce endpoint à intervalle régulier et stocke les données.
    - Grafana se connecte à Prometheus comme source de données pour afficher les métriques.

2.  **Logs** :
    - Nos conteneurs (backend, frontend...) écrivent leurs logs sur la sortie standard (`stdout`).
    - Promtail est configuré pour lire les logs de tous les conteneurs Docker.
    - Promtail envoie ces logs, avec des labels (ex: nom du conteneur), à Loki.
    - Grafana se connecte à Loki comme source de données pour rechercher et afficher les logs.

Voici un schéma simplifié de l'architecture :

```
                                  +-----------------+
                                  |     Grafana     |
                                  | (Visualisation) |
                                  +-----------------+
                                     /             \
                                    /               \
                       (Data Source) /                 \ (Data Source)
                                  /                   \
                                 v                     v
                      +------------+            +---------------+ 
                      | Prometheus |            |      Loki     |
                      | (Métriques)|            | (Logs)        |
                      +------------+            +---------------+ 
                             ^                           ^
                             | (Scrape)                  | (Push)
                             |                           |
+---------------------+      |      +--------------------+
|   Backend (NestJS)  |<-----+      |     Promtail       |
| (+ /metrics)        |             | (Agent de collecte)|
+---------------------+             +--------------------+
        ^                                      ^
        | (Logs stdout)                        | (Lit les logs Docker)
        |                                      |
+---------------------+------------------------+
|       Docker Engine (Logs des conteneurs)    |
+----------------------------------------------+

```

## 3. Intégration de notre application

- **Backend** : Il devra être modifié pour exposer un endpoint `/metrics` compatible avec Prometheus, grâce à une librairie comme `@willsoto/nestjs-prometheus`.
- **Services Docker** : Les logs de tous nos services (backend, frontend, proxy) sont nativement capturés par le driver de logs de Docker. Promtail lira directement ces logs sans nécessiter de modification dans nos conteneurs.

## 4. Ports d'Exécution

Les services de la stack de monitoring seront accessibles sur les ports suivants :

- **Grafana** : [http://localhost:3000](http://localhost:3000)
- **Prometheus** : [http://localhost:9090](http://localhost:9090)
- **Loki** : Port `3100` (exposé uniquement en interne au réseau Docker par défaut)

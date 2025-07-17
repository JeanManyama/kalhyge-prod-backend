🛰️ Déploiement API Node/Express sur Render
Le code est versionné sur GitHub (repo : …).

Render est connecté à GitHub. Chaque push sur main déclenche un déploiement automatique.

Le serveur Node démarre via la commande npm run start.

La base de données PostgreSQL est également hébergée sur Render.

Les variables d’environnement sensibles sont stockées sur Render en ligne (non poussées sur GitHub).

Le front consomme les endpoints via HTTPS.
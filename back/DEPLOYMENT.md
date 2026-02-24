## Dépôt GitHub
Le code source du back-end est versionné sur GitHub (repo : …).
Ce dépôt est relié à Render pour permettre un déploiement continu.

## Pipeline de déploiement automatique
Render est connecté à GitHub.

Chaque push sur la branche main déclenche automatiquement un nouveau déploiement de l’API.

## Démarrage du serveur
Le serveur Node.js démarre avec la commande suivante définie dans package.json :

npm run start

Render utilise cette commande après chaque déploiement.

## Base de données
La base PostgreSQL est hébergée sur Render et liée à l’application back-end.
Elle est configurée via une URL de connexion définie dans les variables d’environnement.

## Variables d’environnement
Les données sensibles (comme PG_URL, MAIL_USER, MAIL_PASS) sont :

Stockées exclusivement sur le tableau de bord Render (environnement de production)

Jamais versionnées (le fichier .env est ignoré grâce au .gitignore)

## Accès depuis le front-end
Le front consomme les endpoints de l’API via HTTPS.
Le middleware CORS est configuré pour autoriser les URLs spécifiques définies dans la variable FRONTEND_URL.
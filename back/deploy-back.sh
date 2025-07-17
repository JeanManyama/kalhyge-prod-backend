#!/bin/bash

echo "📦 Vérification et préparation du déploiement..."

echo "✅ Ajout des fichiers modifiés au commit..."
git add .

echo "📝 Saisie du message de commit :"
read COMMIT_MSG

git commit -m "$COMMIT_MSG"

echo "🚀 Push vers GitHub (branche main)..."
git push origin main

echo "⚙️ Render détectera automatiquement le push et déclenchera le déploiement."

echo "✅ Déploiement lancé via Render."
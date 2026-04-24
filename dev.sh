#!/bin/bash
# Ignorer tous les arguments passés par la plateforme pour éviter l'erreur --host
echo "Démarrage du serveur Next.js sur le port 3000..."
npx next dev -p 3000 -H 0.0.0.0

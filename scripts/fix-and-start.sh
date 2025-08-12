#!/bin/bash

# Script de correction et démarrage RADRIS v2.0
# Corrige les problèmes identifiés et démarre le système

set -e

echo "🔧 Correction et démarrage de RADRIS v2.0..."
echo "============================================="

# Vérifier la syntaxe docker-compose
echo "1️⃣  Vérification de la syntaxe Docker Compose..."
if docker-compose config --quiet; then
    echo "✅ Syntaxe Docker Compose valide"
else
    echo "❌ Erreur de syntaxe Docker Compose"
    exit 1
fi

# Arrêter tout proprement
echo "2️⃣  Arrêt des services existants..."
docker-compose down --remove-orphans 2>/dev/null || true

# Télécharger les images nécessaires
echo "3️⃣  Téléchargement des images Docker..."
images=(
    "postgres:15"
    "redis:7-alpine" 
    "orthancteam/orthanc:latest"
    "ohif/viewer:latest"
)

for image in "${images[@]}"; do
    echo "📥 Téléchargement $image..."
    if docker pull "$image"; then
        echo "✅ $image téléchargé"
    else
        echo "⚠️  Échec de téléchargement de $image, on continue..."
    fi
done

# Mettre à jour docker-compose pour utiliser des versions qui existent
echo "4️⃣  Mise à jour des versions d'images..."
sed -i.bak 's/orthancteam\/orthanc:25\.7\.0/orthancteam\/orthanc:latest/g' docker-compose.yml

echo "5️⃣  Démarrage des services..."
# Démarrer en mode détaché
if docker-compose up -d; then
    echo "✅ Services démarrés avec succès"
else
    echo "❌ Erreur lors du démarrage"
    echo "📋 Logs des services:"
    docker-compose logs --tail=10
    exit 1
fi

# Attendre que les services soient prêts
echo "6️⃣  Attente des services..."
sleep 10

# Vérifier les services
echo "7️⃣  Vérification des services..."
services=(
    "Frontend:http://localhost:3000"
    "Backend:http://localhost:3001" 
    "Orthanc:http://localhost:8042/system"
    "OHIF:http://localhost:3005"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r name url <<< "$service_info"
    if curl -sf "$url" >/dev/null 2>&1; then
        echo "✅ $name - Opérationnel"
    else
        echo "⚠️  $name - En cours de démarrage..."
    fi
done

echo
echo "🎉 RADRIS v2.0 est en cours de démarrage !"
echo
echo "📋 URLs d'accès :"
echo "  🏥 Frontend RADRIS     : http://localhost:3000"
echo "  🔧 Backend API         : http://localhost:3001"
echo "  🏥 Orthanc PACS        : http://localhost:8042"
echo "     ├─ Explorer 2        : http://localhost:8042/ui/app/"
echo "     └─ Stone Web Viewer  : http://localhost:8042/ui/app/stone-webviewer/"
echo "  👁️  OHIF Viewer        : http://localhost:3005"
echo
echo "💡 Utilisez 'docker-compose logs -f' pour voir les logs en temps réel"
echo "💡 Utilisez './start.sh status' pour vérifier le statut complet"
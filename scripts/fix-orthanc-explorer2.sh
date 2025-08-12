#!/bin/bash

echo "🔧 Correction du plugin OrthancExplorer2"
echo "========================================"

# Restart Orthanc with verbose logging to see plugin loading
echo "Redémarrage d'Orthanc avec logs détaillés..."
docker-compose restart orthanc

# Wait for Orthanc to start
echo "Attente du démarrage d'Orthanc..."
sleep 10

# Check plugin loading
echo "Vérification du chargement des plugins..."
docker logs radris-orthanc --tail 50 | grep -i "plugin\|explorer"

echo ""
echo "Test des URLs OrthancExplorer2..."

# Test different possible URLs for OrthancExplorer2
URLS=(
    "http://localhost:8042/ui/"
    "http://localhost:8042/oe2/"
    "http://localhost:8042/explorer2/"
    "http://localhost:8042/app/explorer2/"
)

for url in "${URLS[@]}"; do
    echo -n "Testing $url... "
    if curl -s --max-time 5 "$url" | grep -q "html\|<!DOCTYPE"; then
        echo "✓ FOUND!"
        echo "OrthancExplorer2 accessible à: $url"
        break
    else
        echo "✗"
    fi
done

echo ""
echo "Configuration actuelle d'OrthancExplorer2:"
docker exec radris-orthanc cat /etc/orthanc/orthanc.json | grep -A 30 "OrthancExplorer2"

echo ""
echo "Plugins chargés:"
curl -s http://localhost:8042/plugins | jq .

echo ""
echo "Si OrthancExplorer2 ne fonctionne toujours pas, utilisez:"
echo "1. L'interface Orthanc classique: http://localhost:8042/app/explorer.html"
echo "2. OHIF directement via RADRIS (recommandé)"
echo "3. Stone Web Viewer: http://localhost:8042/ui/app/stone-webviewer/"
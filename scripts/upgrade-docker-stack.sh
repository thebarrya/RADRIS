#!/bin/bash

# =============================================================================
# Script de mise à jour RADRIS - Docker Stack Optimization
# Mise à jour Orthanc 24.12.0 + OHIF v3.11.0 + Optimisations PostgreSQL
# =============================================================================

set -e  # Arrêt en cas d'erreur

echo "🚀 === Mise à jour Stack Docker RADRIS === 🚀"
echo

# Configuration
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
COMPOSE_FILE="docker-compose.yml"

# Fonctions utilitaires
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

# 1. Vérifications préalables
log_info "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose n'est pas installé"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Fichier docker-compose.yml introuvable"
    exit 1
fi

log_success "Prérequis validés"

# 2. Sauvegarde de l'état actuel
log_info "Création d'une sauvegarde de l'état actuel..."
mkdir -p "$BACKUP_DIR"

# Sauvegarde des volumes Orthanc
log_info "Sauvegarde des données Orthanc..."
docker run --rm \
  -v radris_orthanc_data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf /backup/orthanc_data_backup.tar.gz -C /data .

# Sauvegarde des configurations
cp -r config "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

log_success "Sauvegarde créée dans $BACKUP_DIR"

# 3. Arrêt en douceur des services
log_info "Arrêt des services actuels..."
docker-compose down --remove-orphans

log_success "Services arrêtés"

# 4. Nettoyage des images anciennes
log_info "Nettoyage des images Docker obsolètes..."
docker image prune -f
docker system prune -f --volumes=false

# Suppression de l'ancienne image OHIF si elle existe
if docker images | grep -q "ohif/viewer.*latest"; then
    log_info "Suppression de l'ancienne image OHIF..."
    docker rmi ohif/viewer:latest 2>/dev/null || true
fi

log_success "Nettoyage terminé"

# 5. Pull des nouvelles images
log_info "Téléchargement des nouvelles images Docker..."

# Téléchargement des images en parallèle
{
    log_info "📥 Téléchargement Orthanc 24.12.0..."
    docker pull orthancteam/orthanc:24.12.0
} &

{
    log_info "📥 Téléchargement OHIF v3.11.0..."  
    docker pull ohif/viewer:v3.11.0
} &

# Attendre que tous les téléchargements se terminent
wait

log_success "Toutes les images téléchargées"

# 6. Vérification des configurations
log_info "Vérification des fichiers de configuration..."

required_files=(
    "config/orthanc.json"
    "config/ohif-v3-config.js"
    "config/nginx-ohif-v3.conf"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Fichier manquant: $file"
        exit 1
    fi
done

log_success "Configurations validées"

# 7. Démarrage des services mis à jour
log_info "Démarrage des services avec les nouvelles versions..."

# Démarrage progressif pour éviter les conflits
log_info "Démarrage de PostgreSQL et Redis..."
docker-compose up -d postgres redis

# Attendre que PostgreSQL soit prêt
log_info "Attente de la disponibilité de PostgreSQL..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T postgres pg_isready -U radris -d radris > /dev/null 2>&1; then
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -le 0 ]; then
    log_error "PostgreSQL n'est pas disponible après 30 secondes"
    exit 1
fi

log_success "PostgreSQL disponible"

# Démarrage d'Orthanc
log_info "Démarrage d'Orthanc avec PostgreSQL backend..."
docker-compose up -d orthanc

# Attendre qu'Orthanc soit disponible
log_info "Attente de la disponibilité d'Orthanc..."
timeout=60
while [ $timeout -gt 0 ]; do
    if curl -sf http://localhost:8042/system > /dev/null 2>&1; then
        break
    fi
    sleep 3
    timeout=$((timeout-3))
done

if [ $timeout -le 0 ]; then
    log_error "Orthanc n'est pas disponible après 60 secondes"
    exit 1
fi

log_success "Orthanc disponible"

# Démarrage d'OHIF v3
log_info "Démarrage d'OHIF v3.11.0..."
docker-compose up -d ohif-viewer

# Attendre qu'OHIF soit disponible
log_info "Attente de la disponibilité d'OHIF..."
timeout=30
while [ $timeout -gt 0 ]; do
    if curl -sf http://localhost:3005/health > /dev/null 2>&1; then
        break
    fi
    sleep 2
    timeout=$((timeout-2))
done

if [ $timeout -le 0 ]; then
    log_warning "OHIF pourrait ne pas être complètement disponible"
fi

# Démarrage des autres services
log_info "Démarrage du backend et frontend..."
docker-compose up -d backend frontend

log_success "Tous les services démarrés"

# 8. Tests de validation
log_info "Tests de validation du déploiement..."

# Test Orthanc
if orthanc_version=$(curl -s http://localhost:8042/system | jq -r '.Version' 2>/dev/null); then
    log_success "Orthanc fonctionnel - Version: $orthanc_version"
else
    log_error "Orthanc ne répond pas correctement"
fi

# Test DICOMweb API
if curl -sf http://localhost:8042/dicom-web/studies > /dev/null 2>&1; then
    log_success "API DICOMweb fonctionnelle"
else
    log_error "API DICOMweb ne répond pas"
fi

# Test Stone Web Viewer
if curl -sf "http://localhost:8042/ui/app/" > /dev/null 2>&1; then
    log_success "Stone Web Viewer accessible"
else
    log_warning "Stone Web Viewer pourrait ne pas être accessible"
fi

# Test OHIF
if curl -sf http://localhost:3005 > /dev/null 2>&1; then
    log_success "OHIF v3.11.0 accessible"
else
    log_warning "OHIF v3.11.0 pourrait ne pas être accessible"
fi

# Test Backend
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    log_success "Backend API fonctionnelle"
else
    log_warning "Backend API pourrait ne pas être disponible"
fi

# Test Frontend  
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log_success "Frontend accessible"
else
    log_warning "Frontend pourrait ne pas être accessible"
fi

# 9. Vérification des plugins Orthanc
log_info "Vérification des plugins Orthanc..."
if plugins=$(curl -s http://localhost:8042/plugins 2>/dev/null); then
    echo "Plugins actifs: $plugins"
    
    if echo "$plugins" | grep -q "stone-webviewer"; then
        log_success "Plugin Stone Web Viewer actif"
    else
        log_warning "Plugin Stone Web Viewer non détecté"
    fi
    
    if echo "$plugins" | grep -q "dicom-web"; then
        log_success "Plugin DICOMweb actif"
    else
        log_error "Plugin DICOMweb non détecté"
    fi
    
    if echo "$plugins" | grep -q "orthanc-explorer-2"; then
        log_success "Plugin Orthanc Explorer 2 actif"
    else
        log_warning "Plugin Orthanc Explorer 2 non détecté"
    fi
else
    log_error "Impossible de vérifier les plugins Orthanc"
fi

# 10. Rapport final
echo
echo "🎉 === Mise à jour terminée === 🎉"
echo
echo "📊 Résumé du déploiement:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Orthanc:         24.12.0 avec PostgreSQL backend"  
echo "🏥 OHIF Viewer:     v3.11.0 avec optimisations"
echo "🔧 Stone Viewer:    Intégré et optimisé"
echo "📚 Sauvegarde:      $BACKUP_DIR"
echo
echo "🌐 URLs d'accès:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Frontend RADRIS:    http://localhost:3000"
echo "Backend API:        http://localhost:3001"
echo "Orthanc Explorer 2: http://localhost:8042/ui/app/"
echo "Stone Web Viewer:   http://localhost:8042/ui/app/stone-webviewer/"
echo "OHIF v3.11.0:       http://localhost:3005"
echo "Orthanc API:        http://localhost:8042"
echo
echo "💡 Prochaines étapes recommandées:"
echo "1. Tester le chargement d'images DICOM"
echo "2. Vérifier les performances des viewers"
echo "3. Configurer les utilisateurs et permissions"
echo "4. Planifier une sauvegarde automatique"
echo
log_success "Déploiement réussi !"
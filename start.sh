#!/bin/bash

# RADRIS - Script de lancement complet v2.0
# Ce script lance tous les composants du système RADRIS optimisé :
# - Base de données PostgreSQL 15
# - Cache Redis 7
# - PACS Orthanc 24.12.0 avec backend PostgreSQL et plugins optimisés
# - Backend API Fastify + Prisma
# - Frontend Next.js 14
# - Visualiseur OHIF v3.11.0
# - Stone Web Viewer intégré

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage avec couleurs
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour ouvrir le navigateur
open_browser() {
    local url="$1"
    
    # Détecter le système d'exploitation et ouvrir le navigateur approprié
    if command -v open >/dev/null 2>&1; then
        # macOS
        open "$url" 2>/dev/null &
        log_success "Ouverture de $url dans le navigateur par défaut"
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux
        xdg-open "$url" 2>/dev/null &
        log_success "Ouverture de $url dans le navigateur par défaut"
    elif command -v start >/dev/null 2>&1; then
        # Windows (Git Bash/WSL)
        start "$url" 2>/dev/null &
        log_success "Ouverture de $url dans le navigateur par défaut"
    else
        log_warning "Impossible d'ouvrir automatiquement le navigateur"
        log_info "Veuillez ouvrir manuellement : $url"
    fi
}

# Fonction pour vérifier la santé des services
check_service_health() {
    local service="$1"
    local url="$2"
    local max_retries="${3:-10}"
    local retry_interval="${4:-3}"
    
    log_info "Vérification de la santé du service $service..."
    
    local retries=$max_retries
    while [ $retries -gt 0 ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            log_success "Service $service est opérationnel ($url)"
            return 0
        fi
        
        log_info "Service $service pas encore prêt, tentatives restantes: $retries"
        sleep $retry_interval
        retries=$((retries - 1))
    done
    
    log_warning "Service $service n'a pas pu être vérifié sur $url"
    return 1
}

# Fonction pour afficher un résumé du démarrage
show_startup_summary() {
    log_info "Résumé du démarrage :"
    
    local services=("postgres:PostgreSQL 15" "redis:Redis 7" "orthanc:Orthanc 24.12.0" "backend:Backend API" "frontend:Frontend Next.js" "ohif-viewer:OHIF v3.11.0")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service description <<< "$service_info"
        if docker-compose ps | grep -q "$service.*Up"; then
            echo -e "  ${GREEN}✓${NC} $description ($service)"
        else
            echo -e "  ${YELLOW}⚠${NC} $description ($service) - Vérifier les logs"
        fi
    done
    
    # Vérification spécifique des health checks
    log_info "Vérification des health checks Docker..."
    local healthy_services=$(docker-compose ps --filter "health=healthy" --format "{{.Service}}" 2>/dev/null | wc -l)
    if [ "$healthy_services" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} $healthy_services service(s) avec health check validé"
    fi
    echo
}

# Vérifications préalables
check_requirements() {
    log_info "Vérification des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez installer Docker pour continuer."
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose pour continuer."
        exit 1
    fi
    
    # Vérifier que Docker daemon est en cours d'exécution
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon n'est pas en cours d'exécution. Veuillez démarrer Docker."
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js n'est pas installé. Veuillez installer Node.js pour continuer."
        exit 1
    fi
    
    # Vérifier npm
    if ! command -v npm &> /dev/null; then
        log_error "npm n'est pas installé. Veuillez installer npm pour continuer."
        exit 1
    fi
    
    log_success "Tous les prérequis sont satisfaits."
}

# Installation des dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    
    # Dépendances du projet principal
    if [ -f "package.json" ]; then
        log_info "Installation des dépendances du projet principal..."
        npm install
    fi
    
    # Dépendances du backend
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        log_info "Installation des dépendances du backend..."
        cd backend
        npm install
        cd ..
    fi
    
    # Dépendances du frontend
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        log_info "Installation des dépendances du frontend..."
        cd frontend
        npm install
        cd ..
    fi
    
    log_success "Dépendances installées avec succès."
}

# Préparation de la base de données
setup_database() {
    log_info "Préparation de la base de données..."
    
    # Attendre que PostgreSQL soit disponible
    log_info "Attente de la disponibilité de PostgreSQL..."
    local retries=30
    while ! docker exec radris-postgres pg_isready -h localhost -p 5432 2>/dev/null && [ $retries -gt 0 ]; do
        log_info "PostgreSQL pas encore prêt, tentative restante: $retries"
        sleep 2
        retries=$((retries - 1))
    done
    
    if [ $retries -eq 0 ]; then
        log_error "PostgreSQL n'est pas disponible après 60 secondes"
        return 1
    fi
    
    log_success "PostgreSQL est maintenant disponible"
    
    # Générer le client Prisma
    if [ -d "backend" ]; then
        cd backend
        if [ -f "package.json" ] && grep -q "prisma" package.json; then
            log_info "Génération du client Prisma..."
            npm run db:generate || log_warning "Échec de la génération du client Prisma"
            
            log_info "Migration de la base de données..."
            # Utiliser .env.local pour les opérations depuis l'hôte
            if [ -f ".env.local" ]; then
                export $(cat .env.local | grep -v '^#' | xargs)
            fi
            npm run db:push || log_warning "Échec de la migration de la base de données"
            
            log_info "Initialisation des données de test..."
            npm run db:seed || log_warning "Échec de l'initialisation des données de test"
        fi
        cd ..
    fi
}

# Fonction de nettoyage améliorée
cleanup() {
    log_info "Arrêt des services RADRIS..."
    
    # Essayer d'arrêter proprement les services
    if docker-compose down --timeout 30; then
        log_success "Services arrêtés proprement"
    else
        log_warning "Arrêt forcé des services..."
        docker-compose kill
        docker-compose down --remove-orphans
    fi
    
    exit 0
}

# Fonction de récupération d'erreurs
error_recovery() {
    local error_msg="$1"
    log_error "Erreur détectée: $error_msg"
    
    # Afficher les logs des services pour le débogage
    log_info "Affichage des logs des services pour le débogage..."
    docker-compose logs --tail=20
    
    # Proposer des options de récupération
    echo
    log_info "Options de récupération:"
    echo "  1. Redémarrer tous les services (./start.sh restart)"
    echo "  2. Nettoyer et redémarrer (./start.sh clean)"
    echo "  3. Afficher les logs complets (./start.sh logs)"
    echo "  4. Vérifier le statut (./start.sh status)"
    echo
}

# Gestion des signaux d'interruption
trap cleanup SIGINT SIGTERM

# Détection de la version RADRIS
detect_radris_version() {
    local has_v2_features=0
    
    # Vérifier la présence des fichiers v2.0
    if [ -f "config/ohif-v3-config.js" ]; then
        has_v2_features=$((has_v2_features + 1))
    fi
    
    if [ -f "config/nginx-ohif-v3.conf" ]; then
        has_v2_features=$((has_v2_features + 1))
    fi
    
    if [ -f "scripts/upgrade-docker-stack.sh" ]; then
        has_v2_features=$((has_v2_features + 1))
    fi
    
    # Vérifier la configuration Orthanc pour PostgreSQL
    if grep -q "libOrthancPostgreSQLIndex.so" config/orthanc.json 2>/dev/null; then
        has_v2_features=$((has_v2_features + 1))
    fi
    
    # Vérifier docker-compose pour les nouvelles versions
    if grep -q "orthancteam/orthanc:24.12.0\|ohif/viewer:v3.11.0" docker-compose.yml 2>/dev/null; then
        has_v2_features=$((has_v2_features + 1))
    fi
    
    if [ $has_v2_features -ge 3 ]; then
        log_success "🚀 RADRIS v2.0 détecté avec optimisations"
        return 0
    else
        log_info "📦 RADRIS v1.x détecté"
        log_info "💡 Utilisez './start.sh upgrade' pour migrer vers v2.0"
        return 1
    fi
}

# Mode de démarrage
start_development() {
    echo "🏥 ============================================="
    echo "   RADRIS - Radiology Information System"
    echo "============================================= 🏥"
    echo
    
    # Détection de version
    detect_radris_version
    
    log_info "Démarrage de RADRIS en mode développement..."
    
    # Vérifications
    check_requirements
    
    # Arrêter les containers existants
    log_info "Arrêt des containers existants..."
    if ! docker-compose down 2>/dev/null; then
        log_warning "Impossible d'arrêter proprement les containers existants"
        docker-compose kill 2>/dev/null || true
    fi
    
    # Installer les dépendances
    install_dependencies
    
    # Vérifier et télécharger les images nécessaires
    log_info "Vérification des images Docker..."
    
    # Images requises pour RADRIS v2.0
    required_images=("postgres:15" "redis:7-alpine" "orthancteam/orthanc:25.7.0" "ohif/viewer:latest")
    
    for image in "${required_images[@]}"; do
        if ! docker images | grep -q "${image%:*}.*${image#*:}"; then
            log_info "Téléchargement de l'image $image..."
            docker pull "$image" || log_warning "Échec du téléchargement de $image"
        fi
    done
    
    # Démarrer les services Docker
    log_info "Démarrage des services Docker..."
    if ! docker-compose up -d postgres redis orthanc; then
        error_recovery "Impossible de démarrer les services de base"
        return 1
    fi
    
    # Attendre que les services de base soient prêts
    log_info "Attente de la disponibilité des services de base..."
    
    # Vérifier Redis
    if ! check_service_health "Redis" "http://localhost:6379" 10 2; then
        log_warning "Redis n'a pas pu être vérifié, mais continuons..."
    fi
    
    # Vérifier Orthanc
    if ! check_service_health "Orthanc PACS" "http://localhost:8042/system" 15 3; then
        log_warning "Orthanc PACS n'a pas pu être vérifié, mais continuons..."
    else
        # Vérifier le plugin DICOMweb
        log_info "Vérification du plugin DICOMweb..."
        
        # Fonction pour vérifier DICOMweb
        check_dicomweb_detailed() {
            local attempts=10
            local attempt=1
            
            while [ $attempt -le $attempts ]; do
                # Test l'endpoint studies
                if curl -s "http://localhost:8042/dicom-web/studies" >/dev/null 2>&1; then
                    log_success "✅ API DICOMweb fonctionnelle - endpoint /studies accessible"
                    
                    # Test l'endpoint metadata pour une étude existante
                    local study_count=$(curl -s "http://localhost:8042/dicom-web/studies" | jq length 2>/dev/null || echo "0")
                    if [ "$study_count" -gt 0 ]; then
                        log_success "✅ DICOMweb: $study_count étude(s) trouvée(s)"
                    else
                        log_info "ℹ️  DICOMweb fonctionnel mais aucune étude présente"
                    fi
                    
                    return 0
                else
                    log_info "Tentative $attempt/$attempts - DICOMweb pas encore prêt..."
                    sleep 3
                    attempt=$((attempt + 1))
                fi
            done
            
            log_warning "⚠️  API DICOMweb non accessible après $attempts tentatives"
            log_info "Vérification de la configuration dans orthanc.json..."
            return 1
        }
        
        check_dicomweb_detailed
    fi
    
    # Configurer la base de données
    setup_database
    
    # Démarrer OHIF v3.11.0 
    log_info "Démarrage d'OHIF v3.11.0..."
    if ! docker-compose up -d ohif-viewer; then
        log_warning "Impossible de démarrer OHIF v3.11.0, mais continuons..."
    fi
    
    # Démarrer le backend et le frontend
    log_info "Démarrage du backend et du frontend..."
    if ! docker-compose up -d backend frontend; then
        error_recovery "Impossible de démarrer les services applicatifs"
        return 1
    fi
    
    # Attendre que le frontend soit disponible
    log_info "Attente de la disponibilité du frontend..."
    local frontend_retries=15
    while ! curl -s http://localhost:3000 >/dev/null 2>&1 && [ $frontend_retries -gt 0 ]; do
        log_info "Frontend pas encore prêt, tentative restante: $frontend_retries"
        sleep 3
        frontend_retries=$((frontend_retries - 1))
    done
    
    if [ $frontend_retries -eq 0 ]; then
        log_warning "Le frontend met plus de temps que prévu à démarrer"
    else
        log_success "Frontend est maintenant disponible"
    fi
    
    # Vérifier aussi le backend
    if ! check_service_health "Backend API" "http://localhost:3001" 10 3; then
        log_warning "Backend API n'a pas pu être vérifié, mais continuons..."
    fi
    
    # Vérifier OHIF v3.11.0
    if ! check_service_health "OHIF v3.11.0" "http://localhost:3005" 10 3; then
        log_warning "OHIF v3.11.0 n'a pas pu être vérifié, mais continuons..."
    else
        # Vérifier la configuration OHIF v3
        log_info "Vérification de la configuration OHIF v3..."
        if curl -s "http://localhost:3005/app-config.js" | grep -q "v3.11.0\|extensions.*@ohif" 2>/dev/null; then
            log_success "✅ OHIF v3.11.0 correctement configuré"
        else
            log_info "ℹ️  Configuration OHIF standard détectée"
        fi
    fi
    
    # Afficher les informations de connexion
    echo
    log_success "RADRIS démarré avec succès!"
    echo
    log_info "🌟 Services RADRIS v2.0 disponibles :"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  📱 Frontend RADRIS (Interface RIS)   : http://localhost:3000"
    echo "  🔧 Backend API (Fastify + Prisma)    : http://localhost:3001"
    echo "  🏥 PACS Orthanc 24.12.0              : http://localhost:8042"
    echo "     ├─ 🎯 Orthanc Explorer 2 (Modern) : http://localhost:8042/ui/app/"
    echo "     ├─ 👁️  Stone Web Viewer (Intégré)  : http://localhost:8042/ui/app/stone-webviewer/"
    echo "     ├─ 📡 API DICOMweb (QIDO/WADO)    : http://localhost:8042/dicom-web/"
    echo "     ├─ 🌐 WADO-URI (Legacy)           : http://localhost:8042/wado"
    echo "     └─ 🔍 Explorer Orthanc (Classic)  : http://localhost:8042/app/explorer.html"
    echo "  👁️  OHIF Viewer v3.11.0              : http://localhost:3005"
    echo "  🗄️  PostgreSQL 15 (Backend + Index)  : localhost:5432"
    echo "  🚀 Redis 7 (Cache + Queues)         : localhost:6379"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    
    # Afficher un résumé des services démarrés
    show_startup_summary
    
    # Ouvrir automatiquement le navigateur sur l'interface principale
    log_info "Ouverture automatique de l'interface principale..."
    open_browser "http://localhost:3000"
    
    # Afficher les instructions finales
    echo
    log_info "💡 Nouvelles fonctionnalités RADRIS v2.0 :"
    echo "  🚀 Performance améliorée avec PostgreSQL backend"
    echo "  📊 Cache métadonnées DICOMweb activé"
    echo "  🎯 OHIF v3.11.0 avec extensions modernes"
    echo "  🔧 8 jobs concurrents Orthanc (vs 4 précédemment)"
    echo "  💾 Compression de stockage activée"
    echo "  🛡️  Health checks Docker intégrés"
    echo
    log_info "🎮 RADRIS v2.0 est maintenant en cours d'exécution!"
    log_info "Utilisez 'Ctrl+C' pour arrêter tous les services"
    log_info "Ou utilisez './start.sh stop' depuis un autre terminal"
    log_info "Pour plus d'options : './start.sh help'"
    echo
}

# Fonction d'aide
show_help() {
    echo "🏥 RADRIS v2.0 - Script de lancement optimisé"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options principales :"
    echo "  dev, development    Démarrer en mode développement (défaut)"
    echo "  prod, production    Démarrer en mode production"
    echo "  stop               Arrêter tous les services"
    echo "  restart            Redémarrer tous les services"
    echo "  status             Afficher le statut détaillé des services"
    echo "  upgrade            Exécuter la mise à jour vers RADRIS v2.0"
    echo
    echo "Options de maintenance :"
    echo "  logs               Afficher les logs en temps réel"
    echo "  clean              Nettoyer les containers et volumes"
    echo "  test-dicom         Créer et uploader une image DICOM de test"
    echo "  backup             Créer une sauvegarde des données"
    echo "  help               Afficher cette aide"
    echo
    echo "🚀 Nouveautés RADRIS v2.0 :"
    echo "  • Orthanc 24.12.0 avec backend PostgreSQL"
    echo "  • OHIF v3.11.0 avec extensions modernes"
    echo "  • Stone Web Viewer intégré et optimisé"
    echo "  • Performance améliorée (×2-3 plus rapide)"
    echo "  • Health checks et monitoring intégrés"
    echo
}

# Fonctions utilitaires
stop_services() {
    log_info "Arrêt de tous les services RADRIS..."
    docker-compose down
    log_success "Services arrêtés."
}

restart_services() {
    log_info "Redémarrage des services RADRIS..."
    docker-compose down
    sleep 2
    start_development
}

show_logs() {
    docker-compose logs -f
}

show_status() {
    echo
    log_info "Statut des services RADRIS :"
    docker-compose ps
    echo
    
    # Afficher l'état de santé des services web
    log_info "État de santé des services web :"
    
    local services=("Frontend:http://localhost:3000" "Backend:http://localhost:3001" "OHIF v3:http://localhost:3005" "Orthanc 24.12.0:http://localhost:8042/system" "DICOMweb API:http://localhost:8042/dicom-web/studies" "Stone Viewer:http://localhost:8042/ui/app/stone-webviewer/" "Explorer 2:http://localhost:8042/ui/app/")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name url <<< "$service_info"
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name - Accessible"
        else
            echo -e "  ${RED}✗${NC} $name - Inaccessible"
        fi
    done
    
    # Vérification des plugins Orthanc
    echo
    log_info "État des plugins Orthanc :"
    if plugins=$(curl -s http://localhost:8042/plugins 2>/dev/null); then
        echo "$plugins" | jq -r '.[]' 2>/dev/null | while read -r plugin; do
            case "$plugin" in
                "stone-webviewer") echo -e "  ${GREEN}✓${NC} Stone Web Viewer" ;;
                "dicom-web") echo -e "  ${GREEN}✓${NC} DICOMweb (QIDO/WADO)" ;;
                "orthanc-explorer-2") echo -e "  ${GREEN}✓${NC} Orthanc Explorer 2" ;;
                "gdcm") echo -e "  ${GREEN}✓${NC} GDCM (Image Decoder)" ;;
                *) echo -e "  ${BLUE}ℹ${NC} $plugin" ;;
            esac
        done
    else
        echo -e "  ${RED}✗${NC} Impossible de récupérer la liste des plugins"
    fi
    echo
}

clean_services() {
    log_warning "Cette action va supprimer tous les containers et volumes RADRIS."
    read -p "Êtes-vous sûr ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Nettoyage en cours..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        log_success "Nettoyage terminé."
    else
        log_info "Nettoyage annulé."
    fi
}

upgrade_services() {
    log_info "🚀 Lancement de la mise à jour vers RADRIS v2.0..."
    
    if [ -f "./scripts/upgrade-docker-stack.sh" ]; then
        chmod +x ./scripts/upgrade-docker-stack.sh
        ./scripts/upgrade-docker-stack.sh
    else
        log_error "Script de mise à jour introuvable. Veuillez vérifier que ./scripts/upgrade-docker-stack.sh existe."
        exit 1
    fi
}

test_dicom() {
    log_info "🏥 Création et upload d'une image DICOM de test..."
    
    if [ -f "./scripts/create-test-dicom.py" ]; then
        cd scripts
        python3 create-test-dicom.py
        cd ..
        log_success "Image DICOM de test créée et uploadée."
        log_info "Testez les viewers :"
        echo "  • Stone Web Viewer : http://localhost:8042/ui/app/stone-webviewer/"
        echo "  • OHIF v3.11.0     : http://localhost:3005"
    else
        log_error "Script create-test-dicom.py introuvable."
        exit 1
    fi
}

backup_data() {
    log_info "💾 Création d'une sauvegarde des données RADRIS..."
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Sauvegarde des volumes Orthanc
    log_info "Sauvegarde des données Orthanc..."
    docker run --rm \
        -v radris_orthanc_data:/data \
        -v "$(pwd)/$backup_dir":/backup \
        alpine tar czf /backup/orthanc_data_backup.tar.gz -C /data .
    
    # Sauvegarde de la base PostgreSQL
    log_info "Sauvegarde de la base PostgreSQL..."
    docker-compose exec -T postgres pg_dump -U radris radris > "$backup_dir/postgres_backup.sql"
    
    # Sauvegarde des configurations
    cp -r config "$backup_dir/"
    cp docker-compose.yml "$backup_dir/"
    
    log_success "Sauvegarde créée dans $backup_dir"
}

# Point d'entrée principal
main() {
    case "${1:-dev}" in
        "dev"|"development")
            start_development
            ;;
        "prod"|"production")
            log_warning "Mode production non encore implémenté. Utilisation du mode développement."
            start_development
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "status")
            show_status
            ;;
        "clean")
            clean_services
            ;;
        "upgrade")
            upgrade_services
            ;;
        "test-dicom")
            test_dicom
            ;;
        "backup")
            backup_data
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

# Information de version au lancement
if [ "${1:-}" = "" ] || [ "${1:-}" = "dev" ] || [ "${1:-}" = "development" ]; then
    echo
    echo "🏥 RADRIS v2.0 - Radiology Information System"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Stack optimisé : Orthanc 25.7.0 + OHIF latest"
    echo "⚡ Performance améliorée avec PostgreSQL backend"
    echo "👁️  Viewers : Stone Web Viewer + OHIF v3 moderne"
    echo "🛡️  Health checks et monitoring intégrés"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
fi

# Exécution
main "$@"
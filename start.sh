#!/bin/bash

# RADRIS - Script de lancement complet
# Ce script lance tous les composants du système RADRIS :
# - Base de données PostgreSQL
# - Cache Redis
# - PACS Orthanc avec plugins DICOMweb et OHIF
# - Backend API
# - Frontend Next.js
# - Visualiseur OHIF

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
    
    local services=("postgres:Base de données" "redis:Cache" "orthanc:PACS" "backend:API" "frontend:Interface" "ohif-viewer:Visualiseur")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service description <<< "$service_info"
        if docker-compose ps | grep -q "$service.*Up"; then
            echo -e "  ${GREEN}✓${NC} $description ($service)"
        else
            echo -e "  ${YELLOW}⚠${NC} $description ($service) - Vérifier les logs"
        fi
    done
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

# Mode de démarrage
start_development() {
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
        if curl -s "http://localhost:8042/plugins" | grep -q "dicom-web"; then
            log_success "Plugin DICOMweb chargé avec succès"
            
            # Vérifier l'endpoint DICOMweb
            if curl -s "http://localhost:8042/dicom-web/studies" >/dev/null 2>&1; then
                log_success "API DICOMweb fonctionnelle"
            else
                log_warning "API DICOMweb non accessible"
            fi
        else
            log_warning "Plugin DICOMweb non détecté"
        fi
    fi
    
    # Configurer la base de données
    setup_database
    
    # Démarrer le backend et le frontend
    log_info "Démarrage du backend et du frontend..."
    if ! docker-compose up -d backend frontend ohif-viewer; then
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
    
    # Vérifier OHIF Viewer
    if ! check_service_health "OHIF Viewer" "http://localhost:3005" 10 3; then
        log_warning "OHIF Viewer n'a pas pu être vérifié, mais continuons..."
    fi
    
    # Afficher les informations de connexion
    echo
    log_success "RADRIS démarré avec succès!"
    echo
    log_info "Services disponibles :"
    echo "  📱 Frontend (Interface principale)    : http://localhost:3000"
    echo "  🔧 Backend API                       : http://localhost:3001"
    echo "  👁️  Visualiseur OHIF                  : http://localhost:3005"
    echo "  🗄️  Base de données PostgreSQL       : localhost:5432"
    echo "  🚀 Cache Redis                       : localhost:6379"
    echo "  🏥 PACS Orthanc                      : http://localhost:8042"
    echo "     └─ 📡 API DICOMweb                : http://localhost:8042/dicom-web/"
    echo "     └─ 🌐 WADO-URI                    : http://localhost:8042/wado"
    echo "     └─ 🔍 Explorer Orthanc            : http://localhost:8042/app/explorer.html"
    echo "     └─ 🎯 Orthanc Explorer 2          : http://localhost:8042/ui/app/"
    echo "     └─ 👁️  Stone Web Viewer           : Intégré dans Explorer 2"
    echo "     └─ 🔬 OHIF Viewer                 : Intégré dans Explorer 2"
    echo
    
    # Afficher un résumé des services démarrés
    show_startup_summary
    
    # Ouvrir automatiquement le navigateur sur l'interface principale
    log_info "Ouverture automatique de l'interface principale..."
    open_browser "http://localhost:3000"
    
    # Afficher les instructions finales
    echo
    log_info "RADRIS est maintenant en cours d'exécution!"
    log_info "Utilisez 'Ctrl+C' pour arrêter tous les services"
    log_info "Ou utilisez './start.sh stop' depuis un autre terminal"
    echo
}

# Fonction d'aide
show_help() {
    echo "RADRIS - Script de lancement"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  dev, development    Démarrer en mode développement (défaut)"
    echo "  prod, production    Démarrer en mode production"
    echo "  stop               Arrêter tous les services"
    echo "  restart            Redémarrer tous les services"
    echo "  logs               Afficher les logs"
    echo "  status             Afficher le statut des services"
    echo "  clean              Nettoyer les containers et volumes"
    echo "  help               Afficher cette aide"
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
    
    local services=("Frontend:http://localhost:3000" "Backend:http://localhost:3001" "OHIF:http://localhost:3005" "Orthanc:http://localhost:8042/system" "DICOMweb:http://localhost:8042/dicom-web/studies")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name url <<< "$service_info"
        if curl -s "$url" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name ($url) - Accessible"
        else
            echo -e "  ${RED}✗${NC} $name ($url) - Inaccessible"
        fi
    done
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

# Exécution
main "$@"
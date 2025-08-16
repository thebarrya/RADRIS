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
    
    # Dépendances du backend
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        log_info "Installation des dépendances du backend..."
        cd backend
        
        # Vérifier et installer les dépendances manquantes
        if ! npm list ws >/dev/null 2>&1; then
            log_info "Installation de la dépendance WebSocket..."
            npm install ws @types/ws
        fi
        
        if ! npm list react-resizable-panels >/dev/null 2>&1; then
            log_info "Installation de react-resizable-panels..."
            npm install react-resizable-panels
        fi
        
        npm install
        cd ..
    fi
    
    # Dépendances du frontend
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        log_info "Installation des dépendances du frontend..."
        cd frontend
        
        # Vérifier et installer les dépendances manquantes pour le frontend
        if ! npm list react-resizable-panels >/dev/null 2>&1; then
            log_info "Installation de react-resizable-panels pour le frontend..."
            npm install react-resizable-panels@3.0.4
        fi
        
        if ! npm list @radix-ui/react-tooltip >/dev/null 2>&1; then
            log_info "Installation de @radix-ui/react-tooltip..."
            npm install @radix-ui/react-tooltip
        fi
        
        npm install
        cd ..
    fi
    
    # Dépendances du projet principal (si elles existent)
    if [ -f "package.json" ]; then
        log_info "Installation des dépendances du projet principal..."
        npm install
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
    log_info "🛑 Arrêt des services RADRIS suite à interruption..."
    
    # Arrêt des processus Node.js
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    # Essayer d'arrêter proprement les services Docker
    if docker-compose down --timeout 30 2>/dev/null; then
        log_success "Services arrêtés proprement"
    else
        log_warning "Arrêt forcé des services..."
        docker-compose kill 2>/dev/null || true
        docker-compose down --remove-orphans 2>/dev/null || true
    fi
    
    log_info "✅ Nettoyage terminé."
    exit 0
}

# Fonction pour afficher l'utilisation des ports
check_ports() {
    log_info "🔍 Vérification de l'utilisation des ports RADRIS :"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local ports=(3000 3001 3002 3005 5432 6379 8042)
    local port_names=("Frontend" "Backend API" "WebSocket" "OHIF Viewer" "PostgreSQL" "Redis" "Orthanc PACS")
    
    for i in "${!ports[@]}"; do
        local port="${ports[$i]}"
        local name="${port_names[$i]}"
        
        if lsof -i:"$port" >/dev/null 2>&1; then
            local pid=$(lsof -t -i:"$port" 2>/dev/null | head -1)
            local process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
            local process_cmd=$(ps -p "$pid" -o args= 2>/dev/null | cut -c1-50 || echo "")
            echo -e "  ${RED}🔒${NC} Port $port ($name) - Utilisé par $process_name (PID: $pid)"
            echo -e "      └─ Commande: $process_cmd"
        else
            echo -e "  ${GREEN}🟢${NC} Port $port ($name) - Libre"
        fi
    done
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
}

# Fonction de récupération d'erreurs
error_recovery() {
    local error_msg="$1"
    log_error "❌ Erreur détectée: $error_msg"
    
    # Diagnostic automatique
    log_info "🔍 Diagnostic automatique..."
    
    # Vérifier l'utilisation des ports
    log_info "Vérification des ports..."
    check_ports
    
    # Afficher les logs des services pour le débogage
    log_info "📋 Logs récents des services :"
    docker-compose logs --tail=10 2>/dev/null || {
        log_warning "Impossible d'obtenir les logs Docker Compose"
    }
    
    # Vérifier l'espace disque
    log_info "💾 Espace disque disponible :"
    df -h . | tail -1 | awk '{print "  Disponible: " $4 " (utilisé: " $5 ")"}'
    
    # Vérifier la mémoire
    log_info "🧠 Mémoire système :"
    if command -v free >/dev/null 2>&1; then
        free -h | grep "Mem:" | awk '{print "  Disponible: " $7 " / " $2}'
    elif command -v vm_stat >/dev/null 2>&1; then
        # macOS
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        local page_size=4096
        local free_mb=$(( pages_free * page_size / 1024 / 1024 ))
        echo "  Disponible: ~${free_mb}MB"
    fi
    
    # Proposer des options de récupération
    echo
    log_info "🛠️  Options de récupération automatique :"
    echo "  1. Redémarrer tous les services     : ./start.sh restart"
    echo "  2. Arrêt et redémarrage complet     : ./start.sh reset"  
    echo "  3. Arrêt forcé puis redémarrage     : ./start.sh force-stop && ./start.sh dev"
    echo "  4. Nettoyer et redémarrer           : ./start.sh clean && ./start.sh dev"
    echo "  5. Afficher les logs complets       : ./start.sh logs"
    echo "  6. Vérifier le statut détaillé      : ./start.sh status"
    echo "  7. Vérifier uniquement les ports    : ./start.sh ports"
    echo
}

# Fonction de diagnostic système
diagnose_system() {
    log_info "🩺 Diagnostic système RADRIS..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Version des outils
    log_info "📋 Versions des outils :"
    echo "  Docker: $(docker --version 2>/dev/null || echo 'Non installé')"
    echo "  Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Non installé')"
    echo "  Node.js: $(node --version 2>/dev/null || echo 'Non installé')"
    echo "  npm: $(npm --version 2>/dev/null || echo 'Non installé')"
    echo
    
    # État de Docker
    log_info "🐳 État de Docker :"
    if docker info >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Docker daemon actif"
        echo "  Containers en cours: $(docker ps -q | wc -l)"
        echo "  Images disponibles: $(docker images -q | wc -l)"
    else
        echo -e "  ${RED}✗${NC} Docker daemon inactif"
    fi
    echo
    
    # Vérification des fichiers de configuration
    log_info "📁 Fichiers de configuration :"
    local config_files=("docker-compose.yml" "backend/package.json" "frontend/package.json" "config/orthanc.json")
    for file in "${config_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file - Manquant"
        fi
    done
    echo
    
    # Ports et processus
    check_ports
    
    # Espace disque et mémoire
    log_info "💾 Ressources système :"
    df -h . | tail -1 | awk '{print "  Espace disque: " $4 " disponible (" $5 " utilisé)"}'
    
    # Résumé des services
    if docker-compose ps >/dev/null 2>&1; then
        echo
        log_info "📊 État des services Docker :"
        docker-compose ps --format "table {{.Service}}\t{{.Status}}"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
}

# Gestion des signaux d'interruption
trap cleanup SIGINT SIGTERM

# Détection de la version RADRIS
detect_radris_version() {
    local has_features=0
    
    # Vérifier la présence des composants essentiels
    if [ -f "docker-compose.yml" ]; then
        has_features=$((has_features + 1))
    fi
    
    if [ -f "config/orthanc.json" ]; then
        has_features=$((has_features + 1))
    fi
    
    if [ -d "frontend" ] && [ -d "backend" ]; then
        has_features=$((has_features + 1))
    fi
    
    # Vérifier la configuration Orthanc pour PostgreSQL
    if grep -q "PostgreSQL\|postgresql" config/orthanc.json 2>/dev/null; then
        has_features=$((has_features + 1))
    fi
    
    # Vérifier les services WebSocket
    if grep -q "WebSocket\|websocket" backend/src/services/websocket.ts 2>/dev/null; then
        has_features=$((has_features + 1))
    fi
    
    if [ $has_features -ge 4 ]; then
        log_success "🚀 RADRIS avec WebSocket et optimisations détecté"
        return 0
    else
        log_info "📦 RADRIS de base détecté"
        log_info "💡 Utilisez './start.sh upgrade' pour mettre à jour"
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
    
    # Images requises pour RADRIS
    required_images=("postgres:15" "redis:7-alpine" "orthancteam/orthanc:latest" "ohif/viewer:latest")
    
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
    log_info "🌟 Services RADRIS disponibles :"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  📱 Frontend RADRIS (Interface RIS)   : http://localhost:3000"
    echo "  🔧 Backend API (Fastify + Prisma)    : http://localhost:3001"
    echo "  🔌 WebSocket (Temps réel)            : ws://localhost:3002"
    echo "  🏥 PACS Orthanc                      : http://localhost:8042"
    echo "     ├─ 🎯 Orthanc Explorer 2 (Modern) : http://localhost:8042/ui/app/"
    echo "     ├─ 👁️  Stone Web Viewer (Intégré)  : http://localhost:8042/ui/app/stone-webviewer/"
    echo "     ├─ 📡 API DICOMweb (QIDO/WADO)    : http://localhost:8042/dicom-web/"
    echo "     ├─ 🌐 WADO-URI (Legacy)           : http://localhost:8042/wado"
    echo "     └─ 🔍 Explorer Orthanc (Classic)  : http://localhost:8042/app/explorer.html"
    echo "  👁️  OHIF Viewer                      : http://localhost:3005"
    echo "  🗄️  PostgreSQL (Backend + Index)     : localhost:5432"
    echo "  🚀 Redis (Cache + Queues)            : localhost:6379"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    
    # Afficher un résumé des services démarrés
    show_startup_summary
    
    # Ouvrir automatiquement le navigateur sur l'interface principale
    log_info "Ouverture automatique de l'interface principale..."
    open_browser "http://localhost:3000"
    
    # Afficher les instructions finales
    echo
    log_info "💡 Fonctionnalités RADRIS disponibles :"
    echo "  🚀 Performance optimisée avec PostgreSQL backend"
    echo "  📊 Cache métadonnées DICOMweb activé"
    echo "  🎯 OHIF Viewer avec extensions modernes"
    echo "  🔌 WebSocket pour mises à jour temps réel"
    echo "  💾 Compression de stockage activée"
    echo "  🛡️  Health checks Docker intégrés"
    echo
    log_info "🎮 RADRIS est maintenant en cours d'exécution!"
    log_info "Utilisez 'Ctrl+C' pour arrêter tous les services"
    log_info "Ou utilisez './start.sh stop' depuis un autre terminal"
    log_info "Pour plus d'options : './start.sh help'"
    echo
}

# Fonction d'aide
show_help() {
    echo "🏥 RADRIS - Script de lancement optimisé"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options principales :"
    echo "  dev, development    Démarrer en mode développement (défaut)"
    echo "  prod, production    Démarrer en mode production"
    echo "  stop               Arrêter tous les services proprement"
    echo "  force-stop         Arrêter tous les services de force"
    echo "  restart            Redémarrer tous les services"
    echo "  status             Afficher le statut détaillé des services"
    echo "  upgrade            Mettre à jour les composants RADRIS"
    echo
    echo "Options de maintenance :"
    echo "  logs               Afficher les logs en temps réel"
    echo "  logs [service]     Afficher les logs d'un service spécifique"
    echo "  clean              Nettoyer les containers et volumes"
    echo "  reset              Arrêter, nettoyer et redémarrer complètement"
    echo "  ports              Vérifier l'utilisation des ports"
    echo "  diagnose           Diagnostic complet du système"
    echo "  test-dicom         Créer et uploader une image DICOM de test"
    echo "  backup             Créer une sauvegarde des données"
    echo "  help               Afficher cette aide"
    echo
    echo "🚀 Fonctionnalités RADRIS :"
    echo "  • Orthanc PACS avec backend PostgreSQL"
    echo "  • OHIF Viewer avec extensions modernes"
    echo "  • Stone Web Viewer intégré et optimisé"
    echo "  • WebSocket temps réel intégré"
    echo "  • Health checks et monitoring intégrés"
    echo
}

# Fonctions utilitaires
stop_services() {
    log_info "Arrêt de tous les services RADRIS..."
    
    # Arrêt des processus Node.js locaux s'ils existent
    log_info "Arrêt des processus Node.js locaux..."
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "node.*start.sh" 2>/dev/null || true
    
    # Arrêt des services Docker
    log_info "Arrêt des services Docker..."
    if docker-compose down --timeout 30; then
        log_success "Services Docker arrêtés proprement."
    else
        log_warning "Arrêt forcé des services Docker..."
        docker-compose kill
        docker-compose down --remove-orphans
    fi
    
    # Nettoyage des ports potentiellement bloqués
    log_info "Vérification des ports..."
    local ports=(3000 3001 3002 3005 5432 6379 8042)
    for port in "${ports[@]}"; do
        local pid=$(lsof -t -i:"$port" 2>/dev/null || true)
        if [ ! -z "$pid" ]; then
            log_warning "Port $port encore utilisé par le processus $pid"
            # kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    log_success "Arrêt complet terminé."
}

restart_services() {
    log_info "Redémarrage des services RADRIS..."
    
    # Arrêt complet
    stop_services
    
    # Attendre que les ports se libèrent
    log_info "Attente de libération des ports..."
    sleep 5
    
    # Vérification de l'état des services avant redémarrage
    log_info "Vérification de l'état des services..."
    if docker ps -q --filter "name=radris-" | wc -l | grep -q "0"; then
        log_success "Tous les containers RADRIS sont arrêtés."
    else
        log_warning "Certains containers sont encore en cours d'arrêt..."
        sleep 3
    fi
    
    # Redémarrage
    log_info "Redémarrage en cours..."
    start_development
}

force_stop() {
    log_warning "Arrêt forcé de tous les services RADRIS..."
    
    # Tuer tous les processus liés à RADRIS
    log_info "Arrêt forcé des processus Node.js..."
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "tsx watch" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "fastify" 2>/dev/null || true
    
    # Arrêt forcé des containers Docker
    log_info "Arrêt forcé des containers Docker..."
    docker-compose kill 2>/dev/null || true
    docker-compose down --remove-orphans --timeout 0 2>/dev/null || true
    
    # Nettoyage forcé des ports
    log_info "Libération forcée des ports..."
    local ports=(3000 3001 3002 3005 5432 6379 8042)
    for port in "${ports[@]}"; do
        local pids=$(lsof -t -i:"$port" 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            log_info "Port $port libéré."
        fi
    done
    
    log_success "Arrêt forcé terminé."
}

show_logs() {
    local service="$1"
    
    if [ -z "$service" ]; then
        log_info "Affichage des logs de tous les services (Ctrl+C pour quitter)..."
        docker-compose logs -f --tail=50
    else
        log_info "Affichage des logs du service '$service' (Ctrl+C pour quitter)..."
        if docker-compose ps | grep -q "$service"; then
            docker-compose logs -f --tail=100 "$service"
        else
            log_error "Service '$service' introuvable."
            log_info "Services disponibles :"
            docker-compose ps --services
        fi
    fi
}

show_status() {
    echo
    log_info "📊 Statut des services RADRIS :"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Statut des containers Docker
    log_info "🐳 Services Docker :"
    docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || {
        log_warning "Impossible d'obtenir le statut Docker Compose"
        docker ps --filter "name=radris-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true
    }
    echo
    
    # Vérification des processus Node.js
    log_info "⚡ Processus Node.js :"
    local node_processes=()
    
    # Backend processes
    if pgrep -f "tsx watch.*src/index.ts" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Backend (tsx watch) - PID: $(pgrep -f "tsx watch.*src/index.ts")"
    else
        echo -e "  ${RED}✗${NC} Backend (tsx watch) - Arrêté"
    fi
    
    # Frontend processes  
    if pgrep -f "next dev" >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Frontend (next dev) - PID: $(pgrep -f "next dev")"
    else
        echo -e "  ${RED}✗${NC} Frontend (next dev) - Arrêté"
    fi
    
    echo
    
    # État de santé des services web
    log_info "🌐 État de santé des services web :"
    
    local services=("Frontend:http://localhost:3000" "Backend API:http://localhost:3001/health" "WebSocket:ws://localhost:3002" "OHIF Viewer:http://localhost:3005" "Orthanc PACS:http://localhost:8042/system" "DICOMweb API:http://localhost:8042/dicom-web/studies" "Stone Viewer:http://localhost:8042/ui/app/stone-webviewer/" "Explorer 2:http://localhost:8042/ui/app/")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name url <<< "$service_info"
        
        if [[ "$url" == ws://* ]]; then
            # Test WebSocket avec timeout
            if timeout 3 bash -c "</dev/tcp/localhost/3002" 2>/dev/null; then
                echo -e "  ${GREEN}✓${NC} $name - Port ouvert"
            else
                echo -e "  ${RED}✗${NC} $name - Port fermé"
            fi
        else
            # Test HTTP
            if curl -s --max-time 3 "$url" >/dev/null 2>&1; then
                echo -e "  ${GREEN}✓${NC} $name - Accessible"
                
                # Test spécial pour le Backend API health
                if [[ "$name" == "Backend API" ]]; then
                    local health_response=$(curl -s --max-time 3 "$url" 2>/dev/null || echo "")
                    if echo "$health_response" | grep -q '"status":"ok"'; then
                        local ws_clients=$(echo "$health_response" | grep -o '"clients":[0-9]*' | grep -o '[0-9]*' || echo "0")
                        echo -e "    └─ WebSocket: $ws_clients client(s) connecté(s)"
                    fi
                fi
            else
                echo -e "  ${RED}✗${NC} $name - Inaccessible"
            fi
        fi
    done
    
    # État de la base de données
    echo
    log_info "🗄️  État de la base de données :"
    if docker exec radris-postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} PostgreSQL - Disponible"
        local db_size=$(docker exec radris-postgres psql -U radris -d radris -t -c "SELECT pg_size_pretty(pg_database_size('radris'));" 2>/dev/null | xargs || echo "N/A")
        echo -e "    └─ Taille de la DB: $db_size"
    else
        echo -e "  ${RED}✗${NC} PostgreSQL - Indisponible"
    fi
    
    if docker exec radris-redis redis-cli ping >/dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Redis - Disponible"
        local redis_memory=$(docker exec radris-redis redis-cli info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "N/A")
        echo -e "    └─ Mémoire utilisée: $redis_memory"
    else
        echo -e "  ${RED}✗${NC} Redis - Indisponible"  
    fi
    
    # Vérification des plugins Orthanc
    echo
    log_info "🔌 Plugins Orthanc :"
    if plugins=$(curl -s --max-time 3 http://localhost:8042/plugins 2>/dev/null); then
        echo "$plugins" | jq -r '.[]' 2>/dev/null | while read -r plugin; do
            case "$plugin" in
                "stone-webviewer") echo -e "  ${GREEN}✓${NC} Stone Web Viewer" ;;
                "dicom-web") echo -e "  ${GREEN}✓${NC} DICOMweb (QIDO/WADO)" ;;
                "orthanc-explorer-2") echo -e "  ${GREEN}✓${NC} Orthanc Explorer 2" ;;
                "gdcm") echo -e "  ${GREEN}✓${NC} GDCM (Image Decoder)" ;;
                "postgresql-index") echo -e "  ${GREEN}✓${NC} PostgreSQL Index" ;;
                "postgresql-storage") echo -e "  ${GREEN}✓${NC} PostgreSQL Storage" ;;
                *) echo -e "  ${BLUE}ℹ${NC} $plugin" ;;
            esac
        done
    else
        echo -e "  ${RED}✗${NC} Impossible de récupérer la liste des plugins"
    fi
    
    # Statistiques d'utilisation
    echo
    log_info "📈 Statistiques d'utilisation des ports :"
    local ports=(3000 3001 3002 3005 5432 6379 8042)
    for port in "${ports[@]}"; do
        if lsof -i:"$port" >/dev/null 2>&1; then
            local process=$(lsof -t -i:"$port" 2>/dev/null | head -1)
            local process_name=$(ps -p "$process" -o comm= 2>/dev/null || echo "unknown")
            echo -e "  ${GREEN}✓${NC} Port $port - Utilisé par $process_name (PID: $process)"
        else
            echo -e "  ${YELLOW}○${NC} Port $port - Libre"
        fi
    done
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
}

clean_services() {
    log_warning "Cette action va supprimer tous les containers et volumes RADRIS."
    echo "⚠️  Cela inclut :"
    echo "  - Tous les containers RADRIS"
    echo "  - Tous les volumes de données"
    echo "  - Images DICOM stockées"
    echo "  - Base de données PostgreSQL"
    echo "  - Cache Redis"
    echo
    read -p "Êtes-vous sûr ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Nettoyage en cours..."
        
        # Arrêt forcé d'abord
        force_stop
        
        # Nettoyage des containers et volumes
        docker-compose down -v --remove-orphans 2>/dev/null || true
        
        # Nettoyage des images RADRIS
        log_info "Suppression des images Docker inutilisées..."
        docker system prune -f
        
        # Nettoyage des réseaux
        docker network prune -f 2>/dev/null || true
        
        log_success "Nettoyage terminé."
        log_info "Utilisez './start.sh dev' pour redémarrer proprement."
    else
        log_info "Nettoyage annulé."
    fi
}

reset_services() {
    log_warning "Cette action va complètement réinitialiser RADRIS."
    echo "🔄 Séquence de réinitialisation :"
    echo "  1. Arrêt de tous les services"
    echo "  2. Nettoyage des containers et volumes"
    echo "  3. Réinstallation des dépendances"
    echo "  4. Redémarrage complet"
    echo
    read -p "Continuer avec la réinitialisation complète ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "🔄 Début de la réinitialisation..."
        
        # Nettoyage complet
        force_stop
        docker-compose down -v --remove-orphans 2>/dev/null || true
        
        # Réinstallation des dépendances
        install_dependencies
        
        # Redémarrage
        log_info "🚀 Redémarrage complet..."
        start_development
    else
        log_info "Réinitialisation annulée."
    fi
}

upgrade_services() {
    log_info "🚀 Mise à jour des composants RADRIS..."
    
    # Mise à jour des images Docker
    log_info "Mise à jour des images Docker..."
    docker-compose pull
    
    # Mise à jour des dépendances Node.js
    log_info "Mise à jour des dépendances..."
    install_dependencies
    
    # Redémarrage des services
    log_info "Redémarrage des services avec les nouvelles versions..."
    restart_services
    
    log_success "Mise à jour terminée !"
}

test_dicom() {
    log_info "🏥 Création et upload d'études DICOM de test..."
    
    if [ -f "./scripts/create-test-studies.sh" ]; then
        cd scripts
        chmod +x create-test-studies.sh
        ./create-test-studies.sh
        cd ..
        log_success "Études DICOM de test créées."
        log_info "Testez les viewers :"
        echo "  • Stone Web Viewer : http://localhost:8042/ui/app/stone-webviewer/"
        echo "  • OHIF Viewer      : http://localhost:3005"
        echo "  • Orthanc Explorer : http://localhost:8042/app/explorer.html"
    else
        log_warning "Script de création d'études non trouvé."
        log_info "Vous pouvez créer manuellement des études DICOM via :"
        echo "  • Interface Orthanc : http://localhost:8042/app/explorer.html"
        echo "  • Upload direct     : http://localhost:8042/app/explorer.html#upload"
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
        "force-stop")
            force_stop
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs "$2"
            ;;
        "status")
            show_status
            ;;
        "clean")
            clean_services
            ;;
        "reset")
            reset_services
            ;;
        "ports")
            check_ports
            ;;
        "diagnose"|"diag")
            diagnose_system
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
    echo "🏥 RADRIS - Radiology Information System"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🚀 Stack complet : Orthanc + OHIF + WebSocket"
    echo "⚡ Performance optimisée avec PostgreSQL backend"
    echo "👁️  Viewers : Stone Web Viewer + OHIF moderne"
    echo "🔌 Temps réel : WebSocket pour mises à jour live"
    echo "🛡️  Health checks et monitoring intégrés"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
fi

# Exécution
main "$@"
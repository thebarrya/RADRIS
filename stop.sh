#!/bin/bash

# RADRIS - Script d'arrêt rapide
# Arrête tous les services RADRIS rapidement

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Fonction d'arrêt rapide
quick_stop() {
    echo "🛑 Arrêt rapide de RADRIS..."
    echo
    
    # Arrêter les processus Node.js locaux
    log_info "Arrêt des processus Node.js..."
    pkill -f "npm run dev" 2>/dev/null && log_info "✓ npm run dev arrêté" || true
    pkill -f "tsx watch" 2>/dev/null && log_info "✓ tsx watch arrêté" || true
    pkill -f "next dev" 2>/dev/null && log_info "✓ next dev arrêté" || true
    
    # Arrêter les services Docker
    log_info "Arrêt des services Docker..."
    if docker-compose down --timeout 10 2>/dev/null; then
        log_success "✓ Services Docker arrêtés"
    else
        log_warning "Arrêt forcé..."
        docker-compose kill 2>/dev/null || true
        docker-compose down --remove-orphans 2>/dev/null || true
    fi
    
    echo
    log_success "🏁 RADRIS arrêté avec succès !"
    echo
}

# Mode forcé
force_stop() {
    echo "🚨 Arrêt forcé de RADRIS..."
    echo
    
    # Arrêt brutal des processus
    log_warning "Arrêt forcé des processus..."
    pkill -9 -f "npm run dev" 2>/dev/null || true
    pkill -9 -f "tsx watch" 2>/dev/null || true
    pkill -9 -f "next dev" 2>/dev/null || true
    pkill -9 -f "fastify" 2>/dev/null || true
    
    # Arrêt brutal des containers
    log_warning "Arrêt forcé des containers..."
    docker-compose kill 2>/dev/null || true
    docker-compose down --remove-orphans --timeout 0 2>/dev/null || true
    
    # Libération des ports
    local ports=(3000 3001 3002 3005 5432 6379 8042)
    for port in "${ports[@]}"; do
        local pids=$(lsof -t -i:"$port" 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            log_info "Port $port libéré"
        fi
    done
    
    echo
    log_success "🏁 Arrêt forcé terminé !"
    echo
}

# Aide
show_help() {
    echo "🛑 RADRIS Stop - Script d'arrêt rapide"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options :"
    echo "  (aucune)    Arrêt normal (défaut)"
    echo "  force       Arrêt forcé de tous les services"
    echo "  help        Afficher cette aide"
    echo
}

# Point d'entrée
case "${1:-}" in
    "force")
        force_stop
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        quick_stop
        ;;
    *)
        echo "Option inconnue: $1"
        show_help
        exit 1
        ;;
esac
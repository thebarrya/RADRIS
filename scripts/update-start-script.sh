#!/bin/bash

# Script de mise à jour automatique du script de lancement RADRIS
# Ce script analyse les changements dans le projet et met à jour start.sh en conséquence

set -e

# Couleurs pour l'affichage
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction pour détecter les changements dans le projet
detect_changes() {
    local changes_detected=false
    
    log_info "Analyse des changements dans la configuration du projet..."
    
    # Vérifier les changements dans docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
        # Extraire les services du docker-compose
        local services=$(docker-compose config --services 2>/dev/null | sort)
        local expected_services="backend frontend ohif-viewer orthanc postgres redis"
        
        if [ "$services" != "$expected_services" ]; then
            log_warning "Changements détectés dans les services Docker Compose"
            changes_detected=true
        fi
    fi
    
    # Vérifier les changements dans les ports
    if [ -f "docker-compose.yml" ]; then
        local ports=$(grep -E "^\s+- \"[0-9]+:" docker-compose.yml | sort)
        local expected_ports_count=$(echo "$ports" | wc -l)
        
        if [ $expected_ports_count -ne 6 ]; then
            log_warning "Changements détectés dans la configuration des ports"
            changes_detected=true
        fi
    fi
    
    # Vérifier les nouveaux scripts dans package.json
    for package_file in "package.json" "backend/package.json" "frontend/package.json"; do
        if [ -f "$package_file" ]; then
            local scripts_count=$(jq -r '.scripts | keys[]' "$package_file" 2>/dev/null | wc -l)
            if [ $scripts_count -gt 10 ]; then
                log_warning "Nouveaux scripts détectés dans $package_file"
                changes_detected=true
            fi
        fi
    done
    
    # Vérifier l'ajout de nouveaux Dockerfiles
    local dockerfiles=$(find . -name "Dockerfile*" -not -path "./node_modules/*" | wc -l)
    if [ $dockerfiles -gt 2 ]; then
        log_warning "Nouveaux Dockerfiles détectés"
        changes_detected=true
    fi
    
    if [ "$changes_detected" = true ]; then
        log_info "Des changements ont été détectés. Mise à jour du script de lancement..."
        return 0
    else
        log_success "Aucun changement détecté. Le script de lancement est à jour."
        return 1
    fi
}

# Fonction pour mettre à jour le script de lancement
update_start_script() {
    local backup_file="start.sh.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Créer une sauvegarde
    if [ -f "start.sh" ]; then
        log_info "Création d'une sauvegarde : $backup_file"
        cp start.sh "$backup_file"
    fi
    
    # Analyser la configuration actuelle
    local services=""
    local ports=""
    local environment_vars=""
    
    if [ -f "docker-compose.yml" ]; then
        services=$(docker-compose config --services 2>/dev/null | tr '\n' ' ')
        ports=$(grep -E "^\s+- \"[0-9]+:" docker-compose.yml | sed 's/.*"\([0-9]*\):.*/\1/' | sort -n)
    fi
    
    # Générer les informations de service dynamiquement
    local service_info=""
    while IFS= read -r port; do
        case $port in
            3000) service_info+="\n  📱 Frontend (Interface principale)    : http://localhost:3000" ;;
            3001) service_info+="\n  🔧 Backend API                       : http://localhost:3001" ;;
            3005) service_info+="\n  👁️  Visualiseur OHIF                  : http://localhost:3005" ;;
            5432) service_info+="\n  🗄️  Base de données PostgreSQL       : localhost:5432" ;;
            6379) service_info+="\n  🚀 Cache Redis                       : localhost:6379" ;;
            8042) service_info+="\n  🏥 PACS Orthanc                      : http://localhost:8042" ;;
        esac
    done <<< "$ports"
    
    # Mettre à jour la section des services dans start.sh
    if [ -f "start.sh" ] && [ -n "$service_info" ]; then
        # Remplacer la section des services
        sed -i.tmp "/Services disponibles/,/^$/c\\
    log_info \"Services disponibles :\"$service_info\\
    echo" start.sh
        rm -f start.sh.tmp
        log_success "Script de lancement mis à jour avec les nouveaux services"
    fi
}

# Fonction pour valider le script mis à jour
validate_script() {
    log_info "Validation du script mis à jour..."
    
    # Vérifier la syntaxe bash
    if bash -n start.sh; then
        log_success "Syntaxe du script validée"
    else
        log_error "Erreur de syntaxe dans le script mis à jour"
        return 1
    fi
    
    # Vérifier que les commandes essentielles sont présentes
    local essential_commands=("docker-compose" "npm" "node")
    for cmd in "${essential_commands[@]}"; do
        if ! grep -q "$cmd" start.sh; then
            log_warning "Commande '$cmd' non trouvée dans le script"
        fi
    done
}

# Fonction pour générer un hook Git
setup_git_hook() {
    if [ -d ".git" ]; then
        local hook_file=".git/hooks/post-merge"
        
        cat > "$hook_file" << 'EOF'
#!/bin/bash
# Hook Git pour mettre à jour automatiquement le script de lancement

echo "Vérification des changements de configuration..."
if [ -f "scripts/update-start-script.sh" ]; then
    bash scripts/update-start-script.sh
fi
EOF
        
        chmod +x "$hook_file"
        log_success "Hook Git configuré pour la mise à jour automatique"
    fi
}

# Fonction principale
main() {
    log_info "Démarrage de la mise à jour du script de lancement RADRIS..."
    
    # Vérifier que nous sommes dans le bon répertoire
    if [ ! -f "docker-compose.yml" ]; then
        log_error "Ce script doit être exécuté depuis la racine du projet RADRIS"
        exit 1
    fi
    
    # Détecter les changements
    if detect_changes; then
        # Mettre à jour le script
        update_start_script
        
        # Valider le script mis à jour
        validate_script
        
        log_success "Mise à jour terminée avec succès"
    fi
    
    # Configurer le hook Git si demandé
    if [ "${1:-}" = "--setup-hook" ]; then
        setup_git_hook
    fi
    
    log_info "Pour configurer la mise à jour automatique avec Git, exécutez :"
    log_info "$0 --setup-hook"
}

# Point d'entrée
main "$@"
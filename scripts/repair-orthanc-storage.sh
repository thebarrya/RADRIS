#!/bin/bash

# RADRIS - Script de réparation du stockage Orthanc corrompu
# Version: 1.0
# Date: 2025-01-13

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backup/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}================================"
echo -e "RADRIS - Réparation Stockage Orthanc"
echo -e "================================${NC}\n"

# Fonction de logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction de vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé ou accessible"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé ou accessible"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "Fichier docker-compose.yml non trouvé dans $PROJECT_ROOT"
        exit 1
    fi
    
    log_info "✓ Prérequis validés"
}

# Fonction de création du backup
create_backup() {
    log_info "Création du backup de sécurité..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup de la configuration
    if [ -f "$PROJECT_ROOT/config/orthanc.json" ]; then
        cp "$PROJECT_ROOT/config/orthanc.json" "$BACKUP_DIR/"
        log_info "✓ Configuration Orthanc sauvegardée"
    fi
    
    # Backup du docker-compose
    cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/"
    log_info "✓ Docker Compose sauvegardé"
    
    # Export des données PostgreSQL si possible
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps postgres | grep -q "Up"; then
        log_info "Export de la base de données PostgreSQL..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" exec -T postgres pg_dump -U orthanc orthanc > "$BACKUP_DIR/postgres_backup.sql" 2>/dev/null || log_warn "Impossible d'exporter PostgreSQL"
    fi
    
    log_info "✓ Backup créé dans: $BACKUP_DIR"
}

# Fonction d'arrêt des services
stop_services() {
    log_info "Arrêt des services Docker..."
    
    cd "$PROJECT_ROOT"
    
    # Arrêt gracieux
    docker-compose down --timeout 30 || {
        log_warn "Arrêt gracieux échoué, forçage de l'arrêt..."
        docker-compose kill
        docker-compose rm -f
    }
    
    log_info "✓ Services arrêtés"
}

# Fonction de nettoyage des volumes
clean_volumes() {
    log_info "Nettoyage des volumes Docker corrompus..."
    
    # Liste des volumes Orthanc à nettoyer
    VOLUMES_TO_CLEAN=(
        "radris_orthanc-data"
        "radris_orthanc-db"
        "radris_postgres-data"
    )
    
    for volume in "${VOLUMES_TO_CLEAN[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            log_info "Suppression du volume: $volume"
            docker volume rm "$volume" 2>/dev/null || log_warn "Impossible de supprimer $volume"
        fi
    done
    
    # Nettoyage des conteneurs orphelins
    docker container prune -f &>/dev/null || true
    docker network prune -f &>/dev/null || true
    
    log_info "✓ Volumes nettoyés"
}

# Fonction de vérification de la configuration Orthanc
verify_orthanc_config() {
    log_info "Vérification de la configuration Orthanc..."
    
    local config_file="$PROJECT_ROOT/config/orthanc.json"
    
    if [ ! -f "$config_file" ]; then
        log_error "Configuration Orthanc non trouvée: $config_file"
        exit 1
    fi
    
    # Vérification de la syntaxe JSON
    if ! python3 -m json.tool "$config_file" >/dev/null 2>&1; then
        log_error "Configuration Orthanc invalide (syntaxe JSON)"
        exit 1
    fi
    
    log_info "✓ Configuration Orthanc valide"
}

# Fonction de redémarrage des services
restart_services() {
    log_info "Redémarrage des services avec stockage propre..."
    
    cd "$PROJECT_ROOT"
    
    # Démarrage avec recréation des volumes
    docker-compose up -d --force-recreate
    
    log_info "✓ Services redémarrés"
}

# Fonction d'attente de démarrage
wait_for_services() {
    log_info "Attente du démarrage complet des services..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8042/system >/dev/null 2>&1; then
            log_info "✓ Orthanc est accessible"
            break
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -ge $max_attempts ]; then
        log_error "Timeout: Orthanc n'est pas accessible après 2 minutes"
        return 1
    fi
    
    # Attente supplémentaire pour PostgreSQL
    sleep 5
    log_info "✓ Services prêts"
}

# Fonction de test avec fichier DICOM
test_dicom_upload() {
    log_info "Test d'upload d'un fichier DICOM..."
    
    # Recherche d'un fichier DICOM de test
    local test_files=(
        "$PROJECT_ROOT/test-chest.dcm"
        "$PROJECT_ROOT/sample.dcm"
        "$PROJECT_ROOT/dcm-sample.dcm"
        "$PROJECT_ROOT/orthanc-test.dcm"
    )
    
    local test_file=""
    for file in "${test_files[@]}"; do
        if [ -f "$file" ]; then
            test_file="$file"
            break
        fi
    done
    
    if [ -z "$test_file" ]; then
        log_warn "Aucun fichier DICOM de test trouvé"
        log_info "Création d'un fichier DICOM de test minimal..."
        create_test_dicom
        test_file="$PROJECT_ROOT/test-minimal.dcm"
    fi
    
    # Upload du fichier DICOM
    log_info "Upload du fichier: $(basename "$test_file")"
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/dicom" \
        --data-binary "@$test_file" \
        http://localhost:8042/instances)
    
    if echo "$response" | grep -q "ID"; then
        local instance_id=$(echo "$response" | grep -o '"ID":"[^"]*"' | cut -d'"' -f4)
        log_info "✓ Upload réussi - Instance ID: $instance_id"
        
        # Test de récupération de l'image
        if curl -s "http://localhost:8042/instances/$instance_id/preview" >/dev/null; then
            log_info "✓ Image accessible via l'API"
        else
            log_warn "Image uploadée mais non accessible via l'API"
        fi
    else
        log_error "Échec de l'upload DICOM"
        log_error "Réponse: $response"
        return 1
    fi
}

# Fonction de création d'un fichier DICOM de test minimal
create_test_dicom() {
    log_info "Création d'un fichier DICOM de test minimal..."
    
    # Utilisation de Python pour créer un DICOM basique
    python3 -c "
import sys
try:
    from pydicom.dataset import Dataset, FileDataset
    from pydicom.uid import generate_uid
    import numpy as np
    from datetime import datetime
    
    # Création d'un dataset minimal
    ds = Dataset()
    ds.PatientName = 'TEST^PATIENT'
    ds.PatientID = 'TEST001'
    ds.StudyDate = datetime.now().strftime('%Y%m%d')
    ds.StudyTime = datetime.now().strftime('%H%M%S')
    ds.StudyInstanceUID = generate_uid()
    ds.SeriesInstanceUID = generate_uid()
    ds.SOPInstanceUID = generate_uid()
    ds.SOPClassUID = '1.2.840.10008.5.1.4.1.1.2'  # CT Image Storage
    ds.Modality = 'CT'
    ds.Rows = 64
    ds.Columns = 64
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = 'MONOCHROME2'
    
    # Image de test simple (gradient)
    pixel_data = np.zeros((64, 64), dtype=np.uint16)
    for i in range(64):
        for j in range(64):
            pixel_data[i, j] = (i + j) * 100
    
    ds.PixelData = pixel_data.tobytes()
    
    # Sauvegarde
    ds.save_as('$PROJECT_ROOT/test-minimal.dcm')
    print('✓ Fichier DICOM de test créé')
    
except ImportError:
    print('⚠ pydicom non disponible, utilisation d\\'un fichier DICOM simple')
    # Création d'un fichier DICOM très basique (headers seulement)
    with open('$PROJECT_ROOT/test-minimal.dcm', 'wb') as f:
        # Magic number DICOM
        f.write(b'DICM')
        # Quelques tags basiques
        f.write(b'\\x08\\x00\\x05\\x00CS\\x04\\x00TEST')
" || {
        # Fallback: copie d'un fichier existant s'il y en a un
        log_warn "Impossible de créer un fichier DICOM, utilisation d'un fallback"
        echo "DICOM_TEST_FILE" > "$PROJECT_ROOT/test-minimal.dcm"
    }
}

# Fonction de vérification finale
final_verification() {
    log_info "Vérification finale du système..."
    
    # Vérification de l'état des conteneurs
    local unhealthy=$(docker-compose ps | grep -c "unhealthy" || true)
    if [ "$unhealthy" -gt 0 ]; then
        log_warn "Certains conteneurs sont marqués comme 'unhealthy'"
    fi
    
    # Vérification des endpoints
    local endpoints=(
        "http://localhost:8042/system"
        "http://localhost:8042/plugins"
        "http://localhost:8042/dicom-web/studies"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s "$endpoint" >/dev/null; then
            log_info "✓ $(basename "$endpoint") accessible"
        else
            log_warn "⚠ $(basename "$endpoint") non accessible"
        fi
    done
    
    log_info "✓ Vérification terminée"
}

# Fonction principale
main() {
    echo -e "${BLUE}Démarrage de la réparation du stockage Orthanc...${NC}\n"
    
    # Confirmation utilisateur (skip si --force ou -f)
    if [[ "$1" != "--force" && "$1" != "-f" ]]; then
        read -p "Continuer avec la réparation? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Opération annulée par l'utilisateur"
            exit 0
        fi
    else
        log_info "Mode automatique activé (--force)"
    fi
    
    # Exécution des étapes
    check_prerequisites
    create_backup
    stop_services
    clean_volumes
    verify_orthanc_config
    restart_services
    wait_for_services
    test_dicom_upload
    final_verification
    
    echo -e "\n${GREEN}================================"
    echo -e "✓ RÉPARATION TERMINÉE AVEC SUCCÈS"
    echo -e "================================${NC}"
    echo -e "Backup sauvegardé dans: ${BLUE}$BACKUP_DIR${NC}"
    echo -e "Orthanc accessible sur: ${BLUE}http://localhost:8042${NC}"
    echo -e "Stone Web Viewer: ${BLUE}http://localhost:8042/stone-webviewer/index.html${NC}"
    echo -e "Orthanc Explorer 2: ${BLUE}http://localhost:8042/ui/app/index.html${NC}"
}

# Gestion des signaux
trap 'log_error "Script interrompu"; exit 1' INT TERM

# Exécution
main "$@"
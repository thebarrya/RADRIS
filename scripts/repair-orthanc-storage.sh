#!/bin/bash

# =============================================================================
# RADRIS - Orthanc Storage Repair Script
# =============================================================================
# Purpose: Fix corrupted Orthanc DICOM storage causing black images
# Author: RADRIS Development Team
# Version: 1.0
# Date: $(date +%Y-%m-%d)
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# =============================================================================
# STEP 1: Pre-flight checks
# =============================================================================
log "🔍 Starting Orthanc storage repair process..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    error "Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found. Please run this script from the RADRIS root directory."
    exit 1
fi

# =============================================================================
# STEP 2: Backup current configuration (optional)
# =============================================================================
log "💾 Creating backup of current configuration..."

BACKUP_DIR="backups/storage-repair-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup configurations
cp docker-compose.yml "$BACKUP_DIR/"
cp -r config/ "$BACKUP_DIR/" 2>/dev/null || true

success "Configuration backup saved to $BACKUP_DIR"

# =============================================================================
# STEP 3: Stop all services
# =============================================================================
log "⏹️  Stopping all Docker services..."

docker-compose down --remove-orphans || true

# Wait for services to fully stop
sleep 5

success "All services stopped"

# =============================================================================
# STEP 4: Remove corrupted volumes and data
# =============================================================================
log "🧹 Removing corrupted Docker volumes and data..."

warning "This will permanently delete all stored DICOM data!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    error "Operation cancelled by user"
    exit 1
fi

# Remove Docker volumes
docker volume rm radris_orthanc-db radris_orthanc-data radris_postgres-data 2>/dev/null || true

# Remove any remaining containers
docker container prune -f

# Clean up any orphaned images
docker image prune -f

success "Corrupted data removed"

# =============================================================================
# STEP 5: Recreate clean storage
# =============================================================================
log "🔄 Recreating clean storage volumes..."

# Recreate volumes
docker volume create radris_orthanc-db
docker volume create radris_orthanc-data  
docker volume create radris_postgres-data

success "Clean storage volumes created"

# =============================================================================
# STEP 6: Start services with clean storage
# =============================================================================
log "🚀 Starting services with clean storage..."

# Start PostgreSQL first
docker-compose up -d postgres
log "Waiting for PostgreSQL to be ready..."
sleep 10

# Start Orthanc
docker-compose up -d orthanc
log "Waiting for Orthanc to initialize..."
sleep 15

# Start remaining services
docker-compose up -d

log "Waiting for all services to be ready..."
sleep 10

success "All services started with clean storage"

# =============================================================================
# STEP 7: Verify services are running
# =============================================================================
log "🔍 Verifying services are running correctly..."

# Check service health
ORTHANC_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8042/system 2>/dev/null || echo "000")
OHIF_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 2>/dev/null || echo "000")
STONE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "000")

echo ""
echo "=== Service Health Check ==="
echo "Orthanc (8042): $([[ $ORTHANC_HEALTH == "200" ]] && echo "✅ Running" || echo "❌ Not responding")"
echo "OHIF (3001): $([[ $OHIF_HEALTH == "200" ]] && echo "✅ Running" || echo "❌ Not responding")"  
echo "Stone Viewer (3002): $([[ $STONE_HEALTH == "200" ]] && echo "✅ Running" || echo "❌ Not responding")"
echo ""

# =============================================================================
# STEP 8: Upload test DICOM files
# =============================================================================
log "📤 Uploading test DICOM files..."

# Check if test DICOM files exist
TEST_DICOMS=("dcm-sample.dcm" "test-chest.dcm" "sample.dcm" "orthanc-test.dcm")
UPLOADED_COUNT=0

for dicom_file in "${TEST_DICOMS[@]}"; do
    if [ -f "$dicom_file" ]; then
        log "Uploading $dicom_file..."
        
        # Upload via Orthanc REST API
        UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8042/instances \
            -H "Content-Type: application/dicom" \
            --data-binary "@$dicom_file" || echo "failed")
        
        if [[ $UPLOAD_RESPONSE == *"ID"* ]]; then
            success "✅ $dicom_file uploaded successfully"
            ((UPLOADED_COUNT++))
        else
            warning "⚠️  Failed to upload $dicom_file"
        fi
    else
        warning "⚠️  Test file $dicom_file not found"
    fi
done

if [ $UPLOADED_COUNT -eq 0 ]; then
    warning "No test DICOM files were uploaded. You may need to upload your own DICOM files for testing."
fi

# =============================================================================
# STEP 9: Final verification
# =============================================================================
log "🔍 Performing final verification..."

# Check Orthanc instances
INSTANCES_COUNT=$(curl -s http://localhost:8042/instances 2>/dev/null | jq length 2>/dev/null || echo "0")

echo ""
echo "=== Repair Summary ==="
echo "• Services Status: All services restarted with clean storage"
echo "• DICOM Instances: $INSTANCES_COUNT instances available"
echo "• Test Files: $UPLOADED_COUNT test files uploaded"
echo ""

# =============================================================================
# STEP 10: Next steps and instructions
# =============================================================================
success "🎉 Orthanc storage repair completed!"

echo ""
echo "=== Next Steps ==="
echo "1. 🌐 Access Orthanc Web UI: http://localhost:8042"
echo "2. 👁️  Test Stone Web Viewer: http://localhost:3002"  
echo "3. 🔬 Test OHIF Viewer: http://localhost:3001"
echo "4. 📤 Upload your DICOM files via Orthanc web interface"
echo "5. 🧪 Verify images display correctly (no more black images)"
echo ""

echo "=== Useful Commands ==="
echo "• Check logs: docker-compose logs -f orthanc"
echo "• Upload DICOM: curl -X POST http://localhost:8042/instances -H 'Content-Type: application/dicom' --data-binary @your-file.dcm"
echo "• Monitor services: docker-compose ps"
echo ""

warning "Note: All previous DICOM data has been permanently deleted. Please re-upload your DICOM studies."

log "Repair process completed successfully! 🚀"
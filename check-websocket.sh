#!/bin/bash

# Script de vérification WebSocket pour RADRIS
# Vérifie l'état du service WebSocket et les connexions actives

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo "🔌 Vérification du service WebSocket RADRIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier si le port 3002 est ouvert
log_info "Vérification du port WebSocket (3002)..."
if lsof -i:3002 >/dev/null 2>&1; then
    pid=$(lsof -t -i:3002 2>/dev/null | head -1)
    process_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
    log_success "Port 3002 ouvert - Processus: $process_name (PID: $pid)"
else
    log_error "Port 3002 fermé - Service WebSocket non actif"
fi

# Tester la connectivité WebSocket
log_info "Test de connectivité WebSocket..."
if timeout 3 bash -c "</dev/tcp/localhost/3002" 2>/dev/null; then
    log_success "Port WebSocket accessible"
else
    log_error "Port WebSocket inaccessible"
fi

# Vérifier l'état du backend API
log_info "Vérification de l'API Backend..."
if curl -s --max-time 3 "http://localhost:3001/health" >/dev/null 2>&1; then
    health_response=$(curl -s --max-time 3 "http://localhost:3001/health" 2>/dev/null)
    
    if echo "$health_response" | grep -q '"status":"ok"'; then
        log_success "Backend API opérationnel"
        
        # Extraire les informations WebSocket du health check
        ws_clients=$(echo "$health_response" | grep -o '"clients":[0-9]*' | grep -o '[0-9]*' || echo "0")
        ws_users=$(echo "$health_response" | grep -o '"usersOnline":[0-9]*' | grep -o '[0-9]*' || echo "0")
        
        echo "  └─ WebSocket: $ws_clients client(s) connecté(s)"
        echo "  └─ Utilisateurs en ligne: $ws_users"
    else
        log_warning "Backend API répond mais statut non OK"
    fi
else
    log_error "Backend API inaccessible"
fi

# Vérifier les processus Node.js actifs
echo
log_info "Processus Node.js actifs :"

if pgrep -f "tsx watch.*src/index.ts" >/dev/null 2>&1; then
    backend_pid=$(pgrep -f "tsx watch.*src/index.ts")
    log_success "Backend (tsx watch) - PID: $backend_pid"
else
    log_warning "Backend (tsx watch) non détecté"
fi

if pgrep -f "next dev" >/dev/null 2>&1; then
    frontend_pid=$(pgrep -f "next dev")
    log_success "Frontend (next dev) - PID: $frontend_pid"
else
    log_warning "Frontend (next dev) non détecté"
fi

# Vérifier les conteneurs Docker
echo
log_info "Services Docker RADRIS :"

if docker ps --filter "name=radris-backend" --format "{{.Status}}" | grep -q "Up"; then
    log_success "Container Backend actif"
else
    log_warning "Container Backend inactif"
fi

if docker ps --filter "name=radris-frontend" --format "{{.Status}}" | grep -q "Up"; then
    log_success "Container Frontend actif"
else
    log_warning "Container Frontend inactif"
fi

# Test simple de WebSocket avec Node.js (si disponible)
echo
log_info "Test de connexion WebSocket..."

# Créer un test WebSocket simple en JavaScript
cat > /tmp/ws-test.js << 'EOF'
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3002?token=test');

ws.on('open', function open() {
    console.log('✅ Connexion WebSocket établie');
    ws.close();
});

ws.on('error', function error(err) {
    console.log('❌ Erreur WebSocket:', err.message);
});

ws.on('close', function close() {
    console.log('🔌 Connexion WebSocket fermée');
    process.exit(0);
});

// Timeout après 5 secondes
setTimeout(() => {
    console.log('⏱️  Timeout - WebSocket non accessible');
    process.exit(1);
}, 5000);
EOF

# Exécuter le test si Node.js est disponible
if command -v node >/dev/null 2>&1; then
    if node -e "require('ws')" 2>/dev/null; then
        log_info "Exécution du test WebSocket..."
        node /tmp/ws-test.js 2>/dev/null || log_warning "Test WebSocket échoué"
    else
        log_info "Module 'ws' non disponible pour le test avancé"
    fi
    
    # Nettoyage
    rm -f /tmp/ws-test.js
else
    log_warning "Node.js non disponible pour test avancé"
fi

echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Pour plus d'informations détaillées :"
echo "  • Statut complet : ./start.sh status"
echo "  • Logs WebSocket : ./start.sh logs backend"
echo "  • Health check   : curl http://localhost:3001/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
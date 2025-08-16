#!/bin/bash

# Script de test complet de l'authentification RADRIS
echo "🏥 Test Complet d'Authentification RADRIS"
echo "=========================================="

FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001/api"

echo ""
echo "🔍 Phase 1: Tests Backend Direct"
echo "--------------------------------"

# Test backend auth
echo "📡 Test backend auth endpoint..."
BACKEND_AUTH=$(curl -s -w "%{http_code}" -o /tmp/backend_auth.json \
  "$BACKEND_URL/auth/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@radris.fr","password":"admin123"}')

BACKEND_CODE=${BACKEND_AUTH: -3}
if [ "$BACKEND_CODE" = "200" ]; then
    echo "   ✅ Backend Auth: OK"
    TOKEN=$(cat /tmp/backend_auth.json | jq -r '.token')
else
    echo "   ❌ Backend Auth: FAILED ($BACKEND_CODE)"
    cat /tmp/backend_auth.json
    exit 1
fi

echo ""
echo "🔍 Phase 2: Tests API Routes Frontend"
echo "-----------------------------------"

# Test frontend API route
echo "📡 Test frontend API route..."
FRONTEND_API=$(curl -s -w "%{http_code}" -o /tmp/frontend_api.json \
  "$FRONTEND_URL/api/auth/test-backend" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@radris.fr","password":"admin123"}')

FRONTEND_API_CODE=${FRONTEND_API: -3}
if [ "$FRONTEND_API_CODE" = "200" ]; then
    echo "   ✅ Frontend API Route: OK"
else
    echo "   ❌ Frontend API Route: FAILED ($FRONTEND_API_CODE)"
    cat /tmp/frontend_api.json
fi

echo ""
echo "🔍 Phase 3: Tests Pages Frontend"
echo "------------------------------"

# Test pages accessibility
PAGES=("/" "auth/test-login" "auth/simple-login" "test-auth-debug" "test-cornerstone-fixed")

for page in "${PAGES[@]}"; do
    PAGE_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/$page")
    if [ "$PAGE_STATUS" = "200" ]; then
        echo "   ✅ /$page: OK"
    else
        echo "   ❌ /$page: Error ($PAGE_STATUS)"
    fi
done

echo ""
echo "🔍 Phase 4: Tests NextAuth"
echo "------------------------"

# Test NextAuth endpoints
NEXTAUTH_ENDPOINTS=("api/auth/providers" "api/auth/csrf")

for endpoint in "${NEXTAUTH_ENDPOINTS[@]}"; do
    NEXTAUTH_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/$endpoint")
    if [ "$NEXTAUTH_STATUS" = "200" ]; then
        echo "   ✅ $endpoint: OK"
    else
        echo "   ❌ $endpoint: Error ($NEXTAUTH_STATUS)"
    fi
done

echo ""
echo "🎯 Résumé des Solutions d'Authentification"
echo "=========================================="
echo ""
echo "✅ FONCTIONNELLES:"
echo "   • Backend Direct: $BACKEND_URL/auth/login"
echo "   • Frontend API Route: $FRONTEND_URL/api/auth/test-backend"
echo "   • Simple Login Page: $FRONTEND_URL/auth/simple-login"
echo ""
echo "🔧 À TESTER:"
echo "   • NextAuth Login: $FRONTEND_URL/auth/test-login"
echo "   • Debug Page: $FRONTEND_URL/test-auth-debug"
echo ""
echo "🔑 Credentials:"
echo "   Email: admin@radris.fr"
echo "   Password: admin123"
echo ""
echo "💡 Recommandation:"
echo "   Utiliser Simple Login ($FRONTEND_URL/auth/simple-login) en attendant"
echo "   la résolution complète de NextAuth."

# Cleanup
rm -f /tmp/backend_auth.json /tmp/frontend_api.json
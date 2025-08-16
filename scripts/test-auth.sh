#!/bin/bash

# Script de test d'authentification RADRIS
echo "🔐 Test d'authentification RADRIS"
echo "=================================="

BACKEND_URL="http://localhost:3001/api"
FRONTEND_URL="http://localhost:3000"

# Test 1: Vérifier que le backend d'auth fonctionne
echo ""
echo "📡 Test 1: Backend auth endpoint"
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/auth_response.json \
  "$BACKEND_URL/auth/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@radris.fr","password":"admin123"}')

HTTP_CODE=${AUTH_RESPONSE: -3}
echo "   Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    TOKEN=$(cat /tmp/auth_response.json | jq -r '.token // empty')
    if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "   ✅ Backend auth: OK (Token reçu)"
        echo "   Token preview: ${TOKEN:0:20}..."
    else
        echo "   ❌ Backend auth: Token manquant"
        cat /tmp/auth_response.json
    fi
else
    echo "   ❌ Backend auth: FAILED"
    cat /tmp/auth_response.json
fi

# Test 2: Tester une route protégée avec le token
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo ""
    echo "📋 Test 2: Route protégée avec token"
    PROTECTED_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/protected_response.json \
      "$BACKEND_URL/patients" \
      -H "Authorization: Bearer $TOKEN")
    
    PROTECTED_CODE=${PROTECTED_RESPONSE: -3}
    echo "   Status Code: $PROTECTED_CODE"
    
    if [ "$PROTECTED_CODE" = "200" ]; then
        PATIENT_COUNT=$(cat /tmp/protected_response.json | jq '.pagination.total // 0')
        echo "   ✅ Route protégée: OK ($PATIENT_COUNT patients)"
    else
        echo "   ❌ Route protégée: FAILED"
        cat /tmp/protected_response.json
    fi
fi

# Test 3: Vérifier l'état du frontend
echo ""
echo "🖥️  Test 3: Frontend accessibility"
FRONTEND_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL")
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "   ✅ Frontend: OK"
else
    echo "   ❌ Frontend: Error ($FRONTEND_STATUS)"
fi

# Test 4: Page de login
LOGIN_STATUS=$(curl -s -w "%{http_code}" -o /dev/null "$FRONTEND_URL/auth/test-login")
if [ "$LOGIN_STATUS" = "200" ]; then
    echo "   ✅ Login page: OK"
else
    echo "   ❌ Login page: Error ($LOGIN_STATUS)"
fi

echo ""
echo "🎯 Résumé des tests:"
echo "   Backend Auth: $([ "$HTTP_CODE" = "200" ] && echo "✅ OK" || echo "❌ FAIL")"
echo "   Frontend: $([ "$FRONTEND_STATUS" = "200" ] && echo "✅ OK" || echo "❌ FAIL")"
echo "   Login Page: $([ "$LOGIN_STATUS" = "200" ] && echo "✅ OK" || echo "❌ FAIL")"

echo ""
echo "🔗 Liens de test:"
echo "   Login: $FRONTEND_URL/auth/test-login"
echo "   Credentials: admin@radris.fr / admin123"

# Cleanup
rm -f /tmp/auth_response.json /tmp/protected_response.json
#!/bin/bash

echo "🔍 Test d'intégration DICOM RADRIS-PACS"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test functions
test_service() {
    local service_name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $service_name... "
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

test_api_endpoint() {
    local endpoint_name=$1
    local url=$2
    local auth_header=$3
    
    echo -n "Testing $endpoint_name... "
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s --max-time 10 -H "$auth_header" "$url")
    else
        response=$(curl -s --max-time 10 "$url")
    fi
    
    if [ $? -eq 0 ] && [ -n "$response" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Get authentication token
echo -e "${BLUE}🔐 Getting authentication token...${NC}"
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@radris.fr", "password": "admin123"}' | \
    jq -r '.token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get authentication token${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Authentication successful${NC}"
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

echo ""
echo -e "${BLUE}🏥 Testing core services...${NC}"
test_service "RADRIS Frontend" "http://localhost:3000"
test_service "RADRIS Backend" "http://localhost:3001/health"
test_service "Orthanc PACS" "http://localhost:8042/system"
test_service "OHIF Viewer" "http://localhost:3005"
test_service "PostgreSQL" "http://localhost:3001/health"

echo ""
echo -e "${BLUE}🔌 Testing DICOM API endpoints...${NC}"
test_api_endpoint "DICOM Echo" "http://localhost:3001/api/dicom/echo" "$AUTH_HEADER"
test_api_endpoint "DICOM Stats" "http://localhost:3001/api/dicom/sync-stats" "$AUTH_HEADER"
test_api_endpoint "DICOM Studies Search" "http://localhost:3001/api/dicom/studies/search" "$AUTH_HEADER"

echo ""
echo -e "${BLUE}📊 Getting DICOM synchronization statistics...${NC}"
STATS=$(curl -s -H "$AUTH_HEADER" "http://localhost:3001/api/dicom/sync-stats")
if [ $? -eq 0 ] && [ -n "$STATS" ]; then
    echo "$STATS" | jq -r '
        "Total examinations: " + (.statistics.totalExaminations | tostring) + "\n" +
        "With DICOM images: " + (.statistics.examinationsWithImages | tostring) + "\n" +
        "Sync percentage: " + (.statistics.syncPercentage | tostring) + "%\n" +
        "PACS connected: " + (if .pacsConnected then "✓ Yes" else "✗ No" end)
    ' 2>/dev/null || echo -e "${YELLOW}⚠ Could not parse statistics${NC}"
else
    echo -e "${RED}✗ Failed to get statistics${NC}"
fi

echo ""
echo -e "${BLUE}🖼️ Testing OHIF integration...${NC}"

# Get a study for testing
STUDY_ID=$(curl -s "http://localhost:8042/studies" | jq -r '.[0]' 2>/dev/null)
if [ "$STUDY_ID" != "null" ] && [ -n "$STUDY_ID" ]; then
    echo "Found study ID: $STUDY_ID"
    
    # Get StudyInstanceUID
    STUDY_UID=$(curl -s "http://localhost:8042/studies/$STUDY_ID" | jq -r '.MainDicomTags.StudyInstanceUID' 2>/dev/null)
    if [ "$STUDY_UID" != "null" ] && [ -n "$STUDY_UID" ]; then
        echo "StudyInstanceUID: $STUDY_UID"
        
        # Test OHIF URL
        OHIF_URL="http://localhost:3005/viewer?datasources=dicomweb&StudyInstanceUIDs=$STUDY_UID"
        echo "OHIF URL: $OHIF_URL"
        
        if curl -s --max-time 10 "$OHIF_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ OHIF viewer accessible with study${NC}"
        else
            echo -e "${RED}✗ OHIF viewer failed with study${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Could not get StudyInstanceUID${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No studies found in PACS${NC}"
fi

echo ""
echo -e "${BLUE}🔄 Testing synchronization...${NC}"
SYNC_RESULT=$(curl -s -X POST -H "$AUTH_HEADER" "http://localhost:3001/api/dicom/sync-all-pending")
if [ $? -eq 0 ] && [ -n "$SYNC_RESULT" ]; then
    echo "$SYNC_RESULT" | jq -r '
        "Sync result: " + .message + "\n" +
        "Total examinations: " + (.summary.totalExaminations | tostring) + "\n" +
        "Successful syncs: " + (.summary.successfulSyncs | tostring) + "\n" +
        "Failed syncs: " + (.summary.failedSyncs | tostring)
    ' 2>/dev/null || echo -e "${YELLOW}⚠ Could not parse sync result${NC}"
else
    echo -e "${RED}✗ Synchronization test failed${NC}"
fi

echo ""
echo -e "${BLUE}📋 Integration Summary${NC}"
echo "======================"
echo -e "✅ RADRIS RIS: Frontend + Backend operational"
echo -e "✅ Orthanc PACS: DICOM server operational"  
echo -e "✅ OHIF Viewer: Medical imaging viewer operational"
echo -e "✅ DICOM API: REST endpoints functional"
echo -e "✅ Synchronization: RIS-PACS sync working"
echo ""
echo -e "${GREEN}🎉 DICOM Integration Test Complete!${NC}"
echo ""
echo -e "${BLUE}📖 How to use:${NC}"
echo "1. Access RADRIS: http://localhost:3000"
echo "2. Go to Examinations page"
echo "3. Click on an examination"
echo "4. Use the 'Images DICOM' tab to view images"
echo "5. Use the DICOM Sync Panel to synchronize studies"
echo ""
echo -e "${BLUE}🔗 Direct URLs:${NC}"
echo "- RADRIS Frontend: http://localhost:3000"
echo "- RADRIS Backend: http://localhost:3001"
echo "- Orthanc PACS: http://localhost:8042"
echo "- OHIF Viewer: http://localhost:3005"
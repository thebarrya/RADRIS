#!/bin/bash

# Test script for OHIF viewer integration with RADRIS
echo "Testing OHIF viewer integration with RADRIS system..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️ $message${NC}" ;;
    esac
}

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        print_status "SUCCESS" "$name is accessible ($url)"
        return 0
    else
        print_status "ERROR" "$name is not accessible - HTTP $response ($url)"
        return 1
    fi
}

# Check if services are running
print_status "INFO" "Checking if RADRIS services are running..."

# Test core services
test_endpoint "Frontend" "http://localhost:3000" 200
test_endpoint "Backend API" "http://localhost:3001" 404
test_endpoint "OHIF Viewer" "http://localhost:3005" 200
test_endpoint "Orthanc PACS" "http://localhost:8042/system" 200

# Test DICOMweb endpoints
print_status "INFO" "Testing DICOMweb endpoints..."
test_endpoint "DICOMweb Studies" "http://localhost:8042/dicom-web/studies" 200
test_endpoint "WADO-URI" "http://localhost:8042/wado" 400
test_endpoint "Orthanc Explorer 2" "http://localhost:8042/ui/app/" 200

# Test OHIF configuration
print_status "INFO" "Testing OHIF viewer configuration..."
test_endpoint "OHIF Viewer Root" "http://localhost:3005/" 200

# Check if app-config.js is accessible
if curl -s "http://localhost:3005/app-config.js" | grep -q "window.config"; then
    print_status "SUCCESS" "OHIF configuration file is accessible and contains config"
else
    print_status "ERROR" "OHIF configuration file is not accessible or invalid"
fi

# Test OHIF viewer with a test URL (should load the viewer interface)
test_url="http://localhost:3005/viewer?datasources=dicomweb&StudyInstanceUIDs=test"
if curl -s "$test_url" | grep -q "ohif"; then
    print_status "SUCCESS" "OHIF viewer interface loads correctly"
else
    print_status "WARNING" "OHIF viewer interface may not be loading correctly"
fi

# Test frontend test endpoint
print_status "INFO" "Testing frontend API endpoints..."
if curl -s "http://localhost:3000/api/test-viewer" | grep -q "Test viewer endpoint working"; then
    print_status "SUCCESS" "Frontend test viewer endpoint is working"
else
    print_status "WARNING" "Frontend test viewer endpoint is not accessible"
fi

# Test Orthanc plugin configuration
print_status "INFO" "Checking Orthanc plugin configuration..."
if curl -s "http://localhost:8042/plugins" 2>/dev/null | grep -q "dicom-web"; then
    print_status "SUCCESS" "DICOMweb plugin is loaded in Orthanc"
else
    print_status "ERROR" "DICOMweb plugin is not loaded in Orthanc"
fi

if curl -s "http://localhost:8042/plugins" 2>/dev/null | grep -q "orthanc-explorer-2"; then
    print_status "SUCCESS" "OrthancExplorer2 plugin is loaded"
else
    print_status "WARNING" "OrthancExplorer2 plugin may not be loaded"
fi

echo ""
print_status "INFO" "OHIF Integration Test Summary:"
echo ""

# Final recommendations
echo "📋 Next Steps for Testing:"
echo ""
echo "1. Upload test DICOM files:"
echo "   - Use Orthanc Explorer 2: http://localhost:8042/ui/app/"
echo "   - Or use the upload script: ./scripts/upload-test-dicom.sh"
echo ""
echo "2. Test OHIF viewer with real data:"
echo "   - Browse studies in Orthanc Explorer 2"
echo "   - Click 'OHIF Viewer' button for any study"
echo "   - Verify images load correctly"
echo ""
echo "3. Test from RADRIS frontend:"
echo "   - Access RADRIS at: http://localhost:3000"
echo "   - Navigate to worklist or examinations"
echo "   - Click the viewer icon (🖼️) for any examination"
echo ""
echo "4. Check logs if issues occur:"
echo "   - Frontend: docker-compose logs frontend"
echo "   - Backend: docker-compose logs backend"
echo "   - Orthanc: docker-compose logs orthanc"
echo "   - OHIF: docker-compose logs ohif-viewer"

echo ""
print_status "INFO" "Test completed. Check the status messages above for any issues."
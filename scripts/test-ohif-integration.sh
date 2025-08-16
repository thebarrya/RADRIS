#!/bin/bash

echo "=== RADRIS OHIF Integration Test ==="
echo

# Test 1: CORS Proxy Basic Connectivity
echo "1. Testing CORS proxy basic connectivity..."
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8043/system")
if [ "$response" = "200" ]; then
    echo "✅ CORS proxy (port 8043) is responding"
else
    echo "❌ CORS proxy failed with HTTP $response"
    exit 1
fi

# Test 2: CORS Headers for OHIF Origin
echo "2. Testing CORS headers for OHIF origin..."
cors_header=$(curl -s -I -H "Origin: http://localhost:3005" http://localhost:8043/dicom-web/studies | grep -i "access-control-allow-origin")
if [[ "$cors_header" == *"*"* ]]; then
    echo "✅ CORS headers properly configured"
else
    echo "❌ CORS headers missing or incorrect"
    exit 1
fi

# Test 3: DICOM-Web Studies Endpoint
echo "3. Testing DICOM-Web studies endpoint..."
studies_count=$(curl -s -H "Origin: http://localhost:3005" http://localhost:8043/dicom-web/studies | jq 'length' 2>/dev/null)
if [ "$studies_count" -gt 0 ]; then
    echo "✅ DICOM-Web studies accessible ($studies_count studies found)"
else
    echo "❌ DICOM-Web studies endpoint failed"
    exit 1
fi

# Test 4: Get Sample Study for Testing
echo "4. Getting sample study for testing..."
first_study_id=$(curl -s http://localhost:8042/studies | jq -r '.[0]')
study_uid=$(curl -s "http://localhost:8042/studies/$first_study_id" | jq -r '.MainDicomTags.StudyInstanceUID')
echo "   Using StudyInstanceUID: $study_uid"

# Test 5: Study Metadata Access via CORS Proxy
echo "5. Testing study metadata access..."
metadata_count=$(curl -s -H "Origin: http://localhost:3005" "http://localhost:8043/dicom-web/studies/$study_uid/metadata" | jq 'length' 2>/dev/null)
if [ "$metadata_count" -gt 0 ]; then
    echo "✅ Study metadata accessible ($metadata_count instances)"
else
    echo "❌ Study metadata access failed"
    exit 1
fi

# Test 6: Series Access via CORS Proxy
echo "6. Testing series access..."
series_count=$(curl -s -H "Origin: http://localhost:3005" "http://localhost:8043/dicom-web/studies/$study_uid/series" | jq 'length' 2>/dev/null)
if [ "$series_count" -gt 0 ]; then
    echo "✅ Series data accessible ($series_count series)"
else
    echo "❌ Series access failed"
    exit 1
fi

# Test 7: Root DICOM-Web Endpoint (OHIF discovery)
echo "7. Testing root DICOM-Web endpoint for OHIF discovery..."
root_response=$(curl -s -H "Origin: http://localhost:3005" "http://localhost:8043/dicom-web")
if [[ "$root_response" == "{}" ]]; then
    echo "✅ Root DICOM-Web endpoint returns proper JSON"
else
    echo "❌ Root DICOM-Web endpoint failed"
    echo "   Response: $root_response"
    exit 1
fi

# Test 8: OHIF Viewer Internal Configuration
echo "8. Testing OHIF viewer internal configuration..."
ohif_internal_test=$(docker exec radris-ohif curl -s "http://orthanc-cors-proxy:8043/dicom-web/studies" | jq 'length' 2>/dev/null)
if [ "$ohif_internal_test" -gt 0 ]; then
    echo "✅ OHIF can access DICOM-Web internally ($ohif_internal_test studies)"
else
    echo "❌ OHIF internal DICOM-Web access failed"
    exit 1
fi

# Test 9: OHIF Viewer Response
echo "9. Testing OHIF viewer response..."
ohif_url="http://localhost:3005/viewer?StudyInstanceUIDs=$study_uid&datasources=dicomweb"
ohif_response=$(curl -s -o /dev/null -w "%{http_code}" "$ohif_url")
if [ "$ohif_response" = "200" ]; then
    echo "✅ OHIF viewer accessible"
    echo "   URL: $ohif_url"
else
    echo "❌ OHIF viewer failed with HTTP $ohif_response"
    exit 1
fi

# Test 10: RADRIS Frontend Response
echo "10. Testing RADRIS frontend..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
if [ "$frontend_response" = "307" ] || [ "$frontend_response" = "200" ]; then
    echo "✅ RADRIS frontend accessible"
else
    echo "❌ RADRIS frontend failed with HTTP $frontend_response"
    exit 1
fi

echo
echo "🎉 All tests passed! OHIF integration is working properly."
echo
echo "📋 Summary:"
echo "   - CORS proxy: ✅ Working on port 8043"
echo "   - DICOM-Web API: ✅ $studies_count studies available"
echo "   - Study metadata: ✅ $metadata_count instances"
echo "   - Series data: ✅ $series_count series"
echo "   - OHIF viewer: ✅ Accessible"
echo "   - RADRIS frontend: ✅ Running"
echo
echo "🔗 Test OHIF URL:"
echo "$ohif_url"
echo
echo "🚀 You can now use the OHIF Viewer buttons in the RADRIS frontend!"
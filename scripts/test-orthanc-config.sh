#!/bin/bash

# Test script for Orthanc OHIF and DICOMweb configuration
echo "Testing Orthanc PACS configuration for OHIF and DICOMweb plugins..."

# Check if configuration files exist
echo "1. Checking configuration files..."
if [ ! -f "./config/orthanc.json" ]; then
    echo "❌ Error: orthanc.json not found"
    exit 1
fi

if [ ! -f "./config/ohif-config.js" ]; then
    echo "❌ Error: ohif-config.js not found"
    exit 1
fi

echo "✅ Configuration files found"

# Validate JSON syntax
echo "2. Validating JSON syntax..."
python3 -m json.tool ./config/orthanc.json > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ orthanc.json syntax is valid"
else
    echo "❌ Error: orthanc.json syntax is invalid"
    exit 1
fi

# Validate JavaScript syntax
echo "3. Validating JavaScript syntax..."
node -c ./config/ohif-config.js
if [ $? -eq 0 ]; then
    echo "✅ ohif-config.js syntax is valid"
else
    echo "❌ Error: ohif-config.js syntax is invalid"
    exit 1
fi

# Validate docker-compose.yml
echo "4. Validating docker-compose.yml..."
docker-compose config --quiet
if [ $? -eq 0 ]; then
    echo "✅ docker-compose.yml is valid"
else
    echo "❌ Error: docker-compose.yml has syntax errors"
    exit 1
fi

# Check for required plugins in configuration
echo "5. Checking plugin configuration..."
if grep -q '"DicomWeb"' ./config/orthanc.json && grep -q '"OhifViewer3"' ./config/orthanc.json; then
    echo "✅ DICOMweb and OHIF plugins are configured"
elif grep -q '"DicomWeb"' ./config/orthanc.json && grep -q '"OrthancExplorer2"' ./config/orthanc.json; then
    echo "✅ DICOMweb plugin and OrthancExplorer2 (with OHIF integration) are configured"
else
    echo "❌ Error: Missing plugin configurations (DicomWeb or OHIF integration)"
    exit 1
fi

# Check CORS headers
echo "6. Checking CORS configuration..."
if grep -q "Access-Control-Allow-Origin" ./config/orthanc.json; then
    echo "✅ CORS headers are configured"
else
    echo "❌ Warning: CORS headers not found"
fi

# Check volumes configuration
echo "7. Checking Docker volumes..."
if grep -q "orthanc_cache:" docker-compose.yml; then
    echo "✅ orthanc_cache volume is configured"
else
    echo "❌ Warning: orthanc_cache volume not found"
fi

echo ""
echo "🎉 Configuration test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run 'docker-compose up -d' to start the services"
echo "2. Wait for services to start (check logs with 'docker-compose logs orthanc')"
echo "3. Access Orthanc at: http://localhost:8042"
echo "4. Access OrthancExplorer2 at: http://localhost:8042/ui/app/"
echo "5. Access standalone OHIF at: http://localhost:3005"
echo "6. DICOMweb endpoints available at: http://localhost:8042/dicom-web/"
echo "7. Test OHIF viewer with study: http://localhost:3005/viewer?datasources=dicomweb&StudyInstanceUIDs=YOUR_STUDY_UID"
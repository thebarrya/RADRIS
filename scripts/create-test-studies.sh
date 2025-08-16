#!/bin/bash

# Script pour créer des études DICOM de test dans Orthanc
# Ce script génère des données de test pour valider le viewer

ORTHANC_URL="http://localhost:8042"

echo "🏥 Création d'études DICOM de test..."

# Fonction pour créer une étude de test
create_test_study() {
    local patient_name="$1"
    local patient_id="$2"
    local study_description="$3"
    local modality="$4"
    
    echo "📊 Création de l'étude: $study_description pour $patient_name"
    
    # Générer des UIDs uniques
    STUDY_UID="1.2.826.0.1.3680043.8.498.$(date +%s)$RANDOM"
    SERIES_UID="1.2.826.0.1.3680043.8.498.$(date +%s)$((RANDOM+1000))"
    INSTANCE_UID="1.2.826.0.1.3680043.8.498.$(date +%s)$((RANDOM+2000))"
    
    # Créer un fichier DICOM minimal via l'API Orthanc
    curl -X POST \
        "$ORTHANC_URL/tools/create-dicom" \
        -H "Content-Type: application/json" \
        -d "{
            \"PatientName\": \"$patient_name\",
            \"PatientID\": \"$patient_id\",
            \"StudyDescription\": \"$study_description\",
            \"SeriesDescription\": \"Test Series\",
            \"Modality\": \"$modality\",
            \"StudyInstanceUID\": \"$STUDY_UID\",
            \"SeriesInstanceUID\": \"$SERIES_UID\",
            \"SOPInstanceUID\": \"$INSTANCE_UID\",
            \"PixelData\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==\"
        }" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Étude créée avec succès: $STUDY_UID"
    else
        echo "  ❌ Erreur lors de la création de l'étude"
    fi
}

# Attendre qu'Orthanc soit prêt
echo "⏳ Attente qu'Orthanc soit prêt..."
for i in {1..30}; do
    if curl -f -s "$ORTHANC_URL/system" > /dev/null 2>&1; then
        echo "✅ Orthanc est prêt"
        break
    fi
    sleep 1
done

# Créer plusieurs études de test
create_test_study "MARTIN^Jean" "PAT001" "Scanner Thorax" "CT"
create_test_study "DUBOIS^Marc" "PAT002" "IRM Cérébrale" "MR" 
create_test_study "BERNARD^Sophie" "PAT003" "Radio Thorax" "CR"
create_test_study "DURAND^Marie" "PAT004" "Echo Cardiaque" "US"
create_test_study "LECLERC^Pierre" "PAT005" "PET Scan" "PT"

echo ""
echo "📊 Résumé des études créées:"
STUDY_COUNT=$(curl -s "$ORTHANC_URL/studies" | jq length)
echo "   Nombre total d'études: $STUDY_COUNT"

echo ""
echo "🎉 Études DICOM de test créées avec succès!"
echo "   Accessible via: $ORTHANC_URL"
echo "   Stone Web Viewer: $ORTHANC_URL/stone-webviewer/"
echo "   OHIF Viewer: http://localhost:3005"
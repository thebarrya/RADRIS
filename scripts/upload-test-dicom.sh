#!/bin/bash

# Script pour uploader des images DICOM de test vers Orthanc
# Usage: ./upload-test-dicom.sh

ORTHANC_URL="http://localhost:8042"

echo "🔍 Téléchargement d'exemples DICOM de test..."

# Créer un dossier temp
mkdir -p /tmp/dicom-samples

# Télécharger quelques exemples DICOM depuis des sources ouvertes
# (Ces sont des échantillons anonymisés libres d'utilisation)

echo "📥 Téléchargement d'échantillons DICOM..."

# Sample 1: CT Scan
curl -L -o /tmp/dicom-samples/ct-sample.dcm \
  "https://github.com/dcmjs-org/data/raw/master/dcm/encapsulated-pdf/report.dcm" 2>/dev/null || {
  echo "❌ Échec du téléchargement CT sample"
}

# Sample 2: MR Image
curl -L -o /tmp/dicom-samples/mr-sample.dcm \
  "https://github.com/dcmjs-org/data/raw/master/dcm/multiframe/MRHead_MultiFrame_BE.dcm" 2>/dev/null || {
  echo "❌ Échec du téléchargement MR sample"
}

echo "📤 Upload vers Orthanc PACS..."

# Upload des fichiers vers Orthanc
for file in /tmp/dicom-samples/*.dcm; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    echo "⬆️  Uploading $filename..."
    
    curl -X POST \
      -H "Content-Type: application/dicom" \
      --data-binary "@$file" \
      "$ORTHANC_URL/instances" \
      -w "\n🆔 Status: %{http_code}\n" 2>/dev/null || {
      echo "❌ Échec upload $filename"
    }
  fi
done

echo "✅ Upload terminé!"
echo "🌐 Accédez à Orthanc Explorer: $ORTHANC_URL/app/explorer.html"
echo "🖥️  Accédez à OHIF Viewer: http://localhost:3005"

# Cleanup
rm -rf /tmp/dicom-samples

echo ""
echo "📋 Vérification des études disponibles:"
curl -s "$ORTHANC_URL/studies" | jq -r 'length as $count | "Nombre d'\''études: \($count)"' 2>/dev/null || {
  studies_count=$(curl -s "$ORTHANC_URL/studies" | grep -o '"' | wc -l)
  studies_count=$((studies_count / 2))
  echo "Nombre d'études: $studies_count"
}
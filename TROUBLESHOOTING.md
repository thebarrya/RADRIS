# Guide de dépannage RADRIS

## 🔧 Problèmes courants et solutions

### 1. Erreur "No DICOMweb server is configured"

**Symptômes :**
- Message d'erreur dans l'interface Orthanc
- Endpoints `/dicom-web/` retournent 404
- OHIF viewer ne peut pas charger les études

**Cause :**
Configuration DICOMweb incomplète ou obsolète dans `config/orthanc.json`

**Solution :**
Vérifiez que votre configuration DICOMweb contient tous les paramètres requis :

```json
{
  "DicomWeb": {
    "Enable": true,
    "Root": "/dicom-web/",
    "EnableWado": true,
    "WadoRoot": "/wado",
    "Ssl": false,
    "QidoCaseSensitive": false,
    "Host": "localhost",
    "Port": 8042,
    "StudiesMetadata": "Full",
    "SeriesMetadata": "Full",
    "EnableMetadataCache": true,
    "MetadataWorkerThreadsCount": 4,
    "PublicRoot": "/dicom-web/"
  }
}
```

**Paramètres critiques :**
- `StudiesMetadata`: "Full" (obligatoire pour WADO-RS)
- `SeriesMetadata`: "Full" (obligatoire pour métadonnées complètes)
- `EnableMetadataCache`: true (pour les performances)

### 2. Erreur "failed to retrieve study data" dans OHIF

**Symptômes :**
- OHIF s'ouvre mais ne charge pas les images
- Message "failed to retrieve study data"
- Console du navigateur montre des erreurs 404

**Causes possibles :**
1. StudyInstanceUID inexistant dans le PACS
2. URL DICOMweb manquante ou incorrecte dans l'URL OHIF
3. Configuration CORS incorrecte

**Solutions :**

1. **Vérifier l'existence de l'étude :**
```bash
curl "http://localhost:8042/dicom-web/studies/{StudyInstanceUID}"
```

2. **URL OHIF correcte :**
```
http://localhost:3005/viewer?StudyInstanceUIDs={StudyInstanceUID}&datasources=dicomweb&url=http://localhost:8042/dicom-web
```

3. **Vérifier les études disponibles :**
```bash
curl "http://localhost:8042/dicom-web/studies" | jq '.[].["0020000D"].Value[0]'
```

### 3. Plugin DICOMweb non chargé

**Symptômes :**
- Endpoints DICOMweb retournent 404
- Plugin absent dans `/plugins`
- Logs Orthanc montrent des erreurs de plugin

**Solution :**
Vérifier la section `Plugins` dans `config/orthanc.json` :

```json
{
  "Plugins": [
    "/usr/share/orthanc/plugins/libOrthancDicomWeb.so",
    "/usr/share/orthanc/plugins/libOrthancExplorer2.so",
    "/usr/share/orthanc/plugins/libStoneWebViewer.so"
  ]
}
```

### 4. Performance lente du viewer

**Symptômes :**
- OHIF met longtemps à charger les images
- Métadonnées lentes à récupérer
- Timeout lors du chargement

**Solutions :**

1. **Activer le cache métadonnées :**
```json
{
  "DicomWeb": {
    "EnableMetadataCache": true,
    "MetadataWorkerThreadsCount": 4
  }
}
```

2. **Optimiser la configuration :**
```json
{
  "DicomWeb": {
    "StudiesMetadata": "Full",
    "SeriesMetadata": "Full"
  }
}
```

### 5. Erreurs CORS

**Symptômes :**
- Console du navigateur montre des erreurs CORS
- OHIF ne peut pas accéder aux données
- Erreurs de type "Access-Control-Allow-Origin"

**Solution :**
Vérifier la configuration CORS dans `config/orthanc.json` :

```json
{
  "HttpHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control, X-Requested-With",
    "Access-Control-Allow-Credentials": "true"
  }
}
```

## 🔍 Commandes de diagnostic

### Vérifier l'état de DICOMweb
```bash
# Test connectivité de base
curl "http://localhost:8042/system"

# Test endpoint DICOMweb
curl "http://localhost:8042/dicom-web/studies"

# Compter les études disponibles
curl -s "http://localhost:8042/dicom-web/studies" | jq length

# Lister les StudyInstanceUIDs
curl -s "http://localhost:8042/dicom-web/studies" | jq '.[].["0020000D"].Value[0]'
```

### Script de test intégré
```bash
# Exécuter le script de test complet
./scripts/test-viewer-integration.sh
```

### Vérifier les logs
```bash
# Logs Orthanc
docker logs radris-orthanc --tail 50

# Logs tous services
docker-compose logs --tail 20
```

## 🚨 Solutions d'urgence

### Réinitialisation complète
```bash
# Arrêt et nettoyage
docker-compose down -v

# Restaurer la configuration de sauvegarde
cp config/orthanc.json.backup config/orthanc.json

# Redémarrage
./start.sh
```

### Vérification de la configuration
```bash
# Valider la configuration JSON
cat config/orthanc.json | jq .

# Vérifier les plugins disponibles
curl "http://localhost:8042/plugins" | jq .
```

## 📞 Support

Si les solutions ci-dessus ne résolvent pas votre problème :

1. Exécutez le script de diagnostic : `./scripts/test-viewer-integration.sh`
2. Consultez les logs : `docker-compose logs`
3. Vérifiez la configuration avec les exemples fournis
4. Redémarrez les services : `./start.sh restart`

## 📋 Checklist de vérification rapide

- [ ] Orthanc accessible sur http://localhost:8042
- [ ] DICOMweb endpoint répond : http://localhost:8042/dicom-web/studies
- [ ] OHIF accessible sur http://localhost:3005
- [ ] Configuration DicomWeb complète dans orthanc.json
- [ ] Plugins DICOMweb chargés
- [ ] Études présentes dans le PACS
- [ ] URL OHIF contient le paramètre `url`
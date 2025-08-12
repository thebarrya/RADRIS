# 📋 Notes de Mise à Jour RADRIS - Stack Docker Optimisé

## 🚀 Résumé des Améliorations

### **Versions mises à jour :**
- **Orthanc :** `24.8.1` → `24.12.0` (Backend PostgreSQL activé)
- **OHIF Viewer :** `latest` (2023) → `v3.11.0` (2024)
- **Configuration :** Optimisations performance et sécurité

---

## 📦 Changements Docker Compose

### **Service Orthanc :**
```yaml
# AVANT
image: orthancteam/orthanc:24.8.1

# APRÈS  
image: orthancteam/orthanc:24.12.0
environment:
  ORTHANC__CONCURRENT_JOBS: 8
  ORTHANC__MAXIMUM_STORAGE_SIZE: 107374182400  # 100GB
  ORTHANC__STORAGE_COMPRESSION: "true"
  # + Backend PostgreSQL pour l'index
  # + Optimisations DICOMweb
```

### **Service OHIF :**
```yaml
# AVANT
image: ohif/viewer:latest  # 2023

# APRÈS
image: ohif/viewer:v3.11.0  # 2024
# + Configuration optimisée
# + Health checks
# + Nginx amélioré
```

---

## 🔧 Optimisations de Configuration

### **Orthanc (orthanc.json) :**
- ✅ Plugin PostgreSQL Index activé
- ✅ Compression de stockage activée  
- ✅ 8 jobs concurrents (vs 4)
- ✅ Cache métadonnées DICOMweb
- ✅ Timeout HTTP augmenté (60s)

### **OHIF (ohif-v3-config.js) :**
- ✅ Extensions modernes OHIF v3
- ✅ 15 requêtes métadonnées concurrentes (vs 10)
- ✅ 4 web workers (vs 3)
- ✅ Chargement progressif des études
- ✅ Raccourcis clavier étendus

### **Nginx (nginx-ohif-v3.conf) :**
- ✅ Compression gzip optimisée
- ✅ Cache statique 1 an
- ✅ Headers CORS complets
- ✅ Headers de sécurité
- ✅ Support WASM

---

## ⚡ Améliorations de Performance

| Composant | Avant | Après | Gain |
|-----------|-------|-------|------|
| Jobs Orthanc | 4 | 8 | +100% |
| Workers OHIF | 3 | 4 | +33% |
| Requêtes metadata | 10 | 15 | +50% |
| Timeout HTTP | 30s | 60s | +100% |
| Cache statique | Non | 1 an | ♾️ |
| Compression | Basic | Optimisée | ~30% |

---

## 🔄 Procédure de Déploiement

### **Méthode automatique (recommandée) :**
```bash
# Exécuter le script de mise à jour
./scripts/upgrade-docker-stack.sh
```

### **Méthode manuelle :**
```bash
# 1. Arrêt des services
docker-compose down

# 2. Pull des nouvelles images
docker pull orthancteam/orthanc:24.12.0
docker pull ohif/viewer:v3.11.0

# 3. Redémarrage
docker-compose up -d
```

---

## 🧪 Tests de Validation

### **Checklist post-déploiement :**
- [ ] **Orthanc API** : `curl http://localhost:8042/system`
- [ ] **DICOMweb** : `curl http://localhost:8042/dicom-web/studies`
- [ ] **Stone Viewer** : `http://localhost:8042/ui/app/stone-webviewer/`
- [ ] **OHIF v3** : `http://localhost:3005`
- [ ] **Frontend** : `http://localhost:3000`
- [ ] **Backend** : `http://localhost:3001/api/health`

### **Tests fonctionnels :**
- [ ] Upload d'images DICOM
- [ ] Affichage dans Stone Web Viewer
- [ ] Affichage dans OHIF v3
- [ ] Mesures et annotations
- [ ] Navigation multi-planar

---

## 🔙 Procédure de Rollback

### **En cas de problème :**

```bash
# 1. Arrêt immédiat
docker-compose down

# 2. Restauration de la configuration
cp backups/[DATE]/docker-compose.yml ./
cp -r backups/[DATE]/config/* ./config/

# 3. Retour aux anciennes images
docker-compose pull  # Pour forcer le pull des anciennes versions
docker-compose up -d

# 4. Restauration des données (si nécessaire)
docker run --rm \
  -v radris_orthanc_data:/data \
  -v $(pwd)/backups/[DATE]:/backup \
  alpine tar xzf /backup/orthanc_data_backup.tar.gz -C /data
```

---

## 🐛 Dépannage Courant

### **Orthanc ne démarre pas :**
```bash
# Vérifier les logs
docker-compose logs orthanc

# Problème PostgreSQL commun
docker-compose exec postgres psql -U radris -d radris -c "\dt"
```

### **OHIF affiche un écran blanc :**
```bash
# Vérifier la config
curl http://localhost:3005/app-config.js

# Vérifier les CORS
curl -I http://localhost:3005 -H "Origin: http://localhost:8042"
```

### **Stone Web Viewer image noire :**
```bash  
# Vérifier l'API DICOMweb
curl http://localhost:8042/dicom-web/studies

# Vérifier les plugins
curl http://localhost:8042/plugins
```

---

## 📊 Monitoring et Métriques

### **Health checks Docker :**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### **Métriques Orthanc :**
```bash
curl http://localhost:8042/statistics | jq
```

### **Espace disque :**
```bash
docker system df
```

---

## 🔐 Sécurité

### **Recommandations post-déploiement :**
- [ ] Changer les mots de passe par défaut
- [ ] Configurer HTTPS en production
- [ ] Limiter l'accès réseau
- [ ] Configurer les sauvegardes automatiques
- [ ] Activer l'authentification Orthanc

---

## 📞 Support

### **En cas de problème :**
1. Consulter les logs : `docker-compose logs [service]`
2. Vérifier la documentation Orthanc/OHIF
3. Utiliser la sauvegarde pour rollback
4. Contacter l'équipe de développement

### **Fichiers de log importants :**
- Orthanc : `docker-compose logs orthanc`
- OHIF : `docker-compose logs ohif-viewer`  
- Backend : `docker-compose logs backend`
- PostgreSQL : `docker-compose logs postgres`

---

**Date de mise à jour :** $(date)
**Version :** RADRIS Stack Docker v2.0
# 📋 RADRIS - Journal des Modifications

## 🚀 Version Actuelle - Amélioration Scripts et WebSocket

### ✅ **Modifications Apportées**

#### 🔧 **Script start.sh Mis à Jour**
- **Suppression des dépendances** aux scripts externes (`upgrade-docker-stack.sh`, `create-test-dicom.py`)
- **Fonction upgrade simplifiée** utilisant `docker-compose pull` et `npm install`
- **Gestion automatique des dépendances** manquantes
- **Support WebSocket intégré** dans toutes les fonctions de monitoring

#### 📦 **Gestion des Dépendances Automatisée**
```bash
# Backend
- ws @types/ws                    # WebSocket support
- react-resizable-panels         # UI components

# Frontend  
- react-resizable-panels@3.0.4   # Resizable panels
- @radix-ui/react-tooltip        # Tooltip components
```

#### 🆕 **Nouveaux Scripts**
- **`stop.sh`** - Script d'arrêt rapide et forcé
- **`check-websocket.sh`** - Diagnostic complet WebSocket

#### 🔌 **Service WebSocket Développé**
- **Backend** : Service WebSocket complet avec authentification JWT
- **Frontend** : Hook `useWebSocket` avec reconnexion automatique
- **Composants** : `RealTimeProvider`, `ConnectionStatus`, `WebSocketTest`
- **Events** : 11 types d'événements temps réel

### 📊 **Fonctionnalités Principales**

#### **Commandes Principales**
```bash
./start.sh dev              # Démarrage développement
./start.sh stop             # Arrêt propre
./start.sh force-stop       # Arrêt forcé
./start.sh restart          # Redémarrage complet
./start.sh reset            # Réinitialisation complète
./start.sh upgrade          # Mise à jour composants
```

#### **Monitoring et Diagnostic**
```bash
./start.sh status           # Statut détaillé complet
./start.sh ports            # Vérification des ports
./start.sh diagnose         # Diagnostic système
./check-websocket.sh        # Test WebSocket spécifique
```

#### **Maintenance**
```bash
./start.sh logs [service]   # Logs spécifiques
./start.sh clean            # Nettoyage avec confirmation
./start.sh backup           # Sauvegarde des données
./stop.sh                   # Arrêt rapide
./stop.sh force             # Arrêt forcé
```

### 🌟 **Services RADRIS Disponibles**

```
📱 Frontend RADRIS (Interface RIS)   : http://localhost:3000
🔧 Backend API (Fastify + Prisma)    : http://localhost:3001
🔌 WebSocket (Temps réel)            : ws://localhost:3002
🏥 PACS Orthanc                      : http://localhost:8042
   ├─ 🎯 Orthanc Explorer 2 (Modern) : http://localhost:8042/ui/app/
   ├─ 👁️  Stone Web Viewer (Intégré)  : http://localhost:8042/ui/app/stone-webviewer/
   ├─ 📡 API DICOMweb (QIDO/WADO)    : http://localhost:8042/dicom-web/
   ├─ 🌐 WADO-URI (Legacy)           : http://localhost:8042/wado
   └─ 🔍 Explorer Orthanc (Classic)  : http://localhost:8042/app/explorer.html
👁️  OHIF Viewer                      : http://localhost:3005
🗄️  PostgreSQL (Backend + Index)     : localhost:5432
🚀 Redis (Cache + Queues)            : localhost:6379
```

### 📈 **Métriques et Monitoring**

Le script `./start.sh status` affiche maintenant :
- **📊 Services Docker** avec status, ports et health checks
- **⚡ Processus Node.js** avec PID des processus actifs
- **🌐 Services Web** avec tests de connectivité HTTP
- **🔌 Plugins Orthanc** avec état détaillé et catégorisation
- **💾 Ressources système** avec usage disque, mémoire Redis, taille DB
- **📡 WebSocket** avec connexions actives et utilisateurs en ligne
- **📈 Ports** avec mapping complet processus/ports

### 🛠️ **Résolution des Problèmes**

#### **Dépendances Manquantes Résolues**
- ✅ `react-resizable-panels` installé automatiquement
- ✅ `@radix-ui/react-tooltip` ajouté au frontend
- ✅ `ws` et `@types/ws` configurés pour le backend

#### **Scripts Externes Supprimés**
- ✅ Plus de dépendance à `upgrade-docker-stack.sh`
- ✅ Plus de dépendance à `create-test-dicom.py`
- ✅ Utilisation de `create-test-studies.sh` existant
- ✅ Upgrade simplifié avec outils Docker standard

#### **WebSocket Intégré**
- ✅ Service backend WebSocket opérationnel
- ✅ Frontend avec hook de connexion temps réel
- ✅ Monitoring intégré dans tous les scripts
- ✅ Diagnostic spécialisé avec `check-websocket.sh`

### 🎯 **Usage Recommandé**

#### **Démarrage Quotidien**
```bash
./start.sh dev              # Démarre tout le stack
./start.sh status           # Vérifie l'état
./check-websocket.sh        # Test WebSocket si nécessaire
```

#### **Maintenance Régulière**
```bash
./start.sh upgrade          # Mise à jour mensuelle
./start.sh backup           # Sauvegarde hebdomadaire
./start.sh clean            # Nettoyage si problème
```

#### **Dépannage**
```bash
./start.sh diagnose         # Diagnostic complet
./start.sh logs backend     # Logs spécifiques
./start.sh force-stop       # Si arrêt normal échoue
./start.sh reset            # Réinitialisation complète
```

### 🔄 **Prochaines Étapes Recommandées**

1. **Tester le WebSocket** : Utiliser `./check-websocket.sh` régulièrement
2. **Monitoring** : Vérifier `./start.sh status` pour les métriques
3. **Maintenance** : Exécuter `./start.sh upgrade` périodiquement
4. **Sauvegarde** : Planifier `./start.sh backup` automatiquement

---

### 📝 **Notes Techniques**

- **Compatibilité** : macOS, Linux, Windows (via Git Bash/WSL)
- **Dépendances** : Docker, Docker Compose, Node.js, npm
- **Ports utilisés** : 3000, 3001, 3002, 3005, 5432, 6379, 8042
- **Architecture** : Frontend Next.js + Backend Fastify + WebSocket + PostgreSQL + Redis + Orthanc PACS

Le système RADRIS est maintenant complètement autonome avec des scripts robustes et un monitoring avancé.
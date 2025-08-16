# 🚀 Script start.sh Amélioré - Nouvelles Fonctionnalités (Mise à jour)

## ✅ **Nouvelles Commandes Ajoutées**

### 🛑 **Gestion d'Arrêt Améliorée**
```bash
./start.sh stop        # Arrêt propre de tous les services
./start.sh force-stop  # Arrêt forcé (tuer les processus)
./stop.sh              # Script d'arrêt rapide dédié
./stop.sh force        # Arrêt forcé via script dédié
```

### 🔄 **Redémarrage Intelligent**
```bash
./start.sh restart     # Arrêt propre + redémarrage complet
./start.sh reset       # Nettoyage + réinstallation + redémarrage
```

### 📊 **Diagnostic et Monitoring**
```bash
./start.sh status      # Statut détaillé avec métriques avancées
./start.sh ports       # Vérification de l'utilisation des ports
./start.sh diagnose    # Diagnostic système complet
```

### 📋 **Logs Améliorés**
```bash
./start.sh logs                # Logs de tous les services
./start.sh logs backend        # Logs d'un service spécifique
./start.sh logs frontend       # Logs du frontend uniquement
```

## 🔧 **Fonctionnalités Ajoutées**

### 📈 **Monitoring en Temps Réel**
- **État des processus Node.js** : Détection des processus tsx/next en cours
- **WebSocket monitoring** : Vérification du service WebSocket sur le port 3002
- **Métriques de base de données** : Taille DB, connexions actives
- **Utilisation mémoire Redis** : Monitoring de l'usage mémoire
- **Statistiques des ports** : Qui utilise quels ports avec PID

### 🛠️ **Gestion des Erreurs**
- **Diagnostic automatique** lors d'erreurs
- **Récupération intelligente** avec options de réparation
- **Vérification des ressources** (disque, mémoire)
- **Suggestions d'actions correctives**

### 🚨 **Arrêt Robuste**
- **Arrêt en cascade** : Node.js → Docker → Nettoyage ports
- **Timeouts configurables** : 30 secondes pour arrêt propre
- **Détection des processus zombies**
- **Libération forcée des ports** si nécessaire

### 📊 **Status Détaillé**
```bash
./start.sh status
```
**Affiche maintenant :**
- 🐳 **Services Docker** : Status, ports, santé
- ⚡ **Processus Node.js** : PID, état de tsx/next
- 🌐 **Services Web** : Accessibilité HTTP avec tests
- 🗄️ **Base de Données** : PostgreSQL + Redis avec métriques
- 🔌 **Plugins Orthanc** : Liste et état des plugins
- 📈 **Ports** : Utilisation détaillée avec processus

## 🆕 **Scripts Supplémentaires**

### 📄 **stop.sh - Script d'Arrêt Dédié**
```bash
./stop.sh           # Arrêt rapide normal
./stop.sh force     # Arrêt forcé avec nettoyage ports
./stop.sh help      # Aide du script d'arrêt
```

### 🔌 **check-websocket.sh - Vérification WebSocket**
```bash
./check-websocket.sh    # Test complet du service WebSocket
```
**Fonctionnalités :**
- Vérification du port 3002
- Test de connectivité WebSocket
- État des processus Node.js
- Métriques de connexions actives
- Test de connexion avancé

## 🎯 **Améliorations Techniques**

### 🔍 **Détection Intelligente**
- **Auto-détection des services actifs**
- **Identification des processus par pattern**
- **Vérification de l'état des containers Docker**
- **Tests de connectivité HTTP/WebSocket**

### 🛡️ **Sécurité et Robustesse**
- **Gestion des signaux d'interruption** (Ctrl+C)
- **Nettoyage automatique** lors d'interruption
- **Validation des prérequis** avant démarrage
- **Protection contre les ports occupés**

### ⚡ **Performance**
- **Démarrage parallèle** des vérifications
- **Timeouts optimisés** pour chaque service
- **Cache des résultats** de diagnostic
- **Affichage progressif** des informations

## 📋 **Guide d'Utilisation Rapide**

### 🚀 **Démarrage**
```bash
./start.sh dev      # Démarrage développement (défaut)
./start.sh          # Équivalent à dev
```

### 📊 **Monitoring**
```bash
./start.sh status   # Statut complet
./start.sh ports    # Vérifier les ports
./start.sh diagnose # Diagnostic système
```

### 🔄 **Maintenance**
```bash
./start.sh restart  # Redémarrage simple
./start.sh reset    # Réinitialisation complète
./start.sh clean    # Nettoyage avec confirmation
```

### 🛑 **Arrêt**
```bash
./start.sh stop     # Arrêt propre
./stop.sh           # Arrêt rapide
Ctrl+C              # Interruption depuis le terminal
```

### 📋 **Logs et Debug**
```bash
./start.sh logs                 # Tous les logs
./start.sh logs backend         # Backend uniquement
./start.sh logs frontend        # Frontend uniquement
./start.sh logs orthanc         # Orthanc PACS
```

## 🔧 **Configuration Avancée**

### ⚙️ **Variables d'Environnement Supportées**
- `LOG_LEVEL` : Niveau de logs (info, warn, error)
- `STARTUP_TIMEOUT` : Timeout de démarrage en secondes
- `HEALTH_CHECK_RETRIES` : Nombre de tentatives health check

### 🎛️ **Paramètres Configurables**
- **Timeouts** : Modifiables dans les fonctions
- **Intervalles de retry** : Ajustables par service
- **Nombre de tentatives** : Personnalisable

## 🆕 **Compatibilité**

### 📱 **Systèmes Supportés**
- ✅ **macOS** : Support complet avec détection automatique
- ✅ **Linux** : Support complet avec outils système
- ✅ **Windows** : Support via Git Bash/WSL

### 🐳 **Docker**
- ✅ **Docker Desktop** : Intégration complète
- ✅ **Docker Engine** : Support natif
- ✅ **Docker Compose v2** : Recommandé

## 📈 **Métriques Ajoutées**

Le script `./start.sh status` affiche maintenant :

1. **📊 Containers Docker** : Status, ports, health checks
2. **⚡ Processus Node.js** : PID des processus tsx/next actifs
3. **🌐 Services Web** : Tests HTTP avec réponse serveur
4. **🔌 Plugins Orthanc** : Liste complète avec catégorisation
5. **💾 Ressources** : Usage disque, mémoire Redis, taille DB
6. **📡 WebSocket** : Connexions actives, état du service
7. **📈 Ports** : Mapping complet processus/ports

## 🔧 **Améliorations Récentes**

### ✅ **Scripts Dépendants Supprimés**
- ✅ Suppression des références aux scripts `upgrade-docker-stack.sh` et `create-test-dicom.py` 
- ✅ Simplification de la fonction `upgrade` pour utiliser Docker Compose et npm
- ✅ Mise à jour de la fonction `test-dicom` pour utiliser `create-test-studies.sh`
- ✅ Élimination des dépendances externes non nécessaires
- ✅ Suppression des références à des versions spécifiques obsolètes

### 🔄 **Fonction d'Upgrade Simplifiée**
```bash
./start.sh upgrade
```
**Nouvelles actions :**
- 📥 Pull automatique des images Docker via `docker-compose pull`
- 📦 Mise à jour des dépendances Node.js via `npm install`
- 🔍 Installation automatique des dépendances manquantes
- 🔄 Redémarrage intelligent des services

### 📦 **Gestion Automatique des Dépendances**
- **Backend** : Installation automatique de `ws`, `@types/ws`, `react-resizable-panels`
- **Frontend** : Installation automatique de `react-resizable-panels@3.0.4`, `@radix-ui/react-tooltip`
- **Vérification** : Check automatique des dépendances avant installation
- **Prévention** : Éviter les réinstallations inutiles

### 🔌 **Support WebSocket Amélioré**
- **Script dédié** : `check-websocket.sh` pour diagnostic WebSocket
- **Monitoring intégré** : État WebSocket dans `./start.sh status`
- **Tests automatiques** : Vérification de connectivité WebSocket
- **Métriques temps réel** : Nombre de clients connectés via health check

## 🎯 **Prochaines Améliorations Prévues**

- 📊 **Dashboard web** pour monitoring
- 🔔 **Notifications** desktop lors d'erreurs
- 📧 **Alertes par email** pour problèmes critiques
- 🤖 **Auto-réparation** des services défaillants
- 📱 **Interface mobile** pour monitoring à distance
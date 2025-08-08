# RADRIS - Système RIS-PACS Open Source

🏥 **Système d'Information Radiologique moderne et open source**

RADRIS est une alternative française gratuite aux solutions RIS commerciales comme EDL, intégrée avec un PACS Orthanc et des visualisateurs médicaux avancés.

## ✨ Fonctionnalités

### 🎯 RIS Complet
- **Gestion des patients** - Dossier unifié, recherche avancée, historique médical
- **Planning intelligent** - Ordonnancement des examens, gestion des ressources
- **Workflow complet** - De la prescription à la validation des comptes-rendus
- **Worklist EDL-Style** - Interface dense multi-colonnes, temps réel

### 🔬 PACS Intégré
- **Orthanc PACS** - Stockage et gestion des images DICOM
- **DICOMweb** - API REST moderne (QIDO-RS, WADO-RS, STOW-RS)
- **Visualisateur** - Cornerstone.js pour l'affichage des images
- **Standards** - Conformité DICOM 3.0, HL7 FHIR

### 📊 Dashboard & Analytics
- **Métriques temps réel** - Productivité, délais, qualité
- **Tableaux de bord** - Vue d'ensemble opérationnelle
- **Alertes intelligentes** - SLA, qualité, technique

## 🏗️ Architecture

### Stack Technique
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Fastify + tRPC + Prisma
- **Database**: PostgreSQL 15
- **Cache**: Redis 7 + BullMQ
- **PACS**: Orthanc avec plugins
- **Container**: Docker + Docker Compose

### Structure du Projet
```
├── backend/           # API Node.js
├── frontend/          # Application Next.js
├── config/           # Configuration Orthanc
├── scripts/          # Scripts d'initialisation
├── docker-compose.yml # Orchestration des services
└── README.md
```

## 🚀 Installation Rapide

### Prérequis
- Docker et Docker Compose
- Node.js 20+ (pour le développement local)

### 1. Cloner le projet
```bash
git clone <repository-url>
cd radris
```

### 2. Lancer avec Docker
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 3. Initialiser la base de données
```bash
# Se connecter au conteneur backend
docker-compose exec backend sh

# Générer le client Prisma et migrer
npm run db:generate
npm run db:migrate
```

### 4. Accéder à l'application
- **Frontend RIS**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Orthanc PACS**: http://localhost:8042
- **Traefik Dashboard**: http://localhost:8080

## 🔧 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Interface utilisateur Next.js |
| Backend | 3001 | API REST/tRPC |
| PostgreSQL | 5432 | Base de données |
| Redis | 6379 | Cache et queues |
| Orthanc | 8042 | PACS DICOM |
| Orthanc DICOM | 4242 | Port DICOM C-STORE/FIND |
| Traefik | 80/8080 | Reverse proxy |

## 📚 Documentation

### API Backend
L'API backend expose plusieurs modules :

- **Auth** (`/api/auth`) - Authentification JWT
- **Patients** (`/api/patients`) - Gestion des patients
- **Examinations** (`/api/examinations`) - Gestion des examens
- **Reports** (`/api/reports`) - Comptes-rendus
- **DICOM** (`/api/dicom`) - Intégration PACS

### Base de données
Le schéma Prisma définit les entités :
- `User` - Utilisateurs (radiologues, techniciens, etc.)
- `Patient` - Dossiers patients
- `Examination` - Examens radiologiques
- `Report` - Comptes-rendus
- `ReportTemplate` - Templates de CR

### Frontend
Structure des composants :
- `components/ui/` - Composants UI de base
- `components/layout/` - Layout et navigation
- `components/forms/` - Formulaires
- `components/tables/` - Tables et worklist
- `app/` - Pages et routes Next.js

## 🔐 Sécurité

- **Authentification** JWT + NextAuth.js
- **Autorisation** RBAC (Role-Based Access Control)
- **Chiffrement** HTTPS/TLS
- **Base de données** Connexions sécurisées
- **RGPD** Conformité données de santé

## 🧪 Développement

### Backend
```bash
cd backend
npm install
npm run dev  # Mode développement avec hot reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Next.js dev server
```

### Tests
```bash
# Tests backend
cd backend
npm test

# Tests frontend
cd frontend
npm test
```

## 📊 Monitoring

### Logs
```bash
# Logs de tous les services
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
```

### Health Checks
- Backend: `GET /health`
- Orthanc: `GET /system`

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Roadmap

### Phase 1 - MVP ✅
- [x] Infrastructure Docker
- [x] Backend API authentification
- [x] Frontend base + login
- [x] Modèles de données
- [x] Intégration Orthanc

### Phase 2 - Core RIS 🚧
- [ ] Worklist EDL-style complète
- [ ] Gestion patients avancée
- [ ] Workflow examens
- [ ] Templates comptes-rendus
- [ ] Dashboard temps réel

### Phase 3 - Avancé 📋
- [ ] Visualisateur DICOM intégré
- [ ] IA aide au diagnostic
- [ ] Application mobile
- [ ] Télé-radiologie

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

- Documentation: [Wiki du projet]
- Issues: [GitHub Issues]
- Discussions: [GitHub Discussions]
- Email: support@radris.fr

---

**RADRIS** - *Révolutionner l'imagerie médicale avec l'open source* 🚀
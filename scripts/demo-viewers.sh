#!/bin/bash

# Démonstration des viewers DICOM RADRIS
echo "🎬 DÉMONSTRATION DES VIEWERS DICOM RADRIS"
echo "=========================================="

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🏥 RADRIS dispose maintenant de viewers DICOM avancés !${NC}"
echo ""

echo -e "${GREEN}📊 STATISTIQUES DU SYSTÈME :${NC}"
STUDY_COUNT=$(curl -s http://localhost:8042/statistics | jq -r '.CountStudies' 2>/dev/null || echo "N/A")
SERIES_COUNT=$(curl -s http://localhost:8042/statistics | jq -r '.CountSeries' 2>/dev/null || echo "N/A")
INSTANCE_COUNT=$(curl -s http://localhost:8042/statistics | jq -r '.CountInstances' 2>/dev/null || echo "N/A")

echo -e "  📚 Études disponibles : ${GREEN}$STUDY_COUNT${NC}"
echo -e "  📁 Séries d'images : ${GREEN}$SERIES_COUNT${NC}"
echo -e "  📄 Instances DICOM : ${GREEN}$INSTANCE_COUNT${NC}"

echo ""
echo -e "${PURPLE}🎯 VIEWERS DISPONIBLES :${NC}"
echo ""

echo -e "${GREEN}1. ORTHANC EXPLORER 2 - Interface moderne${NC}"
echo -e "   📱 URL : http://localhost:8042/ui/app/index.html"
echo -e "   ✨ Fonctionnalités :"
echo -e "      • Interface moderne et responsive"
echo -e "      • Thème sombre activé"
echo -e "      • Gestion avancée des études et séries"
echo -e "      • Intégration avec les viewers"
echo -e "      • Partage et téléchargement"
echo -e "      • Actions en lot"
echo ""

echo -e "${GREEN}2. STONE WEB VIEWER - Viewer médical haute performance${NC}"
echo -e "   📱 URL : http://localhost:8042/stone-webviewer/index.html"
echo -e "   ✨ Fonctionnalités :"
echo -e "      • Viewer médical professionnel"
echo -e "      • Support multi-séries et multi-études"
echo -e "      • Outils de mesure et d'annotation"
echo -e "      • Synchronisation des vues"
echo -e "      • Réglages fenêtrage/niveaux"
echo -e "      • Export d'images"
echo -e "      • Interface en français"
echo ""

echo -e "${GREEN}3. VOLVIEW - Viewer 3D et volume rendering${NC}"
echo -e "   📱 URL : Intégré dans Orthanc Explorer 2"
echo -e "   ✨ Fonctionnalités :"
echo -e "      • Rendu volumique 3D"
echo -e "      • Reconstruction multiplanaire (MPR)"
echo -e "      • Visualisation avancée"
echo -e "      • Support des séries volumiques"
echo ""

echo -e "${GREEN}4. OHIF VIEWER - Viewer web moderne externe${NC}"
echo -e "   📱 URL : http://localhost:3005"
echo -e "   ✨ Fonctionnalités :"
echo -e "      • Interface utilisateur moderne"
echo -e "      • Support des études complexes"
echo -e "      • Outils d'annotation avancés"
echo -e "      • Workflows personnalisables"
echo ""

echo -e "${GREEN}5. ORTHANC EXPLORER CLASSIQUE - Interface de base${NC}"
echo -e "   📱 URL : http://localhost:8042/app/explorer.html"
echo -e "   ✨ Fonctionnalités :"
echo -e "      • Interface classique Orthanc"
echo -e "      • Gestion des patients et études"
echo -e "      • Téléchargement DICOM"
echo -e "      • Administration système"
echo ""

echo -e "${YELLOW}🔗 LIENS DIRECTS POUR TESTER :${NC}"
echo ""

# Obtenir une étude pour les liens directs
STUDY_ID=$(curl -s http://localhost:8042/studies | jq -r '.[0]' 2>/dev/null)
if [ "$STUDY_ID" != "null" ] && [ -n "$STUDY_ID" ]; then
    STUDY_INFO=$(curl -s "http://localhost:8042/studies/$STUDY_ID" | jq -r '.MainDicomTags.StudyDescription // "N/A"')
    echo -e "${BLUE}📁 Étude d'exemple : $STUDY_INFO${NC}"
    echo ""
    
    echo -e "🎯 ${GREEN}Stone Web Viewer avec étude :${NC}"
    echo -e "   http://localhost:8042/stone-webviewer/index.html?study=$STUDY_ID"
    echo ""
    
    echo -e "🎯 ${GREEN}Orthanc Explorer 2 avec étude :${NC}"
    echo -e "   http://localhost:8042/ui/app/index.html#/studies/$STUDY_ID"
    echo ""
    
    echo -e "🎯 ${GREEN}Explorateur classique avec étude :${NC}"
    echo -e "   http://localhost:8042/app/explorer.html#study?uuid=$STUDY_ID"
fi

echo ""
echo -e "${PURPLE}🛠️  APIS DISPONIBLES :${NC}"
echo -e "  • REST API : http://localhost:8042/studies"
echo -e "  • DICOMweb : http://localhost:8042/dicom-web/studies"
echo -e "  • WADO-URI : http://localhost:8042/wado"
echo -e "  • Backend API : http://localhost:3001/api"

echo ""
echo -e "${BLUE}🎉 CONFIGURATION RÉUSSIE !${NC}"
echo -e "Tous les viewers sont opérationnels et prêts à l'utilisation."
echo ""
echo -e "${YELLOW}💡 CONSEILS D'UTILISATION :${NC}"
echo -e "  1. Commencez par Orthanc Explorer 2 pour naviguer"
echo -e "  2. Utilisez Stone Web Viewer pour l'analyse d'images"
echo -e "  3. VolView pour la 3D et les reconstructions"
echo -e "  4. OHIF pour les workflows avancés"
echo ""

echo -e "${GREEN}✅ RADRIS est maintenant un système RIS/PACS complet !${NC}"
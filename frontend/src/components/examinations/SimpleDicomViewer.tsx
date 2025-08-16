'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Monitor, 
  Image, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle,
  User,
  Hash
} from 'lucide-react';

interface SimpleDicomViewerProps {
  studyInstanceUID: string;
  patientName?: string;
  patientId?: string;
  accessionNumber?: string;
  modality?: string;
  studyDate?: string;
  onError?: (error: string) => void;
  className?: string;
}

export function SimpleDicomViewer({ 
  studyInstanceUID,
  patientName = "Patient Anonyme",
  patientId = "N/A",
  accessionNumber = "N/A",
  modality = "CT",
  studyDate,
  onError,
  className = ''
}: SimpleDicomViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URLs for different viewers
  const ohifUrl = `http://localhost:3005/viewer?StudyInstanceUIDs=${studyInstanceUID}`;
  const orthancExplorerUrl = `http://localhost:8042/app/explorer.html#study?uuid=${studyInstanceUID}`;
  const stoneViewerUrl = `http://localhost:8042/ui/app/stone-webviewer/index.html?study=${studyInstanceUID}`;

  const openOhifViewer = () => {
    try {
      const viewerWindow = window.open(ohifUrl, '_blank', 'width=1400,height=900,scrollbars=yes,resizable=yes');
      if (!viewerWindow) {
        const errorMsg = 'Impossible d\'ouvrir OHIF Viewer. Vérifiez que les pop-ups sont autorisés.';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Erreur lors de l\'ouverture d\'OHIF Viewer';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const openOrthancExplorer = () => {
    try {
      const viewerWindow = window.open(orthancExplorerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (!viewerWindow) {
        const errorMsg = 'Impossible d\'ouvrir Orthanc Explorer. Vérifiez que les pop-ups sont autorisés.';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Erreur lors de l\'ouverture d\'Orthanc Explorer';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const openStoneViewer = () => {
    try {
      const viewerWindow = window.open(stoneViewerUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (!viewerWindow) {
        const errorMsg = 'Impossible d\'ouvrir Stone Web Viewer. Vérifiez que les pop-ups sont autorisés.';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Erreur lors de l\'ouverture de Stone Web Viewer';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  const getModalityDisplayName = (modality: string): string => {
    const modalityNames: Record<string, string> = {
      'CT': 'Scanner',
      'MR': 'IRM',
      'XR': 'Radiographie',
      'US': 'Échographie',
      'MG': 'Mammographie',
      'NM': 'Médecine Nucléaire',
      'PT': 'TEP',
      'RF': 'Radioscopie',
      'DX': 'Radiographie Numérique',
      'CR': 'Radiographie Numérisée',
      'DR': 'Radiographie Directe'
    };
    return modalityNames[modality] || modality;
  };

  useEffect(() => {
    // Clear error when studyInstanceUID changes
    setError(null);
  }, [studyInstanceUID]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Visualisation DICOM
          <Badge variant="secondary" className="ml-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Viewer Simplifié
          </Badge>
        </CardTitle>
        <CardDescription>
          Visualisez les images DICOM avec les viewers externes disponibles
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{patientName}</p>
              <p className="text-xs text-muted-foreground">Patient</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{accessionNumber}</p>
              <p className="text-xs text-muted-foreground">N° Accession</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{getModalityDisplayName(modality)}</p>
              <p className="text-xs text-muted-foreground">Modalité</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Viewer Options */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Options de visualisation</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* OHIF Viewer */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-medium">OHIF Viewer</h5>
                    <p className="text-xs text-muted-foreground">Viewer médical avancé</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={openOhifViewer}
                  disabled={isLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir OHIF
                </Button>
              </CardContent>
            </Card>

            {/* Orthanc Explorer */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Monitor className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h5 className="font-medium">Orthanc Explorer</h5>
                    <p className="text-xs text-muted-foreground">Interface PACS native</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={openOrthancExplorer}
                  disabled={isLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Orthanc
                </Button>
              </CardContent>
            </Card>

            {/* Stone Web Viewer */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Image className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h5 className="font-medium">Stone Viewer</h5>
                    <p className="text-xs text-muted-foreground">Viewer léger et rapide</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={openStoneViewer}
                  disabled={isLoading}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir Stone
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Technical Information */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Informations techniques</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Study Instance UID:</span>
              <p className="font-mono text-xs break-all">{studyInstanceUID}</p>
            </div>
            <div>
              <span className="text-muted-foreground">WADO-RS Root:</span>
              <p className="font-mono text-xs">http://localhost:8043/dicom-web</p>
            </div>
            {studyDate && (
              <div>
                <span className="text-muted-foreground">Date d'étude:</span>
                <p className="text-xs">{studyDate}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Patient ID:</span>
              <p className="text-xs">{patientId}</p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="ml-4"
              >
                Fermer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Direct Links for Testing */}
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
          <h5 className="text-xs font-medium text-muted-foreground">Liens directs (pour tests)</h5>
          <div className="space-y-1 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">OHIF: </span>
              <a href={ohifUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {ohifUrl}
              </a>
            </div>
            <div>
              <span className="text-muted-foreground">Orthanc: </span>
              <a href={orthancExplorerUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline break-all">
                {orthancExplorerUrl}
              </a>
            </div>
            <div>
              <span className="text-muted-foreground">Stone: </span>
              <a href={stoneViewerUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline break-all">
                {stoneViewerUrl}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
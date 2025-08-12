'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { DicomService, ViewerConfig } from '@/services/dicomService';
import { 
  Eye, 
  Monitor, 
  Image, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  User,
  Hash
} from 'lucide-react';

interface DicomViewerProps {
  examinationId: string;
  onSync?: () => void;
}

export function DicomViewer({ examinationId, onSync }: DicomViewerProps) {
  const [viewerConfig, setViewerConfig] = useState<ViewerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadViewerConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const config = await DicomService.getViewerConfig(examinationId);
      setViewerConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load viewer configuration');
      setViewerConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      const result = await DicomService.syncExamination(examinationId);
      
      if (result.success && result.imagesAvailable) {
        await loadViewerConfig();
        onSync?.();
      } else {
        setError(result.error || 'No DICOM images found for this examination');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync examination');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadViewerConfig();
  }, [examinationId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Visualisation DICOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Chargement de la configuration...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !viewerConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Visualisation DICOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="ml-4"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Synchroniser
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!viewerConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Visualisation DICOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune image DICOM disponible pour cet examen.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Visualisation DICOM
          <Badge variant="secondary" className="ml-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Images disponibles
          </Badge>
        </CardTitle>
        <CardDescription>
          Visualisez les images DICOM de cet examen avec différents viewers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {viewerConfig.patient.firstName} {viewerConfig.patient.lastName}
              </p>
              <p className="text-xs text-muted-foreground">Patient</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{viewerConfig.accessionNumber}</p>
              <p className="text-xs text-muted-foreground">N° Accession</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{DicomService.getModalityDisplayName(viewerConfig.modality)}</p>
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
                  onClick={() => DicomService.openOhifViewer(viewerConfig.studyInstanceUID)}
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
                  onClick={() => DicomService.openOrthancViewer(viewerConfig.studyInstanceUID)}
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
                  onClick={() => DicomService.openStoneViewer(viewerConfig.studyInstanceUID)}
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
              <p className="font-mono text-xs break-all">{viewerConfig.studyInstanceUID}</p>
            </div>
            <div>
              <span className="text-muted-foreground">WADO-RS Root:</span>
              <p className="font-mono text-xs">{viewerConfig.wadoRsRoot}</p>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Synchronisation...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-synchroniser
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
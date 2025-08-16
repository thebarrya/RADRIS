'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Database,
  Link,
  AlertTriangle
} from 'lucide-react';
import { api } from '@/lib/api';

interface AutoDiscoveryResult {
  success: boolean;
  message: string;
  data?: {
    newStudiesFound: number;
    matchedExaminations: number;
    unmatchedStudies: number;
    syncResults: any[];
  };
  timestamp: string;
}

interface UnmatchedStudy {
  StudyInstanceUID: string;
  PatientName?: string;
  PatientID?: string;
  StudyDate?: string;
  StudyDescription?: string;
  AccessionNumber?: string;
  ModalitiesInStudy: string[];
}

interface AutoDiscoveryProps {
  onDiscoveryComplete?: (result: AutoDiscoveryResult) => void;
  className?: string;
}

export function AutoDiscovery({ onDiscoveryComplete, className = '' }: AutoDiscoveryProps) {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<AutoDiscoveryResult | null>(null);
  const [unmatchedStudies, setUnmatchedStudies] = useState<UnmatchedStudy[]>([]);
  const [isLoadingUnmatched, setIsLoadingUnmatched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  const runAutoDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    
    try {
      const response = await api.post('/dicom/auto-discovery/discover');
      const result: AutoDiscoveryResult = response.data;
      
      setDiscoveryResult(result);
      onDiscoveryComplete?.(result);
      
      // If there are unmatched studies, load them
      if (result.data && result.data.unmatchedStudies > 0) {
        await loadUnmatchedStudies();
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run auto-discovery';
      setError(errorMessage);
      console.error('Auto-discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const loadUnmatchedStudies = async () => {
    setIsLoadingUnmatched(true);
    setError(null);
    
    try {
      const response = await api.get('/dicom/auto-discovery/unmatched-studies');
      setUnmatchedStudies(response.data.data.unmatchedStudies || []);
      setShowUnmatched(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load unmatched studies';
      setError(errorMessage);
      console.error('Load unmatched studies error:', error);
    } finally {
      setIsLoadingUnmatched(false);
    }
  };

  const formatDate = (dicomDate?: string) => {
    if (!dicomDate || dicomDate.length !== 8) return 'Unknown';
    
    const year = dicomDate.substring(0, 4);
    const month = dicomDate.substring(4, 6);
    const day = dicomDate.substring(6, 8);
    
    return `${day}/${month}/${year}`;
  };

  const formatPatientName = (patientName?: string) => {
    if (!patientName) return 'Unknown Patient';
    return patientName.replace(/\^/g, ' ').trim();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Auto-Discovery Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Auto-Discovery DICOM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Recherche automatique de nouvelles études DICOM
              </p>
              <p className="text-xs text-gray-600">
                Détecte et synchronise automatiquement les nouvelles études depuis Orthanc PACS
              </p>
            </div>
            
            <Button
              onClick={runAutoDiscovery}
              disabled={isDiscovering}
              className="min-w-[140px]"
            >
              {isDiscovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Démarrer
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Discovery Results */}
          {discoveryResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {discoveryResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <h4 className="font-medium">
                  {discoveryResult.success ? 'Découverte terminée' : 'Échec de la découverte'}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {new Date(discoveryResult.timestamp).toLocaleString()}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-700 mb-3">
                {discoveryResult.message}
              </p>

              {discoveryResult.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-blue-600">
                      {discoveryResult.data.newStudiesFound}
                    </div>
                    <div className="text-xs text-gray-600">Nouvelles études</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-green-600">
                      {discoveryResult.data.matchedExaminations}
                    </div>
                    <div className="text-xs text-gray-600">Examens liés</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-orange-600">
                      {discoveryResult.data.unmatchedStudies}
                    </div>
                    <div className="text-xs text-gray-600">Non liées</div>
                  </div>
                  
                  <div className="text-center p-3 bg-white rounded border">
                    <div className="text-2xl font-bold text-purple-600">
                      {discoveryResult.data.syncResults.length}
                    </div>
                    <div className="text-xs text-gray-600">Synchronisées</div>
                  </div>
                </div>
              )}

              {/* Load Unmatched Studies Button */}
              {discoveryResult.data && discoveryResult.data.unmatchedStudies > 0 && (
                <div className="mt-4 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadUnmatchedStudies}
                    disabled={isLoadingUnmatched}
                    className="w-full"
                  >
                    {isLoadingUnmatched ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Voir les études non liées ({discoveryResult.data.unmatchedStudies})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmatched Studies */}
      {showUnmatched && unmatchedStudies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Études non liées ({unmatchedStudies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 mb-4">
              Ces études DICOM n'ont pu être associées automatiquement à aucun examen RIS. 
              Vous pouvez les lier manuellement si nécessaire.
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {unmatchedStudies.map((study, index) => (
                <div
                  key={study.StudyInstanceUID}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {formatPatientName(study.PatientName)}
                      </h4>
                      <p className="text-xs text-gray-600">
                        ID Patient: {study.PatientID || 'Non spécifié'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {study.ModalitiesInStudy?.map((modality) => (
                        <Badge key={modality} variant="secondary" className="text-xs">
                          {modality}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(study.StudyDate)}
                    </div>
                    <div>
                      <span className="font-medium">Accession:</span> {study.AccessionNumber || 'N/A'}
                    </div>
                  </div>
                  
                  {study.StudyDescription && (
                    <p className="text-xs text-gray-700 mb-3">
                      <span className="font-medium">Description:</span> {study.StudyDescription}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <code className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      {study.StudyInstanceUID.slice(-20)}...
                    </code>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement manual linking dialog
                        console.log('Manual link for:', study.StudyInstanceUID);
                      }}
                    >
                      <Link className="h-4 w-4 mr-1" />
                      Lier manuellement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>
              Dernière exécution: {discoveryResult 
                ? new Date(discoveryResult.timestamp).toLocaleString()
                : 'Jamais exécutée'
              }
            </span>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            L'auto-discovery peut être configurée pour s'exécuter périodiquement 
            afin de maintenir la synchronisation entre le RIS et le PACS.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
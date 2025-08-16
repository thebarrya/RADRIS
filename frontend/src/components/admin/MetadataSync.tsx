'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Users,
  FileText,
  Activity,
  Settings,
  TrendingUp,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';

interface SyncStatistics {
  ris: {
    totalPatients: number;
    totalExaminations: number;
    examinationsWithStudyUID: number;
    examinationsWithImages: number;
    patientsWithSocialSecurity: number;
    syncPercentage: number;
  };
  pacs: {
    totalStudies: number;
    uniquePatients: number;
  };
  synchronization: {
    linkedExaminations: number;
    availableForLinking: number;
    potentialMatches: number;
  };
  timestamp: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    patientsProcessed: number;
    patientsUpdated: number;
    studiesProcessed: number;
    studiesLinked: number;
    errors: string[];
    totalErrors: number;
  };
  timestamp: string;
}

interface HealthStatus {
  success: boolean;
  data: {
    ris: { connected: boolean; status: string };
    pacs: { connected: boolean; status: string };
    overall: { status: string; readyForSync: boolean };
  };
  timestamp: string;
}

export function MetadataSync() {
  const [statistics, setStatistics] = useState<SyncStatistics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [statsResponse, healthResponse] = await Promise.all([
        api.get('/dicom/metadata-sync/statistics'),
        api.get('/dicom/metadata-sync/health')
      ]);
      
      setStatistics(statsResponse.data.data);
      setHealthStatus(healthResponse.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load metadata sync data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runFullSync = async () => {
    setIsSyncing(true);
    setError(null);
    setSyncResult(null);
    
    try {
      const response = await api.post('/dicom/metadata-sync/synchronize');
      setSyncResult(response.data);
      
      // Refresh statistics after sync
      await loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run synchronization';
      setError(errorMessage);
      console.error('Synchronization failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const runPatientSync = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await api.post('/dicom/metadata-sync/sync-patients');
      setSyncResult(response.data);
      await loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync patients';
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const runStudySync = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      const response = await api.post('/dicom/metadata-sync/sync-studies');
      setSyncResult(response.data);
      await loadData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync studies';
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'disconnected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSyncPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading && !statistics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Chargement des données de synchronisation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Synchronisation des Métadonnées</h2>
          <p className="text-gray-600">Synchronisation bidirectionnelle RIS ↔ PACS</p>
        </div>
        
        <Button
          onClick={loadData}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              État du Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg border">
                <div className="mb-2">
                  <Database className="h-8 w-8 mx-auto text-blue-600" />
                </div>
                <h3 className="font-medium mb-1">RIS Database</h3>
                <Badge className={getStatusColor(healthStatus.data.ris.status)}>
                  {healthStatus.data.ris.status}
                </Badge>
              </div>
              
              <div className="text-center p-4 rounded-lg border">
                <div className="mb-2">
                  <Settings className="h-8 w-8 mx-auto text-green-600" />
                </div>
                <h3 className="font-medium mb-1">PACS System</h3>
                <Badge className={getStatusColor(healthStatus.data.pacs.status)}>
                  {healthStatus.data.pacs.status}
                </Badge>
              </div>
              
              <div className="text-center p-4 rounded-lg border">
                <div className="mb-2">
                  <Zap className="h-8 w-8 mx-auto text-purple-600" />
                </div>
                <h3 className="font-medium mb-1">Sync Status</h3>
                <Badge className={getStatusColor(healthStatus.data.overall.status)}>
                  {healthStatus.data.overall.readyForSync ? 'Ready' : 'Not Ready'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{statistics.ris.totalPatients}</p>
                  <p className="text-sm text-gray-600">Patients RIS</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{statistics.ris.totalExaminations}</p>
                  <p className="text-sm text-gray-600">Examens RIS</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Database className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{statistics.pacs.totalStudies}</p>
                  <p className="text-sm text-gray-600">Études PACS</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div>
                  <p className={`text-2xl font-bold ${getSyncPercentageColor(statistics.ris.syncPercentage)}`}>
                    {statistics.ris.syncPercentage}%
                  </p>
                  <p className="text-sm text-gray-600">Synchronisé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Synchronization Progress */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle>Progression de la Synchronisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Examens avec images DICOM</span>
                <span>{statistics.ris.examinationsWithImages} / {statistics.ris.totalExaminations}</span>
              </div>
              <Progress 
                value={(statistics.ris.examinationsWithImages / statistics.ris.totalExaminations) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Examens liés à des études</span>
                <span>{statistics.ris.examinationsWithStudyUID} / {statistics.ris.totalExaminations}</span>
              </div>
              <Progress 
                value={(statistics.ris.examinationsWithStudyUID / statistics.ris.totalExaminations) * 100}
                className="h-2"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Patients avec identifiants</span>
                <span>{statistics.ris.patientsWithSocialSecurity} / {statistics.ris.totalPatients}</span>
              </div>
              <Progress 
                value={(statistics.ris.patientsWithSocialSecurity / statistics.ris.totalPatients) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Contrôles de Synchronisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={runFullSync}
              disabled={isSyncing || !healthStatus?.data.overall.readyForSync}
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Sync Complète
                </>
              )}
            </Button>

            <Button
              onClick={runPatientSync}
              disabled={isSyncing || !healthStatus?.data.overall.readyForSync}
              variant="outline"
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Sync Patients
            </Button>

            <Button
              onClick={runStudySync}
              disabled={isSyncing || !healthStatus?.data.overall.readyForSync}
              variant="outline"
              className="w-full"
            >
              <FileText className="h-4 w-4 mr-2" />
              Sync Études
            </Button>
          </div>

          <p className="text-sm text-gray-600">
            La synchronisation complète analyse et met à jour toutes les métadonnées entre le RIS et le PACS.
            Utilisez les synchronisations spécifiques pour des mises à jour ciblées.
          </p>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Résultat de la Synchronisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={syncResult.success ? "default" : "destructive"}>
              <AlertDescription>{syncResult.message}</AlertDescription>
            </Alert>

            {syncResult.data && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded border">
                  <div className="text-lg font-bold text-blue-600">
                    {syncResult.data.patientsUpdated}
                  </div>
                  <div className="text-xs text-blue-800">Patients mis à jour</div>
                </div>

                <div className="text-center p-3 bg-green-50 rounded border">
                  <div className="text-lg font-bold text-green-600">
                    {syncResult.data.studiesLinked}
                  </div>
                  <div className="text-xs text-green-800">Études liées</div>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded border">
                  <div className="text-lg font-bold text-purple-600">
                    {syncResult.data.studiesProcessed}
                  </div>
                  <div className="text-xs text-purple-800">Études traitées</div>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded border">
                  <div className="text-lg font-bold text-orange-600">
                    {syncResult.data.totalErrors}
                  </div>
                  <div className="text-xs text-orange-800">Erreurs</div>
                </div>
              </div>
            )}

            {syncResult.data && syncResult.data.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h4 className="font-medium text-red-900 mb-2">Erreurs de synchronisation</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {syncResult.data.errors.map((error, index) => (
                    <li key={index} className="break-words">• {error}</li>
                  ))}
                  {syncResult.data.totalErrors > syncResult.data.errors.length && (
                    <li className="italic">
                      ... et {syncResult.data.totalErrors - syncResult.data.errors.length} autres erreurs
                    </li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
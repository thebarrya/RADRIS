'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { DicomService, DicomSyncStats } from '@/services/dicomService';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react';

interface DicomSyncPanelProps {
  onSyncComplete?: () => void;
}

export function DicomSyncPanel({ onSyncComplete }: DicomSyncPanelProps) {
  const [stats, setStats] = useState<DicomSyncStats | null>(null);
  const [pacsConnected, setPacsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await DicomService.getSyncStats();
      setStats(response.statistics);
      setPacsConnected(response.pacsConnected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sync statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      setError(null);
      setLastSyncResult(null);
      
      const result = await DicomService.syncAllPending();
      
      if (result.success) {
        setLastSyncResult(
          `Synchronisé ${result.summary.successfulSyncs}/${result.summary.totalExaminations} examens ` +
          `(${result.summary.totalStudiesFound} études DICOM trouvées)`
        );
        await loadStats();
        onSyncComplete?.();
      } else {
        setError('Échec de la synchronisation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync examinations');
    } finally {
      setSyncing(false);
    }
  };

  const testConnection = async () => {
    try {
      const result = await DicomService.testConnection();
      setPacsConnected(result.connected);
      if (!result.connected) {
        setError('Connexion PACS indisponible');
      }
    } catch (err) {
      setPacsConnected(false);
      setError('Impossible de tester la connexion PACS');
    }
  };

  useEffect(() => {
    loadStats();
    
    // Set up periodic stats refresh (every 30 seconds) to keep data current without being aggressive
    const statsInterval = setInterval(() => {
      loadStats();
    }, 30000); // 30 seconds instead of more frequent updates
    
    return () => clearInterval(statsInterval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Synchronisation DICOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Chargement des statistiques...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Synchronisation DICOM
          <Badge variant={pacsConnected ? "default" : "destructive"} className="ml-auto">
            {pacsConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                PACS Connecté
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                PACS Déconnecté
              </>
            )}
          </Badge>
        </CardTitle>
        <CardDescription>
          Synchronisez les examens RADRIS avec les études DICOM du PACS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        {!pacsConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Connexion PACS indisponible</span>
              <Button variant="outline" size="sm" onClick={testConnection}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tester
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Statistiques de synchronisation</h4>
              <Button variant="outline" size="sm" onClick={loadStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Examens synchronisés</span>
                <span>{stats.syncPercentage}%</span>
              </div>
              <Progress value={stats.syncPercentage} className="h-2" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.totalExaminations}</div>
                <div className="text-xs text-muted-foreground">Total examens</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.examinationsWithImages}</div>
                <div className="text-xs text-muted-foreground">Avec images</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.pendingSync}</div>
                <div className="text-xs text-muted-foreground">En attente</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.examinationsWithStudyUID}</div>
                <div className="text-xs text-muted-foreground">Avec Study UID</div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Sync Actions */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Actions de synchronisation</h4>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSyncAll}
              disabled={syncing || !pacsConnected}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Synchronisation en cours...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Synchroniser tout
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={loadStats}
              disabled={loading}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Actualiser stats
            </Button>
          </div>

          {stats && stats.pendingSync > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {stats.pendingSync} examen(s) en attente de synchronisation avec le PACS
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Results */}
        {lastSyncResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{lastSyncResult}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Last Update */}
        {stats && (
          <div className="text-xs text-muted-foreground text-center">
            Dernière mise à jour: {new Date(stats.timestamp).toLocaleString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, XCircle, Loader2, Play, Square, RotateCw } from 'lucide-react';
import { useCornerstone } from '@/hooks/useCornerstone';
import { TOOL_NAMES } from '@/lib/cornerstone';

export default function TestCornerstoneFixed() {
  const {
    isInitialized,
    error,
    isLoading,
    activeTool,
    viewportSettings,
    setActiveTool,
    updateViewportSettings,
    resetViewport,
    enableElement,
    disableElement,
    cleanup,
  } = useCornerstone();

  const [viewportEnabled, setViewportEnabled] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportId = 'test-viewport';

  useEffect(() => {
    return () => {
      if (viewportEnabled) {
        disableElement(viewportId);
      }
      cleanup();
    };
  }, [viewportEnabled, disableElement, cleanup]);

  const handleEnableViewport = async () => {
    if (!viewportRef.current || !isInitialized) return;

    try {
      await enableElement(viewportRef.current, viewportId);
      setViewportEnabled(true);
      setTestResults(prev => ({ ...prev, viewport: true }));
    } catch (err) {
      console.error('Failed to enable viewport:', err);
      setTestResults(prev => ({ ...prev, viewport: false }));
    }
  };

  const handleDisableViewport = () => {
    disableElement(viewportId);
    setViewportEnabled(false);
  };

  const handleToolChange = (tool: string) => {
    setActiveTool(tool as any);
    setTestResults(prev => ({ ...prev, tools: true }));
  };

  const handleViewportReset = () => {
    resetViewport();
    setTestResults(prev => ({ ...prev, reset: true }));
  };

  const handleSettingsChange = () => {
    updateViewportSettings({
      windowWidth: 800,
      windowCenter: 200,
      zoom: 1.5,
      rotation: 45,
    });
    setTestResults(prev => ({ ...prev, settings: true }));
  };

  const runAllTests = async () => {
    setTestResults({});
    
    // Test initialization
    if (isInitialized) {
      setTestResults(prev => ({ ...prev, initialization: true }));
    }

    // Test viewport
    if (!viewportEnabled && viewportRef.current && isInitialized) {
      try {
        await handleEnableViewport();
      } catch {
        setTestResults(prev => ({ ...prev, viewport: false }));
      }
    }

    // Test tools
    if (isInitialized) {
      setTimeout(() => {
        handleToolChange(TOOL_NAMES.Zoom);
        setTimeout(() => {
          handleToolChange(TOOL_NAMES.Pan);
        }, 500);
      }, 1000);
    }

    // Test settings
    setTimeout(() => {
      handleSettingsChange();
    }, 2000);

    // Test reset
    setTimeout(() => {
      handleViewportReset();
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Test Cornerstone.js - Configuration Fixée
          </h1>
          <p className="text-lg text-gray-600">
            Test de la nouvelle intégration Cornerstone.js avec Next.js 14
          </p>
        </div>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              ) : isInitialized ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : error ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Status Cornerstone.js
            </CardTitle>
            <CardDescription>
              État actuel de l'initialisation et configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Badge variant={isLoading ? "secondary" : isInitialized ? "default" : "destructive"}>
                  {isLoading ? "Chargement..." : isInitialized ? "Initialisé" : "Non initialisé"}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Core</p>
              </div>
              <div className="text-center">
                <Badge variant={viewportEnabled ? "default" : "secondary"}>
                  {viewportEnabled ? "Activé" : "Inactif"}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Viewport</p>
              </div>
              <div className="text-center">
                <Badge variant={activeTool ? "default" : "secondary"}>
                  {activeTool || "Aucun"}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Outil actif</p>
              </div>
              <div className="text-center">
                <Badge variant={viewportSettings.zoom !== 1 ? "default" : "secondary"}>
                  {viewportSettings.zoom}x
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Zoom</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur d'initialisation</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Contrôles de Test</CardTitle>
              <CardDescription>
                Testez les différentes fonctionnalités de Cornerstone.js
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleEnableViewport}
                  disabled={!isInitialized || viewportEnabled}
                  variant="outline"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Activer Viewport
                </Button>
                <Button 
                  onClick={handleDisableViewport}
                  disabled={!viewportEnabled}
                  variant="outline"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Désactiver
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Outils</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TOOL_NAMES).slice(0, 6).map(([key, toolName]) => (
                    <Button
                      key={key}
                      onClick={() => handleToolChange(toolName)}
                      disabled={!isInitialized}
                      variant={activeTool === toolName ? "default" : "outline"}
                      size="sm"
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={handleSettingsChange}
                  disabled={!viewportEnabled}
                  variant="outline"
                  size="sm"
                >
                  Test Settings
                </Button>
                <Button 
                  onClick={handleViewportReset}
                  disabled={!viewportEnabled}
                  variant="outline"
                  size="sm"
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              <Separator />

              <Button 
                onClick={runAllTests}
                disabled={!isInitialized}
                className="w-full"
              >
                Exécuter tous les tests
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Résultats des Tests</CardTitle>
              <CardDescription>
                Statut des différents tests effectués
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { key: 'initialization', label: 'Initialisation Cornerstone.js' },
                  { key: 'viewport', label: 'Activation du viewport' },
                  { key: 'tools', label: 'Changement d\'outils' },
                  { key: 'settings', label: 'Modification des paramètres' },
                  { key: 'reset', label: 'Reset du viewport' },
                ].map(test => (
                  <div key={test.key} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm font-medium">{test.label}</span>
                    <Badge 
                      variant={testResults[test.key] === true ? "default" : testResults[test.key] === false ? "destructive" : "secondary"}
                    >
                      {testResults[test.key] === true ? "✓ Passé" : 
                       testResults[test.key] === false ? "✗ Échec" : "En attente"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Viewport */}
        <Card>
          <CardHeader>
            <CardTitle>Viewport DICOM</CardTitle>
            <CardDescription>
              Zone d'affichage pour les images DICOM (Test sans images pour l'instant)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div
                ref={viewportRef}
                id={viewportId}
                className="w-full h-96 bg-black rounded flex items-center justify-center text-white"
              >
                {viewportEnabled ? (
                  <div className="text-center">
                    <p className="text-lg font-medium">Viewport Cornerstone.js Actif</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Prêt à charger des images DICOM
                    </p>
                    <div className="mt-4 text-sm text-gray-400">
                      <p>Zoom: {viewportSettings.zoom}x</p>
                      <p>WW/WC: {viewportSettings.windowWidth}/{viewportSettings.windowCenter}</p>
                      <p>Outil actif: {activeTool}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <p>Viewport non activé</p>
                    <p className="text-sm mt-2">Cliquez sur "Activer Viewport" pour commencer</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations Techniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Configuration</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Next.js 14 avec App Router</li>
                  <li>• Cornerstone.js v3.32.10</li>
                  <li>• Web Workers configurés</li>
                  <li>• Codecs DICOM: OpenJPEG, JPEG-LS</li>
                  <li>• Support Docker</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Fonctionnalités</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Viewport Stack et Volume</li>
                  <li>• Outils de manipulation</li>
                  <li>• Outils de mesure</li>
                  <li>• Annotations</li>
                  <li>• Configuration dynamique</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
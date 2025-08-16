'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw, FileText } from 'lucide-react';
import { useCornerstone } from '@/hooks/useCornerstone';
import { TOOL_NAMES } from '@/lib/cornerstone';
import { AnnotationTools } from './AnnotationTools';
import { SeriesNavigator } from './SeriesNavigator';
import { useViewerReportsIntegration, ImageAnnotation } from '@/services/viewerReportsIntegration';

interface CornerstoneViewerProps {
  studyInstanceUID: string;
  examinationId: string;
  reportId?: string;
  showAnnotationTools?: boolean;
  onError?: (error: string) => void;
  onNavigateToReport?: () => void;
  className?: string;
}

export function CornerstoneViewer({ 
  studyInstanceUID,
  examinationId,
  reportId,
  showAnnotationTools = true,
  onError,
  onNavigateToReport,
  className = '' 
}: CornerstoneViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportEnabled, setViewportEnabled] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentSeriesInstanceUID, setCurrentSeriesInstanceUID] = useState('');
  const [currentSOPInstanceUID, setCurrentSOPInstanceUID] = useState('');
  const viewportId = `viewer-${studyInstanceUID}`;

  const {
    isInitialized,
    error,
    isLoading,
    activeTool,
    viewportSettings,
    studyInfo,
    currentSeries,
    currentSeriesIndex,
    setActiveTool,
    updateViewportSettings,
    resetViewport,
    enableElement,
    disableElement,
    loadStudyWithSeriesInfo,
    loadSeriesIntoViewport,
    switchToSeries,
  } = useCornerstone();

  const { service: integrationService } = useViewerReportsIntegration();

  // Enable viewport when Cornerstone is ready
  useEffect(() => {
    if (isInitialized && viewportRef.current && !viewportEnabled) {
      enableElement(viewportRef.current, viewportId)
        .then(() => {
          setViewportEnabled(true);
          console.log('Viewport enabled for study:', studyInstanceUID);
          
          // Load study with series information
          return loadStudyWithSeriesInfo(studyInstanceUID);
        })
        .then(() => {
          console.log('Study with series info loaded successfully');
          
          // Initialize integration service
          if (showAnnotationTools) {
            integrationService.initialize(examinationId, reportId);
            setAnnotations(integrationService.getAnnotations());
          }
        })
        .catch((err) => {
          console.error('Failed to enable viewport or load study:', err);
          onError?.(err.message || 'Failed to enable viewer or load study');
        });
    }

    return () => {
      if (viewportEnabled) {
        disableElement(viewportId);
        setViewportEnabled(false);
        setImagesLoaded(false);
      }
    };
  }, [isInitialized, viewportEnabled, enableElement, disableElement, loadStudyWithSeriesInfo, onError, viewportId, studyInstanceUID, examinationId, reportId, showAnnotationTools, integrationService]);

  // Load first series when study info is available
  useEffect(() => {
    if (viewportEnabled && studyInfo && studyInfo.series.length > 0 && !imagesLoaded) {
      loadSeriesIntoViewport(viewportId, 0)
        .then(() => {
          console.log('First series loaded successfully into viewport');
          setImagesLoaded(true);
        })
        .catch((err) => {
          console.error('Failed to load first series:', err);
          onError?.(err.message || 'Failed to load series');
        });
    }
  }, [viewportEnabled, studyInfo, imagesLoaded, loadSeriesIntoViewport, viewportId, onError]);

  // Listen for integration service events
  useEffect(() => {
    if (!showAnnotationTools) return;

    const handleAnnotationCreated = (annotation: ImageAnnotation) => {
      setAnnotations(prev => [...prev, annotation]);
    };

    const handleAnnotationUpdated = (annotation: ImageAnnotation) => {
      setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
    };

    const handleAnnotationDeleted = ({ id }: { id: string }) => {
      setAnnotations(prev => prev.filter(a => a.id !== id));
    };

    const handleNavigateToReport = () => {
      onNavigateToReport?.();
    };

    integrationService.on('annotation-created', handleAnnotationCreated);
    integrationService.on('annotation-updated', handleAnnotationUpdated);
    integrationService.on('annotation-deleted', handleAnnotationDeleted);
    integrationService.on('navigate-to-report', handleNavigateToReport);

    return () => {
      integrationService.off('annotation-created', handleAnnotationCreated);
      integrationService.off('annotation-updated', handleAnnotationUpdated);
      integrationService.off('annotation-deleted', handleAnnotationDeleted);
      integrationService.off('navigate-to-report', handleNavigateToReport);
    };
  }, [showAnnotationTools, integrationService, onNavigateToReport]);

  // Handle viewport interactions for annotations
  useEffect(() => {
    if (!viewportRef.current || !viewportEnabled || !showAnnotationTools) return;

    const viewport = viewportRef.current;

    const handleClick = (event: MouseEvent) => {
      // Handle annotation creation based on active tool
      // This would integrate with the annotation service
      const rect = viewport.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      console.log('Viewport clicked at:', { x, y });
      // TODO: Create annotation if annotation tool is active
    };

    const handleMouseMove = (event: MouseEvent) => {
      // Handle dynamic annotation preview
      // TODO: Show annotation preview while drawing
    };

    viewport.addEventListener('click', handleClick);
    viewport.addEventListener('mousemove', handleMouseMove);

    return () => {
      viewport.removeEventListener('click', handleClick);
      viewport.removeEventListener('mousemove', handleMouseMove);
    };
  }, [viewportEnabled, showAnnotationTools]);

  // Report errors to parent
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Tool handlers
  const handleToolChange = (tool: string) => {
    setActiveTool(tool as any);
  };

  const handleZoomIn = () => {
    const currentZoom = viewportSettings.zoom;
    updateViewportSettings({ zoom: currentZoom * 1.2 });
  };

  const handleZoomOut = () => {
    const currentZoom = viewportSettings.zoom;
    updateViewportSettings({ zoom: currentZoom / 1.2 });
  };

  const handleRotateLeft = () => {
    const currentRotation = viewportSettings.rotation;
    updateViewportSettings({ rotation: currentRotation - 90 });
  };

  const handleRotateRight = () => {
    const currentRotation = viewportSettings.rotation;
    updateViewportSettings({ rotation: currentRotation + 90 });
  };

  const handleReset = () => {
    resetViewport();
  };

  // Series navigation handlers
  const handleSeriesChange = (seriesIndex: number) => {
    switchToSeries(seriesIndex);
  };

  const handleSeriesLoad = (seriesIndex: number) => {
    if (viewportEnabled) {
      loadSeriesIntoViewport(viewportId, seriesIndex)
        .catch((err) => {
          console.error('Failed to load series:', err);
          onError?.(err.message || 'Failed to load series');
        });
    }
  };

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Erreur du viewer DICOM:</strong> {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading || !isInitialized) {
    return (
      <Card className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Initialisation du viewer DICOM Cornerstone...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Main Viewer */}
      <div className="flex flex-col flex-1 bg-black">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTool === TOOL_NAMES.Pan ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolChange(TOOL_NAMES.Pan)}
              className="text-white hover:bg-gray-700"
            >
              <Eye className="h-4 w-4 mr-1" />
              Pan
            </Button>
            <Button
              variant={activeTool === TOOL_NAMES.Zoom ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToolChange(TOOL_NAMES.Zoom)}
              className="text-white hover:bg-gray-700"
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="text-white hover:bg-gray-700"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="text-white hover:bg-gray-700"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateLeft}
              className="text-white hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRotateRight}
              className="text-white hover:bg-gray-700"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {onNavigateToReport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToReport}
                className="text-white hover:bg-gray-700"
              >
                <FileText className="h-4 w-4 mr-1" />
                Report
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white hover:bg-gray-700"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 relative">
          <div
            ref={viewportRef}
            className="w-full h-full bg-black"
            style={{ minHeight: '400px' }}
          />
          
          {/* Study Info Overlay */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
            <div>Study: {studyInstanceUID.slice(0, 30)}...</div>
            {currentSeries && (
              <>
                <div>Série: {currentSeries.seriesDescription}</div>
                <div>Images: {currentSeries.numberOfImages}</div>
                <div>Modalité: {currentSeries.modality}</div>
              </>
            )}
            <div>Status: {imagesLoaded ? 'Images chargées' : viewportEnabled ? 'Chargement...' : 'En attente'}</div>
            <div>Tool: {activeTool}</div>
            <div>Zoom: {viewportSettings.zoom.toFixed(1)}x</div>
            {showAnnotationTools && annotations.length > 0 && (
              <div>Annotations: {annotations.length}</div>
            )}
          </div>

          {/* Annotations Overlay */}
          {showAnnotationTools && annotations.length > 0 && (
            <div className="absolute inset-0 pointer-events-none">
              {annotations
                .filter(a => a.imageIndex === currentImageIndex)
                .map((annotation) => (
                  <div
                    key={annotation.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: annotation.coordinates.x,
                      top: annotation.coordinates.y,
                      width: annotation.coordinates.width || 'auto',
                      height: annotation.coordinates.height || 'auto'
                    }}
                  >
                    {/* Render annotation based on type */}
                    {annotation.type === 'circle' && (
                      <div className="border-2 border-yellow-400 rounded-full bg-yellow-400 bg-opacity-20" />
                    )}
                    {annotation.type === 'rectangle' && (
                      <div className="border-2 border-blue-400 bg-blue-400 bg-opacity-20" />
                    )}
                    {annotation.type === 'arrow' && (
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                    )}
                    {annotation.type === 'text' && annotation.text && (
                      <div className="bg-black bg-opacity-70 text-white text-xs p-1 rounded">
                        {annotation.text}
                      </div>
                    )}
                    {annotation.type === 'measurement' && annotation.measurement && (
                      <div className="bg-green-600 bg-opacity-70 text-white text-xs p-1 rounded">
                        {annotation.measurement.value}{annotation.measurement.unit}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Placeholder content when no images loaded */}
          {viewportEnabled && !imagesLoaded && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white text-center bg-black bg-opacity-50 p-4 rounded">
                <p className="text-lg mb-2">📊 Viewer DICOM Prêt</p>
                <p className="text-sm text-gray-300">
                  Cornerstone.js initialisé avec succès
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Prêt à charger des images DICOM depuis Orthanc
                </p>
              </div>
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white text-center bg-black bg-opacity-50 p-4 rounded">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-lg">Chargement des images DICOM...</span>
                </div>
                <p className="text-sm text-gray-300">
                  Récupération depuis Orthanc PACS
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
        {/* Series Navigator */}
        {studyInfo && studyInfo.series.length > 1 && (
          <SeriesNavigator
            series={studyInfo.series}
            currentSeriesIndex={currentSeriesIndex}
            onSeriesChange={handleSeriesChange}
            onSeriesLoad={handleSeriesLoad}
            isLoading={isLoading}
            className="m-4 mb-6"
          />
        )}

        {/* Annotation Tools */}
        {showAnnotationTools && (
          <AnnotationTools
            examinationId={examinationId}
            reportId={reportId}
            onNavigateToReport={onNavigateToReport}
            className="p-4"
          />
        )}

        {/* Study Info Panel */}
        {studyInfo && (
          <div className="p-4 border-t border-gray-200">
            <h3 className="text-sm font-medium mb-3">Informations de l'étude</h3>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Séries:</span>
                <span className="font-medium">{studyInfo.series.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Images totales:</span>
                <span className="font-medium">{studyInfo.totalImages}</span>
              </div>
              <div className="flex justify-between">
                <span>Study UID:</span>
                <span className="font-mono text-xs break-all">
                  {studyInfo.studyInstanceUID.slice(-20)}...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Ruler,
  MousePointer,
  Square,
  Circle,
  Type,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  Volume2,
  Settings,
  Download,
  Share2,
  Maximize,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { type Examination } from '@/types';

interface AdvancedDicomViewerProps {
  examination: Examination;
  studyInstanceUID: string;
  onViewportChange?: (viewport: ViewportState) => void;
  onAnnotationAdd?: (annotation: Annotation) => void;
  collaborationMode?: boolean;
  aiAnalysisResults?: any[];
}

interface ViewportState {
  windowLevel: number;
  windowWidth: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  currentFrame: number;
  invert: boolean;
  interpolation: boolean;
  layout: 'single' | 'compare' | 'grid' | 'mpr';
}

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'freehand' | 'text' | 'measurement';
  coordinates: number[];
  text?: string;
  color: string;
  userId: string;
  timestamp: Date;
}

interface DICOMSeries {
  seriesInstanceUID: string;
  seriesDescription: string;
  modality: string;
  frameCount: number;
  images: DICOMImage[];
}

interface DICOMImage {
  sopInstanceUID: string;
  instanceNumber: number;
  imageData: string; // URL or base64
  windowPresets: WindowPreset[];
}

interface WindowPreset {
  name: string;
  windowLevel: number;
  windowWidth: number;
}

export function AdvancedDicomViewer({
  examination,
  studyInstanceUID,
  onViewportChange,
  onAnnotationAdd,
  collaborationMode = false,
  aiAnalysisResults = []
}: AdvancedDicomViewerProps) {
  const [viewport, setViewport] = useState<ViewportState>({
    windowLevel: 40,
    windowWidth: 400,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    rotation: 0,
    currentFrame: 1,
    invert: false,
    interpolation: true,
    layout: 'single'
  });

  const [series, setSeries] = useState<DICOMSeries[]>([]);
  const [currentSeries, setCurrentSeries] = useState<string>('');
  const [activeTool, setActiveTool] = useState<string>('pointer');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<NodeJS.Timeout>();

  // Load DICOM data
  useEffect(() => {
    loadDICOMStudy();
  }, [studyInstanceUID]);

  // Handle viewport changes
  useEffect(() => {
    if (onViewportChange) {
      onViewportChange(viewport);
    }
  }, [viewport, onViewportChange]);

  // Auto-play animation
  useEffect(() => {
    if (isPlaying && currentSeries) {
      const series = getSeries(currentSeries);
      if (series && series.frameCount > 1) {
        animationRef.current = setInterval(() => {
          setViewport(prev => ({
            ...prev,
            currentFrame: prev.currentFrame >= series.frameCount ? 1 : prev.currentFrame + 1
          }));
        }, 100); // 10 FPS
      }
      
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    }
  }, [isPlaying, currentSeries]);

  const loadDICOMStudy = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Simulate loading DICOM series
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSeries = generateMockSeries(examination);
      setSeries(mockSeries);
      
      if (mockSeries.length > 0) {
        setCurrentSeries(mockSeries[0].seriesInstanceUID);
      }
    } catch (error) {
      console.error('Failed to load DICOM study:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studyInstanceUID, examination]);

  const generateMockSeries = (exam: Examination): DICOMSeries[] => {
    const series: DICOMSeries[] = [];
    
    // Generate series based on modality
    if (exam.modality === 'CT') {
      series.push({
        seriesInstanceUID: 'series-1',
        seriesDescription: 'Axial CT',
        modality: 'CT',
        frameCount: 120,
        images: Array.from({ length: 120 }, (_, i) => ({
          sopInstanceUID: `image-${i + 1}`,
          instanceNumber: i + 1,
          imageData: `/api/dicom/instances/image-${i + 1}`,
          windowPresets: [
            { name: 'Soft Tissue', windowLevel: 40, windowWidth: 400 },
            { name: 'Lung', windowLevel: -600, windowWidth: 1600 },
            { name: 'Bone', windowLevel: 300, windowWidth: 1500 },
            { name: 'Brain', windowLevel: 40, windowWidth: 80 }
          ]
        }))
      });

      series.push({
        seriesInstanceUID: 'series-2',
        seriesDescription: 'Coronal CT',
        modality: 'CT',
        frameCount: 80,
        images: Array.from({ length: 80 }, (_, i) => ({
          sopInstanceUID: `coronal-${i + 1}`,
          instanceNumber: i + 1,
          imageData: `/api/dicom/instances/coronal-${i + 1}`,
          windowPresets: [
            { name: 'Soft Tissue', windowLevel: 40, windowWidth: 400 },
            { name: 'Bone', windowLevel: 300, windowWidth: 1500 }
          ]
        }))
      });
    } else if (exam.modality === 'MR') {
      series.push({
        seriesInstanceUID: 'series-1',
        seriesDescription: 'T1 Axial',
        modality: 'MR',
        frameCount: 25,
        images: Array.from({ length: 25 }, (_, i) => ({
          sopInstanceUID: `t1-${i + 1}`,
          instanceNumber: i + 1,
          imageData: `/api/dicom/instances/t1-${i + 1}`,
          windowPresets: [
            { name: 'Default', windowLevel: 500, windowWidth: 1000 }
          ]
        }))
      });

      series.push({
        seriesInstanceUID: 'series-2',
        seriesDescription: 'T2 Axial',
        modality: 'MR',
        frameCount: 25,
        images: Array.from({ length: 25 }, (_, i) => ({
          sopInstanceUID: `t2-${i + 1}`,
          instanceNumber: i + 1,
          imageData: `/api/dicom/instances/t2-${i + 1}`,
          windowPresets: [
            { name: 'Default', windowLevel: 500, windowWidth: 1000 }
          ]
        }))
      });
    } else {
      // Single frame modalities (CR, DX, etc.)
      series.push({
        seriesInstanceUID: 'series-1',
        seriesDescription: `${exam.modality} Image`,
        modality: exam.modality,
        frameCount: 1,
        images: [{
          sopInstanceUID: 'image-1',
          instanceNumber: 1,
          imageData: `/api/dicom/instances/image-1`,
          windowPresets: [
            { name: 'Default', windowLevel: 2048, windowWidth: 4096 }
          ]
        }]
      });
    }
    
    return series;
  };

  const getSeries = (seriesUID: string): DICOMSeries | undefined => {
    return series.find(s => s.seriesInstanceUID === seriesUID);
  };

  const handleToolChange = useCallback((tool: string) => {
    setActiveTool(tool);
  }, []);

  const handleWindowLevelChange = useCallback((values: number[]) => {
    setViewport(prev => ({
      ...prev,
      windowLevel: values[0]
    }));
  }, []);

  const handleWindowWidthChange = useCallback((values: number[]) => {
    setViewport(prev => ({
      ...prev,
      windowWidth: values[0]
    }));
  }, []);

  const handleZoomChange = useCallback((values: number[]) => {
    setViewport(prev => ({
      ...prev,
      zoom: values[0]
    }));
  }, []);

  const resetViewport = useCallback(() => {
    setViewport({
      windowLevel: 40,
      windowWidth: 400,
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      rotation: 0,
      currentFrame: 1,
      invert: false,
      interpolation: true,
      layout: 'single'
    });
  }, []);

  const applyWindowPreset = useCallback((preset: WindowPreset) => {
    setViewport(prev => ({
      ...prev,
      windowLevel: preset.windowLevel,
      windowWidth: preset.windowWidth
    }));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const toggleAnimation = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const nextFrame = useCallback(() => {
    const series = getSeries(currentSeries);
    if (series) {
      setViewport(prev => ({
        ...prev,
        currentFrame: prev.currentFrame >= series.frameCount ? 1 : prev.currentFrame + 1
      }));
    }
  }, [currentSeries]);

  const previousFrame = useCallback(() => {
    const series = getSeries(currentSeries);
    if (series) {
      setViewport(prev => ({
        ...prev,
        currentFrame: prev.currentFrame <= 1 ? series.frameCount : prev.currentFrame - 1
      }));
    }
  }, [currentSeries]);

  const exportImage = useCallback(() => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${examination.examType}_frame_${viewport.currentFrame}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  }, [examination.examType, viewport.currentFrame]);

  if (isLoading) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading DICOM study...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSeriesData = getSeries(currentSeries);
  const windowPresets = currentSeriesData?.images[0]?.windowPresets || [];

  return (
    <div className="space-y-4" ref={viewerRef}>
      {/* Viewer Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Advanced DICOM Viewer</CardTitle>
                <p className="text-sm text-gray-600">
                  {examination.examType} - {examination.modality}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {collaborationMode && (
                <Badge variant="secondary">
                  <Eye className="w-3 h-3 mr-1" />
                  Collaborative
                </Badge>
              )}
              
              <Button size="sm" variant="outline" onClick={exportImage}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button size="sm" variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-12 gap-4">
        {/* Tools Panel */}
        <div className="col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'pointer', icon: MousePointer, label: 'Pointer' },
                  { id: 'pan', icon: Move, label: 'Pan' },
                  { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
                  { id: 'rotate', icon: RotateCw, label: 'Rotate' },
                  { id: 'measure', icon: Ruler, label: 'Measure' },
                  { id: 'rectangle', icon: Square, label: 'Rectangle' },
                  { id: 'circle', icon: Circle, label: 'Circle' },
                  { id: 'text', icon: Type, label: 'Text' }
                ].map(tool => (
                  <Button
                    key={tool.id}
                    size="sm"
                    variant={activeTool === tool.id ? 'default' : 'outline'}
                    onClick={() => handleToolChange(tool.id)}
                    className="p-2"
                  >
                    <tool.icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>
              
              <div className="pt-2 border-t">
                <Button size="sm" variant="outline" onClick={resetViewport} className="w-full">
                  Reset View
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Window/Level Controls */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Window/Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Window Presets */}
              {windowPresets.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">Presets:</label>
                  {windowPresets.map(preset => (
                    <Button
                      key={preset.name}
                      size="sm"
                      variant="outline"
                      onClick={() => applyWindowPreset(preset)}
                      className="w-full text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium">Level: {viewport.windowLevel}</label>
                  <Slider
                    value={[viewport.windowLevel]}
                    onValueChange={handleWindowLevelChange}
                    min={-1024}
                    max={3071}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium">Width: {viewport.windowWidth}</label>
                  <Slider
                    value={[viewport.windowWidth]}
                    onValueChange={handleWindowWidthChange}
                    min={1}
                    max={4096}
                    step={1}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium">Zoom: {viewport.zoom.toFixed(1)}x</label>
                  <Slider
                    value={[viewport.zoom]}
                    onValueChange={handleZoomChange}
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Invert</label>
                  <Switch
                    checked={viewport.invert}
                    onCheckedChange={(checked) => 
                      setViewport(prev => ({ ...prev, invert: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Interpolation</label>
                  <Switch
                    checked={viewport.interpolation}
                    onCheckedChange={(checked) => 
                      setViewport(prev => ({ ...prev, interpolation: checked }))
                    }
                  />
                </div>
                
                {aiAnalysisResults.length > 0 && (
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">AI Overlay</label>
                    <Switch
                      checked={showAIOverlay}
                      onCheckedChange={setShowAIOverlay}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Viewer */}
        <div className="col-span-8">
          <Card className="h-96">
            <CardContent className="p-0 h-full">
              <div className="relative h-full bg-black rounded overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  style={{
                    filter: viewport.invert ? 'invert(1)' : 'none',
                    imageRendering: viewport.interpolation ? 'auto' : 'pixelated',
                    transform: `rotate(${viewport.rotation}deg) scale(${viewport.zoom}) translate(${viewport.pan.x}px, ${viewport.pan.y}px)`
                  }}
                />
                
                {/* AI Overlay */}
                {showAIOverlay && aiAnalysisResults.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {aiAnalysisResults.map((result, index) => (
                      <div
                        key={index}
                        className="absolute border-2 border-red-500 bg-red-500 bg-opacity-20"
                        style={{
                          left: '30%',
                          top: '40%',
                          width: '20%',
                          height: '15%'
                        }}
                      >
                        <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded">
                          AI: {result.description || 'Finding detected'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Frame Info */}
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                  Frame {viewport.currentFrame} / {currentSeriesData?.frameCount || 1}
                </div>
                
                {/* Patient Info */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                  {examination.patient.firstName} {examination.patient.lastName}
                </div>
                
                {/* Image Info */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  WL: {viewport.windowLevel} | WW: {viewport.windowWidth} | Zoom: {viewport.zoom.toFixed(1)}x
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frame Controls */}
          {currentSeriesData && currentSeriesData.frameCount > 1 && (
            <Card className="mt-4">
              <CardContent className="flex items-center justify-center space-x-4 py-3">
                <Button size="sm" variant="outline" onClick={previousFrame}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                
                <Button size="sm" variant="outline" onClick={toggleAnimation}>
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button size="sm" variant="outline" onClick={nextFrame}>
                  <SkipForward className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 max-w-md">
                  <Slider
                    value={[viewport.currentFrame]}
                    onValueChange={(values) => 
                      setViewport(prev => ({ ...prev, currentFrame: values[0] }))
                    }
                    min={1}
                    max={currentSeriesData.frameCount}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Series/Info Panel */}
        <div className="col-span-2">
          <Tabs defaultValue="series" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="series">
                <Layers className="w-4 h-4 mr-1" />
                Series
              </TabsTrigger>
              <TabsTrigger value="info">
                <Settings className="w-4 h-4 mr-1" />
                Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="series">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Series ({series.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {series.map(s => (
                    <div
                      key={s.seriesInstanceUID}
                      className={`p-2 border rounded cursor-pointer text-xs ${
                        currentSeries === s.seriesInstanceUID
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCurrentSeries(s.seriesInstanceUID)}
                    >
                      <div className="font-medium">{s.seriesDescription}</div>
                      <div className="text-gray-500">
                        {s.modality} • {s.frameCount} images
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Study Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Patient:</span><br />
                    {examination.patient.firstName} {examination.patient.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Study Date:</span><br />
                    {new Date(examination.scheduledDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Modality:</span><br />
                    {examination.modality}
                  </div>
                  <div>
                    <span className="font-medium">Body Part:</span><br />
                    {examination.bodyPart}
                  </div>
                  <div>
                    <span className="font-medium">Study UID:</span><br />
                    <span className="font-mono text-xs break-all">
                      {studyInstanceUID}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
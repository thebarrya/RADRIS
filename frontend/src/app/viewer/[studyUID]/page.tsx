'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CornerstoneViewer } from '@/components/examinations/CornerstoneViewer';
import { MeasurementsPanel, Measurement } from '@/components/examinations/MeasurementsPanel';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

export default function ViewerPage() {
  const params = useParams();
  const router = useRouter();
  const studyUID = params.studyUID as string;
  
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);

  // Mock measurements for demo
  React.useEffect(() => {
    const mockMeasurements: Measurement[] = [
      {
        id: '1',
        type: 'length',
        value: 45.2,
        unit: 'mm',
        label: 'Diamètre aortique',
        description: 'Mesure du diamètre de l\'aorte ascendante',
        visible: true,
        color: '#ff0000',
        createdAt: new Date(),
      },
      {
        id: '2',
        type: 'angle',
        value: 127.5,
        unit: '°',
        label: 'Angle coxo-fémoral',
        visible: true,
        color: '#00ff00',
        createdAt: new Date(),
      },
      {
        id: '3',
        type: 'rectangle',
        value: 234.8,
        unit: 'mm',
        label: 'Surface hépatique',
        description: 'ROI sur le segment VII du foie',
        visible: true,
        color: '#0000ff',
        createdAt: new Date(),
      },
    ];
    
    setMeasurements(mockMeasurements);
  }, []);

  const handleMeasurementUpdate = (id: string, updates: Partial<Measurement>) => {
    setMeasurements(prev => 
      prev.map(m => m.id === id ? { ...m, ...updates } : m)
    );
  };

  const handleMeasurementDelete = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  const handleMeasurementToggleVisibility = (id: string) => {
    setMeasurements(prev =>
      prev.map(m => m.id === id ? { ...m, visible: !m.visible } : m)
    );
  };

  const handleExportMeasurements = () => {
    const data = JSON.stringify(measurements, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `measurements-${studyUID}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllMeasurements = () => {
    setMeasurements([]);
  };

  const handleViewerError = (error: string) => {
    console.error('Viewer error:', error);
    // TODO: Show user-friendly error message
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div className={`h-screen flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Viewer DICOM</h1>
                <p className="text-sm text-muted-foreground">
                  Study: {studyUID.slice(0, 20)}...
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMeasurements(!showMeasurements)}
              >
                {showMeasurements ? 'Masquer' : 'Afficher'} mesures
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Viewer */}
        <div className="flex-1">
          <CornerstoneViewer
            studyInstanceUID={studyUID}
            examinationId={studyUID} // Use studyUID as examination ID for standalone viewer
            onError={handleViewerError}
            className="h-full"
          />
        </div>

        {/* Measurements Panel */}
        {showMeasurements && !isFullscreen && (
          <div className="border-l">
            <MeasurementsPanel
              measurements={measurements}
              onMeasurementUpdate={handleMeasurementUpdate}
              onMeasurementDelete={handleMeasurementDelete}
              onMeasurementToggleVisibility={handleMeasurementToggleVisibility}
              onExportMeasurements={handleExportMeasurements}
              onClearAllMeasurements={handleClearAllMeasurements}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* Fullscreen Exit */}
      {isFullscreen && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-black text-white border-white hover:bg-gray-800"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
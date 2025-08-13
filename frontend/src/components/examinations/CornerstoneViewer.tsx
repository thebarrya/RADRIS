'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Eye, ZoomIn, ZoomOut, RotateCcw, RotateCw } from 'lucide-react';

interface CornerstoneViewerProps {
  studyInstanceUID: string;
  onError?: (error: string) => void;
  className?: string;
}

export function CornerstoneViewer({ 
  studyInstanceUID, 
  onError,
  className = '' 
}: CornerstoneViewerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Cornerstone when component mounts
  useEffect(() => {
    const initializeCornerstone = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        const cornerstone = await import('@cornerstonejs/core');
        const cornerstoneWADOImageLoader = await import('@cornerstonejs/dicom-image-loader');
        
        // Initialize Cornerstone
        await cornerstone.init();
        
        // Configure WADO Image Loader
        const { wadouri } = cornerstoneWADOImageLoader;
        
        // Configure the image loader
        wadouri.configure({
          beforeSend: (xhr: XMLHttpRequest) => {
            // Add any authentication headers if needed
            xhr.setRequestHeader('Accept', 'application/dicom, image/jpeg, image/png, */*');
          }
        });

        // Register the WADO URI image loader
        cornerstone.imageLoadPoolManager.maxNumRequests = {
          interaction: 1000,
          thumbnail: 1000,
          prefetch: 200
        };

        setIsInitialized(true);
        
        if (viewportRef.current) {
          await loadStudyImages(cornerstone);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Cornerstone viewer';
        console.error('Cornerstone initialization error:', err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCornerstone();

    // Cleanup function
    return () => {
      // Cleanup Cornerstone resources if needed
    };
  }, [studyInstanceUID, onError]);

  const loadStudyImages = async (cornerstone: any) => {
    try {
      if (!viewportRef.current) return;

      const element = viewportRef.current;
      
      // Enable the element for Cornerstone
      cornerstone.enable(element);

      // For now, create a placeholder image since we need to integrate with DICOMweb properly
      // In a real implementation, you would:
      // 1. Fetch study metadata from WADO-RS
      // 2. Get image URLs for each instance
      // 3. Load images using cornerstone.loadImage()
      
      // Placeholder implementation
      const canvas = element.querySelector('canvas') || document.createElement('canvas');
      if (!element.querySelector('canvas')) {
        canvas.width = element.clientWidth || 512;
        canvas.height = element.clientHeight || 512;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        element.appendChild(canvas);
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw a placeholder
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#666';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DICOM Viewer', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`Study: ${studyInstanceUID.slice(0, 20)}...`, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillText('Cornerstone.js intégré', canvas.width / 2, canvas.height / 2 + 40);
      }

    } catch (err) {
      console.error('Failed to load study images:', err);
      throw err;
    }
  };

  const handleZoomIn = () => {
    console.log('Zoom in');
    // TODO: Implement zoom functionality
  };

  const handleZoomOut = () => {
    console.log('Zoom out');
    // TODO: Implement zoom functionality
  };

  const handleRotateLeft = () => {
    console.log('Rotate left');
    // TODO: Implement rotate functionality
  };

  const handleRotateRight = () => {
    console.log('Rotate right');
    // TODO: Implement rotate functionality
  };

  const handleReset = () => {
    console.log('Reset view');
    // TODO: Implement reset functionality
  };

  if (error) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erreur du viewer DICOM: {error}
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Retry initialization
              }}
            >
              Réessayer
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

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
    <div className={`flex flex-col h-full bg-black ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
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
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="text-white hover:bg-gray-700"
        >
          Reset
        </Button>
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
          <div>Status: Viewer intégré actif</div>
        </div>
      </div>
    </div>
  );
}
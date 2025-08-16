'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Image, Play } from 'lucide-react';
import { SeriesInfo } from '@/lib/cornerstone';

interface SeriesNavigatorProps {
  series: SeriesInfo[];
  currentSeriesIndex: number;
  onSeriesChange: (seriesIndex: number) => void;
  onSeriesLoad: (seriesIndex: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function SeriesNavigator({
  series,
  currentSeriesIndex,
  onSeriesChange,
  onSeriesLoad,
  isLoading = false,
  className = ''
}: SeriesNavigatorProps) {
  const currentSeries = series[currentSeriesIndex];

  const handlePreviousSeries = () => {
    if (currentSeriesIndex > 0) {
      const newIndex = currentSeriesIndex - 1;
      onSeriesChange(newIndex);
      onSeriesLoad(newIndex);
    }
  };

  const handleNextSeries = () => {
    if (currentSeriesIndex < series.length - 1) {
      const newIndex = currentSeriesIndex + 1;
      onSeriesChange(newIndex);
      onSeriesLoad(newIndex);
    }
  };

  const handleSeriesSelect = (seriesIndex: number) => {
    if (seriesIndex !== currentSeriesIndex) {
      onSeriesChange(seriesIndex);
      onSeriesLoad(seriesIndex);
    }
  };

  if (series.length === 0) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-4">
          <p className="text-sm text-gray-500">Aucune série disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Navigation des Séries ({series.length})
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {currentSeriesIndex + 1} / {series.length}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {/* Current Series Info */}
        {currentSeries && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Image className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-sm text-blue-900">
                Série {currentSeries.seriesNumber}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {currentSeries.modality}
              </Badge>
            </div>
            <p className="text-sm text-blue-800 mb-1">
              {currentSeries.seriesDescription}
            </p>
            <p className="text-xs text-blue-600">
              {currentSeries.numberOfImages} image{currentSeries.numberOfImages > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousSeries}
            disabled={currentSeriesIndex === 0 || isLoading}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédente
          </Button>
          
          <span className="text-sm text-gray-600">
            Série {currentSeriesIndex + 1} sur {series.length}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextSeries}
            disabled={currentSeriesIndex === series.length - 1 || isLoading}
            className="flex items-center gap-1"
          >
            Suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Series List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {series.map((seriesInfo, index) => (
            <div
              key={seriesInfo.seriesInstanceUID}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                index === currentSeriesIndex
                  ? 'bg-blue-100 border-blue-300'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleSeriesSelect(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      Série {seriesInfo.seriesNumber}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {seriesInfo.modality}
                    </Badge>
                    {index === currentSeriesIndex && (
                      <Play className="h-3 w-3 text-blue-600 fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {seriesInfo.seriesDescription}
                  </p>
                  <p className="text-xs text-gray-500">
                    {seriesInfo.numberOfImages} image{seriesInfo.numberOfImages > 1 ? 's' : ''}
                  </p>
                </div>
                
                {isLoading && index === currentSeriesIndex && (
                  <div className="ml-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Series Summary */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Total des séries:</span>
              <span className="font-medium">{series.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total des images:</span>
              <span className="font-medium">
                {series.reduce((sum, s) => sum + s.numberOfImages, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Modalités:</span>
              <span className="font-medium">
                {Array.from(new Set(series.map(s => s.modality))).join(', ')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
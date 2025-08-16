'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ruler, Calculator, Trash2, Save, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewerReportsIntegration, ImageAnnotation } from '@/services/viewerReportsIntegration';

interface MeasurementToolsProps {
  examinationId: string;
  reportId?: string;
  className?: string;
}

interface MeasurementData {
  id: string;
  type: 'length' | 'angle' | 'area';
  value: number;
  unit: 'mm' | 'cm' | 'pixels' | 'degree' | 'mm²' | 'cm²';
  label?: string;
  annotation: ImageAnnotation;
}

export function MeasurementTools({ examinationId, reportId, className }: MeasurementToolsProps) {
  const { getAnnotations, createMeasurement, service } = useViewerReportsIntegration();
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementData | null>(null);
  const [measurementLabel, setMeasurementLabel] = useState('');

  // Get all measurement annotations
  React.useEffect(() => {
    const measurementAnnotations = getAnnotations().filter(a => a.type === 'measurement' && a.measurement);
    const measurementData: MeasurementData[] = measurementAnnotations.map(annotation => ({
      id: annotation.id,
      type: annotation.measurement!.type,
      value: annotation.measurement!.value,
      unit: annotation.measurement!.unit,
      label: annotation.text,
      annotation
    }));
    setMeasurements(measurementData);
  }, [getAnnotations]);

  // Listen for new measurements
  React.useEffect(() => {
    const handleMeasurementCreated = (annotation: ImageAnnotation) => {
      if (annotation.type === 'measurement' && annotation.measurement) {
        const measurementData: MeasurementData = {
          id: annotation.id,
          type: annotation.measurement.type,
          value: annotation.measurement.value,
          unit: annotation.measurement.unit,
          label: annotation.text,
          annotation
        };
        setMeasurements(prev => [...prev, measurementData]);
      }
    };

    service.on('annotation-created', handleMeasurementCreated);
    return () => {
      service.off('annotation-created', handleMeasurementCreated);
    };
  }, [service]);

  // Calculate derived measurements
  const calculateDerivedMeasurements = () => {
    const lengths = measurements.filter(m => m.type === 'length');
    const areas = measurements.filter(m => m.type === 'area');
    
    return {
      totalLength: lengths.reduce((sum, m) => {
        // Convert to mm for consistency
        const valueInMm = m.unit === 'cm' ? m.value * 10 : m.value;
        return sum + valueInMm;
      }, 0),
      totalArea: areas.reduce((sum, m) => {
        // Convert to mm² for consistency
        const valueInMm2 = m.unit === 'cm²' ? m.value * 100 : m.value;
        return sum + valueInMm2;
      }, 0),
      averageLength: lengths.length > 0 ? lengths.reduce((sum, m) => {
        const valueInMm = m.unit === 'cm' ? m.value * 10 : m.value;
        return sum + valueInMm;
      }, 0) / lengths.length : 0
    };
  };

  const derived = calculateDerivedMeasurements();

  // Format measurement value
  const formatValue = (value: number, unit: string, precision = 2) => {
    return `${value.toFixed(precision)} ${unit}`;
  };

  // Handle measurement selection
  const handleMeasurementSelect = (measurement: MeasurementData) => {
    setSelectedMeasurement(measurement);
    setMeasurementLabel(measurement.label || '');
  };

  // Update measurement label
  const handleUpdateLabel = () => {
    if (!selectedMeasurement) return;

    service.updateAnnotation(selectedMeasurement.id, {
      text: measurementLabel
    });

    setMeasurements(prev => prev.map(m => 
      m.id === selectedMeasurement.id 
        ? { ...m, label: measurementLabel }
        : m
    ));

    setSelectedMeasurement(null);
    setMeasurementLabel('');
  };

  // Delete measurement
  const handleDeleteMeasurement = (measurementId: string) => {
    service.deleteAnnotation(measurementId);
    setMeasurements(prev => prev.filter(m => m.id !== measurementId));
    if (selectedMeasurement?.id === measurementId) {
      setSelectedMeasurement(null);
    }
  };

  // Copy measurements to clipboard
  const handleCopyMeasurements = () => {
    const measurementText = measurements.map(m => 
      `${m.label || 'Measurement'}: ${formatValue(m.value, m.unit)}`
    ).join('\n');
    
    navigator.clipboard.writeText(measurementText);
  };

  // Generate measurement report
  const generateMeasurementReport = () => {
    const report = [
      '## Measurements Report',
      '',
      '### Individual Measurements',
      ...measurements.map(m => 
        `- **${m.label || 'Measurement'}**: ${formatValue(m.value, m.unit)} (${m.type})`
      ),
      '',
      '### Summary Statistics',
      `- Total Length: ${formatValue(derived.totalLength, 'mm')}`,
      `- Total Area: ${formatValue(derived.totalArea, 'mm²')}`,
      `- Average Length: ${formatValue(derived.averageLength, 'mm')}`,
      `- Number of Measurements: ${measurements.length}`,
      '',
      `*Generated on ${new Date().toLocaleString()}*`
    ].join('\n');

    return report;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Measurement Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Measurements ({measurements.length})
            </div>
            {measurements.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyMeasurements}
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {measurements.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No measurements yet. Use the measurement tool to add measurements.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Summary Statistics */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-md">
                <div>
                  <p className="text-xs font-medium text-gray-500">Total Length</p>
                  <p className="text-sm font-mono">{formatValue(derived.totalLength, 'mm')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Total Area</p>
                  <p className="text-sm font-mono">{formatValue(derived.totalArea, 'mm²')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Average Length</p>
                  <p className="text-sm font-mono">{formatValue(derived.averageLength, 'mm')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Count</p>
                  <p className="text-sm font-mono">{measurements.length}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Measurements */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Individual Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {measurements.map((measurement) => (
                <div
                  key={measurement.id}
                  onClick={() => handleMeasurementSelect(measurement)}
                  className={cn(
                    "p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedMeasurement?.id === measurement.id && "border-blue-500 bg-blue-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {measurement.type}
                      </Badge>
                      <span className="text-sm font-mono">
                        {formatValue(measurement.value, measurement.unit)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-500">
                        Image {measurement.annotation.imageIndex + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMeasurement(measurement.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {measurement.label && (
                    <p className="text-sm text-gray-700 mt-1">
                      {measurement.label}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurement Editor */}
      {selectedMeasurement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Edit Measurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="measurement-label">Label</Label>
              <Input
                id="measurement-label"
                value={measurementLabel}
                onChange={(e) => setMeasurementLabel(e.target.value)}
                placeholder="Describe this measurement..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-gray-500">Type</Label>
                <p className="text-sm">{selectedMeasurement.type}</p>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-500">Value</Label>
                <p className="text-sm font-mono">
                  {formatValue(selectedMeasurement.value, selectedMeasurement.unit)}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMeasurement(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateLabel}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const report = generateMeasurementReport();
                  navigator.clipboard.writeText(report);
                }}
                className="w-full"
              >
                Copy Full Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add measurements to report findings
                  const measurementText = measurements.map(m => 
                    `${m.label || 'Measurement'}: ${formatValue(m.value, m.unit)}`
                  ).join('; ');
                  
                  service.emit('add-to-report-findings', {
                    text: `Measurements: ${measurementText}`,
                    measurements: measurements
                  });
                }}
                className="w-full"
              >
                Add to Report Findings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MeasurementTools;
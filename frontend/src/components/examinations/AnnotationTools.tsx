'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MousePointer, 
  Circle, 
  Square, 
  ArrowRight, 
  Type, 
  Ruler, 
  Trash2, 
  Save, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewerReportsIntegration, ImageAnnotation, ReportFinding } from '@/services/viewerReportsIntegration';

interface AnnotationToolsProps {
  examinationId: string;
  reportId?: string;
  onAnnotationCreated?: (annotation: ImageAnnotation) => void;
  onNavigateToReport?: () => void;
  className?: string;
}

type AnnotationTool = 'select' | 'arrow' | 'circle' | 'rectangle' | 'text' | 'measurement';

export function AnnotationTools({ 
  examinationId, 
  reportId, 
  onAnnotationCreated,
  onNavigateToReport,
  className 
}: AnnotationToolsProps) {
  const { 
    service,
    createAnnotation, 
    createMeasurement,
    linkAnnotationToFinding,
    getAnnotations,
    getFindings,
    navigateToReport
  } = useViewerReportsIntegration();

  const [activeTool, setActiveTool] = useState<AnnotationTool>('select');
  const [selectedAnnotation, setSelectedAnnotation] = useState<ImageAnnotation | null>(null);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [reportSection, setReportSection] = useState<ReportFinding['section']>('findings');

  // Tool configurations
  const tools = [
    { id: 'select', label: 'Select', icon: MousePointer, color: 'text-gray-600' },
    { id: 'arrow', label: 'Arrow', icon: ArrowRight, color: 'text-blue-600' },
    { id: 'circle', label: 'Circle', icon: Circle, color: 'text-green-600' },
    { id: 'rectangle', label: 'Rectangle', icon: Square, color: 'text-purple-600' },
    { id: 'text', label: 'Text', icon: Type, color: 'text-orange-600' },
    { id: 'measurement', label: 'Measure', icon: Ruler, color: 'text-red-600' }
  ] as const;

  // Initialize integration service
  React.useEffect(() => {
    service.initialize(examinationId, reportId);
    
    // Listen for annotation updates
    const handleAnnotationCreated = (annotation: ImageAnnotation) => {
      setAnnotations(prev => [...prev, annotation]);
      onAnnotationCreated?.(annotation);
    };

    const handleAnnotationUpdated = (annotation: ImageAnnotation) => {
      setAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
    };

    const handleAnnotationDeleted = ({ id }: { id: string }) => {
      setAnnotations(prev => prev.filter(a => a.id !== id));
      if (selectedAnnotation?.id === id) {
        setSelectedAnnotation(null);
      }
    };

    service.on('annotation-created', handleAnnotationCreated);
    service.on('annotation-updated', handleAnnotationUpdated);
    service.on('annotation-deleted', handleAnnotationDeleted);

    // Load existing annotations
    setAnnotations(getAnnotations());

    return () => {
      service.off('annotation-created', handleAnnotationCreated);
      service.off('annotation-updated', handleAnnotationUpdated);
      service.off('annotation-deleted', handleAnnotationDeleted);
    };
  }, [examinationId, reportId, service, getAnnotations, onAnnotationCreated]);

  // Handle tool selection
  const handleToolSelect = (tool: AnnotationTool) => {
    setActiveTool(tool);
    setSelectedAnnotation(null);
  };

  // Handle annotation creation (called from viewer)
  const handleCreateAnnotation = useCallback((coordinates: ImageAnnotation['coordinates'], imageIndex: number, seriesInstanceUID: string, sopInstanceUID: string) => {
    if (activeTool === 'select') return;

    const annotation = createAnnotation({
      examinationId,
      reportId,
      type: activeTool as Exclude<AnnotationTool, 'select'>,
      coordinates,
      imageIndex,
      seriesInstanceUID,
      sopInstanceUID,
      text: activeTool === 'text' ? 'New annotation' : undefined
    });

    setSelectedAnnotation(annotation);
    setActiveTool('select');
  }, [activeTool, examinationId, reportId, createAnnotation]);

  // Handle measurement creation
  const handleCreateMeasurement = useCallback((coordinates: ImageAnnotation['coordinates'], imageIndex: number, seriesInstanceUID: string, sopInstanceUID: string, measurement: NonNullable<ImageAnnotation['measurement']>) => {
    const annotation = createMeasurement({
      examinationId,
      reportId,
      coordinates,
      imageIndex,
      seriesInstanceUID,
      sopInstanceUID,
      measurement
    });

    setSelectedAnnotation(annotation);
  }, [examinationId, reportId, createMeasurement]);

  // Handle annotation selection
  const handleAnnotationSelect = (annotation: ImageAnnotation) => {
    setSelectedAnnotation(annotation);
    setNewAnnotationText(annotation.text || '');
    setReportSection(annotation.reportSection || 'findings');
  };

  // Save annotation text and link to report
  const handleSaveAnnotationText = () => {
    if (!selectedAnnotation || !newAnnotationText.trim()) return;

    // Link to report finding
    linkAnnotationToFinding(selectedAnnotation.id, newAnnotationText, reportSection);
    
    setNewAnnotationText('');
    setSelectedAnnotation(null);
  };

  // Navigate to report
  const handleNavigateToReport = () => {
    if (onNavigateToReport) {
      onNavigateToReport();
    } else {
      navigateToReport(reportId);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tool Palette */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center">
            <MousePointer className="h-4 w-4 mr-2" />
            Annotation Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolSelect(tool.id as AnnotationTool)}
                  className={cn(
                    "flex flex-col items-center p-2 h-auto",
                    activeTool === tool.id && "border-blue-500 bg-blue-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1", tool.color)} />
                  <span className="text-xs">{tool.label}</span>
                </Button>
              );
            })}
          </div>
          
          <Separator className="my-3" />
          
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className="flex items-center"
            >
              {showAnnotations ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {showAnnotations ? 'Hide' : 'Show'} Annotations
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavigateToReport}
              className="flex items-center"
            >
              <FileText className="h-4 w-4 mr-1" />
              Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Annotation List */}
      {showAnnotations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Annotations ({annotations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {annotations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No annotations yet. Use the tools above to add annotations.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    onClick={() => handleAnnotationSelect(annotation)}
                    className={cn(
                      "p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedAnnotation?.id === annotation.id && "border-blue-500 bg-blue-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {annotation.type}
                        </Badge>
                        {annotation.measurement && (
                          <Badge variant="secondary" className="text-xs">
                            {annotation.measurement.value}{annotation.measurement.unit}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Image {annotation.imageIndex + 1}
                      </span>
                    </div>
                    {annotation.text && (
                      <p className="text-sm text-gray-700 mt-1 truncate">
                        {annotation.text}
                      </p>
                    )}
                    {annotation.reportSection && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {annotation.reportSection}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Annotation Editor */}
      {selectedAnnotation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              Edit Annotation
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Delete annotation
                  service.deleteAnnotation(selectedAnnotation.id);
                }}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="annotation-text">Annotation Text</Label>
              <Textarea
                id="annotation-text"
                value={newAnnotationText}
                onChange={(e) => setNewAnnotationText(e.target.value)}
                placeholder="Describe this finding..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="report-section">Link to Report Section</Label>
              <Select value={reportSection} onValueChange={(value: ReportFinding['section']) => setReportSection(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="findings">Findings</SelectItem>
                  <SelectItem value="impression">Impression</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAnnotation.type === 'measurement' && selectedAnnotation.measurement && (
              <div className="p-3 bg-gray-50 rounded-md">
                <Label className="text-sm font-medium">Measurement</Label>
                <p className="text-sm text-gray-700">
                  {selectedAnnotation.measurement.type}: {selectedAnnotation.measurement.value} {selectedAnnotation.measurement.unit}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAnnotation(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAnnotationText}
                disabled={!newAnnotationText.trim()}
              >
                <Save className="h-4 w-4 mr-1" />
                Save to Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Tool Indicator */}
      {activeTool !== 'select' && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-md shadow-lg">
          <div className="flex items-center space-x-2">
            {(() => {
              const tool = tools.find(t => t.id === activeTool);
              const Icon = tool?.icon || MousePointer;
              return <Icon className="h-4 w-4" />;
            })()}
            <span className="text-sm font-medium">
              {activeTool === 'arrow' && 'Click to place arrow'}
              {activeTool === 'circle' && 'Drag to draw circle'}
              {activeTool === 'rectangle' && 'Drag to draw rectangle'}
              {activeTool === 'text' && 'Click to add text'}
              {activeTool === 'measurement' && 'Drag to measure distance'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnotationTools;
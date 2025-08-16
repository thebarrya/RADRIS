'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Ruler, 
  Triangle, 
  Square, 
  Circle, 
  Trash2, 
  Eye, 
  EyeOff, 
  Edit3, 
  Save, 
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export interface Measurement {
  id: string;
  type: 'length' | 'angle' | 'rectangle' | 'ellipse';
  value: number;
  unit: string;
  label?: string;
  description?: string;
  visible: boolean;
  color: string;
  createdAt: Date;
  coordinates?: any; // Tool-specific coordinates
}

interface MeasurementsPanelProps {
  measurements: Measurement[];
  onMeasurementUpdate: (id: string, updates: Partial<Measurement>) => void;
  onMeasurementDelete: (id: string) => void;
  onMeasurementToggleVisibility: (id: string) => void;
  onExportMeasurements: () => void;
  onClearAllMeasurements: () => void;
  className?: string;
}

const MEASUREMENT_ICONS = {
  length: Ruler,
  angle: Triangle,
  rectangle: Square,
  ellipse: Circle,
};

const MEASUREMENT_COLORS = [
  '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
  '#ff00ff', '#00ffff', '#ffa500', '#800080'
];

export function MeasurementsPanel({
  measurements,
  onMeasurementUpdate,
  onMeasurementDelete,
  onMeasurementToggleVisibility,
  onExportMeasurements,
  onClearAllMeasurements,
  className = ''
}: MeasurementsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const handleStartEdit = (measurement: Measurement) => {
    setEditingId(measurement.id);
    setEditLabel(measurement.label || '');
    setEditDescription(measurement.description || '');
  };

  const handleSaveEdit = () => {
    if (editingId) {
      onMeasurementUpdate(editingId, {
        label: editLabel,
        description: editDescription,
      });
      setEditingId(null);
      setEditLabel('');
      setEditDescription('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditDescription('');
  };

  const formatValue = (measurement: Measurement) => {
    switch (measurement.type) {
      case 'length':
        return `${measurement.value.toFixed(2)} ${measurement.unit}`;
      case 'angle':
        return `${measurement.value.toFixed(1)}°`;
      case 'rectangle':
      case 'ellipse':
        return `${measurement.value.toFixed(2)} ${measurement.unit}²`;
      default:
        return `${measurement.value.toFixed(2)}`;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'length': return 'Longueur';
      case 'angle': return 'Angle';
      case 'rectangle': return 'Rectangle';
      case 'ellipse': return 'Ellipse';
      default: return type;
    }
  };

  if (collapsed) {
    return (
      <Card className={`w-64 ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Mesures ({measurements.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(false)}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={`w-80 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="h-4 w-4" />
            Mesures et Annotations
            <Badge variant="secondary" className="text-xs">
              {measurements.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(true)}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportMeasurements}
            className="flex-1 text-xs"
            disabled={measurements.length === 0}
          >
            Exporter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAllMeasurements}
            className="flex-1 text-xs"
            disabled={measurements.length === 0}
          >
            Effacer tout
          </Button>
        </div>

        <Separator />

        {/* Measurements List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {measurements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Ruler className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucune mesure
              </div>
            ) : (
              measurements.map((measurement) => {
                const Icon = MEASUREMENT_ICONS[measurement.type];
                const isEditing = editingId === measurement.id;

                return (
                  <Card key={measurement.id} className="p-3">
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon 
                            className="h-4 w-4" 
                            style={{ color: measurement.color }}
                          />
                          <span className="text-sm font-medium">
                            {getTypeLabel(measurement.type)}
                          </span>
                          <Badge 
                            variant={measurement.visible ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {formatValue(measurement)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMeasurementToggleVisibility(measurement.id)}
                            className="h-6 w-6 p-0"
                          >
                            {measurement.visible ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(measurement)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMeasurementDelete(measurement.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Content */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs">Libellé</Label>
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Nom de la mesure"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="min-h-[60px] text-xs"
                              placeholder="Description optionnelle"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-6 text-xs flex-1"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Sauver
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-6 text-xs flex-1"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {measurement.label && (
                            <p className="text-xs font-medium">{measurement.label}</p>
                          )}
                          {measurement.description && (
                            <p className="text-xs text-muted-foreground">
                              {measurement.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {measurement.createdAt.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Color Picker */}
                      {isEditing && (
                        <div className="space-y-1">
                          <Label className="text-xs">Couleur</Label>
                          <div className="flex gap-1 flex-wrap">
                            {MEASUREMENT_COLORS.map((color) => (
                              <button
                                key={color}
                                className={`w-6 h-6 rounded border-2 ${
                                  measurement.color === color 
                                    ? 'border-foreground' 
                                    : 'border-transparent'
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => onMeasurementUpdate(measurement.id, { color })}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Summary */}
        {measurements.length > 0 && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <div className="grid grid-cols-2 gap-2">
                <div>Longueurs: {measurements.filter(m => m.type === 'length').length}</div>
                <div>Angles: {measurements.filter(m => m.type === 'angle').length}</div>
                <div>Rectangles: {measurements.filter(m => m.type === 'rectangle').length}</div>
                <div>Ellipses: {measurements.filter(m => m.type === 'ellipse').length}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
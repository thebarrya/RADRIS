'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Contrast, 
  Sun, 
  Monitor, 
  Palette, 
  RotateCw, 
  Home,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface ViewerControlsProps {
  windowWidth: number;
  windowCenter: number;
  zoom: number;
  rotation: number;
  invert: boolean;
  colormap?: string;
  onWindowWidthChange: (value: number) => void;
  onWindowCenterChange: (value: number) => void;
  onZoomChange: (value: number) => void;
  onRotationChange: (value: number) => void;
  onInvertChange: (value: boolean) => void;
  onColormapChange?: (value: string) => void;
  onReset: () => void;
  onPresetSelect: (preset: WindowingPreset) => void;
  disabled?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface WindowingPreset {
  name: string;
  windowWidth: number;
  windowCenter: number;
  description: string;
}

const DEFAULT_PRESETS: WindowingPreset[] = [
  { name: 'Défaut', windowWidth: 400, windowCenter: 40, description: 'Fenêtrage par défaut' },
  { name: 'Poumons', windowWidth: 1500, windowCenter: -600, description: 'Optimisé pour les poumons' },
  { name: 'Os', windowWidth: 1000, windowCenter: 400, description: 'Optimisé pour les structures osseuses' },
  { name: 'Tissus mous', windowWidth: 350, windowCenter: 50, description: 'Optimisé pour les tissus mous' },
  { name: 'Cerveau', windowWidth: 80, windowCenter: 40, description: 'Optimisé pour le cerveau' },
  { name: 'Foie', windowWidth: 150, windowCenter: 90, description: 'Optimisé pour le foie' },
  { name: 'Abdomen', windowWidth: 400, windowCenter: 50, description: 'Optimisé pour l\'abdomen' },
];

const COLORMAPS = [
  { value: '', label: 'Niveaux de gris' },
  { value: 'hot', label: 'Hot' },
  { value: 'jet', label: 'Jet' },
  { value: 'rainbow', label: 'Arc-en-ciel' },
  { value: 'cool', label: 'Cool' },
  { value: 'winter', label: 'Hiver' },
];

export function ViewerControls({
  windowWidth,
  windowCenter,
  zoom,
  rotation,
  invert,
  colormap = '',
  onWindowWidthChange,
  onWindowCenterChange,
  onZoomChange,
  onRotationChange,
  onInvertChange,
  onColormapChange,
  onReset,
  onPresetSelect,
  disabled = false,
  isCollapsed = false,
  onToggleCollapse
}: ViewerControlsProps) {
  const [manualWW, setManualWW] = useState(windowWidth.toString());
  const [manualWC, setManualWC] = useState(windowCenter.toString());

  const handleManualWWChange = (value: string) => {
    setManualWW(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onWindowWidthChange(numValue);
    }
  };

  const handleManualWCChange = (value: string) => {
    setManualWC(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      onWindowCenterChange(numValue);
    }
  };

  React.useEffect(() => {
    setManualWW(windowWidth.toString());
    setManualWC(windowCenter.toString());
  }, [windowWidth, windowCenter]);

  if (isCollapsed) {
    return (
      <Card className="w-64">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Contrôles
            </CardTitle>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">WW:</span> {windowWidth}
            </div>
            <div>
              <span className="text-muted-foreground">WC:</span> {windowCenter}
            </div>
            <div>
              <span className="text-muted-foreground">Zoom:</span> {Math.round(zoom * 100)}%
            </div>
            <div>
              <span className="text-muted-foreground">Rotation:</span> {rotation}°
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-64">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Contrôles d'affichage
          </CardTitle>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Windowing Presets */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Contrast className="h-3 w-3" />
            Presets de fenêtrage
          </Label>
          <Select
            value=""
            onValueChange={(value) => {
              const preset = DEFAULT_PRESETS.find(p => p.name === value);
              if (preset) onPresetSelect(preset);
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Sélectionner un preset" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PRESETS.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  <div className="flex flex-col">
                    <span>{preset.name}</span>
                    <span className="text-xs text-muted-foreground">
                      WW: {preset.windowWidth}, WC: {preset.windowCenter}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Window Width */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Largeur de fenêtre</Label>
            <Input
              value={manualWW}
              onChange={(e) => handleManualWWChange(e.target.value)}
              className="h-6 w-16 text-xs"
              disabled={disabled}
            />
          </div>
          <Slider
            value={[windowWidth]}
            onValueChange={([value]) => onWindowWidthChange(value)}
            min={1}
            max={2000}
            step={1}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Window Center */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Centre de fenêtre</Label>
            <Input
              value={manualWC}
              onChange={(e) => handleManualWCChange(e.target.value)}
              className="h-6 w-16 text-xs"
              disabled={disabled}
            />
          </div>
          <Slider
            value={[windowCenter]}
            onValueChange={([value]) => onWindowCenterChange(value)}
            min={-1000}
            max={1000}
            step={1}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Zoom */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Zoom</Label>
            <Badge variant="secondary" className="h-5 text-xs">
              {Math.round(zoom * 100)}%
            </Badge>
          </div>
          <Slider
            value={[zoom]}
            onValueChange={([value]) => onZoomChange(value)}
            min={0.1}
            max={5}
            step={0.1}
            disabled={disabled}
            className="w-full"
          />
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1">
              <RotateCw className="h-3 w-3" />
              Rotation
            </Label>
            <Badge variant="secondary" className="h-5 text-xs">
              {rotation}°
            </Badge>
          </div>
          <Slider
            value={[rotation]}
            onValueChange={([value]) => onRotationChange(value)}
            min={0}
            max={360}
            step={15}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Colormap */}
        {onColormapChange && (
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Palette className="h-3 w-3" />
              Palette de couleurs
            </Label>
            <Select
              value={colormap}
              onValueChange={onColormapChange}
              disabled={disabled}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORMAPS.map((map) => (
                  <SelectItem key={map.value} value={map.value}>
                    {map.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Invert */}
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1">
            <Sun className="h-3 w-3" />
            Inverser
          </Label>
          <Button
            variant={invert ? "default" : "outline"}
            size="sm"
            onClick={() => onInvertChange(!invert)}
            disabled={disabled}
            className="h-6 px-2 text-xs"
          >
            {invert ? 'ON' : 'OFF'}
          </Button>
        </div>

        <Separator />

        {/* Reset */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="w-full h-8 text-xs"
        >
          <Home className="h-3 w-3 mr-1" />
          Réinitialiser
        </Button>
      </CardContent>
    </Card>
  );
}
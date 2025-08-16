'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Move, 
  ZoomIn, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Contrast,
  Ruler,
  Triangle,
  Square,
  Circle,
  MousePointer,
  Undo,
  Redo,
  RotateCcw,
  Home,
  Download,
  Share,
  Settings
} from 'lucide-react';
import { ToolName, TOOL_NAMES } from '@/lib/cornerstone';

interface ViewerToolbarProps {
  activeTool: ToolName | null;
  onToolChange: (toolName: ToolName) => void;
  onReset: () => void;
  onRotate: (direction: 'left' | 'right') => void;
  onFlip: (direction: 'horizontal' | 'vertical') => void;
  onInvert: () => void;
  onFitToWindow: () => void;
  onDownload: () => void;
  onShare: () => void;
  onSettings: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  disabled?: boolean;
}

export function ViewerToolbar({
  activeTool,
  onToolChange,
  onReset,
  onRotate,
  onFlip,
  onInvert,
  onFitToWindow,
  onDownload,
  onShare,
  onSettings,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  disabled = false
}: ViewerToolbarProps) {
  const toolButtons = [
    {
      name: TOOL_NAMES.Pan,
      icon: Move,
      label: 'Déplacer',
      shortcut: 'V',
    },
    {
      name: TOOL_NAMES.Zoom,
      icon: ZoomIn,
      label: 'Zoom',
      shortcut: 'Z',
    },
    {
      name: TOOL_NAMES.WindowLevel,
      icon: Contrast,
      label: 'Fenêtrage',
      shortcut: 'W',
    },
  ];

  const measurementTools = [
    {
      name: TOOL_NAMES.Length,
      icon: Ruler,
      label: 'Mesure linéaire',
      shortcut: 'L',
    },
    {
      name: TOOL_NAMES.Angle,
      icon: Triangle,
      label: 'Mesure angulaire',
      shortcut: 'A',
    },
    {
      name: TOOL_NAMES.RectangleROI,
      icon: Square,
      label: 'ROI rectangulaire',
      shortcut: 'R',
    },
    {
      name: TOOL_NAMES.EllipticalROI,
      icon: Circle,
      label: 'ROI elliptique',
      shortcut: 'E',
    },
  ];

  return (
    <div className="flex items-center gap-2 p-2 bg-background border-b border-border">
      {/* Navigation Tools */}
      <div className="flex items-center gap-1">
        {toolButtons.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.name;
          
          return (
            <Button
              key={tool.name}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(tool.name)}
              disabled={disabled}
              title={`${tool.label} (${tool.shortcut})`}
              className="relative"
            >
              <Icon className="h-4 w-4" />
              {isActive && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full"
                />
              )}
            </Button>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Measurement Tools */}
      <div className="flex items-center gap-1">
        {measurementTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.name;
          
          return (
            <Button
              key={tool.name}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange(tool.name)}
              disabled={disabled}
              title={`${tool.label} (${tool.shortcut})`}
              className="relative"
            >
              <Icon className="h-4 w-4" />
              {isActive && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-1 -right-1 h-2 w-2 p-0 rounded-full"
                />
              )}
            </Button>
          );
        })}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Image Manipulation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRotate('left')}
          disabled={disabled}
          title="Rotation anti-horaire"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRotate('right')}
          disabled={disabled}
          title="Rotation horaire"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFlip('horizontal')}
          disabled={disabled}
          title="Retournement horizontal"
        >
          <FlipHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFlip('vertical')}
          disabled={disabled}
          title="Retournement vertical"
        >
          <FlipVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onInvert}
          disabled={disabled}
          title="Inverser les couleurs"
        >
          <Contrast className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History */}
      {(onUndo || onRedo) && (
        <>
          <div className="flex items-center gap-1">
            {onUndo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={disabled || !canUndo}
                title="Annuler (Ctrl+Z)"
              >
                <Undo className="h-4 w-4" />
              </Button>
            )}
            {onRedo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={disabled || !canRedo}
                title="Rétablir (Ctrl+Y)"
              >
                <Redo className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* View Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitToWindow}
          disabled={disabled}
          title="Ajuster à la fenêtre"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          title="Réinitialiser la vue"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          disabled={disabled}
          title="Télécharger l'image"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          disabled={disabled}
          title="Partager"
        >
          <Share className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettings}
          disabled={disabled}
          title="Paramètres du viewer"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
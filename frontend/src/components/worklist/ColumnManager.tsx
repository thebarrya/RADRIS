'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SettingsIcon, EyeIcon, EyeOffIcon, GripVerticalIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column {
  id: string;
  label: string;
  width: number;
  sortable: boolean;
  sticky?: 'left' | 'right';
  visible: boolean;
  required?: boolean;
}

interface ColumnManagerProps {
  columns: Column[];
  onColumnsChange: (columns: Column[]) => void;
  onSaveView?: (name: string, columns: Column[]) => void;
  savedViews?: Array<{ name: string; columns: Column[] }>;
  onLoadView?: (columns: Column[]) => void;
}

export function ColumnManager({ 
  columns, 
  onColumnsChange, 
  onSaveView,
  savedViews = [],
  onLoadView 
}: ColumnManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);

  const handleToggleColumn = (columnId: string) => {
    const updatedColumns = columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(updatedColumns);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedIndex];
    
    // Remove dragged column
    newColumns.splice(draggedIndex, 1);
    // Insert at new position
    newColumns.splice(dropIndex, 0, draggedColumn);
    
    onColumnsChange(newColumns);
    setDraggedIndex(null);
  };

  const handleSaveView = () => {
    if (saveViewName.trim() && onSaveView) {
      onSaveView(saveViewName.trim(), columns);
      setSaveViewName('');
      setShowSaveView(false);
    }
  };

  const handleLoadView = (viewColumns: Column[]) => {
    if (onLoadView) {
      onLoadView(viewColumns);
    }
  };

  const resetToDefault = () => {
    const defaultColumns = columns.map(col => ({
      ...col,
      visible: !['comments', 'lock'].includes(col.id) // Hide non-essential columns by default
    }));
    onColumnsChange(defaultColumns);
  };

  const visibleCount = columns.filter(col => col.visible).length;
  const totalCount = columns.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SettingsIcon className="h-4 w-4 mr-1" />
          Colonnes ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Gestion des colonnes</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
              className="text-xs"
            >
              Réinitialiser
            </Button>
          </div>

          {/* Saved views */}
          {savedViews.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Vues sauvegardées</h4>
              <div className="space-y-1">
                {savedViews.map((view, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <button
                      onClick={() => handleLoadView(view.columns)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {view.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save current view */}
          <div className="mb-4 pb-4 border-b">
            {!showSaveView ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveView(true)}
                className="w-full text-xs"
              >
                Sauvegarder cette vue
              </Button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nom de la vue"
                  value={saveViewName}
                  onChange={(e) => setSaveViewName(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleSaveView}
                    disabled={!saveViewName.trim()}
                    className="text-xs flex-1"
                  >
                    Sauvegarder
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowSaveView(false);
                      setSaveViewName('');
                    }}
                    className="text-xs flex-1"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Column list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {columns.map((column, index) => (
              <div
                key={column.id}
                draggable={!column.required}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  'flex items-center space-x-2 p-2 rounded text-xs',
                  'hover:bg-gray-50 cursor-pointer',
                  draggedIndex === index && 'opacity-50',
                  column.required && 'cursor-not-allowed opacity-75'
                )}
              >
                {!column.required && (
                  <GripVerticalIcon className="h-3 w-3 text-gray-400" />
                )}
                
                <button
                  onClick={() => !column.required && handleToggleColumn(column.id)}
                  disabled={column.required}
                  className="flex items-center space-x-2 flex-1 text-left"
                >
                  {column.visible ? (
                    <EyeIcon className="h-3 w-3 text-green-600" />
                  ) : (
                    <EyeOffIcon className="h-3 w-3 text-gray-400" />
                  )}
                  <span className={cn(
                    column.visible ? 'text-gray-900' : 'text-gray-500',
                    column.sticky && 'font-medium'
                  )}>
                    {column.label}
                    {column.sticky && (
                      <span className="ml-1 text-xs text-blue-600">
                        ({column.sticky === 'left' ? 'fixe gauche' : 'fixe droite'})
                      </span>
                    )}
                  </span>
                </button>

                <span className="text-xs text-gray-400 w-12 text-right">
                  {column.width}px
                </span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allVisible = columns.map(col => ({ ...col, visible: true }));
                  onColumnsChange(allVisible);
                }}
                className="text-xs flex-1"
              >
                Tout afficher
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const essentialVisible = columns.map(col => ({
                    ...col,
                    visible: ['status', 'patient', 'modality', 'examType', 'actions'].includes(col.id)
                  }));
                  onColumnsChange(essentialVisible);
                }}
                className="text-xs flex-1"
              >
                Essentiel
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
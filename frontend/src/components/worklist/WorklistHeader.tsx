'use client';

import { useState } from 'react';
import { WorklistParams } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorklistHeaderProps {
  params: WorklistParams;
  onParamsChange: (params: Partial<WorklistParams>) => void;
  onRefresh: () => void;
  totalCount: number;
  isWebSocketConnected?: boolean;
}

export function WorklistHeader({ 
  params, 
  onParamsChange, 
  onRefresh, 
  totalCount,
  isWebSocketConnected = false
}: WorklistHeaderProps) {
  const [searchValue, setSearchValue] = useState(params.query || '');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onParamsChange({ query: value || undefined });
  };

  const contextOptions = [
    { value: 'all', label: 'Tous les examens' },
    { value: 'today', label: 'Examens du jour' },
    { value: 'my-exams', label: 'Mes examens' },
    { value: 'urgent', label: 'Urgences' },
    { value: 'pending-reports', label: 'En attente de CR' },
    { value: 'validated', label: 'Validés' },
  ];

  const currentContext = contextOptions.find(opt => {
    if (params.status === 'EMERGENCY') return opt.value === 'urgent';
    if (params.status === 'REPORTING') return opt.value === 'pending-reports';
    if (params.status === 'VALIDATED') return opt.value === 'validated';
    return opt.value === 'all';
  });

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="px-6 py-4">
        {/* Top row with logo and utilities */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">RADRIS v1.0</h1>
            <span className="text-sm text-gray-500">|</span>
            <div className="flex items-center space-x-2">
              <select 
                className="text-sm border rounded px-3 py-1"
                value={currentContext?.value}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'urgent') {
                    onParamsChange({ status: 'EMERGENCY' });
                  } else if (value === 'pending-reports') {
                    onParamsChange({ status: 'REPORTING' });
                  } else if (value === 'validated') {
                    onParamsChange({ status: 'VALIDATED' });
                  } else {
                    onParamsChange({ status: undefined });
                  }
                }}
              >
                {contextOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Date range picker */}
            <div className="flex items-center space-x-2 text-sm">
              <span>Période:</span>
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={params.dateFrom ? params.dateFrom.toISOString().split('T')[0] : ''}
                onChange={(e) => onParamsChange({ dateFrom: e.target.value ? new Date(e.target.value) : undefined })}
              />
              <span>→</span>
              <input
                type="date"
                className="border rounded px-2 py-1 text-xs"
                value={params.dateTo ? params.dateTo.toISOString().split('T')[0] : ''}
                onChange={(e) => onParamsChange({ dateTo: e.target.value ? new Date(e.target.value) : undefined })}
              />
            </div>

            {/* Utilities */}
            <button className="text-sm text-blue-600 hover:text-blue-800" title="Aide">
              ❓
            </button>
            <button 
              onClick={onRefresh}
              className="text-sm text-blue-600 hover:text-blue-800" 
              title="Actualiser"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Second row with actions and search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Demo mode indicator */}
            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
              Demo
            </span>

            {/* WebSocket connection status */}
            <div className="flex items-center space-x-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  isWebSocketConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isWebSocketConnected ? 'Temps réel connecté' : 'Temps réel déconnecté'}
              />
              <span className="text-xs text-gray-600">
                {isWebSocketConnected ? 'Temps réel' : 'Hors ligne'}
              </span>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Recherche:</span>
              <Input
                type="text"
                placeholder="Patient, n° accession, examen..."
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-64 h-8 text-xs"
              />
              <span className="text-xs text-gray-500">
                {totalCount} ligne{totalCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Action buttons */}
            <Button variant="outline" size="sm" className="h-8 text-xs">
              🎯 Filtrer
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              📊 Stats
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              📋 Export
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              🖨 Imprimer
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              📤 Partager
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              QR
            </Button>

            {/* Pagination controls */}
            <div className="flex items-center space-x-1 ml-4">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => onParamsChange({ page: Math.max(1, (params.page || 1) - 1) })}
                disabled={(params.page || 1) === 1}
              >
                ⬅
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => onParamsChange({ page: (params.page || 1) + 1 })}
              >
                ➡
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
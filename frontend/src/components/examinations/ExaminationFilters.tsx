'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ExaminationStatus, Modality, Priority } from '@/types';

interface ExaminationFiltersProps {
  onFilter: (filters: any) => void;
  currentFilters: {
    status: string;
    modality: string;
    priority: string;
    assignedTo: string;
    dateFrom: string;
    dateTo: string;
    query: string;
  };
}

const statusOptions: { value: ExaminationStatus | ''; label: string; color: string }[] = [
  { value: '', label: 'Tous les statuts', color: 'text-gray-600' },
  { value: 'SCHEDULED', label: 'Programmé', color: 'text-blue-600' },
  { value: 'IN_PROGRESS', label: 'En cours', color: 'text-yellow-600' },
  { value: 'ACQUIRED', label: 'Acquis', color: 'text-green-600' },
  { value: 'REPORTING', label: 'En lecture', color: 'text-purple-600' },
  { value: 'VALIDATED', label: 'Validé', color: 'text-green-800' },
  { value: 'CANCELLED', label: 'Annulé', color: 'text-red-600' },
  { value: 'EMERGENCY', label: 'Urgence', color: 'text-red-800' },
];

const modalityOptions: { value: Modality | ''; label: string }[] = [
  { value: '', label: 'Toutes modalités' },
  { value: 'CR', label: 'CR - Radiographie' },
  { value: 'CT', label: 'CT - Scanner' },
  { value: 'MR', label: 'MR - IRM' },
  { value: 'US', label: 'US - Échographie' },
  { value: 'MG', label: 'MG - Mammographie' },
  { value: 'RF', label: 'RF - Radioscopie' },
  { value: 'DX', label: 'DX - Radiographie Digitale' },
  { value: 'NM', label: 'NM - Médecine Nucléaire' },
  { value: 'PT', label: 'PT - TEP Scan' },
  { value: 'XA', label: 'XA - Angiographie' },
];

const priorityOptions: { value: Priority | ''; label: string; color: string }[] = [
  { value: '', label: 'Toutes priorités', color: 'text-gray-600' },
  { value: 'LOW', label: 'Basse', color: 'text-gray-600' },
  { value: 'NORMAL', label: 'Normale', color: 'text-blue-600' },
  { value: 'HIGH', label: 'Élevée', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
  { value: 'EMERGENCY', label: 'Urgence', color: 'text-red-800' },
];

export function ExaminationFilters({ onFilter, currentFilters }: ExaminationFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState(currentFilters);

  const handleQuickFilter = (filterType: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    switch (filterType) {
      case 'all':
        onFilter({
          status: '',
          modality: '',
          priority: '',
          assignedTo: '',
          dateFrom: '',
          dateTo: '',
          query: ''
        });
        break;
      case 'today':
        onFilter({
          ...currentFilters,
          dateFrom: today.toISOString().split('T')[0],
          dateTo: today.toISOString().split('T')[0]
        });
        break;
      case 'tomorrow':
        onFilter({
          ...currentFilters,
          dateFrom: tomorrow.toISOString().split('T')[0],
          dateTo: tomorrow.toISOString().split('T')[0]
        });
        break;
      case 'week':
        onFilter({
          ...currentFilters,
          dateFrom: today.toISOString().split('T')[0],
          dateTo: weekFromNow.toISOString().split('T')[0]
        });
        break;
      case 'urgent':
        onFilter({
          ...currentFilters,
          priority: 'URGENT'
        });
        break;
      case 'emergency':
        onFilter({
          ...currentFilters,
          priority: 'EMERGENCY'
        });
        break;
      case 'in-progress':
        onFilter({
          ...currentFilters,
          status: 'IN_PROGRESS'
        });
        break;
      case 'reporting':
        onFilter({
          ...currentFilters,
          status: 'REPORTING'
        });
        break;
    }
  };

  const handleAdvancedFilter = () => {
    onFilter(localFilters);
    setShowAdvanced(false);
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: '',
      modality: '',
      priority: '',
      assignedTo: '',
      dateFrom: '',
      dateTo: '',
      query: ''
    };
    setLocalFilters(emptyFilters);
    onFilter(emptyFilters);
  };

  const updateLocalFilter = (key: string, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Recherche : patient, n° accession, modalité..."
            value={currentFilters.query}
            onChange={(e) => onFilter({ ...currentFilters, query: e.target.value })}
            className="w-full"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          🔍 Filtres avancés
        </Button>
        
        <Button
          variant="outline"
          onClick={clearFilters}
        >
          ✕ Effacer
        </Button>
      </div>

      {/* Quick Filters */}
      <div className="flex items-center space-x-2 flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('all')}
          className="h-8"
        >
          Tous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('today')}
          className="h-8"
        >
          📅 Aujourd'hui
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('tomorrow')}
          className="h-8"
        >
          📅 Demain
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('week')}
          className="h-8"
        >
          📅 Cette semaine
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('urgent')}
          className="h-8 text-red-600 border-red-200"
        >
          🚨 Urgent
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('emergency')}
          className="h-8 text-red-800 border-red-300"
        >
          🚨 Urgence
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('in-progress')}
          className="h-8 text-yellow-600 border-yellow-200"
        >
          ⏳ En cours
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickFilter('reporting')}
          className="h-8 text-purple-600 border-purple-200"
        >
          📝 En lecture
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Filtres Avancés</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={localFilters.status}
                  onChange={(e) => updateLocalFilter('status', e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className={option.color}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modality Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalité
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={localFilters.modality}
                  onChange={(e) => updateLocalFilter('modality', e.target.value)}
                >
                  {modalityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={localFilters.priority}
                  onChange={(e) => updateLocalFilter('priority', e.target.value)}
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value} className={option.color}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Radiologue assigné
                </label>
                <Input
                  type="text"
                  value={localFilters.assignedTo}
                  onChange={(e) => updateLocalFilter('assignedTo', e.target.value)}
                  placeholder="Nom du radiologue"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <Input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) => updateLocalFilter('dateFrom', e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <Input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => updateLocalFilter('dateTo', e.target.value)}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-2">
                <Button onClick={handleAdvancedFilter}>
                  🔍 Appliquer les filtres
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  ✕ Effacer tout
                </Button>
              </div>
              
              <Button 
                variant="ghost"
                onClick={() => setShowAdvanced(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { WorklistParams } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FilterIcon, SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WorklistFiltersProps {
  params: WorklistParams;
  onParamsChange: (params: Partial<WorklistParams>) => void;
}

export function WorklistFilters({ params, onParamsChange }: WorklistFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.query || '');

  const statusOptions = [
    { value: 'all', label: 'Tous', count: 0 },
    { value: 'SCHEDULED', label: 'Programmé', count: 0, color: 'bg-blue-100 text-blue-800' },
    { value: 'IN_PROGRESS', label: 'En cours', count: 0, color: 'bg-orange-100 text-orange-800' },
    { value: 'ACQUIRED', label: 'Acquis', count: 0, color: 'bg-green-100 text-green-800' },
    { value: 'REPORTING', label: 'Lecture', count: 0, color: 'bg-purple-100 text-purple-800' },
    { value: 'VALIDATED', label: 'Validé', count: 0, color: 'bg-emerald-100 text-emerald-800' },
    { value: 'EMERGENCY', label: 'Urgence', count: 0, color: 'bg-red-100 text-red-800' },
    { value: 'CANCELLED', label: 'Annulé', count: 0, color: 'bg-gray-100 text-gray-800' },
  ];

  const modalityOptions = [
    { value: 'all', label: 'Toutes', color: 'bg-gray-100 text-gray-800' },
    { value: 'CR', label: 'CR', color: 'bg-purple-100 text-purple-800' },
    { value: 'CT', label: 'Scanner', color: 'bg-orange-100 text-orange-800' },
    { value: 'MR', label: 'IRM', color: 'bg-blue-100 text-blue-800' },
    { value: 'US', label: 'Echo', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'MG', label: 'Mammo', color: 'bg-pink-100 text-pink-800' },
    { value: 'DX', label: 'Radio', color: 'bg-indigo-100 text-indigo-800' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'Toutes' },
    { value: 'EMERGENCY', label: 'Urgence', color: 'bg-red-100 text-red-800' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
    { value: 'HIGH', label: 'Élevée', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'NORMAL', label: 'Normale', color: 'bg-gray-100 text-gray-800' },
    { value: 'LOW', label: 'Basse', color: 'bg-blue-100 text-blue-800' },
  ];

  const datePresets = [
    { label: 'Aujourd\'hui', value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois', value: 'month' },
    { label: 'Derniers 7 jours', value: 'last7days' },
    { label: 'Derniers 30 jours', value: 'last30days' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onParamsChange({ query: searchQuery || undefined });
  };

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    switch (preset) {
      case 'today':
        dateFrom = today;
        dateTo = today;
        break;
      case 'week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        dateFrom = startOfWeek;
        dateTo = today;
        break;
      case 'month':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        dateTo = today;
        break;
      case 'last7days':
        dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - 7);
        dateTo = today;
        break;
      case 'last30days':
        dateFrom = new Date(today);
        dateFrom.setDate(today.getDate() - 30);
        dateTo = today;
        break;
    }

    onParamsChange({ dateFrom, dateTo });
  };

  const hasActiveFilters = !!(
    params.status || 
    params.modality || 
    params.priority || 
    params.dateFrom || 
    params.dateTo || 
    params.query ||
    params.assignedTo ||
    params.referrer
  );

  return (
    <div className="bg-gray-50 border-b">
      {/* Main filter bar */}
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Quick search and filters toggle */}
          <div className="flex items-center space-x-4">
            {/* Global search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Rechercher patient, examen, prescripteur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-80 text-sm"
                />
              </div>
              <Button type="submit" size="sm" className="h-8">
                Rechercher
              </Button>
            </form>

            {/* Advanced filters toggle */}
            <Button
              variant={showAdvancedFilters ? 'default' : 'outline'}
              size="sm"
              className="h-8"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <FilterIcon className="h-4 w-4 mr-1" />
              Filtres avancés
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  •
                </span>
              )}
            </Button>
          </div>

          {/* Right side - Date presets and clear */}
          <div className="flex items-center space-x-2">
            {/* Date presets */}
            <div className="flex items-center space-x-1">
              {datePresets.map(preset => (
                <Button
                  key={preset.value}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => handleDatePreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Clear all filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs text-red-600 hover:text-red-800"
                onClick={() => {
                  setSearchQuery('');
                  onParamsChange({ 
                    status: undefined, 
                    modality: undefined, 
                    priority: undefined,
                    dateFrom: undefined,
                    dateTo: undefined,
                    query: undefined,
                    assignedTo: undefined,
                    referrer: undefined
                  });
                }}
              >
                ✕ Tout effacer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showAdvancedFilters && (
        <div className="px-6 py-4 bg-white border-t">
          {/* Status filter */}
          <div className="flex items-center space-x-6 mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-16">Statut:</span>
              <div className="flex space-x-1">
                {statusOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={params.status === option.value || (option.value === 'all' && !params.status) ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 px-3 text-xs',
                      option.color && params.status !== option.value && option.value !== 'all' && option.color
                    )}
                    onClick={() => onParamsChange({ 
                      status: option.value === 'all' ? undefined : option.value as any 
                    })}
                  >
                    {option.label}
                    {option.count > 0 && (
                      <span className="ml-1 px-1 bg-white rounded text-xs">
                        {option.count}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Modality and Priority filters */}
          <div className="flex items-center space-x-6 mb-4">
            {/* Modality filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-16">Modalité:</span>
              <div className="flex space-x-1">
                {modalityOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={params.modality === option.value || (option.value === 'all' && !params.modality) ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 px-3 text-xs',
                      option.color && params.modality !== option.value && option.value !== 'all' && option.color
                    )}
                    onClick={() => onParamsChange({ 
                      modality: option.value === 'all' ? undefined : option.value 
                    })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-16">Priorité:</span>
              <div className="flex space-x-1">
                {priorityOptions.map(option => (
                  <Button
                    key={option.value}
                    variant={params.priority === option.value || (option.value === 'all' && !params.priority) ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 px-3 text-xs',
                      option.color && params.priority !== option.value && option.value !== 'all' && option.color
                    )}
                    onClick={() => onParamsChange({ 
                      priority: option.value === 'all' ? undefined : option.value as any 
                    })}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Date range and practitioner filters */}
          <div className="flex items-center space-x-6">
            {/* Date range */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-16">Période:</span>
              <div className="flex items-center space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 w-40 justify-start text-left font-normal',
                        !params.dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {params.dateFrom ? (
                        format(params.dateFrom, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'Date début'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={params.dateFrom}
                      onSelect={(date) => onParamsChange({ dateFrom: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-gray-400">à</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 w-40 justify-start text-left font-normal',
                        !params.dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {params.dateTo ? (
                        format(params.dateTo, 'dd/MM/yyyy', { locale: fr })
                      ) : (
                        'Date fin'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={params.dateTo}
                      onSelect={(date) => onParamsChange({ dateTo: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Assigned radiologist */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-20">Radiologue:</span>
              <Select
                value={params.assignedTo || 'all'}
                onValueChange={(value) => onParamsChange({ 
                  assignedTo: value === 'all' ? undefined : value 
                })}
              >
                <SelectTrigger className="h-8 w-40">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="unassigned">Non assigné</SelectItem>
                  <SelectItem value="dr-martin">Dr. Martin</SelectItem>
                  <SelectItem value="dr-dubois">Dr. Dubois</SelectItem>
                  <SelectItem value="dr-bernard">Dr. Bernard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Referring physician */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 w-20">Prescripteur:</span>
              <Input
                type="text"
                placeholder="Nom du prescripteur"
                value={params.referrer || ''}
                onChange={(e) => onParamsChange({ referrer: e.target.value || undefined })}
                className="h-8 w-40 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
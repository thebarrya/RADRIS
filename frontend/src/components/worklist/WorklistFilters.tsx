'use client';

import { WorklistParams } from '@/types';
import { Button } from '@/components/ui/button';

interface WorklistFiltersProps {
  params: WorklistParams;
  onParamsChange: (params: Partial<WorklistParams>) => void;
}

export function WorklistFilters({ params, onParamsChange }: WorklistFiltersProps) {
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

  return (
    <div className="bg-gray-50 border-b px-6 py-3">
      <div className="flex items-center space-x-6">
        {/* Status filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Statut:</span>
          <div className="flex space-x-1">
            {statusOptions.map(option => (
              <Button
                key={option.value}
                variant={params.status === option.value || (option.value === 'all' && !params.status) ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-3 text-xs ${option.color || ''}`}
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

      <div className="flex items-center space-x-6 mt-3">
        {/* Modality filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Modalité:</span>
          <div className="flex space-x-1">
            {modalityOptions.map(option => (
              <Button
                key={option.value}
                variant={params.modality === option.value || (option.value === 'all' && !params.modality) ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-3 text-xs ${option.color}`}
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
          <span className="text-sm font-medium text-gray-700">Priorité:</span>
          <div className="flex space-x-1">
            {priorityOptions.map(option => (
              <Button
                key={option.value}
                variant={params.priority === option.value || (option.value === 'all' && !params.priority) ? 'default' : 'outline'}
                size="sm"
                className={`h-7 px-3 text-xs ${option.color || ''}`}
                onClick={() => onParamsChange({ 
                  priority: option.value === 'all' ? undefined : option.value as any 
                })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Clear filters */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-3 text-xs text-gray-500"
          onClick={() => onParamsChange({ 
            status: undefined, 
            modality: undefined, 
            priority: undefined,
            dateFrom: undefined,
            dateTo: undefined,
            query: undefined
          })}
        >
          ✕ Effacer filtres
        </Button>
      </div>
    </div>
  );
}
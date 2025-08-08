'use client';

import { useState } from 'react';
import { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { formatDate, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

interface PatientTableProps {
  patients: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSort: (sortBy: string) => void;
  currentSort: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export function PatientTable({ 
  patients, 
  pagination, 
  isLoading, 
  onPageChange, 
  onSort,
  currentSort 
}: PatientTableProps) {
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedPatients(checked ? patients.map(p => p.id) : []);
  };

  const handleSelectPatient = (patientId: string, checked: boolean) => {
    setSelectedPatients(prev => 
      checked 
        ? [...prev, patientId]
        : prev.filter(id => id !== patientId)
    );
  };

  const getSortIcon = (columnId: string) => {
    if (currentSort.sortBy !== columnId) return '↕️';
    return currentSort.sortOrder === 'asc' ? '↑' : '↓';
  };

  const viewPatient = (patientId: string) => {
    window.open(`/patients/${patientId}`, '_blank');
  };

  const editPatient = (patientId: string) => {
    window.open(`/patients/${patientId}/edit`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Selection toolbar */}
      {selectedPatients.length > 0 && (
        <div className="bg-blue-50 border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedPatients.length} patient{selectedPatients.length > 1 ? 's' : ''} sélectionné{selectedPatients.length > 1 ? 's' : ''}
            </span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                📤 Exporter
              </Button>
              <Button size="sm" variant="outline">
                🖨 Imprimer
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedPatients([])}
              >
                ✕ Désélectionner
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedPatients.length === patients.length && patients.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('lastName')}
              >
                <div className="flex items-center justify-between">
                  Nom {getSortIcon('lastName')}
                </div>
              </th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('firstName')}
              >
                <div className="flex items-center justify-between">
                  Prénom {getSortIcon('firstName')}
                </div>
              </th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('birthDate')}
              >
                <div className="flex items-center justify-between">
                  Naissance {getSortIcon('birthDate')}
                </div>
              </th>
              
              <th className="px-4 py-3 text-left font-semibold">Âge</th>
              <th className="px-4 py-3 text-left font-semibold">Genre</th>
              <th className="px-4 py-3 text-left font-semibold">Téléphone</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Alertes</th>
              <th className="px-4 py-3 text-left font-semibold">Examens</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          
          <tbody>
            {isLoading ? (
              // Loading skeleton
              [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b animate-pulse">
                  <td className="px-4 py-3">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </td>
                  {[...Array(10)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : patients.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="text-4xl">👥</div>
                    <div>Aucun patient trouvé</div>
                    <div className="text-sm">Essayez de modifier vos critères de recherche</div>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              patients.map((patient) => (
                <tr 
                  key={patient.id}
                  className={cn(
                    'border-b hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedPatients.includes(patient.id) && 'bg-blue-50'
                  )}
                  onClick={() => viewPatient(patient.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={(e) => handleSelectPatient(patient.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {patient.lastName.toUpperCase()}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-gray-900">
                      {patient.firstName}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(patient.birthDate)}
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {calculateAge(patient.birthDate)} ans
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      patient.gender === 'M' && 'bg-blue-100 text-blue-800',
                      patient.gender === 'F' && 'bg-pink-100 text-pink-800',
                      patient.gender === 'OTHER' && 'bg-gray-100 text-gray-800'
                    )}>
                      {patient.gender === 'M' ? 'Homme' : patient.gender === 'F' ? 'Femme' : 'Autre'}
                    </span>
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {patient.phoneNumber || '-'}
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {patient.email || '-'}
                  </td>
                  
                  <td className="px-4 py-3">
                    {patient.warnings && patient.warnings.length > 0 ? (
                      <div className="flex space-x-1">
                        {patient.warnings.includes('allergy') && (
                          <span className="text-red-500" title="Allergie">⚠️</span>
                        )}
                        {patient.warnings.includes('pregnancy') && (
                          <span className="text-pink-500" title="Grossesse">🤱</span>
                        )}
                        {patient.warnings.includes('pacemaker') && (
                          <span className="text-blue-500" title="Pacemaker">📱</span>
                        )}
                        {patient.warnings.includes('infection') && (
                          <span className="text-orange-500" title="Infection">🦠</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                      {patient.examinationCount || 0}
                    </span>
                  </td>
                  
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewPatient(patient.id)}
                        className="p-1 h-auto text-blue-600 hover:text-blue-800"
                        title="Voir le dossier"
                      >
                        👁️
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editPatient(patient.id)}
                        className="p-1 h-auto text-orange-600 hover:text-orange-800"
                        title="Modifier"
                      >
                        ✏️
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/examinations/new?patientId=${patient.id}`, '_blank')}
                        className="p-1 h-auto text-green-600 hover:text-green-800"
                        title="Nouvel examen"
                      >
                        ➕
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} patients
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
              >
                Précédent
              </Button>
              
              <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                {pagination.page} / {pagination.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page === pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
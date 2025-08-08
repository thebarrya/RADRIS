'use client';

import { useState, useCallback } from 'react';
import { Examination, WorklistParams, PaginatedResponse } from '@/types';
import { StatusIndicator } from './StatusIndicator';
import { PatientCell } from './PatientCell';
import { ModalityBadge } from './ModalityBadge';
import { ActionButtons } from './ActionButtons';
import { formatDate, formatTime, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

interface WorklistTableProps {
  data: Examination[];
  pagination?: PaginatedResponse<Examination>['pagination'];
  params: WorklistParams;
  onParamsChange: (params: Partial<WorklistParams>) => void;
  isLoading: boolean;
  error?: string | null;
}

interface Column {
  id: string;
  label: string;
  width: number;
  sortable: boolean;
  sticky?: 'left' | 'right';
  className?: string;
}

const COLUMNS: Column[] = [
  { id: 'status', label: '', width: 40, sortable: false, sticky: 'left', className: 'text-center' },
  { id: 'site', label: 'Site', width: 60, sortable: true },
  { id: 'scheduledDate', label: 'Date', width: 90, sortable: true },
  { id: 'scheduledTime', label: 'Heure', width: 70, sortable: true },
  { id: 'patient', label: 'Patient', width: 180, sortable: true, sticky: 'left' },
  { id: 'age', label: 'Âge', width: 60, sortable: true },
  { id: 'warnings', label: 'Alertes', width: 80, sortable: false },
  { id: 'antecedents', label: 'ATCD', width: 60, sortable: false },
  { id: 'modality', label: 'Modalité', width: 80, sortable: true },
  { id: 'examType', label: 'Examen', width: 200, sortable: true },
  { id: 'bodyPart', label: 'Région', width: 120, sortable: true },
  { id: 'referrer', label: 'Prescripteur', width: 140, sortable: true },
  { id: 'assignedTo', label: 'Radiologue', width: 140, sortable: true },
  { id: 'priority', label: 'Priorité', width: 80, sortable: true },
  { id: 'images', label: 'Images', width: 70, sortable: false },
  { id: 'report', label: 'CR', width: 60, sortable: false },
  { id: 'comments', label: 'Notes', width: 60, sortable: false },
  { id: 'actions', label: 'Actions', width: 100, sortable: false, sticky: 'right' },
];

export function WorklistTable({ 
  data, 
  pagination, 
  params, 
  onParamsChange, 
  isLoading, 
  error 
}: WorklistTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    COLUMNS.map(col => col.id)
  );

  const handleSort = useCallback((columnId: string) => {
    if (params.sortBy === columnId) {
      // Toggle sort order
      onParamsChange({
        sortOrder: params.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // New sort column
      onParamsChange({
        sortBy: columnId,
        sortOrder: 'asc'
      });
    }
  }, [params.sortBy, params.sortOrder, onParamsChange]);

  const handleRowSelect = useCallback((examinationId: string, selected: boolean) => {
    setSelectedRows(prev => 
      selected 
        ? [...prev, examinationId]
        : prev.filter(id => id !== examinationId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedRows(selected ? data.map(exam => exam.id) : []);
  }, [data]);

  const getSortIcon = (columnId: string) => {
    if (params.sortBy !== columnId) return '↕️';
    return params.sortOrder === 'asc' ? '↑' : '↓';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">
          Erreur de chargement: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Selection toolbar */}
      {selectedRows.length > 0 && (
        <div className="bg-blue-50 border-b px-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedRows.length} élément(s) sélectionné(s)
            </span>
            <div className="flex space-x-2">
              <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded">
                Assigner
              </button>
              <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded">
                Changer statut
              </button>
              <button 
                onClick={() => setSelectedRows([])}
                className="text-xs bg-gray-600 text-white px-3 py-1 rounded"
              >
                Désélectionner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table container with fixed header */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <table className="w-full border-collapse text-xs">
            {/* Fixed header */}
            <thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-300 z-10">
              <tr>
                {/* Select all checkbox */}
                <th className="w-8 px-2 py-2 border-r">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                
                {COLUMNS.filter(col => visibleColumns.includes(col.id)).map(column => (
                  <th
                    key={column.id}
                    className={cn(
                      'px-2 py-2 text-left font-semibold border-r text-gray-700',
                      column.sticky === 'left' && 'sticky left-0 bg-gray-100 z-20',
                      column.sticky === 'right' && 'sticky right-0 bg-gray-100 z-20',
                      column.sortable && 'cursor-pointer hover:bg-gray-200',
                      column.className
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="ml-1 text-gray-400">
                          {getSortIcon(column.id)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table body */}
            <tbody>
              {isLoading ? (
                // Loading rows
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    <td className="px-2 py-2"></td>
                    {COLUMNS.map(col => (
                      <td key={col.id} className="px-2 py-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-gray-500">
                    Aucun examen trouvé
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((examination) => (
                  <tr 
                    key={examination.id}
                    className={cn(
                      'border-b hover:bg-gray-50 cursor-pointer',
                      selectedRows.includes(examination.id) && 'bg-blue-50'
                    )}
                  >
                    {/* Selection checkbox */}
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selectedRows.includes(examination.id)}
                        onChange={(e) => handleRowSelect(examination.id, e.target.checked)}
                      />
                    </td>

                    {/* Status */}
                    {visibleColumns.includes('status') && (
                      <td className="px-2 py-2 text-center">
                        <StatusIndicator status={examination.status} priority={examination.priority} />
                      </td>
                    )}

                    {/* Site */}
                    {visibleColumns.includes('site') && (
                      <td className="px-2 py-2">RIS</td>
                    )}

                    {/* Date */}
                    {visibleColumns.includes('scheduledDate') && (
                      <td className="px-2 py-2">
                        {formatDate(examination.scheduledDate)}
                      </td>
                    )}

                    {/* Time */}
                    {visibleColumns.includes('scheduledTime') && (
                      <td className="px-2 py-2">
                        {formatTime(examination.scheduledDate)}
                      </td>
                    )}

                    {/* Patient */}
                    {visibleColumns.includes('patient') && (
                      <td className={cn(
                        'px-2 py-2 sticky left-9 bg-white',
                        selectedRows.includes(examination.id) && 'bg-blue-50'
                      )}>
                        <PatientCell 
                          patient={examination.patient}
                          accessionNumber={examination.accessionNumber}
                        />
                      </td>
                    )}

                    {/* Age */}
                    {visibleColumns.includes('age') && (
                      <td className="px-2 py-2 text-center">
                        {calculateAge(examination.patient.birthDate)}
                      </td>
                    )}

                    {/* Warnings */}
                    {visibleColumns.includes('warnings') && (
                      <td className="px-2 py-2 text-center">
                        {examination.patient.warnings.length > 0 && (
                          <div className="flex space-x-1">
                            {examination.patient.warnings.includes('allergy') && <span>⚠️</span>}
                            {examination.patient.warnings.includes('pregnancy') && <span>🤱</span>}
                            {examination.patient.warnings.includes('pacemaker') && <span>📱</span>}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Medical history */}
                    {visibleColumns.includes('antecedents') && (
                      <td className="px-2 py-2 text-center">
                        {examination.patient.medicalHistory?.length > 0 ? '📋' : ''}
                      </td>
                    )}

                    {/* Modality */}
                    {visibleColumns.includes('modality') && (
                      <td className="px-2 py-2">
                        <ModalityBadge modality={examination.modality} />
                      </td>
                    )}

                    {/* Exam Type */}
                    {visibleColumns.includes('examType') && (
                      <td className="px-2 py-2" title={examination.procedure}>
                        <div className="truncate">
                          {examination.examType}
                        </div>
                      </td>
                    )}

                    {/* Body Part */}
                    {visibleColumns.includes('bodyPart') && (
                      <td className="px-2 py-2">
                        {examination.bodyPart}
                      </td>
                    )}

                    {/* Referrer */}
                    {visibleColumns.includes('referrer') && (
                      <td className="px-2 py-2">
                        {examination.referrer ? 
                          `${examination.referrer.firstName} ${examination.referrer.lastName}` : 
                          '-'
                        }
                      </td>
                    )}

                    {/* Assigned To */}
                    {visibleColumns.includes('assignedTo') && (
                      <td className="px-2 py-2">
                        {examination.assignedTo ? 
                          `${examination.assignedTo.firstName} ${examination.assignedTo.lastName}` : 
                          '-'
                        }
                      </td>
                    )}

                    {/* Priority */}
                    {visibleColumns.includes('priority') && (
                      <td className="px-2 py-2">
                        <span className={cn(
                          'px-2 py-1 text-xs rounded',
                          examination.priority === 'EMERGENCY' && 'bg-red-100 text-red-800',
                          examination.priority === 'URGENT' && 'bg-orange-100 text-orange-800',
                          examination.priority === 'HIGH' && 'bg-yellow-100 text-yellow-800',
                          examination.priority === 'NORMAL' && 'bg-gray-100 text-gray-800',
                          examination.priority === 'LOW' && 'bg-blue-100 text-blue-800'
                        )}>
                          {examination.priority}
                        </span>
                      </td>
                    )}

                    {/* Images */}
                    {visibleColumns.includes('images') && (
                      <td className="px-2 py-2 text-center">
                        {examination.imagesAvailable ? (
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            onClick={() => window.open(`/viewer/${examination.studyInstanceUID}`, '_blank')}
                            title="Ouvrir le visualiseur"
                          >
                            🖼️
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Report */}
                    {visibleColumns.includes('report') && (
                      <td className="px-2 py-2 text-center">
                        {examination.reports && examination.reports.length > 0 ? (
                          <div className={cn(
                            'w-3 h-3 rounded-full',
                            examination.reports[0].status === 'FINAL' && 'bg-green-500',
                            examination.reports[0].status === 'PRELIMINARY' && 'bg-yellow-500',
                            examination.reports[0].status === 'DRAFT' && 'bg-orange-500'
                          )} title={`Rapport: ${examination.reports[0].status}`} />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}

                    {/* Comments */}
                    {visibleColumns.includes('comments') && (
                      <td className="px-2 py-2 text-center">
                        {examination.comments && examination.comments.length > 0 ? (
                          <span title={examination.comments.join(', ')}>💬</span>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}

                    {/* Actions */}
                    {visibleColumns.includes('actions') && (
                      <td className={cn(
                        'px-2 py-2 sticky right-0 bg-white',
                        selectedRows.includes(examination.id) && 'bg-blue-50'
                      )}>
                        <ActionButtons examination={examination} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur{' '}
              {pagination.total} résultats
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onParamsChange({ page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              
              <span className="px-3 py-1 text-xs bg-blue-600 text-white rounded">
                {pagination.page} / {pagination.totalPages}
              </span>
              
              <button
                onClick={() => onParamsChange({ page: Math.min(pagination.totalPages, pagination.page + 1) })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
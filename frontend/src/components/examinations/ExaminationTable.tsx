'use client';

import { useState } from 'react';
import { Examination } from '@/types';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/worklist/StatusIndicator';
import { ModalityBadge } from '@/components/worklist/ModalityBadge';
import { formatDate, formatTime, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { examinationsApi } from '@/lib/api';
import { ViewerService } from '@/services/viewerService';
import toast from 'react-hot-toast';

interface ExaminationTableProps {
  examinations: Examination[];
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
  onRefresh: () => void;
}

export function ExaminationTable({ 
  examinations, 
  pagination, 
  isLoading, 
  onPageChange, 
  onSort,
  currentSort,
  onRefresh
}: ExaminationTableProps) {
  const [selectedExaminations, setSelectedExaminations] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectedExaminations(checked ? examinations.map(e => e.id) : []);
  };

  const handleSelectExamination = (examinationId: string, checked: boolean) => {
    setSelectedExaminations(prev => 
      checked 
        ? [...prev, examinationId]
        : prev.filter(id => id !== examinationId)
    );
  };

  const getSortIcon = (columnId: string) => {
    if (currentSort.sortBy !== columnId) return '↕️';
    return currentSort.sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleStatusChange = async (examinationId: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      await examinationsApi.update(examinationId, { status: newStatus });
      toast.success('Statut mis à jour');
      onRefresh();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (examinationId: string, newPriority: string) => {
    try {
      setIsUpdating(true);
      await examinationsApi.update(examinationId, { priority: newPriority });
      toast.success('Priorité mise à jour');
      onRefresh();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de la priorité');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedExaminations.length === 0) return;

    try {
      setIsUpdating(true);
      await examinationsApi.bulkAction(action, selectedExaminations);
      toast.success(`Action "${action}" appliquée à ${selectedExaminations.length} examen(s)`);
      setSelectedExaminations([]);
      onRefresh();
    } catch (error: any) {
      toast.error('Erreur lors de l\'action groupée');
    } finally {
      setIsUpdating(false);
    }
  };

  const openViewer = async (examination: Examination) => {
    const viewerStatus = ViewerService.getViewerStatus(examination);
    
    if (!viewerStatus.available) {
      toast.error(viewerStatus.reason || 'Impossible d\'ouvrir le visualiseur');
      return;
    }

    setIsUpdating(true);
    try {
      await ViewerService.openExaminationInViewer(examination);
    } catch (error) {
      // Error handling is done in ViewerService
      console.error('Viewer error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const viewExamination = (examinationId: string) => {
    window.open(`/examinations/${examinationId}`, '_blank');
  };

  const editExamination = (examinationId: string) => {
    window.open(`/examinations/${examinationId}/edit`, '_blank');
  };

  const createReport = (examinationId: string) => {
    window.open(`/reports/new?examinationId=${examinationId}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Bulk Actions Toolbar */}
      {selectedExaminations.length > 0 && (
        <div className="bg-blue-50 border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedExaminations.length} examen{selectedExaminations.length > 1 ? 's' : ''} sélectionné{selectedExaminations.length > 1 ? 's' : ''}
            </span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('assign')}
                disabled={isUpdating}
              >
                👨‍⚕️ Assigner
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('change-status')}
                disabled={isUpdating}
              >
                📊 Changer statut
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkAction('change-priority')}
                disabled={isUpdating}
              >
                ⚡ Priorité
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSelectedExaminations([])}
              >
                ✕ Désélectionner
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedExaminations.length === examinations.length && examinations.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded"
                />
              </th>
              
              <th className="w-12 px-2 py-3 text-center font-semibold">Statut</th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('accessionNumber')}
              >
                <div className="flex items-center justify-between">
                  N° Accession {getSortIcon('accessionNumber')}
                </div>
              </th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('scheduledDate')}
              >
                <div className="flex items-center justify-between">
                  Date/Heure {getSortIcon('scheduledDate')}
                </div>
              </th>
              
              <th className="px-4 py-3 text-left font-semibold">Patient</th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('modality')}
              >
                <div className="flex items-center justify-between">
                  Modalité {getSortIcon('modality')}
                </div>
              </th>
              
              <th className="px-4 py-3 text-left font-semibold">Examen</th>
              
              <th 
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => onSort('priority')}
              >
                <div className="flex items-center justify-between">
                  Priorité {getSortIcon('priority')}
                </div>
              </th>
              
              <th className="px-4 py-3 text-left font-semibold">Radiologue</th>
              
              <th className="px-4 py-3 text-left font-semibold">Images</th>
              <th className="px-4 py-3 text-left font-semibold">Rapport</th>
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
                  {[...Array(11)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : examinations.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="text-4xl">🏥</div>
                    <div>Aucun examen trouvé</div>
                    <div className="text-sm">Essayez de modifier vos critères de recherche</div>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              examinations.map((examination) => (
                <tr 
                  key={examination.id}
                  className={cn(
                    'border-b hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedExaminations.includes(examination.id) && 'bg-blue-50'
                  )}
                  onClick={() => viewExamination(examination.id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedExaminations.includes(examination.id)}
                      onChange={(e) => handleSelectExamination(examination.id, e.target.checked)}
                      className="rounded"
                    />
                  </td>
                  
                  <td className="px-2 py-3 text-center">
                    <div className="relative">
                      <StatusIndicator 
                        status={examination.status} 
                        priority={examination.priority} 
                      />
                      {isUpdating && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                          <div className="animate-spin w-3 h-3 border border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="font-mono text-sm">
                      {examination.accessionNumber}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div>{formatDate(examination.scheduledDate)}</div>
                      <div className="text-gray-500">{formatTime(examination.scheduledDate)}</div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium">
                        {examination.patient.lastName.toUpperCase()}, {examination.patient.firstName}
                      </div>
                      <div className="text-gray-500">
                        {examination.patient.gender} • {calculateAge(examination.patient.birthDate)} ans
                      </div>
                      {examination.patient.warnings && examination.patient.warnings.length > 0 && (
                        <div className="flex space-x-1 mt-1">
                          {examination.patient.warnings.includes('allergy') && (
                            <span className="text-red-500" title="Allergie">⚠️</span>
                          )}
                          {examination.patient.warnings.includes('pregnancy') && (
                            <span className="text-pink-500" title="Grossesse">🤱</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <ModalityBadge modality={examination.modality} />
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium">{examination.examType}</div>
                      <div className="text-gray-500">{examination.bodyPart}</div>
                      {examination.contrast && (
                        <div className="text-orange-600 text-xs">+ Contraste</div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={examination.priority}
                      onChange={(e) => handlePriorityChange(examination.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1"
                      disabled={isUpdating}
                    >
                      <option value="LOW">Basse</option>
                      <option value="NORMAL">Normale</option>
                      <option value="HIGH">Élevée</option>
                      <option value="URGENT">Urgent</option>
                      <option value="EMERGENCY">Urgence</option>
                    </select>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {examination.assignedTo ? 
                        `${examination.assignedTo.firstName} ${examination.assignedTo.lastName}` : 
                        <span className="text-gray-400">Non assigné</span>
                      }
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const viewerStatus = ViewerService.getViewerStatus(examination);
                      
                      if (!viewerStatus.available) {
                        return (
                          <span 
                            className="text-gray-400 cursor-help" 
                            title={viewerStatus.reason || 'Visualiseur non disponible'}
                          >
                            -
                          </span>
                        );
                      }
                      
                      return (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openViewer(examination)}
                          disabled={isUpdating}
                          className={cn(
                            "p-1 h-auto text-blue-600 hover:text-blue-800 transition-all",
                            isUpdating && "opacity-50 cursor-not-allowed"
                          )}
                          title="Ouvrir le visualiseur DICOM"
                        >
                          {isUpdating ? (
                            <div className="animate-spin w-4 h-4 border border-blue-500 border-t-transparent rounded-full" />
                          ) : (
                            '🖼️'
                          )}
                        </Button>
                      );
                    })()}
                  </td>
                  
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {examination.reports && examination.reports.length > 0 ? (
                      <div className={cn(
                        'w-3 h-3 rounded-full mx-auto',
                        examination.reports[0].status === 'FINAL' && 'bg-green-500',
                        examination.reports[0].status === 'PRELIMINARY' && 'bg-yellow-500',
                        examination.reports[0].status === 'DRAFT' && 'bg-orange-500'
                      )} title={`Rapport: ${examination.reports[0].status}`} />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => createReport(examination.id)}
                        className="p-1 h-auto text-green-600 hover:text-green-800"
                        title="Créer un rapport"
                      >
                        📝
                      </Button>
                    )}
                  </td>
                  
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewExamination(examination.id)}
                        className="p-1 h-auto text-blue-600 hover:text-blue-800"
                        title="Voir l'examen"
                      >
                        👁️
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editExamination(examination.id)}
                        className="p-1 h-auto text-orange-600 hover:text-orange-800"
                        title="Modifier"
                      >
                        ✏️
                      </Button>

                      {/* Status change dropdown */}
                      <select
                        value={examination.status}
                        onChange={(e) => handleStatusChange(examination.id, e.target.value)}
                        className="text-xs border rounded px-1 py-0.5 ml-2"
                        disabled={isUpdating}
                        title="Changer le statut"
                      >
                        <option value="SCHEDULED">Programmé</option>
                        <option value="IN_PROGRESS">En cours</option>
                        <option value="ACQUIRED">Acquis</option>
                        <option value="REPORTING">En lecture</option>
                        <option value="VALIDATED">Validé</option>
                        <option value="CANCELLED">Annulé</option>
                      </select>
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
              {pagination.total} examens
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
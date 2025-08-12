'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  UserIcon, 
  CalendarIcon, 
  AlertTriangleIcon, 
  XCircleIcon,
  CheckCircleIcon,
  DownloadIcon,
  PrinterIcon,
  MoreHorizontalIcon
} from 'lucide-react';
import { Examination, ExaminationStatus, Priority } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface BulkActionsProps {
  selectedExaminations: Examination[];
  selectedIds: string[];
  onClearSelection: () => void;
  onBulkUpdate?: (action: string, data: any) => Promise<void>;
}

export function BulkActions({ 
  selectedExaminations, 
  selectedIds, 
  onClearSelection,
  onBulkUpdate 
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const handleBulkAction = async (action: string, data?: any) => {
    if (!onBulkUpdate) {
      toast.error('Action non disponible');
      return;
    }

    setIsProcessing(true);
    try {
      await onBulkUpdate(action, { ids: selectedIds, ...data });
      toast.success(`Action "${action}" appliquée à ${selectedIds.length} examen(s)`);
      onClearSelection();
    } catch (error) {
      toast.error(`Erreur lors de l'action "${action}"`);
      console.error('Bulk action error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignRadiologist = async (radiologistId: string) => {
    await handleBulkAction('assign', { radiologistId });
    setShowAssignModal(false);
  };

  const handleChangeStatus = async (status: ExaminationStatus) => {
    await handleBulkAction('changeStatus', { status });
    setShowStatusModal(false);
  };

  const handleChangePriority = async (priority: Priority) => {
    await handleBulkAction('changePriority', { priority });
    setShowPriorityModal(false);
  };

  const handleReschedule = async (newDate: string) => {
    await handleBulkAction('reschedule', { scheduledDate: newDate });
    setShowRescheduleModal(false);
  };

  const handleExport = async (format: string) => {
    await handleBulkAction('export', { format });
  };

  const handleCancel = async () => {
    if (confirm(`Êtes-vous sûr de vouloir annuler ${selectedIds.length} examen(s) ?`)) {
      await handleBulkAction('cancel');
    }
  };

  const radiologists = [
    { id: 'dr-martin', name: 'Dr. Martin' },
    { id: 'dr-dubois', name: 'Dr. Dubois' },
    { id: 'dr-bernard', name: 'Dr. Bernard' },
    { id: 'unassigned', name: 'Non assigné' },
  ];

  const statusOptions = [
    { value: 'SCHEDULED', label: 'Programmé', color: 'bg-blue-100 text-blue-800' },
    { value: 'IN_PROGRESS', label: 'En cours', color: 'bg-orange-100 text-orange-800' },
    { value: 'ACQUIRED', label: 'Acquis', color: 'bg-green-100 text-green-800' },
    { value: 'REPORTING', label: 'En lecture', color: 'bg-purple-100 text-purple-800' },
    { value: 'VALIDATED', label: 'Validé', color: 'bg-emerald-100 text-emerald-800' },
  ];

  const priorityOptions = [
    { value: 'EMERGENCY', label: 'Urgence', color: 'bg-red-100 text-red-800' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-800' },
    { value: 'HIGH', label: 'Élevée', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'NORMAL', label: 'Normale', color: 'bg-gray-100 text-gray-800' },
    { value: 'LOW', label: 'Basse', color: 'bg-blue-100 text-blue-800' },
  ];

  if (selectedIds.length === 0) return null;

  return (
    <div className="bg-blue-50 border-b px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Selection info */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} examen{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
          
          {/* Quick stats */}
          <div className="flex items-center space-x-2 text-xs text-blue-600">
            {selectedExaminations.some(e => e.priority === 'EMERGENCY') && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                {selectedExaminations.filter(e => e.priority === 'EMERGENCY').length} urgence(s)
              </span>
            )}
            {selectedExaminations.some(e => !e.assignedTo) && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                {selectedExaminations.filter(e => !e.assignedTo).length} non assigné(s)
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Assign radiologist */}
          <Popover open={showAssignModal} onOpenChange={setShowAssignModal}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                disabled={isProcessing}
              >
                <UserIcon className="h-3 w-3 mr-1" />
                Assigner
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Assigner à :</h4>
                {radiologists.map(radiologist => (
                  <button
                    key={radiologist.id}
                    onClick={() => handleAssignRadiologist(radiologist.id)}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                    disabled={isProcessing}
                  >
                    {radiologist.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Change status */}
          <Popover open={showStatusModal} onOpenChange={setShowStatusModal}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                disabled={isProcessing}
              >
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                Statut
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Changer le statut :</h4>
                {statusOptions.map(status => (
                  <button
                    key={status.value}
                    onClick={() => handleChangeStatus(status.value as ExaminationStatus)}
                    className={cn(
                      'w-full text-left px-2 py-1 text-xs rounded',
                      status.color,
                      'hover:opacity-80'
                    )}
                    disabled={isProcessing}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Change priority */}
          <Popover open={showPriorityModal} onOpenChange={setShowPriorityModal}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                disabled={isProcessing}
              >
                <AlertTriangleIcon className="h-3 w-3 mr-1" />
                Priorité
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Changer la priorité :</h4>
                {priorityOptions.map(priority => (
                  <button
                    key={priority.value}
                    onClick={() => handleChangePriority(priority.value as Priority)}
                    className={cn(
                      'w-full text-left px-2 py-1 text-xs rounded',
                      priority.color,
                      'hover:opacity-80'
                    )}
                    disabled={isProcessing}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Reschedule */}
          <Popover open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                disabled={isProcessing}
              >
                <CalendarIcon className="h-3 w-3 mr-1" />
                Reprogrammer
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Nouvelle date :</h4>
                <input
                  type="datetime-local"
                  className="w-full px-2 py-1 text-xs border rounded"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleReschedule(e.target.value);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Export */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                disabled={isProcessing}
              >
                <DownloadIcon className="h-3 w-3 mr-1" />
                Exporter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  disabled={isProcessing}
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  disabled={isProcessing}
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  disabled={isProcessing}
                >
                  PDF
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Print */}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => handleBulkAction('print')}
            disabled={isProcessing}
          >
            <PrinterIcon className="h-3 w-3 mr-1" />
            Imprimer
          </Button>

          {/* More actions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2"
                disabled={isProcessing}
              >
                <MoreHorizontalIcon className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <div className="space-y-2">
                <button
                  onClick={() => handleBulkAction('duplicate')}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  disabled={isProcessing}
                >
                  Dupliquer
                </button>
                <button
                  onClick={() => handleBulkAction('addComment')}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                  disabled={isProcessing}
                >
                  Ajouter note
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleCancel}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-red-100 text-red-600 rounded"
                  disabled={isProcessing}
                >
                  Annuler examens
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear selection */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-gray-500 hover:text-gray-700"
            onClick={onClearSelection}
          >
            <XCircleIcon className="h-3 w-3 mr-1" />
            Désélectionner
          </Button>
        </div>
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-xs text-blue-600">Traitement en cours...</span>
          </div>
        </div>
      )}
    </div>
  );
}
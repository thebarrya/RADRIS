'use client';

import { useState } from 'react';
import { Examination } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/worklist/StatusIndicator';
import { ModalityBadge } from '@/components/worklist/ModalityBadge';
import { formatDate, formatTime, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { examinationsApi } from '@/lib/api';
import { ViewerService } from '@/services/viewerService';
import { DicomViewer } from './DicomViewer';
import toast from 'react-hot-toast';

interface ExaminationDetailViewProps {
  examination: Examination;
  onExaminationUpdated: () => void;
}

export function ExaminationDetailView({ examination, onExaminationUpdated }: ExaminationDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'patient' | 'reports' | 'history' | 'dicom'>('info');
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Programmé';
      case 'IN_PROGRESS': return 'En cours';
      case 'ACQUIRED': return 'Acquis';
      case 'REPORTING': return 'En lecture';
      case 'VALIDATED': return 'Validé';
      case 'CANCELLED': return 'Annulé';
      case 'EMERGENCY': return 'Urgence';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Basse';
      case 'NORMAL': return 'Normale';
      case 'HIGH': return 'Élevée';
      case 'URGENT': return 'Urgent';
      case 'EMERGENCY': return 'Urgence';
      default: return priority;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800';
      case 'NORMAL': return 'bg-blue-100 text-blue-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'EMERGENCY': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdating(true);
      await examinationsApi.update(examination.id, { status: newStatus });
      toast.success('Statut mis à jour');
      onExaminationUpdated();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      setIsUpdating(true);
      await examinationsApi.update(examination.id, { priority: newPriority });
      toast.success('Priorité mise à jour');
      onExaminationUpdated();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour de la priorité');
    } finally {
      setIsUpdating(false);
    }
  };

  const openViewer = async () => {
    const viewerStatus = ViewerService.getViewerStatus(examination);
    
    if (!viewerStatus.available) {
      toast.error(viewerStatus.reason || 'Impossible d\'ouvrir le visualiseur');
      return;
    }

    setIsUpdating(true);
    try {
      await ViewerService.openExaminationInViewer(examination);
    } catch (error) {
      console.error('Viewer error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => window.history.back()}
                className="p-2"
              >
                ← Retour
              </Button>
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Examen #{examination.accessionNumber}
                  </h1>
                  <StatusIndicator 
                    status={examination.status} 
                    priority={examination.priority} 
                  />
                  <ModalityBadge modality={examination.modality} />
                </div>
                <p className="text-sm text-gray-600">
                  {examination.examType} • {examination.bodyPart} • 
                  Programmé le {formatDate(examination.scheduledDate)} à {formatTime(examination.scheduledDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {(() => {
                const viewerStatus = ViewerService.getViewerStatus(examination);
                if (viewerStatus.available) {
                  return (
                    <Button
                      onClick={openViewer}
                      disabled={isUpdating}
                      variant="outline"
                    >
                      🖼️ Visualiseur
                    </Button>
                  );
                }
                return null;
              })()}
              
              <Button
                onClick={() => window.open(`/examinations/${examination.id}/edit`, '_self')}
                variant="outline"
              >
                ✏️ Modifier
              </Button>
              
              <Button
                onClick={() => window.open(`/reports/new?examinationId=${examination.id}`, '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                📝 Créer rapport
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Priority/Urgency Banner */}
      {(examination.priority === 'URGENT' || examination.priority === 'EMERGENCY') && (
        <div className={cn(
          'border-b',
          examination.priority === 'EMERGENCY' ? 'bg-red-100 border-red-200' : 'bg-orange-100 border-orange-200'
        )}>
          <div className="px-6 py-3">
            <div className="flex items-center space-x-2">
              <span className={cn(
                'font-medium',
                examination.priority === 'EMERGENCY' ? 'text-red-800' : 'text-orange-800'
              )}>
                🚨 Examen {getPriorityLabel(examination.priority)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              📋 Informations
            </button>
            
            <button
              onClick={() => setActiveTab('patient')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'patient'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              👤 Patient
            </button>
            
            <button
              onClick={() => setActiveTab('reports')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              📝 Rapports ({examination.reports?.length || 0})
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              📚 Historique
            </button>
            
            <button
              onClick={() => setActiveTab('dicom')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'dicom'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              🖼️ Images DICOM
              {examination.imagesAvailable && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Examination Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de l'examen</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">N° Accession</label>
                    <p className="text-gray-900 font-mono">{examination.accessionNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Modalité</label>
                    <div className="mt-1">
                      <ModalityBadge modality={examination.modality} />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Type d'examen</label>
                    <p className="text-gray-900">{examination.examType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Région anatomique</label>
                    <p className="text-gray-900">{examination.bodyPart}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Procédure</label>
                  <p className="text-gray-900">{examination.procedure}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Contraste</label>
                    <p className="text-gray-900">
                      {examination.contrast ? (
                        <span className="text-orange-600">✓ Avec contraste</span>
                      ) : (
                        <span className="text-gray-600">Sans contraste</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Images disponibles</label>
                    <p className="text-gray-900">
                      {examination.imagesAvailable ? (
                        <span className="text-green-600">✓ Disponibles</span>
                      ) : (
                        <span className="text-gray-600">Non disponibles</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Status and Priority */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut et priorité</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Statut</label>
                  <select
                    value={examination.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isUpdating}
                  >
                    <option value="SCHEDULED">Programmé</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="ACQUIRED">Acquis</option>
                    <option value="REPORTING">En lecture</option>
                    <option value="VALIDATED">Validé</option>
                    <option value="CANCELLED">Annulé</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Priorité</label>
                  <select
                    value={examination.priority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isUpdating}
                  >
                    <option value="LOW">Basse</option>
                    <option value="NORMAL">Normale</option>
                    <option value="HIGH">Élevée</option>
                    <option value="URGENT">Urgent</option>
                    <option value="EMERGENCY">Urgence</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Radiologue assigné</label>
                  <p className="text-gray-900">
                    {examination.assignedTo ? 
                      `${examination.assignedTo.firstName} ${examination.assignedTo.lastName}` : 
                      <span className="text-gray-400">Non assigné</span>
                    }
                  </p>
                </div>
              </div>
            </Card>

            {/* Scheduling */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Planification</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date/Heure programmée</label>
                  <p className="text-gray-900">
                    {formatDate(examination.scheduledDate)} à {formatTime(examination.scheduledDate)}
                  </p>
                </div>
                
                {examination.accessionTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Heure d'accession</label>
                    <p className="text-gray-900">{formatTime(examination.accessionTime)}</p>
                  </div>
                )}
                
                {examination.acquisitionTime && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Heure d'acquisition</label>
                    <p className="text-gray-900">{formatTime(examination.acquisitionTime)}</p>
                  </div>
                )}
                
                {examination.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Terminé le</label>
                    <p className="text-gray-900">{formatDate(examination.completedAt)} à {formatTime(examination.completedAt)}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Clinical Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations cliniques</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Indication clinique</label>
                  <p className="text-gray-900">
                    {examination.clinicalInfo || <span className="text-gray-400">Non renseignée</span>}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Préparation</label>
                  <p className="text-gray-900">
                    {examination.preparation || <span className="text-gray-400">Aucune préparation spécifique</span>}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Médecin référent</label>
                  <p className="text-gray-900">
                    {examination.referrer ? 
                      `${examination.referrer.firstName} ${examination.referrer.lastName}` : 
                      <span className="text-gray-400">Non renseigné</span>
                    }
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'patient' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Informations patient</h3>
              <Button
                onClick={() => window.open(`/patients/${examination.patient.id}`, '_blank')}
                variant="outline"
              >
                👁️ Voir le dossier complet
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nom complet</label>
                  <p className="text-gray-900 font-medium">
                    {examination.patient.firstName} {examination.patient.lastName.toUpperCase()}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date de naissance</label>
                    <p className="text-gray-900">{formatDate(examination.patient.birthDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Âge</label>
                    <p className="text-gray-900">{calculateAge(examination.patient.birthDate)} ans</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Genre</label>
                  <p className="text-gray-900">
                    {examination.patient.gender === 'M' ? 'Homme' : 
                     examination.patient.gender === 'F' ? 'Femme' : 'Autre'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Téléphone</label>
                  <p className="text-gray-900">{examination.patient.phoneNumber || 'Non renseigné'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{examination.patient.email || 'Non renseigné'}</p>
                </div>
                
                {examination.patient.warnings && examination.patient.warnings.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Alertes médicales</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {examination.patient.warnings.map((warning) => (
                        <Badge key={warning} variant="secondary" className="bg-yellow-100 text-yellow-800">
                          ⚠️ {warning}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'reports' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Rapports</h3>
              <Button
                onClick={() => window.open(`/reports/new?examinationId=${examination.id}`, '_blank')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                📝 Nouveau rapport
              </Button>
            </div>
            
            {examination.reports && examination.reports.length > 0 ? (
              <div className="space-y-4">
                {examination.reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge className={cn(
                            report.status === 'FINAL' && 'bg-green-100 text-green-800',
                            report.status === 'PRELIMINARY' && 'bg-yellow-100 text-yellow-800',
                            report.status === 'DRAFT' && 'bg-orange-100 text-orange-800'
                          )}>
                            {report.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Créé le {formatDate(report.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Par {report.createdBy.firstName} {report.createdBy.lastName}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/reports/${report.id}`, '_blank')}
                      >
                        Voir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-3">📝</div>
                <p>Aucun rapport créé</p>
                <p className="text-sm mt-1">Créez le premier rapport pour cet examen</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'history' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique des modifications</h3>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Examen créé</p>
                    <p className="text-sm text-gray-600">
                      Par {examination.createdBy.firstName} {examination.createdBy.lastName}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(examination.createdAt)} à {formatTime(examination.createdAt)}
                  </span>
                </div>
              </div>
              
              {examination.updatedAt !== examination.createdAt && (
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Dernière modification</p>
                      <p className="text-sm text-gray-600">Informations mises à jour</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(examination.updatedAt)} à {formatTime(examination.updatedAt)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'dicom' && (
          <DicomViewer 
            examinationId={examination.id} 
            onSync={onExaminationUpdated}
          />
        )}
      </div>
    </div>
  );
}
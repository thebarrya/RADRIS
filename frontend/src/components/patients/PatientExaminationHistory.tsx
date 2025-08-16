'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/utils/dateUtils';
import { examinationsApi } from '@/lib/api';
import { useNavigation } from '@/hooks/useNavigation';

interface Examination {
  id: string;
  accessionNumber: string;
  scheduledDate: string;
  status: string;
  priority: string;
  modality: string;
  examType: string;
  bodyPart: string;
  procedure: string;
  contrast: boolean;
  clinicalInfo?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  referrer?: {
    firstName: string;
    lastName: string;
  };
  imagesAvailable: boolean;
}

interface PatientExaminationHistoryProps {
  patientId: string;
}

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-gray-100 text-gray-800',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
  STAT: 'bg-red-200 text-red-900',
};

const MODALITY_ICONS = {
  CR: '📸',
  CT: '🔄',
  MR: '🧲',
  US: '📡',
  XA: '💉',
  MG: '🎯',
  DX: '📱',
  RF: '📺',
  NM: '☢️',
  PT: '⚛️',
  OTHER: '🔬',
};

export function PatientExaminationHistory({ patientId }: PatientExaminationHistoryProps) {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { navigateTo } = useNavigation();

  useEffect(() => {
    fetchExaminations();
  }, [patientId]);

  const fetchExaminations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await examinationsApi.getWorklist({
        patientId,
        sortBy: 'scheduledDate',
        sortOrder: 'desc',
        limit: 50
      });
      
      setExaminations(response.data.examinations || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des examens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExaminationClick = (examination: Examination) => {
    navigateTo(`/examinations/${examination.id}`);
  };

  const handleViewImages = (examination: Examination) => {
    if (examination.imagesAvailable) {
      navigateTo(`/examinations/${examination.id}/viewer`);
    }
  };

  const handleScheduleExam = () => {
    navigateTo(`/examinations/schedule?patientId=${patientId}`);
  };

  const displayedExaminations = showAll ? examinations : examinations.slice(0, 5);
  
  const recentExaminations = examinations.filter(exam => {
    const examDate = new Date(exam.scheduledDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return examDate >= thirtyDaysAgo;
  });

  const completedExaminations = examinations.filter(exam => exam.status === 'COMPLETED');
  const pendingExaminations = examinations.filter(exam => 
    exam.status === 'SCHEDULED' || exam.status === 'IN_PROGRESS'
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <Button onClick={fetchExaminations} variant="outline">
          Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{examinations.length}</div>
            <div className="text-sm text-gray-600">Total examens</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{completedExaminations.length}</div>
            <div className="text-sm text-gray-600">Terminés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{pendingExaminations.length}</div>
            <div className="text-sm text-gray-600">En attente</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{recentExaminations.length}</div>
            <div className="text-sm text-gray-600">Récents (30j)</div>
          </div>
        </div>
      </Card>

      {/* Examination List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Historique des examens</h3>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleScheduleExam();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            📅 Programmer un examen
          </Button>
        </div>

        {examinations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">Aucun examen enregistré pour ce patient</div>
            <Button onClick={(e) => {
              e.stopPropagation();
              handleScheduleExam();
            }} variant="outline">
              Programmer le premier examen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedExaminations.map((examination) => (
              <div
                key={examination.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleExaminationClick(examination)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-lg">
                        {MODALITY_ICONS[examination.modality as keyof typeof MODALITY_ICONS] || MODALITY_ICONS.OTHER}
                      </span>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {examination.examType} - {examination.bodyPart}
                        </div>
                        <div className="text-sm text-gray-600">
                          {examination.accessionNumber} • {examination.procedure}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span>📅 {formatDate(examination.scheduledDate)}</span>
                      {examination.assignedTo && (
                        <span>👨‍⚕️ Dr. {examination.assignedTo.lastName}</span>
                      )}
                      {examination.referrer && (
                        <span>📝 Prescrit par Dr. {examination.referrer.lastName}</span>
                      )}
                      {examination.contrast && (
                        <span className="text-orange-600">💉 Avec contraste</span>
                      )}
                    </div>

                    {examination.clinicalInfo && (
                      <div className="text-sm text-gray-700 mb-2">
                        <strong>Info clinique:</strong> {examination.clinicalInfo}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Badge className={STATUS_COLORS[examination.status as keyof typeof STATUS_COLORS]}>
                        {examination.status === 'SCHEDULED' && 'Programmé'}
                        {examination.status === 'IN_PROGRESS' && 'En cours'}
                        {examination.status === 'COMPLETED' && 'Terminé'}
                        {examination.status === 'CANCELLED' && 'Annulé'}
                        {examination.status === 'ARCHIVED' && 'Archivé'}
                      </Badge>
                      
                      <Badge className={PRIORITY_COLORS[examination.priority as keyof typeof PRIORITY_COLORS]}>
                        {examination.priority === 'LOW' && 'Faible'}
                        {examination.priority === 'NORMAL' && 'Normal'}
                        {examination.priority === 'HIGH' && 'Élevé'}
                        {examination.priority === 'URGENT' && 'Urgent'}
                        {examination.priority === 'STAT' && 'STAT'}
                      </Badge>
                      
                      <Badge variant="outline">
                        {examination.modality}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExaminationClick(examination);
                      }}
                    >
                      Détails
                    </Button>
                    
                    {examination.imagesAvailable && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewImages(examination);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        📸 Images
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {examinations.length > 5 && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(!showAll);
                  }}
                >
                  {showAll ? 'Voir moins' : `Voir tous les ${examinations.length} examens`}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Examination, Modality } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusIndicator } from '@/components/worklist/StatusIndicator';
import { ModalityBadge } from '@/components/worklist/ModalityBadge';
import { CreateExaminationModal } from './CreateExaminationModal';
import { formatTime, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { examinationsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface ExaminationSchedulerProps {
  examinations: Examination[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onExaminationUpdated: () => void;
  isLoading: boolean;
}

interface TimeSlot {
  time: string;
  examinations: Examination[];
  available: boolean;
}

const WORKING_HOURS = {
  start: 8,
  end: 18,
  slotDuration: 30, // minutes
};

const MODALITY_COLORS: Record<Modality, string> = {
  'CR': 'bg-blue-100 border-blue-300',
  'CT': 'bg-green-100 border-green-300',
  'MR': 'bg-purple-100 border-purple-300',
  'US': 'bg-yellow-100 border-yellow-300',
  'MG': 'bg-pink-100 border-pink-300',
  'RF': 'bg-orange-100 border-orange-300',
  'DX': 'bg-indigo-100 border-indigo-300',
  'NM': 'bg-red-100 border-red-300',
  'PT': 'bg-teal-100 border-teal-300',
  'XA': 'bg-gray-100 border-gray-300',
};

export function ExaminationScheduler({
  examinations,
  selectedDate,
  onDateChange,
  onExaminationUpdated,
  isLoading
}: ExaminationSchedulerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Generate time slots for the day
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = WORKING_HOURS.start * 60; // Convert to minutes
    const endTime = WORKING_HOURS.end * 60;
    
    for (let time = startTime; time < endTime; time += WORKING_HOURS.slotDuration) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Find examinations for this time slot
      const slotExaminations = examinations.filter(exam => {
        const examTime = new Date(exam.scheduledDate);
        const examHours = examTime.getHours();
        const examMinutes = examTime.getMinutes();
        const examTimeInMinutes = examHours * 60 + examMinutes;
        
        return examTimeInMinutes >= time && examTimeInMinutes < time + WORKING_HOURS.slotDuration;
      });
      
      slots.push({
        time: timeString,
        examinations: slotExaminations,
        available: slotExaminations.length < 3, // Max 3 examinations per slot
      });
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const handleTodayClick = () => {
    onDateChange(new Date());
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setShowCreateModal(true);
  };

  const handleStatusChange = async (examinationId: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      await examinationsApi.update(examinationId, { status: newStatus });
      toast.success('Statut mis à jour');
      onExaminationUpdated();
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExaminationCreated = () => {
    setShowCreateModal(false);
    setSelectedTimeSlot('');
    onExaminationUpdated();
  };

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Date Navigation */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => handleDateNavigation('prev')}
              className="p-2"
            >
              ←
            </Button>
            
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {formatDateHeader(selectedDate)}
              </h2>
              {isToday(selectedDate) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 mt-1">
                  Aujourd'hui
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => handleDateNavigation('next')}
              className="p-2"
            >
              →
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleTodayClick}
              size="sm"
            >
              📅 Aujourd'hui
            </Button>
            
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => onDateChange(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {timeSlots.map((slot) => (
              <Card
                key={slot.time}
                className={cn(
                  'p-4 cursor-pointer transition-all hover:shadow-md',
                  slot.available && !isPastDate(selectedDate) && 'hover:bg-green-50 border-green-200',
                  !slot.available && 'bg-gray-50',
                  isPastDate(selectedDate) && 'opacity-60'
                )}
                onClick={() => slot.available && !isPastDate(selectedDate) && handleTimeSlotClick(slot.time)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {slot.time}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    {slot.available && !isPastDate(selectedDate) ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        {isPastDate(selectedDate) ? 'Passé' : 'Complet'}
                      </Badge>
                    )}
                    
                    <span className="text-sm text-gray-500">
                      {slot.examinations.length}/3
                    </span>
                  </div>
                </div>
                
                {slot.examinations.length > 0 ? (
                  <div className="space-y-2">
                    {slot.examinations.map((examination) => (
                      <div
                        key={examination.id}
                        className={cn(
                          'p-3 rounded-lg border-l-4',
                          MODALITY_COLORS[examination.modality]
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/examinations/${examination.id}`, '_blank');
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <StatusIndicator 
                              status={examination.status} 
                              priority={examination.priority} 
                            />
                            <ModalityBadge modality={examination.modality} />
                          </div>
                          
                          <span className="text-xs text-gray-500">
                            {formatTime(examination.scheduledDate)}
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {examination.patient.lastName.toUpperCase()}, {examination.patient.firstName}
                          </div>
                          <div className="text-gray-600">
                            {examination.examType} • {examination.bodyPart}
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            {examination.patient.gender} • {calculateAge(examination.patient.birthDate)} ans
                          </div>
                        </div>
                        
                        {/* Quick Status Change */}
                        <div className="mt-2 flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={examination.status}
                            onChange={(e) => handleStatusChange(examination.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-white"
                            disabled={isUpdating}
                          >
                            <option value="SCHEDULED">Programmé</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="ACQUIRED">Acquis</option>
                            <option value="REPORTING">En lecture</option>
                            <option value="VALIDATED">Validé</option>
                            <option value="CANCELLED">Annulé</option>
                          </select>
                          
                          {examination.priority === 'URGENT' || examination.priority === 'EMERGENCY' ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                              🚨 {examination.priority === 'EMERGENCY' ? 'Urgence' : 'Urgent'}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">📅</div>
                    <p className="text-sm">Créneau libre</p>
                    {slot.available && !isPastDate(selectedDate) && (
                      <p className="text-xs mt-1">Cliquez pour programmer un examen</p>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{examinations.length}</span> examens programmés
            </div>
            
            <div className="flex items-center space-x-4">
              {['SCHEDULED', 'IN_PROGRESS', 'ACQUIRED', 'REPORTING', 'VALIDATED'].map((status) => {
                const count = examinations.filter(e => e.status === status).length;
                if (count === 0) return null;
                
                return (
                  <div key={status} className="text-sm text-gray-600">
                    <StatusIndicator status={status as any} priority="NORMAL" />
                    <span className="ml-1">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            ➕ Nouvel examen
          </Button>
        </div>
      </div>

      {/* Create Examination Modal */}
      {showCreateModal && (
        <CreateExaminationModal
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTimeSlot('');
          }}
          onExaminationCreated={handleExaminationCreated}
          preselectedDateTime={selectedTimeSlot ? 
            new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTimeSlot}:00`) : 
            undefined
          }
        />
      )}
    </div>
  );
}
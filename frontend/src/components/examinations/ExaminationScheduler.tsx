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

interface DaySchedule {
  date: Date;
  timeSlots: TimeSlot[];
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
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Generate time slots for a specific date
  const generateTimeSlotsForDate = (date: Date, examinations: Examination[]): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startTime = WORKING_HOURS.start * 60; // Convert to minutes
    const endTime = WORKING_HOURS.end * 60;
    
    for (let time = startTime; time < endTime; time += WORKING_HOURS.slotDuration) {
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      // Find examinations for this time slot on this specific date
      const slotExaminations = examinations.filter(exam => {
        const examTime = new Date(exam.scheduledDate);
        const examDate = examTime.toDateString();
        const targetDate = date.toDateString();
        
        if (examDate !== targetDate) return false;
        
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

  // Generate 3 days schedule: yesterday, today, tomorrow
  const generateThreeDaysSchedule = (): DaySchedule[] => {
    const days: DaySchedule[] = [];
    
    for (let i = -1; i <= 1; i++) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + i);
      
      const dayExaminations = examinations.filter(exam => {
        const examDate = new Date(exam.scheduledDate).toDateString();
        return examDate === date.toDateString();
      });
      
      days.push({
        date: date,
        timeSlots: generateTimeSlotsForDate(date, dayExaminations)
      });
    }
    
    return days;
  };

  const threeDaysSchedule = generateThreeDaysSchedule();

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  const handleTodayClick = () => {
    onDateChange(new Date());
  };

  const handleTimeSlotClick = (timeSlot: string, date: Date) => {
    setSelectedTimeSlot(timeSlot);
    setSelectedSlotDate(date);
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
    setSelectedSlotDate(null);
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
              <h2 className="text-lg font-semibold text-gray-900">
                Planning sur 3 jours
              </h2>
              <p className="text-sm text-gray-600">
                {formatDateHeader(threeDaysSchedule[0]?.date)} - {formatDateHeader(threeDaysSchedule[2]?.date)}
              </p>
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

      {/* Schedule Grid - 3 Days View */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 h-full">
            {threeDaysSchedule.map((daySchedule, dayIndex) => (
              <div key={daySchedule.date.toISOString()} className="flex flex-col">
                {/* Day Header */}
                <div className="bg-white border border-gray-200 rounded-t-lg p-3 border-b-0 sticky top-0 z-10">
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {daySchedule.date.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {daySchedule.date.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </p>
                    {isToday(daySchedule.date) && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mt-1">
                        Aujourd'hui
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Time Slots for this day */}
                <div className="border border-gray-200 border-t-0 rounded-b-lg overflow-hidden flex-1">
                  {daySchedule.timeSlots.map((slot) => (
                    <div
                      key={`${daySchedule.date.toISOString()}-${slot.time}`}
                      className={cn(
                        'border-b border-gray-100 last:border-b-0 transition-all hover:shadow-sm',
                        slot.available && !isPastDate(daySchedule.date) && 'hover:bg-green-50',
                        !slot.available && 'bg-gray-50',
                        isPastDate(daySchedule.date) && 'opacity-60'
                      )}
                    >
                      {/* Time Slot Header */}
                      <div 
                        className={cn(
                          'flex items-center justify-between p-2 cursor-pointer bg-white',
                          slot.available && !isPastDate(daySchedule.date) && 'hover:bg-green-50'
                        )}
                        onClick={() => slot.available && !isPastDate(daySchedule.date) && handleTimeSlotClick(slot.time, daySchedule.date)}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-900 w-12">
                            {slot.time}
                          </span>
                          
                          {slot.available && !isPastDate(daySchedule.date) ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1 py-0.5">
                              Libre
                            </Badge>
                          ) : slot.examinations.length === 0 ? (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs px-1 py-0.5">
                              Passé
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs px-1 py-0.5">
                              Complet
                            </Badge>
                          )}
                        </div>
                        
                        <span className="text-xs text-gray-500">
                          {slot.examinations.length}/3
                        </span>
                      </div>
                      
                      {/* Examinations List */}
                      {slot.examinations.length > 0 && (
                        <div className="bg-white">
                          {slot.examinations.map((examination, index) => (
                            <div
                              key={examination.id}
                              className={cn(
                                'p-2 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors',
                                MODALITY_COLORS[examination.modality],
                                index < slot.examinations.length - 1 && 'border-b border-gray-100'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/examinations/${examination.id}`, '_blank');
                              }}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1">
                                    <StatusIndicator 
                                      status={examination.status} 
                                      priority={examination.priority} 
                                    />
                                    <ModalityBadge modality={examination.modality} />
                                  </div>
                                  
                                  {examination.priority === 'URGENT' || examination.priority === 'EMERGENCY' ? (
                                    <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs px-1 py-0.5">
                                      🚨
                                    </Badge>
                                  ) : null}
                                </div>
                                
                                <div>
                                  <div className="text-xs font-medium text-gray-900 truncate">
                                    {examination.patient.lastName.toUpperCase()}, {examination.patient.firstName}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {examination.examType}
                                  </div>
                                </div>

                                {/* Quick Status Change */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={examination.status}
                                    onChange={(e) => handleStatusChange(examination.id, e.target.value)}
                                    className="text-xs border rounded px-1 py-0.5 bg-white w-full"
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
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{examinations.length}</span> examens sur 3 jours
            </div>
            
            <div className="flex items-center space-x-4">
              {threeDaysSchedule.map((daySchedule, index) => {
                const dayExams = examinations.filter(exam => {
                  const examDate = new Date(exam.scheduledDate).toDateString();
                  return examDate === daySchedule.date.toDateString();
                });
                
                return (
                  <div key={index} className="text-sm text-gray-600">
                    <span className="font-medium">
                      {daySchedule.date.toLocaleDateString('fr-FR', { weekday: 'short' })}:
                    </span>
                    <span className="ml-1">{dayExams.length}</span>
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
            setSelectedSlotDate(null);
          }}
          onExaminationCreated={handleExaminationCreated}
          preselectedDateTime={selectedTimeSlot && selectedSlotDate ? 
            new Date(`${selectedSlotDate.toISOString().split('T')[0]}T${selectedTimeSlot}:00`) : 
            undefined
          }
        />
      )}
    </div>
  );
}
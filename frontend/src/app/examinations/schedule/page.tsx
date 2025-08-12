'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExaminationScheduler } from '@/components/examinations/ExaminationScheduler';
import { Button } from '@/components/ui/button';
import { Examination } from '@/types';
import { examinationsApi } from '@/lib/api';

export default function ExaminationSchedulePage() {
  const { data: session, status } = useSession();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExaminations = async (date: Date) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const response = await examinationsApi.getWorklist({
        dateFrom: startOfDay.toISOString().split('T')[0],
        dateTo: endOfDay.toISOString().split('T')[0],
        sortBy: 'scheduledDate',
        sortOrder: 'asc',
        limit: 100
      });
      
      setExaminations(response.data.examinations);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des examens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchExaminations(selectedDate);
    }
  }, [selectedDate, session]);

  // Redirect if not authenticated
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/login');
  }

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  const handleExaminationUpdated = () => {
    fetchExaminations(selectedDate);
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Planification des Examens</h1>
                <p className="text-sm text-gray-600">
                  Gestion du planning et des créneaux d'examens
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => fetchExaminations(selectedDate)}
                  variant="outline"
                  size="sm"
                >
                  🔄 Actualiser
                </Button>
                
                <Button
                  onClick={() => window.open('/examinations', '_self')}
                  variant="outline"
                >
                  📋 Voir la liste
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 mb-2">⚠️ {error}</div>
                <Button onClick={() => fetchExaminations(selectedDate)} variant="outline">
                  Réessayer
                </Button>
              </div>
            </div>
          ) : (
            <ExaminationScheduler
              examinations={examinations}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onExaminationUpdated={handleExaminationUpdated}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
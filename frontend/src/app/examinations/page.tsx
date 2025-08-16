'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExaminationTable } from '@/components/examinations/ExaminationTable';
import { ExaminationFilters } from '@/components/examinations/ExaminationFilters';
import { CreateExaminationModal } from '@/components/examinations/CreateExaminationModal';
import { DicomSyncPanel } from '@/components/examinations/DicomSyncPanel';
import { Button } from '@/components/ui/button';
import { useExaminationsOptimized } from '@/hooks/useExaminationsOptimized';
import { useRealTime } from '@/components/layout/RealTimeProvider';

export default function ExaminationsPage() {
  const { data: session, status } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    modality: '',
    priority: '',
    assignedTo: '',
    dateFrom: '',
    dateTo: '',
    query: '',
    page: 1,
    limit: 25,
    sortBy: 'scheduledDate',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // Use optimized examinations hook
  const {
    examinations,
    pagination,
    isLoading,
    error,
    refetch: fetchExaminations,
    updateExamination,
    addExamination,
    removeExamination
  } = useExaminationsOptimized({
    filters,
    enableBackgroundSync: true,
    backgroundSyncInterval: 60000 // Background sync every minute
  });

  // Connect to real-time updates
  const { subscribeToExamination, unsubscribeFromExamination } = useRealTime();

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

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExaminationCreated = (newExamination?: any) => {
    if (newExamination) {
      addExamination(newExamination);
    } else {
      // Fallback to refetch if examination data not provided
      fetchExaminations();
    }
    setShowCreateModal(false);
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Examens</h1>
                <p className="text-sm text-gray-600">
                  {pagination.total} examen{pagination.total !== 1 ? 's' : ''} au total
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => fetchExaminations()}
                  variant="outline"
                  size="sm"
                >
                  🔄 Actualiser
                </Button>
                
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ➕ Nouvel Examen
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <ExaminationFilters
              onFilter={handleFilterChange}
              currentFilters={filters}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-6">
            {/* DICOM Sync Panel */}
            <div className="xl:col-span-1">
              <DicomSyncPanel onSyncComplete={() => {
                // Use gentle background refresh after DICOM sync
                setTimeout(() => fetchExaminations(), 1000);
              }} />
            </div>
            
            {/* Examinations Table */}
            <div className="xl:col-span-3">
              {error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="text-red-600 mb-2">⚠️ {error}</div>
                    <Button onClick={() => fetchExaminations()} variant="outline">
                      Réessayer
                    </Button>
                  </div>
                </div>
              ) : (
                <ExaminationTable
                  examinations={examinations}
                  pagination={pagination}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                  onSort={handleSort}
                  currentSort={{
                    sortBy: filters.sortBy,
                    sortOrder: filters.sortOrder,
                  }}
                  onRefresh={() => fetchExaminations()}
                />
              )}
            </div>
          </div>
        </div>

        {/* Create Examination Modal */}
        {showCreateModal && (
          <CreateExaminationModal
            onClose={() => setShowCreateModal(false)}
            onExaminationCreated={handleExaminationCreated}
          />
        )}
      </div>
    </AppLayout>
  );
}
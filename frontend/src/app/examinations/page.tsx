'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
// import { ExaminationTable } from '@/components/examinations/ExaminationTable';
// import { ExaminationFilters } from '@/components/examinations/ExaminationFilters';
// import { CreateExaminationModal } from '@/components/examinations/CreateExaminationModal';
import { Button } from '@/components/ui/button';
import { Examination } from '@/types';
import { examinationsApi } from '@/lib/api';

export default function ExaminationsPage() {
  const { data: session, status } = useSession();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchExaminations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await examinationsApi.getWorklist(filters);
      setExaminations(response.data.examinations);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des examens');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExaminations();
  }, [filters]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
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

  const handleExaminationCreated = () => {
    fetchExaminations(); // Refresh the list
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col h-screen">
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

        {/* Placeholder Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Page des examens en développement
            </h2>
            <p className="text-gray-600 mb-4">
              Cette page sera bientôt disponible.
            </p>
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
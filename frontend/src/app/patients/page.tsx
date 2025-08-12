'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { PatientTable } from '@/components/patients/PatientTable';
import { PatientFilters } from '@/components/patients/PatientFilters';
import { PatientSearch } from '@/components/patients/PatientSearch';
import { CreatePatientModal } from '@/components/patients/CreatePatientModal';
import { Button } from '@/components/ui/button';
import { Patient, WorklistParams } from '@/types';
import { patientsApi } from '@/lib/api';

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
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
  const [searchParams, setSearchParams] = useState({
    query: '',
    page: 1,
    limit: 25,
    sortBy: 'lastName',
    sortOrder: 'asc' as 'asc' | 'desc',
  });

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let response;
      if ((searchParams as any).isAdvancedSearch) {
        // Use advanced search endpoint
        const { isAdvancedSearch, ...searchData } = searchParams as any;
        response = await patientsApi.search(searchData);
      } else {
        // Use regular search endpoint
        response = await patientsApi.getAll(searchParams);
      }
      
      setPatients(response.data.patients);
      setPagination(response.data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des patients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPatients();
    }
  }, [searchParams, session]);

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

  const handleSearch = (params: any) => {
    setSearchParams(prev => ({
      ...prev,
      ...params,
      page: 1, // Reset to first page on search
    }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
  };

  const handleSort = (sortBy: string) => {
    setSearchParams(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePatientCreated = () => {
    fetchPatients(); // Refresh the list
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
                <h1 className="text-2xl font-bold text-gray-900">Gestion des Patients</h1>
                <p className="text-sm text-gray-600">
                  {pagination.total} patient{pagination.total !== 1 ? 's' : ''} au total
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => fetchPatients()}
                  variant="outline"
                  size="sm"
                >
                  🔄 Actualiser
                </Button>
                
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  ➕ Nouveau Patient
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border-b">
          <div className="px-6 py-4">
            <PatientSearch 
              onSearch={handleSearch}
              searchParams={searchParams}
            />
          </div>
        </div>

        <div className="bg-gray-50 border-b">
          <div className="px-6 py-3">
            <PatientFilters
              onFilter={handleSearch}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 mb-2">⚠️ {error}</div>
                <Button onClick={fetchPatients} variant="outline">
                  Réessayer
                </Button>
              </div>
            </div>
          ) : (
            <PatientTable
              patients={patients}
              pagination={pagination}
              isLoading={isLoading}
              onPageChange={handlePageChange}
              onSort={handleSort}
              currentSort={{
                sortBy: searchParams.sortBy,
                sortOrder: searchParams.sortOrder,
              }}
            />
          )}
        </div>
      </div>

      {/* Create Patient Modal */}
      {showCreateModal && (
        <CreatePatientModal
          onClose={() => setShowCreateModal(false)}
          onPatientCreated={handlePatientCreated}
        />
      )}
    </AppLayout>
  );
}
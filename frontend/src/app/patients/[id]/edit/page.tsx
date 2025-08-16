'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams } from 'next/navigation';
import { useNavigation } from '@/hooks/useNavigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { EditPatientForm } from '@/components/patients/EditPatientForm';
import { Button } from '@/components/ui/button';
import { Patient } from '@/types';
import { patientsApi } from '@/lib/api';

export default function EditPatientPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const { navigateTo } = useNavigation();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatient = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await patientsApi.getById(patientId);
      setPatient(response.data.patient);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement du patient');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && patientId) {
      fetchPatient();
    }
  }, [session, patientId]);

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

  const handlePatientUpdated = () => {
    navigateTo(`/patients/${patientId}`);
  };

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <Button onClick={fetchPatient} variant="outline">
              Réessayer
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Patient non trouvé</div>
            <Button onClick={() => window.history.back()} variant="outline">
              Retour
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <EditPatientForm 
        patient={patient} 
        onPatientUpdated={handlePatientUpdated}
        onCancel={() => navigateTo(`/patients/${patientId}`)}
      />
    </AppLayout>
  );
}
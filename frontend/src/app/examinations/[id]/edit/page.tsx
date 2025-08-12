'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { EditExaminationForm } from '@/components/examinations/EditExaminationForm';
import { Button } from '@/components/ui/button';
import { Examination } from '@/types';
import { examinationsApi } from '@/lib/api';

export default function EditExaminationPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const examinationId = params.id as string;
  
  const [examination, setExamination] = useState<Examination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamination = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await examinationsApi.getById(examinationId);
      setExamination(response.data.examination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement de l\'examen');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && examinationId) {
      fetchExamination();
    }
  }, [session, examinationId]);

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

  const handleExaminationUpdated = () => {
    router.push(`/examinations/${examinationId}`);
  };

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <Button onClick={fetchExamination} variant="outline">
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

  if (!examination) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Examen non trouvé</div>
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
      <EditExaminationForm 
        examination={examination} 
        onExaminationUpdated={handleExaminationUpdated}
        onCancel={() => router.push(`/examinations/${examinationId}`)}
      />
    </AppLayout>
  );
}
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TemplateManager from '@/components/reports/TemplateManager';
import type { User } from '@/types';

function TemplateManagerContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      // Mock user data - In real implementation, this would come from session/API
      const mockUser: User = {
        id: 'user-senior',
        email: 'senior@radris.com',
        firstName: 'Marie',
        lastName: 'Dubois',
        role: 'RADIOLOGIST_SENIOR',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCurrentUser(mockUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    router.push('/reports/templates/new');
  };

  const handleEditTemplate = (templateId: string) => {
    router.push(`/reports/templates/${templateId}/edit`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need to be logged in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TemplateManager
        currentUser={currentUser}
        onCreateTemplate={handleCreateTemplate}
        onEditTemplate={handleEditTemplate}
      />
    </div>
  );
}

export default function TemplateManagerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template manager...</p>
        </div>
      </div>
    }>
      <TemplateManagerContent />
    </Suspense>
  );
}
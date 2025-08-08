'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorklistTable } from '@/components/worklist/WorklistTable';
import { WorklistFilters } from '@/components/worklist/WorklistFilters';
import { WorklistHeader } from '@/components/worklist/WorklistHeader';
import { WorklistStats } from '@/components/worklist/WorklistStats';
import { useWorklist } from '@/hooks/useWorklist';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WorklistParams } from '@/types';

export default function WorklistPage() {
  const { data: session, status } = useSession();
  const [params, setParams] = useState<WorklistParams>({
    page: 1,
    limit: 25,
    sortBy: 'scheduledDate',
    sortOrder: 'desc',
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

  const {
    data: worklistData,
    isLoading,
    error,
    refetch
  } = useWorklist(params);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    onExaminationUpdate: (examination, updateType) => {
      console.log(`📊 ${updateType} examination:`, examination.accessionNumber);
      // Refresh worklist when examinations are updated
      refetch();
    },
    onReportUpdate: (report, examinationId) => {
      console.log('📄 Report updated for examination:', examinationId);
      // Refresh worklist to show updated report status
      refetch();
    },
    onSystemNotification: (notification) => {
      console.log('📢 System notification:', notification.message);
    },
  });

  const handleParamsChange = (newParams: Partial<WorklistParams>) => {
    setParams(prev => ({
      ...prev,
      ...newParams,
      // Reset to page 1 when filters change
      ...(newParams.status || newParams.modality || newParams.query ? { page: 1 } : {})
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <AppLayout>
      {/* Main Worklist Interface */}
      <div className="flex flex-col min-h-screen">
        {/* Header with context and actions */}
        <WorklistHeader 
          params={params}
          onParamsChange={handleParamsChange}
          onRefresh={handleRefresh}
          totalCount={worklistData?.pagination.total || 0}
          isWebSocketConnected={isConnected}
        />

        {/* Stats Dashboard */}
        <WorklistStats />

        {/* Filters Toolbar */}
        <WorklistFilters 
          params={params}
          onParamsChange={handleParamsChange}
        />

        {/* Main Worklist Table */}
        <div className="flex-1 overflow-hidden">
          <WorklistTable
            data={worklistData?.examinations || []}
            pagination={worklistData?.pagination}
            params={params}
            onParamsChange={handleParamsChange}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </AppLayout>
  );
}
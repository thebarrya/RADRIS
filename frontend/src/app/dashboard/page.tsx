'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { StatusChart } from '@/components/dashboard/StatusChart';
import { ModalityChart } from '@/components/dashboard/ModalityChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { UserRole } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();

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
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useDashboardStats();

  const handleRefresh = () => {
    refetch();
  };

  return (
    <AppLayout>
      <div className="flex flex-col">
        {/* Dashboard Header */}
        <DashboardHeader 
          user={session.user}
          onRefresh={handleRefresh}
          lastUpdated={new Date()}
        />

        {/* Main Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Key Performance Indicators */}
            <DashboardStats 
              stats={dashboardData}
              isLoading={isLoading}
              error={error}
            />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Examination Status Distribution */}
              <StatusChart 
                data={dashboardData?.statusDistribution || []}
                isLoading={isLoading}
                title="Status des examens (7 derniers jours)"
              />

              {/* Modality Distribution */}
              <ModalityChart 
                data={dashboardData?.modalityStats || []}
                isLoading={isLoading}
                title="Répartition par modalité (30 derniers jours)"
              />
            </div>

            {/* Lower Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity Feed */}
              <div className="lg:col-span-2">
                <RecentActivity />
              </div>

              {/* Quick Actions Panel */}
              <div className="lg:col-span-1">
                <QuickActions 
                  userRole={session.user.role as UserRole}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
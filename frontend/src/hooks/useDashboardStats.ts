import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { DashboardStats } from '@/types';

export function useDashboardStats() {
  const { data: session, status } = useSession();
  
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/examinations/stats/dashboard');
      return response.data;
    },
    enabled: status === 'authenticated' && !!session, // Only run when authenticated
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
  });
}
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
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes (less aggressive)
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchIntervalInBackground: false, // Don't refetch when page is not visible
    retry: 3,
  });
}
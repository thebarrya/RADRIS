'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { RealTimeProvider } from '@/components/layout/RealTimeProvider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Prevent aggressive refetching on focus
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      refetchIntervalInBackground: false, // Don't refetch when page is not visible
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <RealTimeProvider>
          {children}
        </RealTimeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
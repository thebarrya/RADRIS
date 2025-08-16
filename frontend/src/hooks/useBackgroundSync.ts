import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface BackgroundSyncOptions {
  queryKeys: string[][];
  syncInterval?: number;
  enabled?: boolean;
}

/**
 * Custom hook for background data synchronization
 * Updates data in the background without causing UI refreshes
 */
export function useBackgroundSync({
  queryKeys,
  syncInterval = 5 * 60 * 1000, // 5 minutes by default
  enabled = true
}: BackgroundSyncOptions) {
  const queryClient = useQueryClient();
  const syncRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const performBackgroundSync = () => {
      queryKeys.forEach(queryKey => {
        // Silently invalidate and refetch data in background
        queryClient.invalidateQueries({
          queryKey,
          refetchType: 'none' // Don't trigger immediate refetch
        });

        // Prefetch to update cache without triggering UI updates
        queryClient.prefetchQuery({
          queryKey,
          staleTime: 30 * 1000, // Consider data fresh for 30 seconds after prefetch
        });
      });
    };

    // Perform initial sync after a short delay
    const initialTimeout = setTimeout(performBackgroundSync, 10000); // 10 seconds

    // Set up interval for background sync
    syncRef.current = setInterval(performBackgroundSync, syncInterval);

    return () => {
      clearTimeout(initialTimeout);
      if (syncRef.current) {
        clearInterval(syncRef.current);
      }
    };
  }, [enabled, syncInterval, queryKeys, queryClient]);

  // Return a function to manually trigger background sync
  const triggerSync = () => {
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({
        queryKey,
        refetchType: 'none'
      });
    });
  };

  return { triggerSync };
}
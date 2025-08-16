import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { examinationsApi } from '@/lib/api';
import { Examination } from '@/types';

interface UseExaminationsOptimizedProps {
  filters: {
    status: string;
    modality: string;
    priority: string;
    assignedTo: string;
    dateFrom: string;
    dateTo: string;
    query: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  enableBackgroundSync?: boolean;
  backgroundSyncInterval?: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function useExaminationsOptimized({
  filters,
  enableBackgroundSync = true,
  backgroundSyncInterval = 60000 // 1 minute default
}: UseExaminationsOptimizedProps) {
  const { data: session } = useSession();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  // Refs for managing intervals and preventing unnecessary fetches
  const backgroundSyncRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFiltersRef = useRef<string>('');

  // Optimized fetch function with caching and deduplication
  const fetchExaminations = useCallback(async (skipLoading = false) => {
    if (!session) return;

    const currentFiltersString = JSON.stringify(filters);
    
    // Prevent duplicate requests for the same filters within 2 seconds
    if (currentFiltersString === lastFiltersRef.current && Date.now() - lastFetch < 2000) {
      return;
    }

    try {
      if (!skipLoading) setIsLoading(true);
      setError(null);
      
      const response = await examinationsApi.getWorklist(filters);
      
      setExaminations(response.data.examinations);
      setPagination(response.data.pagination);
      setLastFetch(Date.now());
      lastFiltersRef.current = currentFiltersString;
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement des examens');
    } finally {
      if (!skipLoading) setIsLoading(false);
    }
  }, [session, filters, lastFetch]);

  // Debounced fetch for text inputs
  const debouncedFetch = useCallback((delay: number = 500) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchExaminations();
    }, delay);
  }, [fetchExaminations]);

  // Background sync function
  const performBackgroundSync = useCallback(async () => {
    if (!session || !enableBackgroundSync) return;
    
    try {
      // Fetch data in background without showing loading state
      await fetchExaminations(true);
    } catch (error) {
      console.warn('Background sync failed:', error);
      // Don't show error for background sync failures
    }
  }, [session, enableBackgroundSync, fetchExaminations]);

  // Update examinations data from external sources (WebSocket updates)
  const updateExamination = useCallback((updatedExamination: Examination) => {
    setExaminations(prev => 
      prev.map(exam => 
        exam.id === updatedExamination.id ? updatedExamination : exam
      )
    );
  }, []);

  // Add new examination to the list
  const addExamination = useCallback((newExamination: Examination) => {
    setExaminations(prev => [newExamination, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

  // Remove examination from the list
  const removeExamination = useCallback((examinationId: string) => {
    setExaminations(prev => prev.filter(exam => exam.id !== examinationId));
    setPagination(prev => ({ ...prev, total: prev.total - 1 }));
  }, []);

  // Effect for initial load and filter changes
  useEffect(() => {
    if (!session) return;

    // Immediate fetch for critical filter changes (page, sort, etc.)
    const criticalFilters = [filters.page, filters.limit, filters.sortBy, filters.sortOrder, filters.status, filters.modality, filters.priority, filters.assignedTo];
    
    // Check if only search/date filters changed (these should be debounced)
    const searchFilters = [filters.query, filters.dateFrom, filters.dateTo];
    const criticalChanged = criticalFilters.some((_, index) => {
      const key = ['page', 'limit', 'sortBy', 'sortOrder', 'status', 'modality', 'priority', 'assignedTo'][index];
      const prevFilters = lastFiltersRef.current ? JSON.parse(lastFiltersRef.current) : {};
      return prevFilters[key] !== filters[key as keyof typeof filters];
    });

    if (criticalChanged) {
      fetchExaminations();
    } else {
      // Debounce search/date filter changes
      debouncedFetch();
    }
  }, [session, filters, fetchExaminations, debouncedFetch]);

  // Setup background sync
  useEffect(() => {
    if (!enableBackgroundSync || !session) return;

    // Clear existing interval
    if (backgroundSyncRef.current) {
      clearInterval(backgroundSyncRef.current);
    }

    // Setup new background sync interval
    backgroundSyncRef.current = setInterval(performBackgroundSync, backgroundSyncInterval);

    return () => {
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
      }
    };
  }, [enableBackgroundSync, session, backgroundSyncInterval, performBackgroundSync]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (backgroundSyncRef.current) {
        clearInterval(backgroundSyncRef.current);
      }
    };
  }, []);

  return {
    examinations,
    pagination,
    isLoading,
    error,
    refetch: fetchExaminations,
    updateExamination,
    addExamination,
    removeExamination,
    lastFetch
  };
}
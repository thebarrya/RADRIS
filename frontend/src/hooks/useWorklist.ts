import { useState, useEffect } from 'react';
import { Examination, WorklistParams, WorklistResponse } from '@/types';
import { examinationsApi } from '@/lib/api';

export function useWorklist(params: WorklistParams) {
  const [data, setData] = useState<WorklistResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorklist = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Filter out undefined/null/empty values
      const cleanParams: any = {};
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          cleanParams[key] = value;
        }
      });

      const response = await examinationsApi.getWorklist(cleanParams);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorklist();
  }, [JSON.stringify(params)]);

  const refetch = () => {
    fetchWorklist();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
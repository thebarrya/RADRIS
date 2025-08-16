'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export const useNavigation = () => {
  const router = useRouter();

  const navigateTo = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const navigateReplace = useCallback((path: string) => {
    router.replace(path);
  }, [router]);

  return {
    navigateTo,
    navigateReplace,
  };
};
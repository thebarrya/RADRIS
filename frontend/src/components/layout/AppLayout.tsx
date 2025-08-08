'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { MainNavigation } from './MainNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export function AppLayout({ children, showNavigation = true }: AppLayoutProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && session && <MainNavigation />}
      <main className={showNavigation && session ? '' : 'min-h-screen'}>
        {children}
      </main>
    </div>
  );
}
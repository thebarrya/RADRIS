'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: UserRole | UserRole[];
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export function RoleGuard({ 
  children, 
  roles, 
  fallback = null, 
  showFallback = false 
}: RoleGuardProps) {
  const { hasRole } = useAuth();

  if (!hasRole(roles)) {
    return showFallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export const AdminOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard roles="ADMIN" fallback={fallback}>{children}</RoleGuard>
);

export const RadiologistOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard roles={['RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']} fallback={fallback}>{children}</RoleGuard>
);

export const SeniorRadiologistOnly = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard roles="RADIOLOGIST_SENIOR" fallback={fallback}>{children}</RoleGuard>
);

export const ReportAccess = ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <RoleGuard roles={['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']} fallback={fallback}>{children}</RoleGuard>
);
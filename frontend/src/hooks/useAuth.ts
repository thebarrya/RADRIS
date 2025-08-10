import { useSession } from 'next-auth/react';
import { UserRole } from '@/types';

export function useAuth() {
  const { data: session, status } = useSession();

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!session?.user?.role) return false;
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(session.user.role as UserRole);
  };

  const isAdmin = (): boolean => {
    return hasRole('ADMIN');
  };

  const isRadiologist = (): boolean => {
    return hasRole(['RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']);
  };

  const isSeniorRadiologist = (): boolean => {
    return hasRole('RADIOLOGIST_SENIOR');
  };

  const isTechnician = (): boolean => {
    return hasRole('TECHNICIAN');
  };

  const isSecretary = (): boolean => {
    return hasRole('SECRETARY');
  };

  const canCreateReports = (): boolean => {
    return hasRole(['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR']);
  };

  const canValidateReports = (): boolean => {
    return hasRole(['ADMIN', 'RADIOLOGIST_SENIOR']);
  };

  const canManageUsers = (): boolean => {
    return hasRole('ADMIN');
  };

  const canAccessAdminPanel = (): boolean => {
    return hasRole('ADMIN');
  };

  return {
    session,
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    hasRole,
    isAdmin,
    isRadiologist,
    isSeniorRadiologist,
    isTechnician,
    isSecretary,
    canCreateReports,
    canValidateReports,
    canManageUsers,
    canAccessAdminPanel,
  };
}
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

interface RealTimeContextType {
  isConnected: boolean;
  connectionAttempts: number;
  usersOnline: string[];
  subscribeToExamination: (examinationId: string) => void;
  unsubscribeFromExamination: (examinationId: string) => void;
  updateUserStatus: (status: string) => void;
}

const RealTimeContext = createContext<RealTimeContextType | null>(null);

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

interface RealTimeProviderProps {
  children: React.ReactNode;
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({ children }) => {
  const [usersOnline, setUsersOnline] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    isConnected,
    connectionAttempts,
    subscribeToExamination,
    unsubscribeFromExamination,
    subscribeToWorklist,
    updateUserStatus,
  } = useWebSocket({
    // Handle examination updates
    onExaminationUpdate: (examination, updateType) => {
      console.log('🔄 Examination update received:', updateType, examination);
      
      // Update specific examination cache immediately for responsive UI
      queryClient.setQueryData(['examinations', examination.id], { examination });
      
      // Use selective background cache updates to avoid full page refreshes
      if (updateType === 'created') {
        // For new examinations, invalidate and refetch in the background
        queryClient.invalidateQueries({ 
          queryKey: ['examinations', 'worklist'],
          refetchType: 'none'
        });
        // Silently prefetch updated data
        setTimeout(() => {
          queryClient.prefetchQuery({ 
            queryKey: ['examinations', 'worklist'],
            staleTime: 30000 // Keep data fresh for 30 seconds
          });
        }, 1000);
      } else {
        // For updates, just update the cache without refetching
        queryClient.setQueryData(['examinations', 'worklist'], (oldData: any) => {
          if (!oldData?.data?.examinations) return oldData;
          
          const updatedExaminations = oldData.data.examinations.map((exam: any) => 
            exam.id === examination.id ? examination : exam
          );
          
          return {
            ...oldData,
            data: {
              ...oldData.data,
              examinations: updatedExaminations
            }
          };
        });
      }
      
      if (updateType === 'created') {
        toast({
          title: "Nouvel examen",
          description: `Examen créé pour ${examination.patient?.firstName} ${examination.patient?.lastName}`,
          duration: 3000,
        });
      } else if (updateType === 'deleted') {
        // Remove from cache
        queryClient.removeQueries({ queryKey: ['examinations', examination.examinationId] });
        
        toast({
          title: "Examen supprimé",
          description: `Examen ${examination.patientInfo?.accessionNumber} supprimé`,
          duration: 2000,
        });
      } else if (examination.status === 'EMERGENCY') {
        toast({
          title: "🚨 URGENCE",
          description: `${examination.patient?.firstName} ${examination.patient?.lastName}`,
          variant: "destructive",
          duration: 8000,
        });
      }
    },

    // Handle report updates
    onReportUpdate: (report, examinationId, updateType) => {
      console.log('📝 Report update received:', updateType, report);
      
      // Update specific caches immediately
      queryClient.setQueryData(['reports', report.id], { report });
      
      // Background invalidation to avoid UI disruption
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['reports'], 
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['examinations', examinationId], 
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['examinations', 'worklist'], 
          refetchType: 'none'
        });
      }, 100);

      if (updateType === 'created') {
        toast({
          title: "Nouveau rapport",
          description: "Un nouveau rapport a été créé",
          duration: 2000,
        });
      } else if (updateType === 'validated') {
        toast({
          title: "✅ Rapport validé",
          description: "Le rapport a été validé par un senior",
          duration: 3000,
        });
      }
    },

    // Handle patient updates
    onPatientUpdate: (patient, updateType) => {
      console.log('👤 Patient update received:', updateType, patient);
      
      // Update specific patient cache immediately
      queryClient.setQueryData(['patients', patient.id], { patient });
      
      // Background invalidation to prevent UI refreshes
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['patients'], 
          refetchType: 'none'
        });
      }, 100);
      
      if (updateType === 'created') {
        toast({
          title: "Nouveau patient",
          description: `${patient.firstName} ${patient.lastName} ajouté`,
          duration: 2000,
        });
      }
    },

    // Handle assignment changes
    onAssignmentChange: (examinationId, oldAssigneeId, newAssigneeId, examination) => {
      console.log('👨‍⚕️ Assignment change:', { examinationId, oldAssigneeId, newAssigneeId });
      
      // Update cache immediately
      queryClient.setQueryData(['examinations', examinationId], { examination });
      
      // Background invalidation
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['examinations', 'worklist'], 
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['examinations', examinationId], 
          refetchType: 'none'
        });
      }, 100);
      
      toast({
        title: "Attribution modifiée",
        description: `Examen ${examination.accessionNumber} réattribué`,
        duration: 2000,
      });
    },

    // Handle worklist refresh requests
    onWorklistRefresh: () => {
      console.log('🔄 Worklist refresh requested');
      
      // Debounced background refresh to avoid UI interruption
      // Only refresh if data is older than 5 seconds to prevent excessive updates
      const lastRefresh = queryClient.getQueryState(['examinations', 'worklist'])?.dataUpdatedAt || 0;
      const now = Date.now();
      
      if (now - lastRefresh > 5000) { // Only refresh if last update was more than 5 seconds ago
        setTimeout(() => {
          queryClient.prefetchQuery({ 
            queryKey: ['examinations', 'worklist'],
            staleTime: 10000 // Keep data fresh for 10 seconds
          });
          queryClient.prefetchQuery({ 
            queryKey: ['dashboard', 'stats'],
            staleTime: 10000
          });
        }, 500); // Slight delay to avoid immediate refresh
      }
    },

    // Handle user status changes (online/offline)
    onUserStatusChange: (userId, status, email) => {
      console.log('👥 User status change:', { userId, status, email });
      
      setUsersOnline(prev => {
        if (status === 'online') {
          return [...prev.filter(id => id !== userId), userId];
        } else {
          return prev.filter(id => id !== userId);
        }
      });
    },

    // Handle system notifications
    onSystemNotification: (notification) => {
      if (notification.level === 'error') {
        toast({
          title: "Erreur système",
          description: notification.message,
          variant: "destructive",
          duration: 5000,
        });
      } else if (notification.level === 'warning') {
        toast({
          title: "⚠️ Attention",
          description: notification.message,
          duration: 4000,
        });
      }
    },

    // Handle DICOM study arrivals
    onDicomArrival: (studyData) => {
      console.log('📷 New DICOM study arrived:', studyData);
      
      // Gentle background update for DICOM arrivals - use prefetch to avoid UI disruption
      setTimeout(() => {
        queryClient.prefetchQuery({ 
          queryKey: ['examinations', 'worklist'],
          staleTime: 15000 // Keep data fresh for 15 seconds
        });
      }, 2000); // Delay to avoid immediate refresh
      
      toast({
        title: "📷 Nouveau DICOM",
        description: `Étude ${studyData.modality || 'DICOM'} reçue pour ${studyData.patientName}`,
        duration: 5000,
      });
    },

    // Handle study linking notifications
    onStudyLinked: (linkData) => {
      console.log('🔗 Study linked to examination:', linkData);
      
      // Update specific examination immediately and queue background refresh
      queryClient.setQueryData(['examinations', linkData.examinationId], (oldData: any) => {
        if (!oldData?.examination) return oldData;
        return {
          ...oldData,
          examination: {
            ...oldData.examination,
            imagesAvailable: true,
            studyInstanceUID: linkData.studyInstanceUID
          }
        };
      });
      
      // Background refresh for study linking with delay
      setTimeout(() => {
        queryClient.prefetchQuery({ 
          queryKey: ['examinations', 'worklist'],
          staleTime: 15000
        });
      }, 3000); // Longer delay to avoid disruption
      
      toast({
        title: "🔗 Étude liée",
        description: `Images DICOM disponibles pour ${linkData.patientName}`,
        duration: 4000,
      });
    },

    // Handle metadata synchronization notifications
    onMetadataSync: (syncData) => {
      console.log('🔄 Metadata sync completed:', syncData);
      
      // Background refresh for metadata sync
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['patients'], 
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['examinations'], 
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['dashboard', 'stats'], 
          refetchType: 'none'
        });
      }, 100);
      
      if (syncData.success) {
        toast({
          title: "✅ Synchronisation",
          description: `${syncData.patientsUpdated} patients et ${syncData.studiesLinked} études synchronisés`,
          duration: 4000,
        });
      } else {
        toast({
          title: "❌ Erreur de synchronisation",
          description: `Synchronisation échouée avec ${syncData.errors.length} erreurs`,
          variant: "destructive",
          duration: 6000,
        });
      }
    },

    // Handle DICOM errors
    onDicomError: (errorData) => {
      console.error('🚨 DICOM error:', errorData);
      
      toast({
        title: "🚨 Erreur DICOM",
        description: `Erreur ${errorData.operation}: ${errorData.error}`,
        variant: "destructive",
        duration: 8000,
      });
    },

    autoReconnect: true,
    reconnectInterval: 3000,
  });

  // Subscribe to worklist updates when connected
  useEffect(() => {
    if (isConnected) {
      subscribeToWorklist();
      updateUserStatus('online');
    }
  }, [isConnected, subscribeToWorklist, updateUserStatus]);

  // Update user status to offline when leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateUserStatus('offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateUserStatus('offline');
    };
  }, [updateUserStatus]);

  // Show connection status in console for debugging
  useEffect(() => {
    if (isConnected) {
      console.log('🟢 WebSocket connected - Real-time updates enabled');
    } else if (connectionAttempts > 0) {
      console.log('🔴 WebSocket disconnected - Attempting to reconnect...');
    }
  }, [isConnected, connectionAttempts]);

  const value: RealTimeContextType = {
    isConnected,
    connectionAttempts,
    usersOnline,
    subscribeToExamination,
    unsubscribeFromExamination,
    updateUserStatus,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
};
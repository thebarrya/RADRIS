import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export interface WebSocketMessage {
  type: 'examination_updated' | 'examination_created' | 'examination_deleted' | 
        'report_updated' | 'report_created' | 'report_validated' |
        'patient_updated' | 'patient_created' |
        'user_status_changed' | 'system_notification' |
        'worklist_refresh' | 'assignment_changed' |
        'dicom_arrival' | 'study_linked' | 'metadata_sync' | 'dicom_error';
  payload: any;
  timestamp: string;
  userId?: string;
  userRole?: string;
}

interface UseWebSocketOptions {
  onExaminationUpdate?: (examination: any, updateType: 'created' | 'updated' | 'deleted') => void;
  onReportUpdate?: (report: any, examinationId: string, updateType: 'created' | 'updated' | 'validated') => void;
  onPatientUpdate?: (patient: any, updateType: 'created' | 'updated') => void;
  onAssignmentChange?: (examinationId: string, oldAssigneeId: string | null, newAssigneeId: string | null, examination: any) => void;
  onWorklistRefresh?: () => void;
  onUserStatusChange?: (userId: string, status: string, email: string) => void;
  onSystemNotification?: (notification: { message: string; level?: 'info' | 'warning' | 'error' }) => void;
  onDicomArrival?: (studyData: any) => void;
  onStudyLinked?: (linkData: any) => void;
  onMetadataSync?: (syncData: any) => void;
  onDicomError?: (errorData: any) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const mountedRef = useRef(true);
  
  const {
    onExaminationUpdate,
    onReportUpdate,
    onPatientUpdate,
    onAssignmentChange,
    onWorklistRefresh,
    onUserStatusChange,
    onSystemNotification,
    onDicomArrival,
    onStudyLinked,
    onMetadataSync,
    onDicomError,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options;

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 WebSocket message:', message.type, message.payload);

    switch (message.type) {
      case 'examination_created':
        onExaminationUpdate?.(message.payload.examination, 'created');
        toast.success('Nouvel examen créé', {
          duration: 3000,
          position: 'top-right',
        });
        break;

      case 'examination_updated':
        onExaminationUpdate?.(message.payload.examination, 'updated');
        if (message.payload.examination.status === 'EMERGENCY') {
          toast.error(`URGENCE: ${message.payload.examination.patient?.firstName} ${message.payload.examination.patient?.lastName}`, {
            duration: 10000,
            position: 'top-right',
          });
        } else {
          toast(`Examen mis à jour: ${message.payload.examination.accessionNumber}`, {
            duration: 2000,
            position: 'top-right',
          });
        }
        break;

      case 'examination_deleted':
        onExaminationUpdate?.(message.payload, 'deleted');
        toast.success('Examen supprimé', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'report_created':
        onReportUpdate?.(message.payload.report, message.payload.examinationId, 'created');
        toast.success('Nouveau rapport créé', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'report_updated':
        onReportUpdate?.(message.payload.report, message.payload.examinationId, 'updated');
        toast.success('Rapport mis à jour', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'report_validated':
        onReportUpdate?.(message.payload.report, message.payload.examinationId, 'validated');
        toast.success('Rapport validé', {
          icon: '✅',
          duration: 3000,
          position: 'top-right',
        });
        break;

      case 'patient_created':
        onPatientUpdate?.(message.payload.patient, 'created');
        toast.success('Nouveau patient créé', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'patient_updated':
        onPatientUpdate?.(message.payload.patient, 'updated');
        toast.success('Patient mis à jour', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'assignment_changed':
        onAssignmentChange?.(
          message.payload.examinationId,
          message.payload.oldAssigneeId,
          message.payload.newAssigneeId,
          message.payload.examination
        );
        toast.success('Attribution modifiée', {
          duration: 2000,
          position: 'top-right',
        });
        break;

      case 'worklist_refresh':
        onWorklistRefresh?.();
        break;

      case 'user_status_changed':
        onUserStatusChange?.(
          message.payload.userId,
          message.payload.status,
          message.payload.email
        );
        break;

      case 'system_notification':
        const { message: notifMessage, level = 'info' } = message.payload;
        onSystemNotification?.(message.payload);
        
        if (level === 'error') {
          toast.error(notifMessage, { duration: 5000 });
        } else if (level === 'warning') {
          toast(notifMessage, { 
            icon: '⚠️',
            duration: 4000 
          });
        } else if (notifMessage !== 'pong' && !notifMessage.includes('Connected to RADRIS')) {
          toast.success(notifMessage, { duration: 3000 });
        }
        break;

      case 'dicom_arrival':
        onDicomArrival?.(message.payload);
        toast.success(`📷 ${message.payload.title}: ${message.payload.message}`, {
          duration: 5000,
          position: 'top-right',
        });
        break;

      case 'study_linked':
        onStudyLinked?.(message.payload);
        toast.success(`🔗 ${message.payload.title}: ${message.payload.message}`, {
          duration: 4000,
          position: 'top-right',
        });
        break;

      case 'metadata_sync':
        onMetadataSync?.(message.payload);
        if (message.payload.success) {
          toast.success(`✅ ${message.payload.title}: ${message.payload.message}`, {
            duration: 3000,
            position: 'top-right',
          });
        } else {
          toast.error(`❌ ${message.payload.title}: ${message.payload.message}`, {
            duration: 5000,
            position: 'top-right',
          });
        }
        break;

      case 'dicom_error':
        onDicomError?.(message.payload);
        toast.error(`🚨 ${message.payload.title}: ${message.payload.message}`, {
          duration: 8000,
          position: 'top-right',
        });
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, [
    onExaminationUpdate,
    onReportUpdate,
    onPatientUpdate,
    onAssignmentChange,
    onWorklistRefresh,
    onUserStatusChange,
    onSystemNotification,
    onDicomArrival,
    onStudyLinked,
    onMetadataSync,
    onDicomError
  ]);

  const connect = useCallback(() => {
    // Don't connect if component is unmounted or already connecting/connected
    if (!mountedRef.current || !session?.accessToken || 
        (ws.current && (ws.current.readyState === WebSocket.CONNECTING || ws.current.readyState === WebSocket.OPEN))) {
      return;
    }

    // Clean up existing connection
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    const wsUrl = `ws://localhost:3002/ws?token=${encodeURIComponent(session.accessToken)}`;
    
    try {
      console.log('🔌 Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      ws.current = new WebSocket(wsUrl);

      const currentWs = ws.current;

      currentWs.onopen = () => {
        if (!mountedRef.current || currentWs !== ws.current) return;
        
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        connectionAttemptsRef.current = 0;
        setConnectionAttempts(0);
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      currentWs.onmessage = (event) => {
        if (!mountedRef.current || currentWs !== ws.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      currentWs.onclose = (event) => {
        if (!mountedRef.current || currentWs !== ws.current) return;
        
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Auto-reconnect logic - only if not a permanent failure
        if (autoReconnect && event.code !== 1008 && event.code !== 1000) { // 1008 = Policy Violation, 1000 = Normal closure
          connectionAttemptsRef.current += 1;
          const attempts = connectionAttemptsRef.current;
          setConnectionAttempts(attempts);
          
          // Exponential backoff with jitter
          const baseDelay = reconnectInterval * Math.pow(1.5, Math.min(attempts - 1, 10));
          const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
          const delay = Math.min(baseDelay + jitter, 30000);
          
          console.log(`🔄 Attempting reconnect in ${Math.round(delay)}ms (attempt ${attempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      currentWs.onerror = (error) => {
        if (!mountedRef.current || currentWs !== ws.current) return;
        
        console.error('🚨 WebSocket error:', error);
        setIsConnected(false);
      };

      // Handle pong responses from server
      currentWs.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'system_notification' && data.payload.message === 'pong') {
            // Server responded to ping - connection is healthy
            console.debug('📡 Received pong from server');
          }
        } catch (e) {
          // Not JSON or not our pong message - ignore
        }
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [session?.accessToken, autoReconnect, reconnectInterval, handleMessage]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      try {
        ws.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message.type || 'unknown');
      return false;
    }
  }, []);

  const ping = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const success = sendMessage({ type: 'ping', timestamp: new Date().toISOString() });
      if (success) {
        console.debug('📡 Sent ping to server');
      }
      return success;
    }
    return false;
  }, [sendMessage]);

  const subscribeToExamination = useCallback((examinationId: string) => {
    sendMessage({ type: 'subscribe_examination', examinationId });
  }, [sendMessage]);

  const unsubscribeFromExamination = useCallback((examinationId: string) => {
    sendMessage({ type: 'unsubscribe_examination', examinationId });
  }, [sendMessage]);

  const subscribeToWorklist = useCallback(() => {
    sendMessage({ type: 'subscribe_worklist' });
  }, [sendMessage]);

  const updateUserStatus = useCallback((status: string) => {
    sendMessage({ type: 'user_status', status });
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Client disconnect');
      ws.current = null;
    }
    
    connectionAttemptsRef.current = 0;
    setIsConnected(false);
    setConnectionAttempts(0);
  }, []);

  // Component mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  // Connect when session is available
  useEffect(() => {
    if (session?.accessToken && mountedRef.current) {
      // Small delay to ensure session is fully loaded
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [session?.accessToken, connect]);

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected || !mountedRef.current) return;

    const pingInterval = setInterval(() => {
      if (mountedRef.current && isConnected) {
        ping();
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected, ping]);

  return {
    isConnected,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
    ping,
    subscribeToExamination,
    unsubscribeFromExamination,
    subscribeToWorklist,
    updateUserStatus,
  };
}
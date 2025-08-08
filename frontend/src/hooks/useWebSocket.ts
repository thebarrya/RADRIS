import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export interface WebSocketMessage {
  type: 'examination_updated' | 'examination_created' | 'report_updated' | 'system_notification';
  payload: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  onExaminationUpdate?: (examination: any, updateType: 'created' | 'updated') => void;
  onReportUpdate?: (report: any, examinationId: string) => void;
  onSystemNotification?: (notification: { message: string; level?: 'info' | 'warning' | 'error' }) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session } = useSession();
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  const {
    onExaminationUpdate,
    onReportUpdate,
    onSystemNotification,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options;

  const connect = useCallback(() => {
    if (!session?.accessToken || ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `ws://localhost:3002/ws?token=${encodeURIComponent(session.accessToken)}`;
    
    try {
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionAttempts(0);
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Auto-reconnect logic
        if (autoReconnect && event.code !== 1008) { // 1008 = Policy Violation (auth error)
          const attempts = connectionAttempts + 1;
          setConnectionAttempts(attempts);
          
          const delay = Math.min(reconnectInterval * Math.pow(1.5, attempts), 30000);
          console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${attempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.current.onerror = (error) => {
        console.error('🚨 WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, [session?.accessToken, autoReconnect, reconnectInterval, connectionAttempts]);

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

      case 'report_updated':
        onReportUpdate?.(message.payload.report, message.payload.examinationId);
        toast.success('Rapport mis à jour', {
          duration: 2000,
          position: 'top-right',
        });
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

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, [onExaminationUpdate, onReportUpdate, onSystemNotification]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setConnectionAttempts(0);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message:', message);
    }
  }, []);

  const ping = useCallback(() => {
    sendMessage({ type: 'ping' });
  }, [sendMessage]);

  // Connect when session is available
  useEffect(() => {
    if (session?.accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session?.accessToken, connect, disconnect]);

  // Ping every 30 seconds to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      ping();
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
  };
}
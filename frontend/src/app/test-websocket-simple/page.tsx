'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function SimpleWebSocketTest() {
  const [status, setStatus] = useState('Initializing...');
  const [messageCount, setMessageCount] = useState(0);

  const {
    isConnected,
    connectionAttempts,
    connect,
    disconnect,
    sendMessage,
    ping,
  } = useWebSocket({
    onExaminationUpdate: (examination, updateType) => {
      setMessageCount(prev => prev + 1);
      setStatus(`Examination ${updateType}: ${examination.accessionNumber}`);
    },
    onReportUpdate: (report, examinationId, updateType) => {
      setMessageCount(prev => prev + 1);
      setStatus(`Report ${updateType} for examination ${examinationId}`);
    },
    onSystemNotification: (notification) => {
      if (notification.message !== 'pong') {
        setMessageCount(prev => prev + 1);
        setStatus(`System: ${notification.message}`);
      }
    },
    onDicomArrival: (studyData) => {
      setMessageCount(prev => prev + 1);
      setStatus(`DICOM arrived: ${studyData.patientName}`);
    },
    autoReconnect: true,
    reconnectInterval: 2000
  });

  useEffect(() => {
    setStatus(`WebSocket ${isConnected ? 'Connected' : 'Disconnected'}`);
  }, [isConnected]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Simple WebSocket Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <p><strong>Status:</strong> {status}</p>
        <p><strong>Connected:</strong> {isConnected ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Connection Attempts:</strong> {connectionAttempts}</p>
        <p><strong>Messages Received:</strong> {messageCount}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={connect} 
          style={{ marginRight: '10px', padding: '10px' }}
          disabled={isConnected}
        >
          Connect
        </button>
        <button 
          onClick={disconnect} 
          style={{ marginRight: '10px', padding: '10px' }}
          disabled={!isConnected}
        >
          Disconnect
        </button>
        <button 
          onClick={() => ping()} 
          style={{ marginRight: '10px', padding: '10px' }}
          disabled={!isConnected}
        >
          Ping
        </button>
        <button 
          onClick={() => sendMessage({ type: 'subscribe_worklist' })} 
          style={{ padding: '10px' }}
          disabled={!isConnected}
        >
          Test Message
        </button>
      </div>

      <div style={{ fontSize: '12px', color: '#666' }}>
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
        <p>If connected, WebSocket errors should be resolved!</p>
      </div>
    </div>
  );
}
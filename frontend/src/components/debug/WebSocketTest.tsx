'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealTime } from '@/components/layout/RealTimeProvider';
import { Wifi, WifiOff, Users, Send } from 'lucide-react';

export const WebSocketTest: React.FC = () => {
  const { isConnected, connectionAttempts, usersOnline, updateUserStatus } = useRealTime();
  const [testMessage, setTestMessage] = useState('');

  const handleStatusUpdate = (status: string) => {
    updateUserStatus(status);
    setTestMessage(`Status updated to: ${status}`);
    setTimeout(() => setTestMessage(''), 3000);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          WebSocket Test
        </CardTitle>
        <CardDescription>
          Test real-time connectivity and events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection:</span>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : connectionAttempts > 0 ? 'Reconnecting...' : 'Disconnected'}
          </Badge>
        </div>

        {/* Users Online */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Users Online:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {usersOnline.length}
          </Badge>
        </div>

        {/* Test Actions */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Test Actions:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('busy')}
              disabled={!isConnected}
            >
              Set Busy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('available')}
              disabled={!isConnected}
            >
              Set Available
            </Button>
          </div>
        </div>

        {/* Test Message Display */}
        {testMessage && (
          <div className="p-2 bg-blue-50 rounded text-sm text-blue-700 border border-blue-200">
            <div className="flex items-center gap-2">
              <Send className="h-3 w-3" />
              {testMessage}
            </div>
          </div>
        )}

        {/* Connection Info */}
        <div className="text-xs text-gray-500">
          {isConnected ? (
            <div>
              ✅ Real-time updates active<br />
              📡 WebSocket server: ws://localhost:3002
            </div>
          ) : (
            <div>
              ❌ Real-time updates disabled<br />
              {connectionAttempts > 0 && (
                <>🔄 Reconnection attempts: {connectionAttempts}</>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
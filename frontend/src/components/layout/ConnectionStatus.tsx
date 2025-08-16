'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useRealTime } from './RealTimeProvider';

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionAttempts, usersOnline } = useRealTime();

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (connectionAttempts > 0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connecté';
    if (connectionAttempts > 0) return 'Reconnexion...';
    return 'Déconnecté';
  };

  const getIcon = () => {
    if (isConnected) return <Wifi className="h-4 w-4" />;
    if (connectionAttempts > 0) return <RotateCcw className="h-4 w-4 animate-spin" />;
    return <WifiOff className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className={`flex items-center gap-1 text-white ${getStatusColor()}`}
            >
              {getIcon()}
              {getStatusText()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">État de la connexion temps réel</p>
              <p className="text-sm">
                {isConnected ? (
                  <>
                    ✅ Connecté au serveur WebSocket<br />
                    👥 {usersOnline.length} utilisateur(s) en ligne
                  </>
                ) : connectionAttempts > 0 ? (
                  <>
                    🔄 Tentative de reconnexion #{connectionAttempts}<br />
                    Les mises à jour temps réel sont temporairement indisponibles
                  </>
                ) : (
                  <>
                    ❌ Déconnecté du serveur WebSocket<br />
                    Les mises à jour temps réel ne fonctionnent pas
                  </>
                )}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Users online indicator */}
      {isConnected && usersOnline.length > 1 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                👥 {usersOnline.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{usersOnline.length} utilisateur(s) connecté(s)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
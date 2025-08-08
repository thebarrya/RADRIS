'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Calendar, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
  onRefresh: () => void;
  lastUpdated: Date;
}

export function DashboardHeader({ user, onRefresh, lastUpdated }: DashboardHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section - Title and user info */}
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tableau de bord
            </h1>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <User className="w-4 h-4 mr-1" />
              {user.name || user.email} ({user.role})
            </p>
          </div>
        </div>

        {/* Right section - Actions and info */}
        <div className="flex items-center space-x-4">
          {/* Last updated */}
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Mis à jour: {format(lastUpdated, 'HH:mm:ss', { locale: fr })}
          </div>

          {/* Current date */}
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </div>

          {/* Refresh button */}
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
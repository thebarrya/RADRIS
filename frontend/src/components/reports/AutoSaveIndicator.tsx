'use client';

import React from 'react';
import { Clock, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isOnline?: boolean;
  className?: string;
}

export default function AutoSaveIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  isOnline = true,
  className
}: AutoSaveIndicatorProps) {
  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'Offline',
        color: 'text-red-500'
      };
    }

    if (isSaving) {
      return {
        icon: Clock,
        text: 'Saving...',
        color: 'text-blue-500'
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: AlertCircle,
        text: 'Unsaved changes',
        color: 'text-orange-500'
      };
    }

    if (lastSaved) {
      return {
        icon: CheckCircle,
        text: `Saved ${formatTime(lastSaved)}`,
        color: 'text-green-500'
      };
    }

    return {
      icon: AlertCircle,
      text: 'Not saved',
      color: 'text-gray-500'
    };
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <div className={cn("flex items-center text-sm", status.color, className)}>
      <Icon 
        className={cn(
          "h-4 w-4 mr-1",
          isSaving && "animate-spin"
        )} 
      />
      <span>{status.text}</span>
    </div>
  );
}
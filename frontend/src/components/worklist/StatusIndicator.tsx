'use client';

import { ExaminationStatus, Priority } from '@/types';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: ExaminationStatus;
  priority: Priority;
}

export function StatusIndicator({ status, priority }: StatusIndicatorProps) {
  const getStatusConfig = () => {
    // Priority overrides for emergency cases
    if (priority === 'EMERGENCY') {
      return {
        color: 'bg-red-500',
        shape: 'diamond',
        pulse: true,
        title: 'URGENCE',
      };
    }

    switch (status) {
      case 'SCHEDULED':
        return {
          color: 'bg-blue-500',
          shape: 'circle',
          title: 'Programmé',
        };
      case 'IN_PROGRESS':
        return {
          color: 'bg-orange-500',
          shape: 'circle',
          pulse: true,
          title: 'En cours',
        };
      case 'ACQUIRED':
        return {
          color: 'bg-green-500',
          shape: 'circle',
          title: 'Acquis',
        };
      case 'REPORTING':
        return {
          color: 'bg-purple-500',
          shape: 'square',
          title: 'En lecture',
        };
      case 'VALIDATED':
        return {
          color: 'bg-emerald-600',
          shape: 'square',
          title: 'Validé',
        };
      case 'CANCELLED':
        return {
          color: 'bg-gray-400',
          shape: 'circle',
          title: 'Annulé',
        };
      case 'EMERGENCY':
        return {
          color: 'bg-red-500',
          shape: 'diamond',
          pulse: true,
          title: 'Urgence',
        };
      default:
        return {
          color: 'bg-gray-400',
          shape: 'circle',
          title: status,
        };
    }
  };

  const config = getStatusConfig();

  const baseClasses = 'inline-block';
  const shapeClasses = {
    circle: 'w-3 h-3 rounded-full',
    square: 'w-3 h-3 rounded-sm',
    diamond: 'w-3 h-3 transform rotate-45',
  };

  return (
    <div 
      className={cn(
        baseClasses,
        shapeClasses[config.shape as keyof typeof shapeClasses],
        config.color,
        config.pulse && 'animate-pulse'
      )}
      title={config.title}
    />
  );
}
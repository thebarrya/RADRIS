'use client';

import { Modality } from '@/types';
import { cn } from '@/lib/utils';

interface ModalityBadgeProps {
  modality: Modality;
}

const modalityConfig = {
  CR: { label: 'CR', color: 'bg-purple-100 text-purple-800' },
  CT: { label: 'TDM', color: 'bg-orange-100 text-orange-800' },
  MR: { label: 'IRM', color: 'bg-blue-100 text-blue-800' },
  US: { label: 'ECH', color: 'bg-yellow-100 text-yellow-800' },
  MG: { label: 'MG', color: 'bg-pink-100 text-pink-800' },
  RF: { label: 'RF', color: 'bg-indigo-100 text-indigo-800' },
  DX: { label: 'RX', color: 'bg-green-100 text-green-800' },
  NM: { label: 'MN', color: 'bg-red-100 text-red-800' },
  PT: { label: 'TEP', color: 'bg-amber-100 text-amber-800' },
  XA: { label: 'ANGIO', color: 'bg-cyan-100 text-cyan-800' },
};

export function ModalityBadge({ modality }: ModalityBadgeProps) {
  const config = modalityConfig[modality] || { 
    label: modality, 
    color: 'bg-gray-100 text-gray-800' 
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 text-xs font-medium rounded',
      config.color
    )}>
      {config.label}
    </span>
  );
}
'use client';

import { Patient } from '@/types';
import { cn } from '@/lib/utils';

interface PatientCellProps {
  patient: Patient;
  accessionNumber: string;
}

export function PatientCell({ patient, accessionNumber }: PatientCellProps) {
  const hasWarnings = patient.warnings && patient.warnings.length > 0;
  const hasAllergies = patient.allergies && patient.allergies.length > 0;

  return (
    <div className="flex flex-col">
      {/* Patient name with alerts */}
      <div className="flex items-center space-x-2">
        <div className={cn(
          'font-medium text-sm',
          hasWarnings && 'text-orange-800'
        )}>
          {patient.lastName.toUpperCase()}, {patient.firstName}
        </div>
        {hasWarnings && (
          <div className="flex space-x-1">
            {patient.warnings.includes('allergy') && (
              <span className="text-red-500" title="Allergie">⚠️</span>
            )}
            {patient.warnings.includes('pregnancy') && (
              <span className="text-pink-500" title="Grossesse">🤱</span>
            )}
            {patient.warnings.includes('pacemaker') && (
              <span className="text-blue-500" title="Pacemaker">📱</span>
            )}
            {patient.warnings.includes('claustrophobia') && (
              <span className="text-purple-500" title="Claustrophobie">😰</span>
            )}
            {patient.warnings.includes('infection') && (
              <span className="text-orange-500" title="Infection">🦠</span>
            )}
          </div>
        )}
      </div>
      
      {/* Accession number and gender */}
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        <span className="font-mono">{accessionNumber}</span>
        <span>•</span>
        <span>{patient.gender}</span>
        {hasAllergies && (
          <>
            <span>•</span>
            <span className="text-red-600 font-medium" title={patient.allergies.join(', ')}>
              Allergies
            </span>
          </>
        )}
      </div>
    </div>
  );
}
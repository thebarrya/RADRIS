'use client';

import { useState } from 'react';
import { Patient, Examination } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PatientExaminationHistory } from './PatientExaminationHistory';
import { useNavigation } from '@/hooks/useNavigation';
import { formatDate, calculateAge } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

interface PatientDetailViewProps {
  patient: Patient;
  onPatientUpdated: () => void;
}

export function PatientDetailView({ patient, onPatientUpdated }: PatientDetailViewProps) {
  const [activeTab, setActiveTab] = useState('info');
  const { navigateTo } = useNavigation();

  const getGenderDisplay = (gender: string) => {
    switch (gender) {
      case 'M': return 'Homme';
      case 'F': return 'Femme';
      default: return 'Autre';
    }
  };

  const getWarningIcon = (warning: string) => {
    switch (warning) {
      case 'allergy': return '⚠️';
      case 'pregnancy': return '🤱';
      case 'pacemaker': return '📱';
      case 'claustrophobia': return '😰';
      case 'infection': return '🦠';
      default: return '⚠️';
    }
  };

  const getWarningLabel = (warning: string) => {
    switch (warning) {
      case 'allergy': return 'Allergie';
      case 'pregnancy': return 'Grossesse';
      case 'pacemaker': return 'Pacemaker';
      case 'claustrophobia': return 'Claustrophobie';
      case 'infection': return 'Infection';
      default: return warning;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'ACQUIRED': return 'bg-green-100 text-green-800';
      case 'REPORTING': return 'bg-purple-100 text-purple-800';
      case 'VALIDATED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'EMERGENCY': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Programmé';
      case 'IN_PROGRESS': return 'En cours';
      case 'ACQUIRED': return 'Acquis';
      case 'REPORTING': return 'Compte-rendu';
      case 'VALIDATED': return 'Validé';
      case 'CANCELLED': return 'Annulé';
      case 'EMERGENCY': return 'Urgence';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  window.history.back();
                }}
                className="p-2"
              >
                ← Retour
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.lastName.toUpperCase()}
                </h1>
                <p className="text-sm text-gray-600">
                  {getGenderDisplay(patient.gender)} • {calculateAge(patient.birthDate)} ans • 
                  Né(e) le {formatDate(patient.birthDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo(`/patients/${patient.id}/edit`);
                }}
                variant="outline"
              >
                ✏️ Modifier
              </Button>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigateTo(`/examinations/schedule?patientId=${patient.id}`);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                ➕ Nouvel examen
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Banner */}
      {patient.warnings && patient.warnings.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200">
          <div className="px-6 py-3">
            <div className="flex items-center space-x-2">
              <span className="text-yellow-800 font-medium">⚠️ Alertes médicales:</span>
              <div className="flex space-x-2">
                {patient.warnings.map((warning) => (
                  <Badge key={warning} variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {getWarningIcon(warning)} {getWarningLabel(warning)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              📋 Informations
            </button>
            
            <button
              onClick={() => setActiveTab('examinations')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'examinations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              🔬 Examens
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              📚 Historique médical
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-gray-50 p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nom</label>
                    <p className="text-gray-900">{patient.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Prénom</label>
                    <p className="text-gray-900">{patient.firstName}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date de naissance</label>
                    <p className="text-gray-900">{formatDate(patient.birthDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Âge</label>
                    <p className="text-gray-900">{calculateAge(patient.birthDate)} ans</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Genre</label>
                  <p className="text-gray-900">{getGenderDisplay(patient.gender)}</p>
                </div>
              </div>
            </Card>

            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Coordonnées</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Téléphone</label>
                  <p className="text-gray-900">{patient.phoneNumber || 'Non renseigné'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{patient.email || 'Non renseigné'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Adresse</label>
                  <p className="text-gray-900">
                    {patient.address ? (
                      <>
                        {patient.address}<br />
                        {patient.zipCode} {patient.city}
                      </>
                    ) : (
                      'Non renseignée'
                    )}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact d'urgence</label>
                  <p className="text-gray-900">{patient.emergencyContact || 'Non renseigné'}</p>
                </div>
              </div>
            </Card>

            {/* Medical Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations médicales</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">N° Sécurité Sociale</label>
                  <p className="text-gray-900">{patient.socialSecurity || 'Non renseigné'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">N° Assurance</label>
                  <p className="text-gray-900">{patient.insuranceNumber || 'Non renseigné'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Allergies</label>
                  <div className="mt-1">
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, index) => (
                          <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                            {allergy}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-900">Aucune allergie connue</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Nombre d'examens</span>
                  <span className="text-gray-900 font-medium">{patient.examinationCount || 0}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Patient depuis</span>
                  <span className="text-gray-900">{formatDate(patient.createdAt)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Dernière mise à jour</span>
                  <span className="text-gray-900">{formatDate(patient.updatedAt)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'examinations' && (
          <PatientExaminationHistory patientId={patient.id} />
        )}

        {activeTab === 'history' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique médical</h3>
            
            <div className="space-y-6">
              {/* Medical History */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Antécédents médicaux</h4>
                {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                  <div className="space-y-2">
                    {patient.medicalHistory.map((history, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span className="text-gray-700">{history}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucun antécédent médical renseigné</p>
                )}
              </div>

              {/* Allergies */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Allergies</h4>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, index) => (
                      <Badge key={index} variant="secondary" className="bg-red-100 text-red-800">
                        ⚠️ {allergy}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucune allergie connue</p>
                )}
              </div>

              {/* Warnings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Alertes médicales</h4>
                {patient.warnings && patient.warnings.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.warnings.map((warning) => (
                      <Badge key={warning} variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {getWarningIcon(warning)} {getWarningLabel(warning)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucune alerte médicale</p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
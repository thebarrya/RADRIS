'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Patient, Modality, Priority } from '@/types';
import { examinationsApi, patientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateExaminationModalProps {
  onClose: () => void;
  onExaminationCreated: () => void;
  preselectedPatientId?: string;
  preselectedDateTime?: Date;
}

interface ExaminationFormData {
  patientId: string;
  scheduledDate: string;
  scheduledTime: string;
  modality: Modality;
  examType: string;
  bodyPart: string;
  procedure: string;
  contrast: boolean;
  priority: Priority;
  clinicalInfo: string;
  preparation: string;
  referrerId: string;
  assignedToId: string;
}

const modalityOptions: { value: Modality; label: string }[] = [
  { value: 'CR', label: 'CR - Radiographie Numérique' },
  { value: 'CT', label: 'CT - Scanner' },
  { value: 'MR', label: 'MR - IRM' },
  { value: 'US', label: 'US - Échographie' },
  { value: 'MG', label: 'MG - Mammographie' },
  { value: 'RF', label: 'RF - Radioscopie' },
  { value: 'DX', label: 'DX - Radiographie Digitale' },
  { value: 'NM', label: 'NM - Médecine Nucléaire' },
  { value: 'PT', label: 'PT - TEP Scan' },
  { value: 'XA', label: 'XA - Angiographie' },
];

const priorityOptions: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Basse', color: 'text-gray-600' },
  { value: 'NORMAL', label: 'Normale', color: 'text-blue-600' },
  { value: 'HIGH', label: 'Élevée', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
  { value: 'EMERGENCY', label: 'Urgence', color: 'text-red-800' },
];

const examTypesByModality: Record<Modality, string[]> = {
  'CR': ['Thorax', 'Abdomen', 'Bassin', 'Membres', 'Rachis'],
  'CT': ['Thorax', 'Abdomen-Pelvis', 'Crâne', 'Rachis', 'Angio-CT'],
  'MR': ['Crâne', 'Rachis', 'Articulations', 'Abdomen', 'Angio-MR'],
  'US': ['Abdomen', 'Pelvis', 'Thyroïde', 'Cardiaque', 'Vasculaire'],
  'MG': ['Mammographie Bilatérale', 'Mammographie Unilatérale', 'Tomosynthèse'],
  'RF': ['Transit Œsogastroduodénal', 'Lavement Baryté', 'Arthrographie'],
  'DX': ['Thorax', 'Abdomen', 'Bassin', 'Membres', 'Rachis'],
  'NM': ['Scintigraphie Osseuse', 'Scintigraphie Cardiaque', 'Scintigraphie Thyroïdienne'],
  'PT': ['TEP-FDG Corps Entier', 'TEP Cérébral', 'TEP Cardiaque'],
  'XA': ['Coronarographie', 'Artériographie', 'Phlébographie'],
};

export function CreateExaminationModal({ 
  onClose, 
  onExaminationCreated, 
  preselectedPatientId,
  preselectedDateTime
}: CreateExaminationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [formData, setFormData] = useState<ExaminationFormData>(() => {
    const defaultDate = preselectedDateTime || new Date();
    return {
      patientId: preselectedPatientId || '',
      scheduledDate: defaultDate.toISOString().split('T')[0],
      scheduledTime: preselectedDateTime ? 
        `${defaultDate.getHours().toString().padStart(2, '0')}:${defaultDate.getMinutes().toString().padStart(2, '0')}` : 
        '09:00',
      modality: 'CR',
      examType: '',
      bodyPart: '',
      procedure: '',
      contrast: false,
      priority: 'NORMAL',
      clinicalInfo: '',
      preparation: '',
      referrerId: '',
      assignedToId: '',
    };
  });

  useEffect(() => {
    if (!preselectedPatientId) {
      searchPatients('');
    }
  }, [preselectedPatientId]);

  const searchPatients = async (query: string) => {
    try {
      const response = await patientsApi.getAll({ 
        query, 
        limit: 20,
        sortBy: 'lastName',
        sortOrder: 'asc'
      });
      setPatients(response.data.patients);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  const handleInputChange = (field: keyof ExaminationFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleModalityChange = (modality: Modality) => {
    setFormData(prev => ({
      ...prev,
      modality,
      examType: '', // Reset exam type when modality changes
      bodyPart: '',
      procedure: ''
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.patientId) errors.push('Veuillez sélectionner un patient');
    if (!formData.scheduledDate) errors.push('La date est requise');
    if (!formData.scheduledTime) errors.push('L\'heure est requise');
    if (!formData.modality) errors.push('La modalité est requise');
    if (!formData.examType) errors.push('Le type d\'examen est requis');
    if (!formData.bodyPart) errors.push('La région anatomique est requise');
    if (!formData.procedure) errors.push('La procédure est requise');
    
    // Validate date is not in the past
    const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
    if (scheduledDateTime < new Date()) {
      errors.push('La date/heure ne peut pas être dans le passé');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const examinationData = {
        ...formData,
        scheduledDate: scheduledDateTime.toISOString(),
        referrerId: formData.referrerId || undefined,
        assignedToId: formData.assignedToId || undefined,
        clinicalInfo: formData.clinicalInfo || undefined,
        preparation: formData.preparation || undefined,
      };
      
      await examinationsApi.create(examinationData);
      toast.success('Examen créé avec succès');
      onExaminationCreated();
    } catch (error: any) {
      console.error('Failed to create examination:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création de l\'examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPatient = patients.find(p => p.id === formData.patientId);
  const availableExamTypes = examTypesByModality[formData.modality] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nouvel Examen</h2>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div>
              <Label htmlFor="patient">Patient *</Label>
              {preselectedPatientId && selectedPatient ? (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedPatient.gender} • {selectedPatient.birthDate} • {selectedPatient.phoneNumber}
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <Input
                    type="text"
                    placeholder="Rechercher un patient..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      searchPatients(e.target.value);
                    }}
                  />
                  
                  {patients.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-md">
                      {patients.map((patient) => (
                        <div
                          key={patient.id}
                          className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                            formData.patientId === patient.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleInputChange('patientId', patient.id)}
                        >
                          <div className="font-medium">
                            {patient.firstName} {patient.lastName.toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-600">
                            {patient.gender} • {patient.birthDate} • {patient.phoneNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="scheduledDate">Date *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="scheduledTime">Heure *</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                  className="mt-2"
                  required
                />
              </div>
            </div>

            {/* Modality and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="modality">Modalité *</Label>
                <select
                  id="modality"
                  value={formData.modality}
                  onChange={(e) => handleModalityChange(e.target.value as Modality)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {modalityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="priority">Priorité *</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value} className={option.color}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Type and Body Part */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="examType">Type d'examen *</Label>
                <select
                  id="examType"
                  value={formData.examType}
                  onChange={(e) => handleInputChange('examType', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Sélectionner un type d'examen</option>
                  {availableExamTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="bodyPart">Région anatomique *</Label>
                <Input
                  id="bodyPart"
                  type="text"
                  value={formData.bodyPart}
                  onChange={(e) => handleInputChange('bodyPart', e.target.value)}
                  className="mt-2"
                  placeholder="Ex: Thorax, Abdomen, Membre supérieur..."
                  required
                />
              </div>
            </div>

            {/* Procedure and Contrast */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="procedure">Procédure *</Label>
                <Input
                  id="procedure"
                  type="text"
                  value={formData.procedure}
                  onChange={(e) => handleInputChange('procedure', e.target.value)}
                  className="mt-2"
                  placeholder="Description de la procédure"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 mt-8">
                <input
                  id="contrast"
                  type="checkbox"
                  checked={formData.contrast}
                  onChange={(e) => handleInputChange('contrast', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="contrast" className="cursor-pointer">
                  Avec produit de contraste
                </Label>
              </div>
            </div>

            {/* Clinical Info */}
            <div>
              <Label htmlFor="clinicalInfo">Informations cliniques</Label>
              <textarea
                id="clinicalInfo"
                value={formData.clinicalInfo}
                onChange={(e) => handleInputChange('clinicalInfo', e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Symptômes, antécédents, indication clinique..."
              />
            </div>

            {/* Preparation */}
            <div>
              <Label htmlFor="preparation">Préparation</Label>
              <textarea
                id="preparation"
                value={formData.preparation}
                onChange={(e) => handleInputChange('preparation', e.target.value)}
                className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Instructions de préparation pour le patient..."
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? 'Création...' : 'Créer l\'examen'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
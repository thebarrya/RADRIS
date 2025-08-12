'use client';

import { useState } from 'react';
import { Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { patientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface EditPatientFormProps {
  patient: Patient;
  onPatientUpdated: () => void;
  onCancel: () => void;
}

interface PatientFormData {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'M' | 'F' | 'OTHER';
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  socialSecurity: string;
  insuranceNumber: string;
  emergencyContact: string;
  allergies: string[];
  medicalHistory: string[];
  warnings: string[];
}

export function EditPatientForm({ patient, onPatientUpdated, onCancel }: EditPatientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: patient.firstName,
    lastName: patient.lastName,
    birthDate: patient.birthDate.split('T')[0], // Convert to YYYY-MM-DD format
    gender: patient.gender,
    phoneNumber: patient.phoneNumber || '',
    email: patient.email || '',
    address: patient.address || '',
    city: patient.city || '',
    zipCode: patient.zipCode || '',
    socialSecurity: patient.socialSecurity || '',
    insuranceNumber: patient.insuranceNumber || '',
    emergencyContact: patient.emergencyContact || '',
    allergies: patient.allergies || [],
    medicalHistory: patient.medicalHistory || [],
    warnings: patient.warnings || [],
  });

  const [allergyInput, setAllergyInput] = useState('');
  const [medicalHistoryInput, setMedicalHistoryInput] = useState('');
  const [warningType, setWarningType] = useState('');

  const handleInputChange = (field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !formData.allergies.includes(allergyInput.trim())) {
      setFormData(prev => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()]
      }));
      setAllergyInput('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index)
    }));
  };

  const addMedicalHistory = () => {
    if (medicalHistoryInput.trim() && !formData.medicalHistory.includes(medicalHistoryInput.trim())) {
      setFormData(prev => ({
        ...prev,
        medicalHistory: [...prev.medicalHistory, medicalHistoryInput.trim()]
      }));
      setMedicalHistoryInput('');
    }
  };

  const removeMedicalHistory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalHistory: prev.medicalHistory.filter((_, i) => i !== index)
    }));
  };

  const addWarning = () => {
    if (warningType && !formData.warnings.includes(warningType)) {
      setFormData(prev => ({
        ...prev,
        warnings: [...prev.warnings, warningType]
      }));
      setWarningType('');
    }
  };

  const removeWarning = (warning: string) => {
    setFormData(prev => ({
      ...prev,
      warnings: prev.warnings.filter(w => w !== warning)
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.firstName.trim()) errors.push('Le prénom est requis');
    if (!formData.lastName.trim()) errors.push('Le nom est requis');
    if (!formData.birthDate) errors.push('La date de naissance est requise');
    if (!formData.gender) errors.push('Le genre est requis');
    
    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Format d\'email invalide');
    }
    
    // Validate birth date is not in the future
    if (formData.birthDate && new Date(formData.birthDate) > new Date()) {
      errors.push('La date de naissance ne peut pas être dans le futur');
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
      // Prepare data for API
      const patientData = {
        ...formData,
        // Convert empty strings to undefined for optional fields
        phoneNumber: formData.phoneNumber || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        zipCode: formData.zipCode || undefined,
        socialSecurity: formData.socialSecurity || undefined,
        insuranceNumber: formData.insuranceNumber || undefined,
        emergencyContact: formData.emergencyContact || undefined,
      };
      
      await patientsApi.update(patient.id, patientData);
      toast.success('Patient mis à jour avec succès');
      onPatientUpdated();
    } catch (error: any) {
      console.error('Failed to update patient:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du patient');
    } finally {
      setIsSubmitting(false);
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
                onClick={onCancel}
                className="p-2"
              >
                ← Retour
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Modifier le patient
                </h1>
                <p className="text-sm text-gray-600">
                  {patient.firstName} {patient.lastName.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-gray-50 p-6">
        <Card className="max-w-4xl mx-auto">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations de base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="birthDate">Date de naissance *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="gender">Genre *</Label>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value as 'M' | 'F' | 'OTHER')}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="M">Homme</option>
                      <option value="F">Femme</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Coordonnées</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phoneNumber">Téléphone</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="zipCode">Code postal</Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="emergencyContact">Contact d'urgence</Label>
                    <Input
                      id="emergencyContact"
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      className="mt-2"
                      placeholder="Nom et téléphone du contact d'urgence"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations médicales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="socialSecurity">N° Sécurité Sociale</Label>
                    <Input
                      id="socialSecurity"
                      type="text"
                      value={formData.socialSecurity}
                      onChange={(e) => handleInputChange('socialSecurity', e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="insuranceNumber">N° Assurance</Label>
                    <Input
                      id="insuranceNumber"
                      type="text"
                      value={formData.insuranceNumber}
                      onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              {/* Allergies */}
              <div>
                <Label>Allergies</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={allergyInput}
                      onChange={(e) => setAllergyInput(e.target.value)}
                      placeholder="Ajouter une allergie"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    />
                    <Button type="button" onClick={addAllergy} variant="outline">
                      Ajouter
                    </Button>
                  </div>
                  {formData.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                        >
                          {allergy}
                          <button
                            type="button"
                            onClick={() => removeAllergy(index)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Medical History */}
              <div>
                <Label>Antécédents médicaux</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={medicalHistoryInput}
                      onChange={(e) => setMedicalHistoryInput(e.target.value)}
                      placeholder="Ajouter un antécédent médical"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicalHistory())}
                    />
                    <Button type="button" onClick={addMedicalHistory} variant="outline">
                      Ajouter
                    </Button>
                  </div>
                  {formData.medicalHistory.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.medicalHistory.map((history, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {history}
                          <button
                            type="button"
                            onClick={() => removeMedicalHistory(index)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Warnings */}
              <div>
                <Label>Alertes médicales</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex space-x-2">
                    <select
                      value={warningType}
                      onChange={(e) => setWarningType(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une alerte</option>
                      <option value="allergy">Allergie</option>
                      <option value="pregnancy">Grossesse</option>
                      <option value="pacemaker">Pacemaker</option>
                      <option value="claustrophobia">Claustrophobie</option>
                      <option value="infection">Infection</option>
                    </select>
                    <Button type="button" onClick={addWarning} variant="outline">
                      Ajouter
                    </Button>
                  </div>
                  {formData.warnings.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.warnings.map((warning) => (
                        <span
                          key={warning}
                          className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                        >
                          {warning === 'allergy' && '⚠️ Allergie'}
                          {warning === 'pregnancy' && '🤱 Grossesse'}
                          {warning === 'pacemaker' && '📱 Pacemaker'}
                          {warning === 'claustrophobia' && '😰 Claustrophobie'}
                          {warning === 'infection' && '🦠 Infection'}
                          <button
                            type="button"
                            onClick={() => removeWarning(warning)}
                            className="ml-2 text-yellow-600 hover:text-yellow-800"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={onCancel}>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
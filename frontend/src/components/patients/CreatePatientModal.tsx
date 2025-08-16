'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MedicalHistoryManager } from './MedicalHistoryManager';
import { AllergyManager } from './AllergyManager';
import { patientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CreatePatientModalProps {
  onClose: () => void;
  onPatientCreated: () => void;
}

interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosisDate?: string;
  notes?: string;
  status: 'active' | 'resolved' | 'chronic';
}

interface Allergy {
  id: string;
  name: string;
  type: 'medication' | 'food' | 'environmental' | 'contrast' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction?: string;
  notes?: string;
  verifiedDate?: string;
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
  allergies: Allergy[];
  medicalHistory: MedicalCondition[];
  warnings: string[];
}

export function CreatePatientModal({ onClose, onPatientCreated }: CreatePatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    socialSecurity: '',
    insuranceNumber: '',
    emergencyContact: '',
    allergies: [],
    medicalHistory: [],
    warnings: [],
  });

  const [warningType, setWarningType] = useState('');
  const [activeTab, setActiveTab] = useState('basic');

  const handleInputChange = (field: keyof PatientFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAllergiesChange = (allergies: Allergy[]) => {
    setFormData(prev => ({ ...prev, allergies }));
  };

  const handleMedicalHistoryChange = (medicalHistory: MedicalCondition[]) => {
    setFormData(prev => ({ ...prev, medicalHistory }));
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
        // Convert structured data to simple arrays for API compatibility
        allergies: formData.allergies.map(a => `${a.name} (${a.severity})`),
        medicalHistory: formData.medicalHistory.map(m => `${m.name} - ${m.category}`),
      };
      
      await patientsApi.create(patientData);
      toast.success('Patient créé avec succès');
      onPatientCreated();
    } catch (error: any) {
      console.error('Failed to create patient:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création du patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nouveau Patient</h2>
            <Button variant="ghost" onClick={onClose}>
              ✕
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Informations de base</TabsTrigger>
                <TabsTrigger value="contact">Contact & Assurance</TabsTrigger>
                <TabsTrigger value="medical">Antécédents médicaux</TabsTrigger>
                <TabsTrigger value="allergies">Allergies & Alertes</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto mt-4">
                <TabsContent value="basic" className="space-y-6 mt-0">
                  {/* Basic Information */}
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
                </TabsContent>

                <TabsContent value="contact" className="space-y-6 mt-0">
                  {/* Contact Information */}
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
                </TabsContent>

                <TabsContent value="medical" className="space-y-6 mt-0">
                  <MedicalHistoryManager
                    conditions={formData.medicalHistory}
                    onChange={handleMedicalHistoryChange}
                  />
                </TabsContent>

                <TabsContent value="allergies" className="space-y-6 mt-0">
                  <AllergyManager
                    allergies={formData.allergies}
                    onChange={handleAllergiesChange}
                  />

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
                </TabsContent>
              </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex space-x-2">
                {activeTab !== 'basic' && (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      const tabs = ['basic', 'contact', 'medical', 'allergies'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                    }}
                  >
                    ← Précédent
                  </Button>
                )}
              </div>
              
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                
                {activeTab !== 'allergies' ? (
                  <Button 
                    type="button"
                    onClick={() => {
                      const tabs = ['basic', 'contact', 'medical', 'allergies'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Suivant →
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmitting ? 'Création...' : 'Créer le patient'}
                  </Button>
                )}
              </div>
            </div>
            </Tabs>
          </form>
        </div>
      </Card>
    </div>
  );
}
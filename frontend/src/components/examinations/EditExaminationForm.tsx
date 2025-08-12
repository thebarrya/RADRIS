'use client';

import { useState } from 'react';
import { Examination, Modality, Priority, ExaminationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { examinationsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface EditExaminationFormProps {
  examination: Examination;
  onExaminationUpdated: () => void;
  onCancel: () => void;
}

interface ExaminationFormData {
  scheduledDate: string;
  scheduledTime: string;
  modality: Modality;
  examType: string;
  bodyPart: string;
  procedure: string;
  contrast: boolean;
  priority: Priority;
  status: ExaminationStatus;
  clinicalInfo: string;
  preparation: string;
  comments: string[];
  locked: boolean;
  lockReason: string;
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

const statusOptions: { value: ExaminationStatus; label: string; color: string }[] = [
  { value: 'SCHEDULED', label: 'Programmé', color: 'text-blue-600' },
  { value: 'IN_PROGRESS', label: 'En cours', color: 'text-yellow-600' },
  { value: 'ACQUIRED', label: 'Acquis', color: 'text-green-600' },
  { value: 'REPORTING', label: 'En lecture', color: 'text-purple-600' },
  { value: 'VALIDATED', label: 'Validé', color: 'text-green-800' },
  { value: 'CANCELLED', label: 'Annulé', color: 'text-red-600' },
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

export function EditExaminationForm({ examination, onExaminationUpdated, onCancel }: EditExaminationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExaminationFormData>(() => {
    const scheduledDate = new Date(examination.scheduledDate);
    return {
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().slice(0, 5),
      modality: examination.modality,
      examType: examination.examType,
      bodyPart: examination.bodyPart,
      procedure: examination.procedure,
      contrast: examination.contrast,
      priority: examination.priority,
      status: examination.status,
      clinicalInfo: examination.clinicalInfo || '',
      preparation: examination.preparation || '',
      comments: examination.comments || [],
      locked: examination.locked,
      lockReason: examination.lockReason || '',
    };
  });

  const [newComment, setNewComment] = useState('');

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
    }));
  };

  const addComment = () => {
    if (newComment.trim()) {
      setFormData(prev => ({
        ...prev,
        comments: [...prev.comments, newComment.trim()]
      }));
      setNewComment('');
    }
  };

  const removeComment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      comments: prev.comments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.scheduledDate) errors.push('La date est requise');
    if (!formData.scheduledTime) errors.push('L\'heure est requise');
    if (!formData.modality) errors.push('La modalité est requise');
    if (!formData.examType) errors.push('Le type d\'examen est requis');
    if (!formData.bodyPart) errors.push('La région anatomique est requise');
    if (!formData.procedure) errors.push('La procédure est requise');
    
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
      
      const updateData = {
        scheduledDate: scheduledDateTime.toISOString(),
        modality: formData.modality,
        examType: formData.examType,
        bodyPart: formData.bodyPart,
        procedure: formData.procedure,
        contrast: formData.contrast,
        priority: formData.priority,
        status: formData.status,
        clinicalInfo: formData.clinicalInfo || undefined,
        preparation: formData.preparation || undefined,
        comments: formData.comments,
        locked: formData.locked,
        lockReason: formData.lockReason || undefined,
      };
      
      await examinationsApi.update(examination.id, updateData);
      toast.success('Examen mis à jour avec succès');
      onExaminationUpdated();
    } catch (error: any) {
      console.error('Failed to update examination:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour de l\'examen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableExamTypes = examTypesByModality[formData.modality] || [];

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
                  Modifier l'examen
                </h1>
                <p className="text-sm text-gray-600">
                  #{examination.accessionNumber} • {examination.patient.firstName} {examination.patient.lastName.toUpperCase()}
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
              {/* Date and Time */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Planification</h3>
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
              </div>

              {/* Modality and Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modalité et statut</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    <Label htmlFor="status">Statut *</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value} className={option.color}>
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
              </div>

              {/* Exam Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Détails de l'examen</h3>
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
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="procedure">Procédure *</Label>
                    <Input
                      id="procedure"
                      type="text"
                      value={formData.procedure}
                      onChange={(e) => handleInputChange('procedure', e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2 mt-4">
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
              </div>

              {/* Clinical Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Informations cliniques</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clinicalInfo">Indication clinique</Label>
                    <textarea
                      id="clinicalInfo"
                      value={formData.clinicalInfo}
                      onChange={(e) => handleInputChange('clinicalInfo', e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Symptômes, antécédents, indication clinique..."
                    />
                  </div>

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
                </div>
              </div>

              {/* Comments */}
              <div>
                <Label>Commentaires</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajouter un commentaire"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addComment())}
                    />
                    <Button type="button" onClick={addComment} variant="outline">
                      Ajouter
                    </Button>
                  </div>
                  {formData.comments.length > 0 && (
                    <div className="space-y-2">
                      {formData.comments.map((comment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <span className="text-sm text-gray-700">{comment}</span>
                          <button
                            type="button"
                            onClick={() => removeComment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lock Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verrouillage</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      id="locked"
                      type="checkbox"
                      checked={formData.locked}
                      onChange={(e) => handleInputChange('locked', e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="locked" className="cursor-pointer">
                      Verrouiller l'examen
                    </Label>
                  </div>

                  {formData.locked && (
                    <div>
                      <Label htmlFor="lockReason">Raison du verrouillage</Label>
                      <Input
                        id="lockReason"
                        type="text"
                        value={formData.lockReason}
                        onChange={(e) => handleInputChange('lockReason', e.target.value)}
                        className="mt-2"
                        placeholder="Raison du verrouillage..."
                      />
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
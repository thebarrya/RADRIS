'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AdvancedSearchFilters {
  firstName?: string;
  lastName?: string;
  socialSecurity?: string;
  email?: string;
  phoneNumber?: string;
  birthDateFrom?: string;
  birthDateTo?: string;
  gender?: 'M' | 'F' | 'OTHER' | '';
  city?: string;
  zipCode?: string;
  hasAllergies?: boolean;
  hasMedicalHistory?: boolean;
  hasWarnings?: boolean;
  insuranceNumber?: string;
  ageFrom?: number;
  ageTo?: number;
  createdFrom?: string;
  createdTo?: string;
  hasRecentExams?: boolean;
  examDateFrom?: string;
  examDateTo?: string;
}

interface AdvancedPatientSearchProps {
  onSearch: (filters: AdvancedSearchFilters) => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AdvancedPatientSearch({ onSearch, onReset, isOpen, onToggle }: AdvancedPatientSearchProps) {
  const [filters, setFilters] = useState<AdvancedSearchFilters>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const updateFilter = (key: keyof AdvancedSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Count active filters
    const count = Object.values(newFilters).filter(v => 
      v !== undefined && v !== '' && v !== null
    ).length;
    setActiveFilterCount(count);
  };

  const handleSearch = () => {
    // Remove empty values
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        acc[key as keyof AdvancedSearchFilters] = value;
      }
      return acc;
    }, {} as AdvancedSearchFilters);
    
    onSearch({ ...cleanFilters, isAdvancedSearch: true } as any);
  };

  const handleReset = () => {
    setFilters({});
    setActiveFilterCount(0);
    onReset();
  };

  const getAgeFromBirthDate = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onToggle}
          className="flex items-center space-x-2"
        >
          <span>🔍 Recherche avancée</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
          <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </Button>
        
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Effacer les filtres
          </Button>
        )}
      </div>

      {/* Advanced Search Form */}
      {isOpen && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recherche avancée</h3>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                ✕
              </Button>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Informations personnelles</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="searchFirstName">Prénom</Label>
                  <Input
                    id="searchFirstName"
                    value={filters.firstName || ''}
                    onChange={(e) => updateFilter('firstName', e.target.value)}
                    placeholder="Rechercher par prénom..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="searchLastName">Nom</Label>
                  <Input
                    id="searchLastName"
                    value={filters.lastName || ''}
                    onChange={(e) => updateFilter('lastName', e.target.value)}
                    placeholder="Rechercher par nom..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="searchGender">Genre</Label>
                  <select
                    id="searchGender"
                    value={filters.gender || ''}
                    onChange={(e) => updateFilter('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tous les genres</option>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="searchEmail">Email</Label>
                  <Input
                    id="searchEmail"
                    value={filters.email || ''}
                    onChange={(e) => updateFilter('email', e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="searchPhone">Téléphone</Label>
                  <Input
                    id="searchPhone"
                    value={filters.phoneNumber || ''}
                    onChange={(e) => updateFilter('phoneNumber', e.target.value)}
                    placeholder="0123456789"
                  />
                </div>
                
                <div>
                  <Label htmlFor="searchCity">Ville</Label>
                  <Input
                    id="searchCity"
                    value={filters.city || ''}
                    onChange={(e) => updateFilter('city', e.target.value)}
                    placeholder="Ville de résidence"
                  />
                </div>
              </div>
            </div>

            {/* Age and Birth Date */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Âge et naissance</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="ageFrom">Âge min</Label>
                  <Input
                    id="ageFrom"
                    type="number"
                    min="0"
                    max="120"
                    value={filters.ageFrom || ''}
                    onChange={(e) => updateFilter('ageFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="18"
                  />
                </div>
                
                <div>
                  <Label htmlFor="ageTo">Âge max</Label>
                  <Input
                    id="ageTo"
                    type="number"
                    min="0"
                    max="120"
                    value={filters.ageTo || ''}
                    onChange={(e) => updateFilter('ageTo', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="65"
                  />
                </div>
                
                <div>
                  <Label htmlFor="birthDateFrom">Né après le</Label>
                  <Input
                    id="birthDateFrom"
                    type="date"
                    value={filters.birthDateFrom || ''}
                    onChange={(e) => updateFilter('birthDateFrom', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="birthDateTo">Né avant le</Label>
                  <Input
                    id="birthDateTo"
                    type="date"
                    value={filters.birthDateTo || ''}
                    onChange={(e) => updateFilter('birthDateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Informations médicales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="searchSocialSecurity">N° Sécurité Sociale</Label>
                  <Input
                    id="searchSocialSecurity"
                    value={filters.socialSecurity || ''}
                    onChange={(e) => updateFilter('socialSecurity', e.target.value)}
                    placeholder="Numéro de sécurité sociale"
                  />
                </div>
                
                <div>
                  <Label htmlFor="searchInsurance">N° Assurance</Label>
                  <Input
                    id="searchInsurance"
                    value={filters.insuranceNumber || ''}
                    onChange={(e) => updateFilter('insuranceNumber', e.target.value)}
                    placeholder="Numéro d'assurance"
                  />
                </div>
              </div>
              
              {/* Medical Conditions Checkboxes */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.hasAllergies || false}
                    onChange={(e) => updateFilter('hasAllergies', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">⚠️ Avec allergies</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.hasMedicalHistory || false}
                    onChange={(e) => updateFilter('hasMedicalHistory', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">📋 Avec antécédents</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.hasWarnings || false}
                    onChange={(e) => updateFilter('hasWarnings', e.target.checked || undefined)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">🚨 Avec alertes</span>
                </label>
              </div>
            </div>

            {/* Examination History */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Historique des examens</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.hasRecentExams || false}
                      onChange={(e) => updateFilter('hasRecentExams', e.target.checked || undefined)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">🔬 Examens récents (30j)</span>
                  </label>
                </div>
                
                <div>
                  <Label htmlFor="examDateFrom">Examens après le</Label>
                  <Input
                    id="examDateFrom"
                    type="date"
                    value={filters.examDateFrom || ''}
                    onChange={(e) => updateFilter('examDateFrom', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="examDateTo">Examens avant le</Label>
                  <Input
                    id="examDateTo"
                    type="date"
                    value={filters.examDateTo || ''}
                    onChange={(e) => updateFilter('examDateTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Registration Date */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Date d'enregistrement</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="createdFrom">Enregistré après le</Label>
                  <Input
                    id="createdFrom"
                    type="date"
                    value={filters.createdFrom || ''}
                    onChange={(e) => updateFilter('createdFrom', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="createdTo">Enregistré avant le</Label>
                  <Input
                    id="createdTo"
                    type="date"
                    value={filters.createdTo || ''}
                    onChange={(e) => updateFilter('createdTo', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <Button variant="outline" onClick={handleReset}>
                Réinitialiser
              </Button>
              <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700 text-white">
                🔍 Rechercher ({activeFilterCount} filtre{activeFilterCount !== 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
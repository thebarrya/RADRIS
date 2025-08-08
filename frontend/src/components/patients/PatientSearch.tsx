'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface PatientSearchProps {
  onSearch: (params: any) => void;
  searchParams: {
    query: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
}

export function PatientSearch({ onSearch, searchParams }: PatientSearchProps) {
  const [quickSearch, setQuickSearch] = useState(searchParams.query);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedParams, setAdvancedParams] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    phoneNumber: '',
    socialSecurity: '',
    ageRange: { min: '', max: '' },
    hasWarnings: undefined as boolean | undefined,
  });

  const handleQuickSearch = (value: string) => {
    setQuickSearch(value);
    onSearch({ query: value });
  };

  const handleAdvancedSearch = () => {
    const params: any = {};
    
    // Convert form data to API format
    if (advancedParams.firstName) params.firstName = advancedParams.firstName;
    if (advancedParams.lastName) params.lastName = advancedParams.lastName;
    if (advancedParams.birthDate) params.birthDate = advancedParams.birthDate;
    if (advancedParams.gender) params.gender = advancedParams.gender;
    if (advancedParams.phoneNumber) params.phoneNumber = advancedParams.phoneNumber;
    if (advancedParams.socialSecurity) params.socialSecurity = advancedParams.socialSecurity;
    if (advancedParams.hasWarnings !== undefined) params.hasWarnings = advancedParams.hasWarnings;
    
    if (advancedParams.ageRange.min || advancedParams.ageRange.max) {
      params.ageRange = {};
      if (advancedParams.ageRange.min) params.ageRange.min = parseInt(advancedParams.ageRange.min);
      if (advancedParams.ageRange.max) params.ageRange.max = parseInt(advancedParams.ageRange.max);
    }
    
    // Use POST request for advanced search
    onSearch(params);
  };

  const clearAdvanced = () => {
    setAdvancedParams({
      firstName: '',
      lastName: '',
      birthDate: '',
      gender: '',
      phoneNumber: '',
      socialSecurity: '',
      ageRange: { min: '', max: '' },
      hasWarnings: undefined,
    });
    onSearch({ query: '' });
  };

  return (
    <div className="space-y-4">
      {/* Quick Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Recherche rapide : nom, prénom, n° sécurité sociale..."
            value={quickSearch}
            onChange={(e) => handleQuickSearch(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          🔍 Recherche avancée
        </Button>
        
        <Button
          variant="outline"
          onClick={() => handleQuickSearch('')}
        >
          ✕ Effacer
        </Button>
      </div>

      {/* Advanced Search */}
      {showAdvanced && (
        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Recherche Avancée</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Name fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <Input
                  type="text"
                  value={advancedParams.lastName}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    lastName: e.target.value
                  }))}
                  placeholder="Nom de famille"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <Input
                  type="text"
                  value={advancedParams.firstName}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    firstName: e.target.value
                  }))}
                  placeholder="Prénom"
                />
              </div>

              {/* Demographics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <Input
                  type="date"
                  value={advancedParams.birthDate}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    birthDate: e.target.value
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Genre
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={advancedParams.gender}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    gender: e.target.value
                  }))}
                >
                  <option value="">Tous</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              {/* Contact info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <Input
                  type="text"
                  value={advancedParams.phoneNumber}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    phoneNumber: e.target.value
                  }))}
                  placeholder="Numéro de téléphone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  N° Sécurité Sociale
                </label>
                <Input
                  type="text"
                  value={advancedParams.socialSecurity}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    socialSecurity: e.target.value
                  }))}
                  placeholder="Numéro de sécurité sociale"
                />
              </div>
            </div>

            {/* Age range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge minimum
                </label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={advancedParams.ageRange.min}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    ageRange: { ...prev.ageRange, min: e.target.value }
                  }))}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge maximum
                </label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={advancedParams.ageRange.max}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    ageRange: { ...prev.ageRange, max: e.target.value }
                  }))}
                  placeholder="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alertes médicales
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={advancedParams.hasWarnings === undefined ? '' : advancedParams.hasWarnings.toString()}
                  onChange={(e) => setAdvancedParams(prev => ({
                    ...prev,
                    hasWarnings: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                >
                  <option value="">Tous</option>
                  <option value="true">Avec alertes</option>
                  <option value="false">Sans alertes</option>
                </select>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-2">
                <Button onClick={handleAdvancedSearch}>
                  🔍 Rechercher
                </Button>
                <Button variant="outline" onClick={clearAdvanced}>
                  ✕ Effacer
                </Button>
              </div>
              
              <Button 
                variant="ghost"
                onClick={() => setShowAdvanced(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
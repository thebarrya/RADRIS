'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface Allergy {
  id: string;
  name: string;
  type: 'medication' | 'food' | 'environmental' | 'contrast' | 'other';
  severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
  reaction?: string;
  notes?: string;
  verifiedDate?: string;
}

interface AllergyManagerProps {
  allergies: Allergy[];
  onChange: (allergies: Allergy[]) => void;
  readOnly?: boolean;
}

const ALLERGY_TYPES = [
  { value: 'medication', label: '💊 Médicaments', icon: '💊' },
  { value: 'food', label: '🍎 Alimentaires', icon: '🍎' },
  { value: 'environmental', label: '🌿 Environnementales', icon: '🌿' },
  { value: 'contrast', label: '🔬 Produits de contraste', icon: '🔬' },
  { value: 'other', label: '🔗 Autres', icon: '🔗' }
];

const SEVERITY_CONFIG = {
  mild: { label: 'Légère', color: 'bg-green-100 text-green-800', icon: '🟢' },
  moderate: { label: 'Modérée', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  severe: { label: 'Sévère', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  'life-threatening': { label: 'Mortelle', color: 'bg-red-100 text-red-800', icon: '🔴' }
};

const COMMON_ALLERGIES = {
  medication: ['Pénicilline', 'Aspirine', 'Iode', 'Codéine', 'Morphine', 'Anti-inflammatoires'],
  food: ['Arachides', 'Fruits de mer', 'Œufs', 'Lait', 'Gluten', 'Soja'],
  environmental: ['Pollen', 'Acariens', 'Poils d\'animaux', 'Latex', 'Poussière'],
  contrast: ['Gadolinium', 'Iode', 'Baryum'],
  other: ['Métaux', 'Cosmétiques', 'Parfums']
};

export function AllergyManager({ allergies, onChange, readOnly = false }: AllergyManagerProps) {
  const [isAddingAllergy, setIsAddingAllergy] = useState(false);
  const [newAllergy, setNewAllergy] = useState<Partial<Allergy>>({
    name: '',
    type: 'medication',
    severity: 'mild',
    reaction: '',
    notes: '',
    verifiedDate: ''
  });

  const addAllergy = () => {
    if (newAllergy.name?.trim()) {
      const allergy: Allergy = {
        id: Date.now().toString(),
        name: newAllergy.name,
        type: newAllergy.type || 'medication',
        severity: newAllergy.severity || 'mild',
        reaction: newAllergy.reaction || undefined,
        notes: newAllergy.notes || undefined,
        verifiedDate: newAllergy.verifiedDate || undefined
      };
      
      onChange([...allergies, allergy]);
      setNewAllergy({
        name: '',
        type: 'medication',
        severity: 'mild',
        reaction: '',
        notes: '',
        verifiedDate: ''
      });
      setIsAddingAllergy(false);
    }
  };

  const removeAllergy = (id: string) => {
    onChange(allergies.filter(allergy => allergy.id !== id));
  };

  const updateAllergy = (id: string, updates: Partial<Allergy>) => {
    onChange(allergies.map(allergy => 
      allergy.id === id ? { ...allergy, ...updates } : allergy
    ));
  };

  const addCommonAllergy = (allergyName: string) => {
    setNewAllergy(prev => ({ ...prev, name: allergyName }));
  };

  const groupedAllergies = allergies.reduce((acc, allergy) => {
    if (!acc[allergy.type]) {
      acc[allergy.type] = [];
    }
    acc[allergy.type].push(allergy);
    return acc;
  }, {} as Record<string, Allergy[]>);

  const hasLifeThreateningAllergies = allergies.some(a => a.severity === 'life-threatening');

  return (
    <div className="space-y-4">
      {/* Header with alert indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="text-base font-semibold">Allergies</Label>
          {hasLifeThreateningAllergies && (
            <Badge className="bg-red-100 text-red-800 animate-pulse">
              ⚠️ ALLERGIES MORTELLES
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingAllergy(true)}
          >
            ➕ Ajouter
          </Button>
        )}
      </div>

      {/* Add new allergy form */}
      {isAddingAllergy && !readOnly && (
        <Card className="p-4 border-2 border-dashed border-blue-300">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="allergyName">Allergie *</Label>
                <Input
                  id="allergyName"
                  value={newAllergy.name || ''}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Pénicilline"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="allergyType">Type</Label>
                <select
                  id="allergyType"
                  value={newAllergy.type || 'medication'}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, type: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALLERGY_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="allergySeverity">Sévérité *</Label>
                <select
                  id="allergySeverity"
                  value={newAllergy.severity || 'mild'}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(SEVERITY_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>{config.icon} {config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="verifiedDate">Date de vérification</Label>
                <Input
                  id="verifiedDate"
                  type="date"
                  value={newAllergy.verifiedDate || ''}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, verifiedDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reaction">Réaction observée</Label>
              <Input
                id="reaction"
                value={newAllergy.reaction || ''}
                onChange={(e) => setNewAllergy(prev => ({ ...prev, reaction: e.target.value }))}
                placeholder="Ex: Éruption cutanée, choc anaphylactique..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="allergyNotes">Notes</Label>
              <Textarea
                id="allergyNotes"
                value={newAllergy.notes || ''}
                onChange={(e) => setNewAllergy(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Common allergies quick add */}
            {newAllergy.type && COMMON_ALLERGIES[newAllergy.type as keyof typeof COMMON_ALLERGIES] && (
              <div>
                <Label>Allergies courantes:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {COMMON_ALLERGIES[newAllergy.type as keyof typeof COMMON_ALLERGIES].map(allergyName => (
                    <Button
                      key={allergyName}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addCommonAllergy(allergyName)}
                      className="h-7 text-xs"
                    >
                      {allergyName}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingAllergy(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={addAllergy}
                disabled={!newAllergy.name?.trim()}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Display existing allergies grouped by type */}
      {Object.keys(groupedAllergies).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedAllergies).map(([type, typeAllergies]) => {
            const typeConfig = ALLERGY_TYPES.find(t => t.value === type);
            return (
              <Card key={type} className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  {typeConfig?.icon} {typeConfig?.label}
                </h4>
                <div className="space-y-3">
                  {typeAllergies.map((allergy) => {
                    const severityConfig = SEVERITY_CONFIG[allergy.severity];
                    return (
                      <div key={allergy.id} className={`flex items-start justify-between p-3 rounded-lg ${
                        allergy.severity === 'life-threatening' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                      }`}>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{allergy.name}</span>
                            <Badge className={severityConfig.color}>
                              {severityConfig.icon} {severityConfig.label}
                            </Badge>
                            {allergy.severity === 'life-threatening' && (
                              <Badge className="bg-red-100 text-red-800 animate-pulse">
                                ⚠️ CRITIQUE
                              </Badge>
                            )}
                          </div>
                          {allergy.reaction && (
                            <p className="text-sm text-gray-600">
                              <strong>Réaction:</strong> {allergy.reaction}
                            </p>
                          )}
                          {allergy.verifiedDate && (
                            <p className="text-sm text-gray-600">
                              Vérifiée le {new Date(allergy.verifiedDate).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {allergy.notes && (
                            <p className="text-sm text-gray-600 mt-1">{allergy.notes}</p>
                          )}
                        </div>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAllergy(allergy.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 text-center text-gray-500">
          <p>Aucune allergie enregistrée</p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => setIsAddingAllergy(true)}
            >
              Ajouter la première allergie
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
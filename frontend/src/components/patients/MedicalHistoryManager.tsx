'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosisDate?: string;
  notes?: string;
  status: 'active' | 'resolved' | 'chronic';
}

interface MedicalHistoryManagerProps {
  conditions: MedicalCondition[];
  onChange: (conditions: MedicalCondition[]) => void;
  readOnly?: boolean;
}

const MEDICAL_CATEGORIES = [
  'Cardiovascular',
  'Respiratoire',
  'Neurologique',
  'Endocrinien',
  'Digestif',
  'Rhumatologique',
  'Dermatologique',
  'Urologique',
  'Gynécologique',
  'Psychiatrique',
  'Oncologique',
  'Autre'
];

const SEVERITY_COLORS = {
  mild: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-red-100 text-red-800'
};

const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-800',
  resolved: 'bg-gray-100 text-gray-800',
  chronic: 'bg-purple-100 text-purple-800'
};

export function MedicalHistoryManager({ conditions, onChange, readOnly = false }: MedicalHistoryManagerProps) {
  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [newCondition, setNewCondition] = useState<Partial<MedicalCondition>>({
    name: '',
    category: 'Autre',
    severity: 'mild',
    status: 'active',
    diagnosisDate: '',
    notes: ''
  });

  const addCondition = () => {
    if (newCondition.name?.trim()) {
      const condition: MedicalCondition = {
        id: Date.now().toString(),
        name: newCondition.name,
        category: newCondition.category || 'Autre',
        severity: newCondition.severity || 'mild',
        status: newCondition.status || 'active',
        diagnosisDate: newCondition.diagnosisDate || undefined,
        notes: newCondition.notes || undefined
      };
      
      onChange([...conditions, condition]);
      setNewCondition({
        name: '',
        category: 'Autre',
        severity: 'mild',
        status: 'active',
        diagnosisDate: '',
        notes: ''
      });
      setIsAddingCondition(false);
    }
  };

  const updateCondition = (id: string, updates: Partial<MedicalCondition>) => {
    onChange(conditions.map(condition => 
      condition.id === id ? { ...condition, ...updates } : condition
    ));
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter(condition => condition.id !== id));
  };

  const groupedConditions = conditions.reduce((acc, condition) => {
    if (!acc[condition.category]) {
      acc[condition.category] = [];
    }
    acc[condition.category].push(condition);
    return acc;
  }, {} as Record<string, MedicalCondition[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Antécédents Médicaux</Label>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCondition(true)}
          >
            ➕ Ajouter
          </Button>
        )}
      </div>

      {/* Add new condition form */}
      {isAddingCondition && !readOnly && (
        <Card className="p-4 border-2 border-dashed border-blue-300">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="conditionName">Pathologie *</Label>
                <Input
                  id="conditionName"
                  value={newCondition.name || ''}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Hypertension artérielle"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category">Catégorie</Label>
                <select
                  id="category"
                  value={newCondition.category || 'Autre'}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MEDICAL_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="severity">Sévérité</Label>
                <select
                  id="severity"
                  value={newCondition.severity || 'mild'}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, severity: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mild">Légère</option>
                  <option value="moderate">Modérée</option>
                  <option value="severe">Sévère</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={newCondition.status || 'active'}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, status: e.target.value as any }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Actif</option>
                  <option value="chronic">Chronique</option>
                  <option value="resolved">Résolu</option>
                </select>
              </div>

              <div>
                <Label htmlFor="diagnosisDate">Date de diagnostic</Label>
                <Input
                  id="diagnosisDate"
                  type="date"
                  value={newCondition.diagnosisDate || ''}
                  onChange={(e) => setNewCondition(prev => ({ ...prev, diagnosisDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newCondition.notes || ''}
                onChange={(e) => setNewCondition(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingCondition(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={addCondition}
                disabled={!newCondition.name?.trim()}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Display existing conditions grouped by category */}
      {Object.keys(groupedConditions).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedConditions).map(([category, categoryConditions]) => (
            <Card key={category} className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
              <div className="space-y-3">
                {categoryConditions.map((condition) => (
                  <div key={condition.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{condition.name}</span>
                        <Badge className={SEVERITY_COLORS[condition.severity]}>
                          {condition.severity === 'mild' && 'Légère'}
                          {condition.severity === 'moderate' && 'Modérée'}
                          {condition.severity === 'severe' && 'Sévère'}
                        </Badge>
                        <Badge className={STATUS_COLORS[condition.status]}>
                          {condition.status === 'active' && 'Actif'}
                          {condition.status === 'chronic' && 'Chronique'}
                          {condition.status === 'resolved' && 'Résolu'}
                        </Badge>
                      </div>
                      {condition.diagnosisDate && (
                        <p className="text-sm text-gray-600">
                          Diagnostiqué le {new Date(condition.diagnosisDate).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {condition.notes && (
                        <p className="text-sm text-gray-600 mt-1">{condition.notes}</p>
                      )}
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center text-gray-500">
          <p>Aucun antécédent médical enregistré</p>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => setIsAddingCondition(true)}
            >
              Ajouter le premier antécédent
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
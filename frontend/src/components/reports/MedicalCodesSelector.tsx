'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Plus, 
  X, 
  Filter, 
  BookOpen, 
  Stethoscope, 
  FileText,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CodeType = 'CCAM' | 'CIM10' | 'ADICAP';

export interface MedicalCode {
  code: string;
  label: string;
  description?: string;
  category?: string;
  type: CodeType;
  keywords?: string[];
}

interface MedicalCodesSelectorProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  codeType: CodeType;
  title?: string;
  placeholder?: string;
  maxSelection?: number;
  disabled?: boolean;
  className?: string;
}

// Mock data - In real implementation, this would come from API
const MOCK_CODES: Record<CodeType, MedicalCode[]> = {
  CCAM: [
    {
      code: 'ZBQK002',
      label: 'Radiographie du thorax, face',
      description: 'Radiographie standard du thorax en incidence de face',
      category: 'Imagerie thoracique',
      type: 'CCAM',
      keywords: ['thorax', 'poumon', 'radiographie', 'face']
    },
    {
      code: 'ZBQK004',
      label: 'Radiographie du thorax, profil',
      description: 'Radiographie standard du thorax en incidence de profil',
      category: 'Imagerie thoracique',
      type: 'CCAM',
      keywords: ['thorax', 'poumon', 'radiographie', 'profil']
    },
    {
      code: 'ZCQK002',
      label: 'Tomodensitométrie du thorax',
      description: 'Scanner thoracique avec ou sans injection de produit de contraste',
      category: 'Imagerie thoracique',
      type: 'CCAM',
      keywords: ['scanner', 'thorax', 'tomodensitométrie', 'CT']
    },
    {
      code: 'ZIQK002',
      label: 'IRM du thorax',
      description: 'Imagerie par résonance magnétique du thorax',
      category: 'Imagerie thoracique',
      type: 'CCAM',
      keywords: ['IRM', 'thorax', 'résonance', 'magnétique']
    },
    {
      code: 'ZCQH002',
      label: 'Tomodensitométrie de l\'abdomen',
      description: 'Scanner abdominal avec ou sans injection',
      category: 'Imagerie abdominale',
      type: 'CCAM',
      keywords: ['scanner', 'abdomen', 'tomodensitométrie', 'CT']
    }
  ],
  CIM10: [
    {
      code: 'J18.9',
      label: 'Pneumonie, sans précision',
      description: 'Pneumonie non spécifiée',
      category: 'Maladies respiratoires',
      type: 'CIM10',
      keywords: ['pneumonie', 'infection', 'poumon', 'respiratoire']
    },
    {
      code: 'J44.1',
      label: 'BPCO avec exacerbation aiguë',
      description: 'Bronchopneumopathie chronique obstructive avec exacerbation',
      category: 'Maladies respiratoires',
      type: 'CIM10',
      keywords: ['BPCO', 'bronchique', 'chronique', 'exacerbation']
    },
    {
      code: 'I25.9',
      label: 'Cardiopathie ischémique chronique',
      description: 'Maladie ischémique chronique du cœur, sans précision',
      category: 'Maladies cardiovasculaires',
      type: 'CIM10',
      keywords: ['cardiaque', 'ischémique', 'chronique', 'cœur']
    },
    {
      code: 'K59.0',
      label: 'Constipation',
      description: 'Constipation fonctionnelle',
      category: 'Maladies digestives',
      type: 'CIM10',
      keywords: ['constipation', 'digestif', 'intestin']
    },
    {
      code: 'M79.3',
      label: 'Panniculite',
      description: 'Panniculite, sans précision',
      category: 'Maladies musculo-squelettiques',
      type: 'CIM10',
      keywords: ['panniculite', 'inflammation', 'tissu']
    }
  ],
  ADICAP: [
    {
      code: 'BHGS',
      label: 'Biopsie hépatique guidée par scanner',
      description: 'Prélèvement biopsique hépatique sous guidage scannographique',
      category: 'Biopsies guidées',
      type: 'ADICAP',
      keywords: ['biopsie', 'foie', 'hépatique', 'scanner', 'guidage']
    },
    {
      code: 'BPGE',
      label: 'Biopsie pulmonaire guidée par échographie',
      description: 'Prélèvement biopsique pulmonaire sous guidage échographique',
      category: 'Biopsies guidées',
      type: 'ADICAP',
      keywords: ['biopsie', 'poumon', 'pulmonaire', 'échographie']
    },
    {
      code: 'CRGS',
      label: 'Cytoponction rénale guidée par scanner',
      description: 'Cytoponction rénale sous guidage scannographique',
      category: 'Cytoponctions',
      type: 'ADICAP',
      keywords: ['cytoponction', 'rein', 'rénal', 'scanner']
    },
    {
      code: 'DTGE',
      label: 'Drainage thoracique guidé par échographie',
      description: 'Drainage pleural sous guidage échographique',
      category: 'Drainages',
      type: 'ADICAP',
      keywords: ['drainage', 'thorax', 'pleural', 'échographie']
    }
  ]
};

const CODE_TYPE_CONFIG = {
  CCAM: {
    icon: Stethoscope,
    color: 'bg-blue-100 text-blue-800',
    title: 'CCAM Codes',
    description: 'Classification Commune des Actes Médicaux'
  },
  CIM10: {
    icon: BookOpen,
    color: 'bg-green-100 text-green-800',
    title: 'CIM-10 Codes',
    description: 'Classification Internationale des Maladies'
  },
  ADICAP: {
    icon: FileText,
    color: 'bg-purple-100 text-purple-800',
    title: 'ADICAP Codes',
    description: 'Association pour le Développement de l\'Informatique en Cytologie et Anatomie Pathologiques'
  }
};

export default function MedicalCodesSelector({
  selectedCodes,
  onCodesChange,
  codeType,
  title,
  placeholder,
  maxSelection,
  disabled = false,
  className
}: MedicalCodesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [tempSelectedCodes, setTempSelectedCodes] = useState<string[]>([]);

  const config = CODE_TYPE_CONFIG[codeType];
  const Icon = config.icon;
  const availableCodes = MOCK_CODES[codeType] || [];

  // Initialize temp selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedCodes([...selectedCodes]);
    }
  }, [isOpen, selectedCodes]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableCodes.map(code => code.category).filter(Boolean)));
    return ['all', ...cats];
  }, [availableCodes]);

  // Filter codes based on search and category
  const filteredCodes = useMemo(() => {
    return availableCodes.filter(code => {
      const matchesSearch = !searchTerm || 
        code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.keywords?.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || code.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [availableCodes, searchTerm, selectedCategory]);

  const handleCodeToggle = (code: string) => {
    setTempSelectedCodes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        if (maxSelection && prev.length >= maxSelection) {
          return prev;
        }
        return [...prev, code];
      }
    });
  };

  const handleApply = () => {
    onCodesChange(tempSelectedCodes);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedCodes([...selectedCodes]);
    setIsOpen(false);
  };

  const handleRemoveCode = (codeToRemove: string) => {
    onCodesChange(selectedCodes.filter(code => code !== codeToRemove));
  };

  const getCodeDetails = (code: string): MedicalCode | undefined => {
    return availableCodes.find(c => c.code === code);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center">
          <Icon className="h-4 w-4 mr-2" />
          {title || config.title}
        </Label>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add {codeType} Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Icon className="h-5 w-5 mr-2" />
                Select {config.title}
              </DialogTitle>
              <p className="text-sm text-gray-600">{config.description}</p>
            </DialogHeader>

            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={placeholder || `Search ${codeType} codes...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="text-sm text-gray-600">
                  {tempSelectedCodes.length} code{tempSelectedCodes.length !== 1 ? 's' : ''} selected
                  {maxSelection && ` (max ${maxSelection})`}
                </span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleApply}>
                    Apply Selection
                  </Button>
                </div>
              </div>

              {/* Codes List */}
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredCodes.map((code) => {
                    const isSelected = tempSelectedCodes.includes(code.code);
                    const isDisabled = !isSelected && maxSelection && tempSelectedCodes.length >= maxSelection;

                    return (
                      <div
                        key={code.code}
                        className={cn(
                          "flex items-start space-x-3 p-3 border rounded-md cursor-pointer transition-colors",
                          isSelected 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 hover:border-gray-300",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !isDisabled && handleCodeToggle(code.code)}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled || false}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="secondary" className={config.color}>
                              {code.code}
                            </Badge>
                            {code.category && (
                              <Badge variant="outline" className="text-xs">
                                {code.category}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">
                            {code.label}
                          </h4>
                          {code.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {code.description}
                            </p>
                          )}
                          {code.keywords && code.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {code.keywords.map((keyword, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {filteredCodes.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No codes found matching your search.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Codes Display */}
      {selectedCodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedCodes.map((code) => {
              const codeDetails = getCodeDetails(code);
              return (
                <Badge
                  key={code}
                  variant="secondary"
                  className={cn("flex items-center space-x-1", config.color)}
                >
                  <span>{code}</span>
                  {codeDetails && (
                    <span className="text-xs opacity-75">
                      - {codeDetails.label.substring(0, 30)}
                      {codeDetails.label.length > 30 ? '...' : ''}
                    </span>
                  )}
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveCode(code)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              );
            })}
          </div>
          
          {selectedCodes.length > 0 && (
            <p className="text-xs text-gray-500">
              {selectedCodes.length} {codeType} code{selectedCodes.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      )}

      {selectedCodes.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No {codeType} codes selected
        </p>
      )}
    </div>
  );
}
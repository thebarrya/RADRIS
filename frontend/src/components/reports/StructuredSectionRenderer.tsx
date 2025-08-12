'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Minus, 
  Move, 
  Edit3, 
  Type, 
  List, 
  BarChart3,
  FileText,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SectionType = 
  | 'text' 
  | 'structured_text' 
  | 'measurements' 
  | 'findings' 
  | 'conclusion'
  | 'checklist'
  | 'table';

export interface SectionField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'measurement';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  value?: any;
}

export interface StructuredSection {
  id: string;
  type: SectionType;
  title: string;
  description?: string;
  required: boolean;
  fields: SectionField[];
  order: number;
}

interface StructuredSectionRendererProps {
  section: StructuredSection;
  values: Record<string, any>;
  onChange: (sectionId: string, fieldId: string, value: any) => void;
  onSectionChange?: (section: StructuredSection) => void;
  errors?: Record<string, string>;
  readonly?: boolean;
  className?: string;
}

const SECTION_ICONS = {
  text: Type,
  structured_text: Edit3,
  measurements: BarChart3,
  findings: Target,
  conclusion: FileText,
  checklist: List,
  table: BarChart3
};

export default function StructuredSectionRenderer({
  section,
  values,
  onChange,
  onSectionChange,
  errors = {},
  readonly = false,
  className
}: StructuredSectionRendererProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const getSectionValue = (fieldId: string) => {
    return values[`${section.id}.${fieldId}`] || section.fields.find(f => f.id === fieldId)?.value || '';
  };

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    onChange(section.id, fieldId, value);
  }, [section.id, onChange]);

  const addField = () => {
    const newField: SectionField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: 'Enter value...'
    };

    const updatedSection = {
      ...section,
      fields: [...section.fields, newField]
    };

    onSectionChange?.(updatedSection);
  };

  const removeField = (fieldId: string) => {
    const updatedSection = {
      ...section,
      fields: section.fields.filter(f => f.id !== fieldId)
    };

    onSectionChange?.(updatedSection);
  };

  const updateField = (fieldId: string, updates: Partial<SectionField>) => {
    const updatedSection = {
      ...section,
      fields: section.fields.map(f => 
        f.id === fieldId ? { ...f, ...updates } : f
      )
    };

    onSectionChange?.(updatedSection);
  };

  const renderField = (field: SectionField) => {
    const fieldValue = getSectionValue(field.id);
    const fieldError = errors[`${section.id}.${field.id}`];
    const fieldKey = `${section.id}.${field.id}`;

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldKey}
              value={fieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              disabled={readonly}
              className={cn(fieldError && "border-red-500")}
            />
            {fieldError && (
              <p className="text-sm text-red-500">{fieldError}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldKey}
              value={fieldValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              disabled={readonly}
              className={cn("min-h-[100px]", fieldError && "border-red-500")}
            />
            {fieldError && (
              <p className="text-sm text-red-500">{fieldError}</p>
            )}
          </div>
        );

      case 'number':
      case 'measurement':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {field.unit && <span className="text-gray-500 ml-2">({field.unit})</span>}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id={fieldKey}
                type="number"
                value={fieldValue}
                onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || 0)}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                disabled={readonly}
                className={cn("flex-1", fieldError && "border-red-500")}
              />
              {field.unit && (
                <span className="text-sm text-gray-500 min-w-fit">{field.unit}</span>
              )}
            </div>
            {fieldError && (
              <p className="text-sm text-red-500">{fieldError}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={fieldValue}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              disabled={readonly}
            >
              <SelectTrigger className={cn(fieldError && "border-red-500")}>
                <SelectValue placeholder={field.placeholder || "Select an option..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError && (
              <p className="text-sm text-red-500">{fieldError}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={fieldKey}
                checked={fieldValue || false}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                disabled={readonly}
              />
              <Label htmlFor={fieldKey} className="flex items-center">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
            </div>
            {fieldError && (
              <p className="text-sm text-red-500">{fieldError}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderSectionContent = () => {
    switch (section.type) {
      case 'text':
        return (
          <div className="space-y-4">
            <Textarea
              value={getSectionValue('content')}
              onChange={(e) => handleFieldChange('content', e.target.value)}
              placeholder={section.description || 'Enter text content...'}
              disabled={readonly}
              className="min-h-[150px]"
            />
          </div>
        );

      case 'structured_text':
      case 'findings':
      case 'conclusion':
        return (
          <div className="space-y-4">
            {section.fields.map(renderField)}
            {!readonly && editMode && (
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addField}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
            )}
          </div>
        );

      case 'measurements':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map(renderField)}
            </div>
            {!readonly && editMode && (
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newField: SectionField = {
                      id: `measurement_${Date.now()}`,
                      label: 'New Measurement',
                      type: 'measurement',
                      unit: 'mm',
                      required: false
                    };
                    const updatedSection = {
                      ...section,
                      fields: [...section.fields, newField]
                    };
                    onSectionChange?.(updatedSection);
                  }}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Measurement
                </Button>
              </div>
            )}
          </div>
        );

      case 'checklist':
        return (
          <div className="space-y-3">
            {section.fields.map(field => (
              <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    checked={getSectionValue(field.id) || false}
                    onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                    disabled={readonly}
                  />
                  <Label className="font-medium">{field.label}</Label>
                </div>
                {!readonly && editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {!readonly && editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newField: SectionField = {
                    id: `checklist_${Date.now()}`,
                    label: 'New Item',
                    type: 'checkbox',
                    required: false
                  };
                  const updatedSection = {
                    ...section,
                    fields: [...section.fields, newField]
                  };
                  onSectionChange?.(updatedSection);
                }}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        );

      case 'table':
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    {section.fields.slice(0, 4).map(field => (
                      <th key={field.id} className="border border-gray-300 px-3 py-2 text-left font-medium">
                        {field.label}
                      </th>
                    ))}
                    {!readonly && editMode && <th className="border border-gray-300 px-3 py-2 w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }, (_, rowIndex) => (
                    <tr key={rowIndex}>
                      {section.fields.slice(0, 4).map(field => (
                        <td key={field.id} className="border border-gray-300 px-3 py-2">
                          <Input
                            value={getSectionValue(`${field.id}_row_${rowIndex}`) || ''}
                            onChange={(e) => handleFieldChange(`${field.id}_row_${rowIndex}`, e.target.value)}
                            disabled={readonly}
                            className="border-0 p-0 h-auto focus:ring-0"
                          />
                        </td>
                      ))}
                      {!readonly && editMode && (
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <Button variant="ghost" size="sm" className="text-red-500">
                            <Minus className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>Unknown section type: {section.type}</p>
          </div>
        );
    }
  };

  const SectionIcon = SECTION_ICONS[section.type] || FileText;

  return (
    <Card className={cn("mb-4", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SectionIcon className="h-5 w-5 text-gray-600" />
            <div>
              <CardTitle className="flex items-center text-lg">
                {section.title}
                {section.required && <span className="text-red-500 ml-2">*</span>}
              </CardTitle>
              {section.description && (
                <p className="text-sm text-gray-600 mt-1">{section.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!readonly && onSectionChange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={cn(editMode && "bg-blue-50 text-blue-600")}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {renderSectionContent()}
        </CardContent>
      )}
    </Card>
  );
}
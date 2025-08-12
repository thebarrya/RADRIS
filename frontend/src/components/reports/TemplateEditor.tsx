'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Save, 
  Eye, 
  ArrowLeft, 
  FileText, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Copy,
  Trash2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTemplate, Modality } from '@/types';

interface TemplateEditorProps {
  templateId?: string;
  onSave?: (template: Partial<ReportTemplate>) => void;
  onCancel?: () => void;
  className?: string;
}

interface TemplateFormData {
  name: string;
  modality: Modality | '';
  examType: string;
  indication: string;
  technique: string;
  findings: string;
  impression: string;
  active: boolean;
}

const MODALITIES: { value: Modality; label: string }[] = [
  { value: 'CT', label: 'CT - Computed Tomography' },
  { value: 'MR', label: 'MR - Magnetic Resonance' },
  { value: 'US', label: 'US - Ultrasound' },
  { value: 'CR', label: 'CR - Computed Radiography' },
  { value: 'DX', label: 'DX - Digital Radiography' },
  { value: 'MG', label: 'MG - Mammography' },
  { value: 'RF', label: 'RF - Radiofluoroscopy' },
  { value: 'NM', label: 'NM - Nuclear Medicine' },
  { value: 'PT', label: 'PT - Positron Emission Tomography' },
  { value: 'XA', label: 'XA - X-Ray Angiography' }
];

const EXAM_TYPES_BY_MODALITY: Record<Modality, string[]> = {
  'CT': ['Thorax', 'Abdomen', 'Pelvis', 'Brain', 'Spine', 'Extremities', 'Angiography'],
  'MR': ['Brain', 'Spine', 'Abdomen', 'Pelvis', 'Extremities', 'Cardiac', 'Angiography'],
  'US': ['Abdomen', 'Pelvis', 'Thyroid', 'Cardiac', 'Vascular', 'Obstetric', 'Musculoskeletal'],
  'CR': ['Chest', 'Abdomen', 'Spine', 'Extremities'],
  'DX': ['Chest', 'Abdomen', 'Spine', 'Extremities'],
  'MG': ['Screening', 'Diagnostic', 'Biopsy'],
  'RF': ['Upper GI', 'Lower GI', 'Urography', 'Arthrography'],
  'NM': ['Bone Scan', 'Cardiac', 'Renal', 'Thyroid', 'Lung'],
  'PT': ['Oncology', 'Cardiac', 'Neurology'],
  'XA': ['Coronary', 'Peripheral', 'Cerebral', 'Renal']
};

const TEMPLATE_SECTIONS = [
  { id: 'basic', label: 'Basic Information', icon: Settings },
  { id: 'indication', label: 'Clinical Indication', icon: FileText },
  { id: 'technique', label: 'Technique', icon: Settings },
  { id: 'findings', label: 'Findings Template', icon: Eye },
  { id: 'impression', label: 'Impression Template', icon: CheckCircle }
];

export default function TemplateEditor({ 
  templateId, 
  onSave, 
  onCancel, 
  className 
}: TemplateEditorProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    modality: '',
    examType: '',
    indication: '',
    technique: '',
    findings: '',
    impression: '',
    active: true
  });
  const [activeSection, setActiveSection] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  useEffect(() => {
    if (formData.modality) {
      setAvailableExamTypes(EXAM_TYPES_BY_MODALITY[formData.modality] || []);
      if (!EXAM_TYPES_BY_MODALITY[formData.modality]?.includes(formData.examType)) {
        setFormData(prev => ({ ...prev, examType: '' }));
      }
    } else {
      setAvailableExamTypes([]);
    }
  }, [formData.modality]);

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - In real implementation, this would come from API
      const mockTemplate: ReportTemplate = {
        id: templateId!,
        name: 'CT Thorax Standard',
        modality: 'CT',
        examType: 'Thorax',
        indication: 'Clinical indication to be specified by referring physician',
        technique: 'CT examination of the thorax performed with/without intravenous contrast material.',
        findings: 'LUNGS: \nPLEURA: \nMEDIASTINUM: \nHEART: \nBONES: \nSOFT TISSUES: ',
        impression: 'Impression to be provided based on findings.',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setFormData({
        name: mockTemplate.name,
        modality: mockTemplate.modality,
        examType: mockTemplate.examType,
        indication: mockTemplate.indication || '',
        technique: mockTemplate.technique || '',
        findings: mockTemplate.findings || '',
        impression: mockTemplate.impression || '',
        active: mockTemplate.active
      });
    } catch (error) {
      console.error('Error loading template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof TemplateFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Template name is required';
    }
    if (!formData.modality) {
      errors.modality = 'Modality is required';
    }
    if (!formData.examType.trim()) {
      errors.examType = 'Exam type is required';
    }
    if (!formData.indication.trim()) {
      errors.indication = 'Clinical indication template is required';
    }
    if (!formData.findings.trim()) {
      errors.findings = 'Findings template is required';
    }
    if (!formData.impression.trim()) {
      errors.impression = 'Impression template is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      
      const templateData: Partial<ReportTemplate> = {
        ...formData,
        modality: formData.modality as Modality,
        updatedAt: new Date().toISOString(),
        ...(templateId ? {} : { createdAt: new Date().toISOString() })
      };

      // API call would go here
      console.log('Saving template:', templateData);
      
      onSave?.(templateData);
      
      // Navigate back or show success message
      router.push('/reports/templates');
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel?.();
        router.back();
      }
    } else {
      onCancel?.();
      router.back();
    }
  };

  const hasUnsavedChanges = (): boolean => {
    // Simple check - in real implementation, compare with original data
    return Object.values(formData).some(value => value !== '');
  };

  const insertTemplate = (field: keyof TemplateFormData, template: string) => {
    const currentValue = formData[field] as string;
    const newValue = currentValue ? `${currentValue}\n${template}` : template;
    handleFieldChange(field, newValue);
  };

  const FINDINGS_TEMPLATES = {
    'CT': [
      'LUNGS: No focal consolidation, mass, or nodule. No pleural effusion.',
      'MEDIASTINUM: Normal mediastinal contours. No lymphadenopathy.',
      'HEART: Normal cardiac size and contours.',
      'BONES: No acute osseous abnormality.',
      'SOFT TISSUES: Unremarkable.'
    ],
    'MR': [
      'BRAIN PARENCHYMA: No focal signal abnormality.',
      'VENTRICULAR SYSTEM: Normal size and configuration.',
      'EXTRA-AXIAL SPACES: No abnormal fluid collection.',
      'VASCULAR STRUCTURES: Normal flow voids.',
      'SKULL BASE: Unremarkable.'
    ],
    'US': [
      'LIVER: Normal size, echogenicity, and contours.',
      'GALLBLADDER: Normal wall thickness. No stones.',
      'KIDNEYS: Normal size and echogenicity bilaterally.',
      'PANCREAS: Visualized portions appear normal.',
      'SPLEEN: Normal size and echogenicity.'
    ]
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col bg-gray-50", className)}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {templateId ? 'Edit Template' : 'New Template'}
              </h1>
              <p className="text-sm text-gray-600">
                {templateId ? 'Modify existing template' : 'Create a new report template'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Template Sections</h3>
            <nav className="space-y-1">
              {TEMPLATE_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center",
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                        : "text-gray-700 hover:bg-gray-50",
                      validationErrors[section.id] && "text-red-600"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{section.label}</span>
                    {validationErrors[section.id] && (
                      <AlertCircle className="h-3 w-3 ml-auto text-red-500" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {TEMPLATE_SECTIONS.find(s => s.id === activeSection)?.icon && (
                    React.createElement(TEMPLATE_SECTIONS.find(s => s.id === activeSection)!.icon, {
                      className: "h-5 w-5 mr-2"
                    })
                  )}
                  {TEMPLATE_SECTIONS.find(s => s.id === activeSection)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeSection === 'basic' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="name">Template Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          placeholder="e.g., CT Thorax Standard"
                          className={cn(validationErrors.name && "border-red-500")}
                        />
                        {validationErrors.name && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="modality">Modality *</Label>
                        <Select
                          value={formData.modality}
                          onValueChange={(value) => handleFieldChange('modality', value)}
                        >
                          <SelectTrigger className={cn(validationErrors.modality && "border-red-500")}>
                            <SelectValue placeholder="Select modality..." />
                          </SelectTrigger>
                          <SelectContent>
                            {MODALITIES.map((modality) => (
                              <SelectItem key={modality.value} value={modality.value}>
                                {modality.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.modality && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.modality}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="examType">Exam Type *</Label>
                        <Select
                          value={formData.examType}
                          onValueChange={(value) => handleFieldChange('examType', value)}
                          disabled={!formData.modality}
                        >
                          <SelectTrigger className={cn(validationErrors.examType && "border-red-500")}>
                            <SelectValue placeholder="Select exam type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableExamTypes.map((examType) => (
                              <SelectItem key={examType} value={examType}>
                                {examType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {validationErrors.examType && (
                          <p className="text-sm text-red-500 mt-1">{validationErrors.examType}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="active"
                          checked={formData.active}
                          onCheckedChange={(checked) => handleFieldChange('active', checked)}
                        />
                        <Label htmlFor="active">Active template</Label>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === 'indication' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="indication">Clinical Indication Template *</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        This text will be pre-filled when creating reports with this template.
                      </p>
                      <Textarea
                        id="indication"
                        value={formData.indication}
                        onChange={(e) => handleFieldChange('indication', e.target.value)}
                        placeholder="Enter the default clinical indication text..."
                        className={cn("min-h-[120px]", validationErrors.indication && "border-red-500")}
                      />
                      {validationErrors.indication && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.indication}</p>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === 'technique' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="technique">Technique Template</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Describe the standard imaging technique for this exam type.
                      </p>
                      <Textarea
                        id="technique"
                        value={formData.technique}
                        onChange={(e) => handleFieldChange('technique', e.target.value)}
                        placeholder="Enter the standard technique description..."
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>
                )}

                {activeSection === 'findings' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="findings">Findings Template *</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Create a structured template for findings. Use anatomical sections and bullet points.
                      </p>
                      <Textarea
                        id="findings"
                        value={formData.findings}
                        onChange={(e) => handleFieldChange('findings', e.target.value)}
                        placeholder="Enter the findings template with anatomical sections..."
                        className={cn("min-h-[200px]", validationErrors.findings && "border-red-500")}
                      />
                      {validationErrors.findings && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.findings}</p>
                      )}
                    </div>
                    
                    {formData.modality && FINDINGS_TEMPLATES[formData.modality as keyof typeof FINDINGS_TEMPLATES] && (
                      <div>
                        <Label>Quick Templates</Label>
                        <div className="mt-2 space-y-2">
                          {FINDINGS_TEMPLATES[formData.modality as keyof typeof FINDINGS_TEMPLATES].map((template, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => insertTemplate('findings', template)}
                              className="mr-2 mb-2"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {template.split(':')[0]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeSection === 'impression' && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="impression">Impression Template *</Label>
                      <p className="text-sm text-gray-600 mb-2">
                        Template for the diagnostic impression section.
                      </p>
                      <Textarea
                        id="impression"
                        value={formData.impression}
                        onChange={(e) => handleFieldChange('impression', e.target.value)}
                        placeholder="Enter the impression template..."
                        className={cn("min-h-[120px]", validationErrors.impression && "border-red-500")}
                      />
                      {validationErrors.impression && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.impression}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
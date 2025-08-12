'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, 
  Eye, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report, ReportTemplate, Examination, ReportStatus } from '@/types';
import MedicalCodesSelector from './MedicalCodesSelector';
import AutoSaveIndicator from './AutoSaveIndicator';
import ReportPreview from './ReportPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ReportEditorProps {
  examinationId: string;
  reportId?: string;
  onSave?: (report: Partial<Report>) => void;
  onSubmit?: (report: Partial<Report>) => void;
  onCancel?: () => void;
}

interface ReportFormData {
  templateId?: string;
  indication: string;
  technique: string;
  findings: string;
  impression: string;
  recommendation: string;
  ccamCodes: string[];
  cim10Codes: string[];
  adicapCodes: string[];
  status: ReportStatus;
}

const REPORT_SECTIONS = [
  { id: 'indication', label: 'Indication', required: true },
  { id: 'technique', label: 'Technique', required: false },
  { id: 'findings', label: 'Findings', required: true },
  { id: 'impression', label: 'Impression', required: true },
  { id: 'recommendation', label: 'Recommendation', required: false },
  { id: 'codes', label: 'Medical Codes', required: false },
];

export default function ReportEditor({ 
  examinationId, 
  reportId, 
  onSave, 
  onSubmit, 
  onCancel 
}: ReportEditorProps) {
  const router = useRouter();
  const [examination, setExamination] = useState<Examination | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [formData, setFormData] = useState<ReportFormData>({
    indication: '',
    technique: '',
    findings: '',
    impression: '',
    recommendation: '',
    ccamCodes: [],
    cim10Codes: [],
    adicapCodes: [],
    status: 'DRAFT'
  });
  const [activeSection, setActiveSection] = useState('indication');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Load examination and templates
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load examination first
        const examResponse = await fetch(`/api/examinations/${examinationId}`);
        let examData = null;
        if (examResponse.ok) {
          examData = await examResponse.json();
          setExamination(examData);
        }

        // Load templates for this modality (use examData directly)
        if (examData?.modality) {
          const templatesResponse = await fetch(`/api/report-templates?modality=${examData.modality}`);
          if (templatesResponse.ok) {
            const templatesData = await templatesResponse.json();
            setTemplates(templatesData);
            
            // Load existing report if editing
            if (reportId) {
              const reportResponse = await fetch(`/api/reports/${reportId}`);
              if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                setFormData({
                  templateId: reportData.templateId,
                  indication: reportData.indication || '',
                  technique: reportData.technique || '',
                  findings: reportData.findings || '',
                  impression: reportData.impression || '',
                  recommendation: reportData.recommendation || '',
                  ccamCodes: reportData.ccamCodes || [],
                  cim10Codes: reportData.cim10Codes || [],
                  adicapCodes: reportData.adicapCodes || [],
                  status: reportData.status
                });
                
                if (reportData.templateId) {
                  const template = templatesData.find((t: ReportTemplate) => t.id === reportData.templateId);
                  setSelectedTemplate(template || null);
                }
              }
            }
          }
        } else {
          // Fallback: load some default templates
          setTemplates([
            {
              id: 'default-ct',
              name: 'CT Standard',
              modality: 'CT',
              examType: 'Standard',
              indication: 'Clinical indication to be specified',
              technique: 'CT examination performed',
              findings: 'Findings to be described',
              impression: 'Impression to be provided',
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'default-mr',
              name: 'MR Standard',
              modality: 'MR',
              examType: 'Standard',
              indication: 'Clinical indication to be specified',
              technique: 'MR examination performed',
              findings: 'Findings to be described',
              impression: 'Impression to be provided',
              active: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading report editor data:', error);
        // Set fallback templates even on error
        setTemplates([
          {
            id: 'fallback-template',
            name: 'Standard Template',
            modality: 'CT',
            examType: 'Standard',
            indication: '',
            technique: '',
            findings: '',
            impression: '',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [examinationId, reportId]);

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;

    try {
      setIsSaving(true);
      const reportData = {
        ...formData,
        examinationId,
        status: 'DRAFT' as ReportStatus
      };

      const url = reportId ? `/api/reports/${reportId}` : '/api/reports';
      const method = reportId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        onSave?.(reportData);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, hasUnsavedChanges, isSaving, examinationId, reportId, onSave]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 's':
            event.preventDefault();
            handleSave();
            break;
          case 'p':
            event.preventDefault();
            setShowPreview(true);
            break;
          case 'Enter':
            if (event.shiftKey) {
              event.preventDefault();
              handleSubmit();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle form changes
  const handleFieldChange = (field: keyof ReportFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormData(prev => ({
        ...prev,
        templateId: template.id,
        indication: template.indication || prev.indication,
        technique: template.technique || prev.technique,
        findings: template.findings || prev.findings,
        impression: template.impression || prev.impression
      }));
      setHasUnsavedChanges(true);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.indication.trim()) {
      errors.indication = 'Indication is required';
    }
    if (!formData.findings.trim()) {
      errors.findings = 'Findings are required';
    }
    if (!formData.impression.trim()) {
      errors.impression = 'Impression is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle manual save
  const handleSave = async () => {
    if (!validateForm()) return;
    await autoSave();
  };

  // Handle submit for validation
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const reportData = {
        ...formData,
        examinationId,
        status: 'PRELIMINARY' as ReportStatus
      };

      const url = reportId ? `/api/reports/${reportId}` : '/api/reports';
      const method = reportId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (response.ok) {
        onSubmit?.(reportData);
        router.push('/worklist');
      }
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onCancel?.();
        router.back();
      }
    } else {
      onCancel?.();
      router.back();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
                {reportId ? 'Edit Report' : 'New Report'}
              </h1>
              {examination ? (
                <p className="text-sm text-gray-600">
                  {examination.patient.firstName} {examination.patient.lastName} - 
                  {examination.modality} {examination.examType}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Loading examination data...
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Auto-save indicator */}
            <AutoSaveIndicator
              isSaving={isSaving}
              lastSaved={lastSaved}
              hasUnsavedChanges={hasUnsavedChanges}
            />
            
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Report Preview</DialogTitle>
                </DialogHeader>
                <ReportPreview
                  report={{
                    ...formData,
                    createdAt: new Date().toISOString()
                  }}
                  examination={examination || undefined}
                  showActions={false}
                />
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            
            <Button onClick={handleSubmit} disabled={isSaving}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white border-r">
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Report Sections</h3>
            <nav className="space-y-1">
              {REPORT_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-blue-50 text-blue-700 border-l-2 border-blue-600"
                      : "text-gray-700 hover:bg-gray-50",
                    validationErrors[section.id] && "text-red-600"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{section.label}</span>
                    {section.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                  {validationErrors[section.id] && (
                    <div className="text-xs text-red-500 mt-1">
                      {validationErrors[section.id]}
                    </div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Template Selection - Always show at the top */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Template Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template">Choose a template (optional)</Label>
                    <Select
                      value={selectedTemplate?.id || ''}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          templates.length > 0 
                            ? "Select a template..." 
                            : "Loading templates..."
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} - {template.modality}
                          </SelectItem>
                        ))}
                        {templates.length === 0 && (
                          <SelectItem value="no-templates" disabled>
                            No templates available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {templates.length} template{templates.length !== 1 ? 's' : ''} available
                      {examination && ` for ${examination.modality}`}
                    </p>
                  </div>
                  {selectedTemplate && (
                    <div className="p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        Template "{selectedTemplate.name}" applied. 
                        You can modify the content as needed.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Report Sections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {REPORT_SECTIONS.find(s => s.id === activeSection)?.label}
                  {REPORT_SECTIONS.find(s => s.id === activeSection)?.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeSection === 'indication' && (
                  <div>
                    <Label htmlFor="indication">Clinical Indication</Label>
                    <Textarea
                      id="indication"
                      value={formData.indication}
                      onChange={(e) => handleFieldChange('indication', e.target.value)}
                      placeholder="Enter the clinical indication for this examination..."
                      className={cn(
                        "min-h-[120px] mt-2",
                        validationErrors.indication && "border-red-500"
                      )}
                    />
                    {validationErrors.indication && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.indication}</p>
                    )}
                  </div>
                )}

                {activeSection === 'technique' && (
                  <div>
                    <Label htmlFor="technique">Technique</Label>
                    <Textarea
                      id="technique"
                      value={formData.technique}
                      onChange={(e) => handleFieldChange('technique', e.target.value)}
                      placeholder="Describe the imaging technique used..."
                      className="min-h-[120px] mt-2"
                    />
                  </div>
                )}

                {activeSection === 'findings' && (
                  <div>
                    <Label htmlFor="findings">Findings</Label>
                    <Textarea
                      id="findings"
                      value={formData.findings}
                      onChange={(e) => handleFieldChange('findings', e.target.value)}
                      placeholder="Describe the imaging findings..."
                      className={cn(
                        "min-h-[200px] mt-2",
                        validationErrors.findings && "border-red-500"
                      )}
                    />
                    {validationErrors.findings && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.findings}</p>
                    )}
                  </div>
                )}

                {activeSection === 'impression' && (
                  <div>
                    <Label htmlFor="impression">Impression</Label>
                    <Textarea
                      id="impression"
                      value={formData.impression}
                      onChange={(e) => handleFieldChange('impression', e.target.value)}
                      placeholder="Provide your diagnostic impression..."
                      className={cn(
                        "min-h-[120px] mt-2",
                        validationErrors.impression && "border-red-500"
                      )}
                    />
                    {validationErrors.impression && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.impression}</p>
                    )}
                  </div>
                )}

                {activeSection === 'recommendation' && (
                  <div>
                    <Label htmlFor="recommendation">Recommendations</Label>
                    <Textarea
                      id="recommendation"
                      value={formData.recommendation}
                      onChange={(e) => handleFieldChange('recommendation', e.target.value)}
                      placeholder="Provide recommendations for follow-up or additional studies..."
                      className="min-h-[120px] mt-2"
                    />
                  </div>
                )}

                {activeSection === 'codes' && (
                  <div className="space-y-6">
                    <div>
                      <Label>Medical Codes</Label>
                      <p className="text-sm text-gray-600 mb-6">
                        Add relevant medical codes for billing and classification.
                      </p>
                      
                      <div className="space-y-6">
                        <MedicalCodesSelector
                          codeType="CCAM"
                          selectedCodes={formData.ccamCodes}
                          onCodesChange={(codes) => handleFieldChange('ccamCodes', codes)}
                          placeholder="Search CCAM codes..."
                        />
                        
                        <MedicalCodesSelector
                          codeType="CIM10"
                          selectedCodes={formData.cim10Codes}
                          onCodesChange={(codes) => handleFieldChange('cim10Codes', codes)}
                          placeholder="Search CIM-10 codes..."
                        />
                        
                        <MedicalCodesSelector
                          codeType="ADICAP"
                          selectedCodes={formData.adicapCodes}
                          onCodesChange={(codes) => handleFieldChange('adicapCodes', codes)}
                          placeholder="Search ADICAP codes..."
                        />
                      </div>
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
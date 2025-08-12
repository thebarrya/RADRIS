'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Edit3, 
  Copy, 
  Trash2, 
  Eye, 
  Filter,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTemplate, Modality, User as UserType } from '@/types';

interface TemplateManagerProps {
  currentUser: UserType;
  onCreateTemplate?: () => void;
  onEditTemplate?: (templateId: string) => void;
  className?: string;
}

const MODALITY_COLORS = {
  'CT': 'bg-blue-100 text-blue-800',
  'MR': 'bg-green-100 text-green-800',
  'US': 'bg-purple-100 text-purple-800',
  'CR': 'bg-orange-100 text-orange-800',
  'DX': 'bg-red-100 text-red-800',
  'MG': 'bg-pink-100 text-pink-800',
  'RF': 'bg-yellow-100 text-yellow-800',
  'NM': 'bg-indigo-100 text-indigo-800',
  'PT': 'bg-teal-100 text-teal-800',
  'XA': 'bg-gray-100 text-gray-800'
};

const MODALITY_LABELS = {
  'CT': 'Computed Tomography',
  'MR': 'Magnetic Resonance',
  'US': 'Ultrasound',
  'CR': 'Computed Radiography',
  'DX': 'Digital Radiography',
  'MG': 'Mammography',
  'RF': 'Radiofluoroscopy',
  'NM': 'Nuclear Medicine',
  'PT': 'Positron Emission Tomography',
  'XA': 'X-Ray Angiography'
};

export default function TemplateManager({ 
  currentUser, 
  onCreateTemplate, 
  onEditTemplate, 
  className 
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, selectedModality, selectedStatus]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      
      // Mock data - In real implementation, this would come from API
      const mockTemplates: ReportTemplate[] = [
        {
          id: 'template-ct-thorax',
          name: 'CT Thorax Standard',
          modality: 'CT',
          examType: 'Thorax',
          indication: 'Clinical indication to be specified by referring physician',
          technique: 'CT examination of the thorax performed with/without intravenous contrast material. Axial images obtained from lung apices to costophrenic angles. Coronal and sagittal reformations provided.',
          findings: 'LUNGS: \nPLEURA: \nMEDIASTINUM: \nHEART: \nBONES: \nSOFT TISSUES: ',
          impression: 'Impression to be provided based on findings.',
          active: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
        },
        {
          id: 'template-mr-brain',
          name: 'MR Brain Standard',
          modality: 'MR',
          examType: 'Brain',
          indication: 'Clinical indication to be specified',
          technique: 'MR examination of the brain performed on 1.5T/3T scanner. Sequences include: T1-weighted, T2-weighted, FLAIR, DWI, and T1-weighted post-contrast (if indicated).',
          findings: 'BRAIN PARENCHYMA: \nVENTRICULAR SYSTEM: \nEXTRA-AXIAL SPACES: \nVASCULAR STRUCTURES: \nSKULL BASE: ',
          impression: 'Impression based on imaging findings.',
          active: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
        },
        {
          id: 'template-us-abdomen',
          name: 'US Abdomen Complete',
          modality: 'US',
          examType: 'Abdomen',
          indication: 'Abdominal ultrasound indication',
          technique: 'Real-time ultrasound examination of the abdomen performed using curvilinear and linear transducers. Patient fasting status: [specify].',
          findings: 'LIVER: \nGALLBLADDER: \nBILE DUCTS: \nPANCREAS: \nSPLEEN: \nKIDNEYS: \nBLADDER: \nAORTA: \nIVC: ',
          impression: 'Ultrasound findings summary.',
          active: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
        },
        {
          id: 'template-ct-abdomen-old',
          name: 'CT Abdomen (Legacy)',
          modality: 'CT',
          examType: 'Abdomen',
          indication: 'Legacy template - deprecated',
          technique: 'Old CT abdomen protocol',
          findings: 'Legacy findings template',
          impression: 'Legacy impression template',
          active: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString()
        }
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.examType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.modality.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Modality filter
    if (selectedModality !== 'all') {
      filtered = filtered.filter(template => template.modality === selectedModality);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(template => 
        selectedStatus === 'active' ? template.active : !template.active
      );
    }

    setFilteredTemplates(filtered);
  };

  const handlePreview = (template: ReportTemplate) => {
    setPreviewTemplate(template);
    setShowPreview(true);
  };

  const handleDuplicate = async (template: ReportTemplate) => {
    try {
      const duplicatedTemplate = {
        ...template,
        id: `${template.id}-copy-${Date.now()}`,
        name: `${template.name} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // API call to create duplicate
      console.log('Duplicating template:', duplicatedTemplate);
      
      // Refresh templates
      await loadTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const handleToggleStatus = async (templateId: string, active: boolean) => {
    try {
      // API call to update status
      console.log('Toggling template status:', templateId, active);
      
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, active, updatedAt: new Date().toISOString() }
            : template
        )
      );
    } catch (error) {
      console.error('Error updating template status:', error);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    try {
      // API call to delete
      console.log('Deleting template:', templateId);
      
      setTemplates(prev => prev.filter(template => template.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canManageTemplates = currentUser.role === 'ADMIN' || currentUser.role === 'RADIOLOGIST_SENIOR';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-600">Manage report templates for different modalities and exam types</p>
        </div>
        
        {canManageTemplates && (
          <Button onClick={onCreateTemplate} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="modality">Modality</Label>
              <Select value={selectedModality} onValueChange={setSelectedModality}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All modalities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modalities</SelectItem>
                  {Object.entries(MODALITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {key} - {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p>{filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}</p>
                <p>{templates.filter(t => t.active).length} active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className={cn(
            "transition-all duration-200 hover:shadow-md",
            !template.active && "opacity-60"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={MODALITY_COLORS[template.modality]}>
                      {template.modality}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.examType}
                    </Badge>
                    {template.active ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p className="line-clamp-2">{template.indication}</p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Updated {formatDate(template.updatedAt)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  
                  {canManageTemplates && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTemplate?.(template.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(template.id, !template.active)}
                        className={template.active ? "text-orange-600" : "text-green-600"}
                      >
                        {template.active ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedModality !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters to see more templates.'
                : 'Get started by creating your first report template.'
              }
            </p>
            {canManageTemplates && (
              <Button onClick={onCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Template Preview: {previewTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {previewTemplate && (
            <ScrollArea className="h-96">
              <div className="space-y-6 p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">Modality</Label>
                    <p className="mt-1">{previewTemplate.modality} - {MODALITY_LABELS[previewTemplate.modality]}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Exam Type</Label>
                    <p className="mt-1">{previewTemplate.examType}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">Clinical Indication</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{previewTemplate.indication}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">Technique</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{previewTemplate.technique}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">Findings Template</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{previewTemplate.findings}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="font-medium">Impression Template</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="whitespace-pre-wrap">{previewTemplate.impression}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
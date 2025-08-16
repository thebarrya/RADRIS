'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useNavigation } from '@/hooks/useNavigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Save, 
  ArrowLeft, 
  Search,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, examinationsApi } from '@/lib/api';
import { Examination, ReportTemplate } from '@/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function NewReportPage() {
  const { navigateTo } = useNavigation();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const examinationId = searchParams?.get('examinationId');
  
  const [selectedExamination, setSelectedExamination] = useState<Examination | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportData, setReportData] = useState({
    indication: '',
    technique: '',
    findings: '',
    impression: '',
    recommendation: '',
  });

  // All hooks must be called before any conditional returns
  // Load examination if ID provided
  const { data: examination, isLoading: isLoadingExam } = useQuery({
    queryKey: ['examination', examinationId],
    queryFn: async () => {
      if (!examinationId) return null;
      const response = await examinationsApi.getById(examinationId);
      return response.data.examination;
    },
    enabled: !!examinationId,
  });

  // Load report templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const response = await reportsApi.getTemplates();
      return response.data;
    },
  });

  // Set examination when loaded
  useEffect(() => {
    if (examination) {
      setSelectedExamination(examination);
      
      // Auto-select matching template
      if (templates?.data) {
        const matchingTemplate = templates.data.find((t: ReportTemplate) => 
          t.modality === examination.modality && 
          t.examType.toLowerCase().includes(examination.examType.toLowerCase())
        );
        if (matchingTemplate) {
          setSelectedTemplate(matchingTemplate);
          setReportData({
            indication: matchingTemplate.indication || '',
            technique: matchingTemplate.technique || '',
            findings: matchingTemplate.findings || '',
            impression: matchingTemplate.impression || '',
            recommendation: '',
          });
        }
      }
    }
  }, [examination, templates]);

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await reportsApi.create(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      navigateTo(`/reports/${data.report.id}/edit`);
    },
    onError: (error: any) => {
      console.error('Error creating report:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExamination) {
      alert('Veuillez sélectionner un examen');
      return;
    }

    const reportPayload = {
      examinationId: selectedExamination.id,
      templateId: selectedTemplate?.id,
      ...reportData,
    };

    createReportMutation.mutate(reportPayload);
  };

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportData({
      indication: template.indication || '',
      technique: template.technique || '',
      findings: template.findings || '',
      impression: template.impression || '',
      recommendation: '',
    });
  };

  // Redirect if not authenticated (after all hooks)
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/reports" prefetch={true} className="flex items-center space-x-1">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </Link>
                </Button>
                <span className="text-gray-400">|</span>
                <h1 className="text-2xl font-bold text-gray-900">Nouveau rapport</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button 
                  type="submit" 
                  form="report-form"
                  disabled={createReportMutation.isPending || !selectedExamination}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {createReportMutation.isPending ? 'Création...' : 'Créer le rapport'}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Examination Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span>Sélection de l'examen</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingExam ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : selectedExamination ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-blue-900">
                          {selectedExamination.examType}
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Patient: {selectedExamination.patient.lastName} {selectedExamination.patient.firstName}
                        </p>
                        <p className="text-sm text-blue-700">
                          N° d'accession: {selectedExamination.accessionNumber}
                        </p>
                        <p className="text-sm text-blue-700">
                          Modalité: {selectedExamination.modality} | Région: {selectedExamination.bodyPart}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                    <p>Aucun examen sélectionné</p>
                    <p className="text-sm mt-1">
                      Accédez depuis la liste de travail ou sélectionnez un examen
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Template Selection */}
            {templates?.data && templates.data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Templates de rapports</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.data.map((template: ReportTemplate) => (
                      <div
                        key={template.id}
                        className={cn(
                          'p-4 border rounded-lg cursor-pointer transition-colors',
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => handleTemplateSelect(template)}
                      >
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {template.modality} - {template.examType}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Report Form */}
            <Card>
              <CardHeader>
                <CardTitle>Contenu du rapport</CardTitle>
              </CardHeader>
              <CardContent>
                <form id="report-form" onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="indication">Indication</Label>
                    <textarea
                      id="indication"
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={reportData.indication}
                      onChange={(e) => setReportData(prev => ({ ...prev, indication: e.target.value }))}
                      placeholder="Indication clinique de l'examen..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="technique">Technique</Label>
                    <textarea
                      id="technique"
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={reportData.technique}
                      onChange={(e) => setReportData(prev => ({ ...prev, technique: e.target.value }))}
                      placeholder="Description de la technique utilisée..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="findings">Constatations</Label>
                    <textarea
                      id="findings"
                      rows={8}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={reportData.findings}
                      onChange={(e) => setReportData(prev => ({ ...prev, findings: e.target.value }))}
                      placeholder="Constatations radiologiques détaillées..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="impression">Conclusion</Label>
                    <textarea
                      id="impression"
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={reportData.impression}
                      onChange={(e) => setReportData(prev => ({ ...prev, impression: e.target.value }))}
                      placeholder="Conclusion et synthèse..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="recommendation">Recommandations</Label>
                    <textarea
                      id="recommendation"
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={reportData.recommendation}
                      onChange={(e) => setReportData(prev => ({ ...prev, recommendation: e.target.value }))}
                      placeholder="Recommandations pour la prise en charge..."
                    />
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
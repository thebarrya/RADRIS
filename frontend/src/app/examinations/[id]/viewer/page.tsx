'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { CornerstoneViewer } from '@/components/examinations/CornerstoneViewer';
import ReportEditor from '@/components/reports/ReportEditor';
import { MeasurementTools } from '@/components/examinations/MeasurementTools';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  ArrowLeft, 
  Eye, 
  FileText, 
  Ruler, 
  Split, 
  Maximize2,
  Save,
  Send,
  RefreshCw
} from 'lucide-react';
import { Examination, Report } from '@/types';
import { examinationsApi } from '@/lib/api';
import viewerReportsIntegration from '@/services/viewerReportsIntegration';
import toast from 'react-hot-toast';

type ViewMode = 'viewer' | 'reports' | 'split';

export default function IntegratedViewerPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const examinationId = params.id as string;
  
  const [examination, setExamination] = useState<Examination | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchExamination = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await examinationsApi.getById(examinationId);
      const examData = response.data.examination;
      setExamination(examData);
      
      // Load reports for this examination
      if (examData.reports) {
        setReports(examData.reports);
        // Auto-select the latest draft or preliminary report
        const latestReport = examData.reports
          .filter((r: Report) => r.status === 'DRAFT' || r.status === 'PRELIMINARY')
          .sort((a: Report, b: Report) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        
        if (latestReport) {
          setActiveReport(latestReport);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors du chargement de l\'examen');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session && examinationId) {
      fetchExamination();
    }
  }, [session, examinationId]);

  // Initialize viewer-reports integration
  useEffect(() => {
    if (examination) {
      viewerReportsIntegration.initialize(examination.id, activeReport?.id);
      
      // Listen for navigation events
      const handleNavigateToReport = () => {
        setViewMode('reports');
      };

      const handleNavigateToViewer = () => {
        setViewMode('viewer');
      };

      viewerReportsIntegration.on('navigate-to-report', handleNavigateToReport);
      viewerReportsIntegration.on('navigate-to-viewer', handleNavigateToViewer);

      return () => {
        viewerReportsIntegration.off('navigate-to-report', handleNavigateToReport);
        viewerReportsIntegration.off('navigate-to-viewer', handleNavigateToViewer);
      };
    }
  }, [examination, activeReport]);

  // Handle fullscreen toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
      if (event.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

  // Redirect if not authenticated
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

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">⚠️ {error}</div>
            <Button onClick={fetchExamination} variant="outline">
              Réessayer
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!examination) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Examen non trouvé</div>
            <Button onClick={() => router.back()} variant="outline">
              Retour
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const createNewReport = async () => {
    try {
      router.push(`/reports/new?examinationId=${examination.id}`);
    } catch (error) {
      console.error('Failed to create new report:', error);
      toast.error('Erreur lors de la création du rapport');
    }
  };

  const handleReportSave = async (reportData: any) => {
    try {
      await viewerReportsIntegration.saveToServer();
      toast.success('Rapport et annotations sauvegardés');
    } catch (error) {
      console.error('Failed to save integrated data:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const MainContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/examinations/${examination.id}`)}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    Viewer Intégré - #{examination.accessionNumber}
                  </h1>
                  <Badge variant="outline">
                    {examination.modality} {examination.examType}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {examination.patient.firstName} {examination.patient.lastName} • 
                  {examination.bodyPart}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'viewer' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('viewer')}
                  className="rounded-none border-none"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Viewer
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  className="rounded-none border-none"
                >
                  <Split className="h-4 w-4 mr-1" />
                  Split
                </Button>
                <Button
                  variant={viewMode === 'reports' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('reports')}
                  className="rounded-none border-none"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Report
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Fullscreen
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchExamination}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {viewerError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-red-800 text-sm">
            ⚠️ Viewer Error: {viewerError}
          </p>
        </div>
      )}

      {!examination.studyInstanceUID && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <p className="text-yellow-800 text-sm">
            ℹ️ No DICOM study available for this examination. Only reports functionality will be available.
          </p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'viewer' && examination.studyInstanceUID && (
          <CornerstoneViewer
            studyInstanceUID={examination.studyInstanceUID}
            examinationId={examination.id}
            reportId={activeReport?.id}
            showAnnotationTools={true}
            onError={setViewerError}
            onNavigateToReport={() => setViewMode('reports')}
            className="h-full"
          />
        )}

        {viewMode === 'reports' && (
          <div className="h-full p-6 bg-gray-50">
            {activeReport ? (
              <ReportEditor
                examinationId={examination.id}
                reportId={activeReport.id}
                onSave={handleReportSave}
                onCancel={() => router.back()}
              />
            ) : (
              <Card className="max-w-md mx-auto mt-12">
                <CardHeader>
                  <CardTitle>No Active Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    No report is currently active for this examination.
                  </p>
                  <Button onClick={createNewReport} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Create New Report
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {viewMode === 'split' && (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Viewer Panel */}
            {examination.studyInstanceUID ? (
              <ResizablePanel defaultSize={60} minSize={40}>
                <CornerstoneViewer
                  studyInstanceUID={examination.studyInstanceUID}
                  examinationId={examination.id}
                  reportId={activeReport?.id}
                  showAnnotationTools={true}
                  onError={setViewerError}
                  onNavigateToReport={() => setViewMode('reports')}
                  className="h-full"
                />
              </ResizablePanel>
            ) : (
              <ResizablePanel defaultSize={60} minSize={40}>
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-500">No DICOM images available</p>
                </div>
              </ResizablePanel>
            )}

            <ResizableHandle />

            {/* Reports Panel */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full bg-white">
                <Tabs defaultValue="report" className="h-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="report">
                      <FileText className="h-4 w-4 mr-1" />
                      Report
                    </TabsTrigger>
                    <TabsTrigger value="measurements">
                      <Ruler className="h-4 w-4 mr-1" />
                      Measurements
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="report" className="flex-1 overflow-auto">
                    {activeReport ? (
                      <div className="p-4">
                        <ReportEditor
                          examinationId={examination.id}
                          reportId={activeReport.id}
                          onSave={handleReportSave}
                          onCancel={() => router.back()}
                        />
                      </div>
                    ) : (
                      <div className="p-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">No Active Report</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Button onClick={createNewReport} size="sm" className="w-full">
                              Create New Report
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="measurements" className="flex-1 overflow-auto">
                    <div className="p-4">
                      <MeasurementTools
                        examinationId={examination.id}
                        reportId={activeReport?.id}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <MainContent />
      </div>
    );
  }

  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
}
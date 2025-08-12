'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Printer, 
  Download,
  Share,
  Eye,
  Edit3,
  History,
  MessageSquare,
  Stethoscope,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report, Examination, User as UserType, ReportStatus } from '@/types';
import ValidationWorkflow from './ValidationWorkflow';
import ReportVersionHistory from './ReportVersionHistory';

interface ReportViewerProps {
  report: Report;
  examination?: Examination;
  currentUser: UserType;
  onEdit?: () => void;
  onValidate?: (action: 'approve' | 'reject' | 'request_changes', comments?: string) => void;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<ReportStatus, { color: string; label: string; icon: any }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: Edit3 },
  PRELIMINARY: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review', icon: Clock },
  FINAL: { color: 'bg-green-100 text-green-800', label: 'Final', icon: CheckCircle2 },
  AMENDED: { color: 'bg-blue-100 text-blue-800', label: 'Amended', icon: Edit3 }
};

export default function ReportViewer({
  report,
  examination,
  currentUser,
  onEdit,
  onValidate,
  onPrint,
  onDownload,
  onShare,
  className
}: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState('content');

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCodes = (codes: string[], type: string) => {
    if (!codes || codes.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 flex items-center">
          <Stethoscope className="h-4 w-4 mr-2" />
          {type}
        </h4>
        <div className="flex flex-wrap gap-1">
          {codes.map((code, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {code}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const statusConfig = STATUS_CONFIG[report.status];
  const StatusIcon = statusConfig.icon;

  const canEdit = currentUser.id === report.createdBy.id && 
                  (report.status === 'DRAFT' || report.status === 'PRELIMINARY');

  const canValidate = currentUser.role === 'RADIOLOGIST_SENIOR' && 
                      currentUser.id !== report.createdBy.id &&
                      report.status === 'PRELIMINARY';

  return (
    <div className={cn("h-screen flex flex-col bg-gray-50", className)}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-gray-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Radiology Report
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                  {examination && (
                    <span className="text-sm text-gray-600">
                      {examination.modality} - {examination.examType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {canEdit && onEdit && (
              <Button variant="outline" onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Report
              </Button>
            )}
            
            <Button variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <Button variant="outline" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button variant="outline" onClick={onShare}>
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-white px-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Report Content
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validation
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent value="content" className="h-full m-0">
              <div className="p-6">
                {/* Patient and Exam Info */}
                {examination && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Patient & Examination Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">Patient Information</h3>
                          <div className="space-y-1 text-gray-600">
                            <p><strong>Name:</strong> {examination.patient.firstName} {examination.patient.lastName}</p>
                            <p><strong>Date of Birth:</strong> {new Date(examination.patient.birthDate).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Gender:</strong> {examination.patient.gender}</p>
                            {examination.patient.socialSecurity && (
                              <p><strong>Social Security:</strong> {examination.patient.socialSecurity}</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">Examination Details</h3>
                          <div className="space-y-1 text-gray-600">
                            <p><strong>Accession Number:</strong> {examination.accessionNumber}</p>
                            <p><strong>Date:</strong> {formatDate(examination.scheduledDate)}</p>
                            <p><strong>Modality:</strong> {examination.modality}</p>
                            <p><strong>Body Part:</strong> {examination.bodyPart}</p>
                            <p><strong>Procedure:</strong> {examination.procedure}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900 mb-2">Report Information</h3>
                          <div className="space-y-1 text-gray-600">
                            <p><strong>Radiologist:</strong> Dr. {report.createdBy.firstName} {report.createdBy.lastName}</p>
                            <p><strong>Created:</strong> {formatDate(report.createdAt)}</p>
                            {report.validatedAt && (
                              <p><strong>Validated:</strong> {formatDate(report.validatedAt)}</p>
                            )}
                            <p><strong>Status:</strong> {statusConfig.label}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Report Sections */}
                <div className="space-y-6">
                  {/* Clinical Indication */}
                  {report.indication && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Target className="h-5 w-5 mr-2" />
                          Clinical Indication
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-800 whitespace-pre-wrap">{report.indication}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Technique */}
                  {report.technique && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Technique</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-800 whitespace-pre-wrap">{report.technique}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Findings */}
                  {report.findings && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Findings</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-md">
                          <p className="text-gray-800 whitespace-pre-wrap">{report.findings}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Impression */}
                  {report.impression && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Impression</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-500">
                          <p className="text-gray-800 whitespace-pre-wrap font-medium">{report.impression}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommendations */}
                  {report.recommendation && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-500">
                          <p className="text-gray-800 whitespace-pre-wrap">{report.recommendation}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Medical Codes */}
                  {((report.ccamCodes && report.ccamCodes.length > 0) ||
                    (report.cim10Codes && report.cim10Codes.length > 0) ||
                    (report.adicapCodes && report.adicapCodes.length > 0)) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Medical Codes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {formatCodes(report.ccamCodes || [], 'CCAM Codes')}
                          {formatCodes(report.cim10Codes || [], 'CIM-10 Codes')}
                          {formatCodes(report.adicapCodes || [], 'ADICAP Codes')}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Signature */}
                <Card className="mt-8">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-end border-t pt-6">
                      <div>
                        <div className="text-sm text-gray-600">
                          <p className="font-medium">Dr. {report.createdBy.firstName} {report.createdBy.lastName}</p>
                          <p>{report.createdBy.role.replace('_', ' ')}</p>
                          {report.validatedBy && (
                            <div className="mt-2">
                              <p className="font-medium">Validated by: Dr. {report.validatedBy.firstName} {report.validatedBy.lastName}</p>
                              <p>{report.validatedBy.role.replace('_', ' ')}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>Report generated on</p>
                        <p className="font-medium">{formatDate(new Date().toISOString())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="validation" className="h-full m-0">
              <div className="p-6">
                <ValidationWorkflow
                  report={report}
                  currentUser={currentUser}
                  onValidate={onValidate || (() => {})}
                  onEdit={onEdit}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="h-full m-0">
              <div className="p-6">
                <ReportVersionHistory
                  reportId={report.id}
                  currentVersion={report}
                  onRestoreVersion={(versionId) => {
                    console.log('Restore version:', versionId);
                  }}
                  onCompareVersions={(v1, v2) => {
                    console.log('Compare versions:', v1, v2);
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="comments" className="h-full m-0">
              <div className="p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Comments & Discussions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No comments yet</p>
                      <p className="text-sm">Comments and discussions will appear here</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
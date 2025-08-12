'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Printer, 
  Download,
  Share,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Report, Examination, User as UserType, ReportStatus } from '@/types';

interface ReportPreviewProps {
  report: Partial<Report>;
  examination?: Examination;
  author?: UserType;
  className?: string;
  showActions?: boolean;
  onPrint?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
}

const STATUS_CONFIG: Record<ReportStatus, { color: string; label: string }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
  PRELIMINARY: { color: 'bg-yellow-100 text-yellow-800', label: 'Preliminary' },
  FINAL: { color: 'bg-green-100 text-green-800', label: 'Final' },
  AMENDED: { color: 'bg-blue-100 text-blue-800', label: 'Amended' }
};

export default function ReportPreview({
  report,
  examination,
  author,
  className,
  showActions = true,
  onPrint,
  onDownload,
  onShare
}: ReportPreviewProps) {
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
        <h4 className="font-medium text-gray-900">{type}</h4>
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

  const statusConfig = report.status ? STATUS_CONFIG[report.status] : STATUS_CONFIG.DRAFT;

  return (
    <div className={cn("bg-white", className)}>
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-gray-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Radiology Report
              </h1>
              <div className="flex items-center space-x-4 mt-1">
                <Badge className={statusConfig.color}>
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
          
          {showActions && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={onShare}>
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Patient and Exam Info */}
        {examination && (
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
                {author && (
                  <p><strong>Radiologist:</strong> Dr. {author.firstName} {author.lastName}</p>
                )}
                <p><strong>Created:</strong> {formatDate(report.createdAt)}</p>
                {report.validatedAt && (
                  <p><strong>Validated:</strong> {formatDate(report.validatedAt)}</p>
                )}
                <p><strong>Status:</strong> {statusConfig.label}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Clinical Indication */}
          {report.indication && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Clinical Indication
              </h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-800 whitespace-pre-wrap">{report.indication}</p>
              </div>
            </div>
          )}

          {/* Technique */}
          {report.technique && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Technique</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-800 whitespace-pre-wrap">{report.technique}</p>
              </div>
            </div>
          )}

          {/* Findings */}
          {report.findings && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Findings</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-800 whitespace-pre-wrap">{report.findings}</p>
              </div>
            </div>
          )}

          {/* Impression */}
          {report.impression && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Impression</h3>
              <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-500">
                <p className="text-gray-800 whitespace-pre-wrap font-medium">{report.impression}</p>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendation && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
              <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-500">
                <p className="text-gray-800 whitespace-pre-wrap">{report.recommendation}</p>
              </div>
            </div>
          )}

          {/* Medical Codes */}
          {((report.ccamCodes && report.ccamCodes.length > 0) ||
            (report.cim10Codes && report.cim10Codes.length > 0) ||
            (report.adicapCodes && report.adicapCodes.length > 0)) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Medical Codes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formatCodes(report.ccamCodes || [], 'CCAM Codes')}
                {formatCodes(report.cim10Codes || [], 'CIM-10 Codes')}
                {formatCodes(report.adicapCodes || [], 'ADICAP Codes')}
              </div>
            </div>
          )}

          {/* Signature */}
          <div className="border-t pt-6 mt-8">
            <div className="flex justify-between items-end">
              <div>
                {author && (
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Dr. {author.firstName} {author.lastName}</p>
                    <p>{author.role.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Report generated on</p>
                <p className="font-medium">{formatDate(new Date().toISOString())}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
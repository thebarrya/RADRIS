'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReportViewer from '@/components/reports/ReportViewer';
import type { Report, Examination, User } from '@/types';

function ReportViewerContent() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [examination, setExamination] = useState<Examination | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, [reportId]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      
      // Load report
      const reportResponse = await fetch(`/api/reports/${reportId}`);
      if (!reportResponse.ok) {
        throw new Error('Report not found');
      }
      const reportData = await reportResponse.json();
      setReport(reportData);

      // Load examination
      if (reportData.examination?.id) {
        const examResponse = await fetch(`/api/examinations/${reportData.examination.id}`);
        if (examResponse.ok) {
          const examData = await examResponse.json();
          setExamination(examData);
        }
      }

      // Load current user (from session)
      const userResponse = await fetch('/api/auth/me');
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setCurrentUser(userData);
      }

    } catch (error) {
      console.error('Error loading report:', error);
      setError(error instanceof Error ? error.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/reports/editor?examinationId=${examination?.id}&reportId=${reportId}`);
  };

  const handleValidate = async (action: 'approve' | 'reject' | 'request_changes', comments?: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comments })
      });

      if (response.ok) {
        // Reload report data to get updated status
        await loadReportData();
      } else {
        throw new Error('Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to validate report. Please try again.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate PDF download
    const link = document.createElement('a');
    link.href = `/api/reports/${reportId}/pdf`;
    link.download = `report-${reportId}.pdf`;
    link.click();
  };

  const handleShare = () => {
    // Copy share link to clipboard
    const shareUrl = `${window.location.origin}/reports/${reportId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Share link copied to clipboard');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Report Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            {error || 'The requested report could not be found.'}
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReportViewer
      report={report}
      examination={examination || undefined}
      currentUser={currentUser}
      onEdit={handleEdit}
      onValidate={handleValidate}
      onPrint={handlePrint}
      onDownload={handleDownload}
      onShare={handleShare}
    />
  );
}

export default function ReportViewerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report viewer...</p>
        </div>
      </div>
    }>
      <ReportViewerContent />
    </Suspense>
  );
}
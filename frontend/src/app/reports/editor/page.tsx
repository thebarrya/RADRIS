'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ReportEditor from '@/components/reports/ReportEditor';

function ReportEditorContent() {
  const searchParams = useSearchParams();
  const examinationId = searchParams.get('examinationId');
  const reportId = searchParams.get('reportId');

  if (!examinationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Missing Examination ID</h1>
          <p className="text-gray-600">Please provide a valid examination ID to create or edit a report.</p>
        </div>
      </div>
    );
  }

  return (
    <ReportEditor
      examinationId={examinationId}
      reportId={reportId || undefined}
      onSave={(report) => {
        console.log('Report saved:', report);
      }}
      onSubmit={(report) => {
        console.log('Report submitted:', report);
      }}
      onCancel={() => {
        console.log('Report editing cancelled');
      }}
    />
  );
}

export default function ReportEditorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report editor...</p>
        </div>
      </div>
    }>
      <ReportEditorContent />
    </Suspense>
  );
}
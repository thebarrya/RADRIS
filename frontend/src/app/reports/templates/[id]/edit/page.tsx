'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import TemplateEditor from '@/components/reports/TemplateEditor';
import type { ReportTemplate } from '@/types';

function EditTemplateContent() {
  const params = useParams();
  const templateId = params.id as string;

  const handleSave = (template: Partial<ReportTemplate>) => {
    console.log('Updating template:', templateId, template);
    // API call to update template would go here
  };

  const handleCancel = () => {
    console.log('Template editing cancelled');
  };

  return (
    <TemplateEditor
      templateId={templateId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

export default function EditTemplatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template editor...</p>
        </div>
      </div>
    }>
      <EditTemplateContent />
    </Suspense>
  );
}
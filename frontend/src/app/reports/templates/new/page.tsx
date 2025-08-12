'use client';

import { Suspense } from 'react';
import TemplateEditor from '@/components/reports/TemplateEditor';
import type { ReportTemplate } from '@/types';

function NewTemplateContent() {
  const handleSave = (template: Partial<ReportTemplate>) => {
    console.log('Creating new template:', template);
    // API call to create template would go here
  };

  const handleCancel = () => {
    console.log('Template creation cancelled');
  };

  return (
    <TemplateEditor
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}

export default function NewTemplatePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template editor...</p>
        </div>
      </div>
    }>
      <NewTemplateContent />
    </Suspense>
  );
}
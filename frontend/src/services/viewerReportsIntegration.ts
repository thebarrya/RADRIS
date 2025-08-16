'use client';

import { EventEmitter } from 'events';

export interface ImageAnnotation {
  id: string;
  examinationId: string;
  reportId?: string;
  reportSection?: 'findings' | 'impression' | 'recommendation';
  type: 'arrow' | 'circle' | 'rectangle' | 'measurement' | 'text';
  coordinates: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    x2?: number;
    y2?: number;
  };
  imageIndex: number;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  text?: string;
  measurement?: {
    value: number;
    unit: 'mm' | 'cm' | 'pixels' | 'degree';
    type: 'length' | 'angle' | 'area';
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ReportFinding {
  id: string;
  text: string;
  section: 'findings' | 'impression' | 'recommendation';
  linkedAnnotations: string[];
  metadata: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface ViewerReportsMessage {
  type: 'annotation-created' | 'annotation-updated' | 'annotation-deleted' | 
        'measurement-created' | 'measurement-updated' | 'finding-updated' |
        'navigate-to-report' | 'navigate-to-viewer' | 'sync-data';
  payload: any;
  source: 'viewer' | 'reports';
  timestamp: string;
}

class ViewerReportsIntegrationService extends EventEmitter {
  private annotations: Map<string, ImageAnnotation> = new Map();
  private findings: Map<string, ReportFinding> = new Map();
  private currentExaminationId: string | null = null;
  private currentReportId: string | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  // Initialize integration for a specific examination/report
  initialize(examinationId: string, reportId?: string) {
    this.currentExaminationId = examinationId;
    this.currentReportId = reportId || null;
    
    // Load existing annotations and findings
    this.loadExaminationData(examinationId);
    
    this.emit('integration-initialized', {
      examinationId,
      reportId
    });
  }

  // Annotation Management
  createAnnotation(annotation: Omit<ImageAnnotation, 'id' | 'metadata'>): ImageAnnotation {
    const newAnnotation: ImageAnnotation = {
      ...annotation,
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdBy: 'current-user', // TODO: Get from session
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    this.annotations.set(newAnnotation.id, newAnnotation);
    
    // Emit to both viewer and reports
    this.emitMessage({
      type: 'annotation-created',
      payload: newAnnotation,
      source: 'viewer',
      timestamp: new Date().toISOString()
    });

    return newAnnotation;
  }

  updateAnnotation(id: string, updates: Partial<ImageAnnotation>): ImageAnnotation | null {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    const updatedAnnotation = {
      ...annotation,
      ...updates,
      metadata: {
        ...annotation.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.annotations.set(id, updatedAnnotation);
    
    this.emitMessage({
      type: 'annotation-updated',
      payload: updatedAnnotation,
      source: 'viewer',
      timestamp: new Date().toISOString()
    });

    return updatedAnnotation;
  }

  deleteAnnotation(id: string): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    this.annotations.delete(id);
    
    this.emitMessage({
      type: 'annotation-deleted',
      payload: { id, annotation },
      source: 'viewer',
      timestamp: new Date().toISOString()
    });

    return true;
  }

  // Measurement Integration
  createMeasurement(measurement: Omit<ImageAnnotation, 'id' | 'metadata' | 'type'> & { measurement: NonNullable<ImageAnnotation['measurement']> }): ImageAnnotation {
    return this.createAnnotation({
      ...measurement,
      type: 'measurement'
    });
  }

  // Report Findings Integration
  linkAnnotationToFinding(annotationId: string, findingText: string, section: ReportFinding['section']): ReportFinding {
    const findingId = `finding-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const finding: ReportFinding = {
      id: findingId,
      text: findingText,
      section,
      linkedAnnotations: [annotationId],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    this.findings.set(findingId, finding);

    // Update annotation to reference the finding
    const annotation = this.annotations.get(annotationId);
    if (annotation) {
      this.updateAnnotation(annotationId, {
        reportSection: section,
        text: findingText
      });
    }

    this.emitMessage({
      type: 'finding-updated',
      payload: { finding, linkedAnnotation: annotation },
      source: 'reports',
      timestamp: new Date().toISOString()
    });

    return finding;
  }

  // Navigation between viewer and reports
  navigateToReport(reportId?: string): void {
    const targetReportId = reportId || this.currentReportId;
    
    this.emitMessage({
      type: 'navigate-to-report',
      payload: { 
        reportId: targetReportId,
        examinationId: this.currentExaminationId
      },
      source: 'viewer',
      timestamp: new Date().toISOString()
    });
  }

  navigateToViewer(annotations?: string[]): void {
    this.emitMessage({
      type: 'navigate-to-viewer',
      payload: { 
        examinationId: this.currentExaminationId,
        highlightAnnotations: annotations || []
      },
      source: 'reports',
      timestamp: new Date().toISOString()
    });
  }

  // Data Access
  getAnnotations(filter?: {
    reportSection?: ReportFinding['section'];
    imageIndex?: number;
    seriesInstanceUID?: string;
  }): ImageAnnotation[] {
    let annotations = Array.from(this.annotations.values());

    if (filter) {
      if (filter.reportSection) {
        annotations = annotations.filter(a => a.reportSection === filter.reportSection);
      }
      if (filter.imageIndex !== undefined) {
        annotations = annotations.filter(a => a.imageIndex === filter.imageIndex);
      }
      if (filter.seriesInstanceUID) {
        annotations = annotations.filter(a => a.seriesInstanceUID === filter.seriesInstanceUID);
      }
    }

    return annotations;
  }

  getFindings(section?: ReportFinding['section']): ReportFinding[] {
    let findings = Array.from(this.findings.values());
    
    if (section) {
      findings = findings.filter(f => f.section === section);
    }

    return findings;
  }

  // Data Persistence (to be implemented with API calls)
  async saveToServer(): Promise<void> {
    if (!this.currentExaminationId) return;

    try {
      // Save annotations
      const annotationsData = Array.from(this.annotations.values());
      await fetch(`/api/examinations/${this.currentExaminationId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations: annotationsData })
      });

      // Save findings (if linked to a report)
      if (this.currentReportId) {
        const findingsData = Array.from(this.findings.values());
        await fetch(`/api/reports/${this.currentReportId}/findings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ findings: findingsData })
        });
      }

      console.log('Viewer-Reports integration data saved successfully');
    } catch (error) {
      console.error('Failed to save integration data:', error);
      throw error;
    }
  }

  async loadExaminationData(examinationId: string): Promise<void> {
    try {
      // Load annotations
      const annotationsResponse = await fetch(`/api/examinations/${examinationId}/annotations`);
      if (annotationsResponse.ok) {
        const annotationsData = await annotationsResponse.json();
        annotationsData.annotations?.forEach((annotation: ImageAnnotation) => {
          this.annotations.set(annotation.id, annotation);
        });
      }

      // Load findings (if there's a current report)
      if (this.currentReportId) {
        const findingsResponse = await fetch(`/api/reports/${this.currentReportId}/findings`);
        if (findingsResponse.ok) {
          const findingsData = await findingsResponse.json();
          findingsData.findings?.forEach((finding: ReportFinding) => {
            this.findings.set(finding.id, finding);
          });
        }
      }

      console.log(`Loaded integration data for examination ${examinationId}`);
    } catch (error) {
      console.error('Failed to load integration data:', error);
    }
  }

  // Event Management
  private emitMessage(message: ViewerReportsMessage): void {
    this.emit('message', message);
    this.emit(message.type, message.payload);
  }

  // Cleanup
  cleanup(): void {
    this.annotations.clear();
    this.findings.clear();
    this.currentExaminationId = null;
    this.currentReportId = null;
    this.removeAllListeners();
  }
}

// Singleton instance
const viewerReportsIntegration = new ViewerReportsIntegrationService();

export default viewerReportsIntegration;

// React Hook for easy component integration
export function useViewerReportsIntegration() {
  return {
    service: viewerReportsIntegration,
    createAnnotation: viewerReportsIntegration.createAnnotation.bind(viewerReportsIntegration),
    updateAnnotation: viewerReportsIntegration.updateAnnotation.bind(viewerReportsIntegration),
    deleteAnnotation: viewerReportsIntegration.deleteAnnotation.bind(viewerReportsIntegration),
    createMeasurement: viewerReportsIntegration.createMeasurement.bind(viewerReportsIntegration),
    linkAnnotationToFinding: viewerReportsIntegration.linkAnnotationToFinding.bind(viewerReportsIntegration),
    navigateToReport: viewerReportsIntegration.navigateToReport.bind(viewerReportsIntegration),
    navigateToViewer: viewerReportsIntegration.navigateToViewer.bind(viewerReportsIntegration),
    getAnnotations: viewerReportsIntegration.getAnnotations.bind(viewerReportsIntegration),
    getFindings: viewerReportsIntegration.getFindings.bind(viewerReportsIntegration)
  };
}
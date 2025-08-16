import { api } from '@/lib/api';

export interface DicomStudy {
  ID: string;
  StudyInstanceUID: string;
  PatientID: string;
  PatientName: string;
  StudyDate: string;
  StudyTime: string;
  StudyDescription: string;
  AccessionNumber: string;
  ModalitiesInStudy: string[];
  NumberOfStudyRelatedSeries: number;
  NumberOfStudyRelatedInstances: number;
}

export interface DicomSyncResult {
  examinationId: string;
  success: boolean;
  studiesFound: number;
  studyInstanceUID?: string;
  imagesAvailable: boolean;
  error?: string;
  syncedAt: string;
}

export interface DicomSyncStats {
  totalExaminations: number;
  examinationsWithImages: number;
  examinationsWithStudyUID: number;
  pendingSync: number;
  syncPercentage: number;
  timestamp: string;
}

export interface ViewerConfig {
  studyInstanceUID: string;
  imagesAvailable: boolean;
  ohifViewerUrl: string;
  dicomWebUrl: string;
  wadoRsRoot: string;
  orthancViewerUrl: string;
  stoneViewerUrl: string;
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string;
    patientId: string;
  };
  modality: string;
  accessionNumber: string;
  timestamp: string;
}

export class DicomService {
  // System endpoints
  static async testConnection(): Promise<{ connected: boolean; timestamp: string }> {
    const response = await api.get('/dicom/echo');
    return {
      connected: response.data?.status === 'connected',
      timestamp: response.data?.timestamp
    };
  }

  static async getSystemInfo() {
    const response = await api.get('/dicom/echo');
    return response.data;
  }

  static async getSyncStats(): Promise<{ pacsConnected: boolean; statistics: DicomSyncStats }> {
    const response = await api.get('/dicom/sync-stats');
    return response.data;
  }

  // Study operations
  static async searchStudies(params: {
    PatientID?: string;
    AccessionNumber?: string;
    PatientName?: string;
    StudyDate?: string;
    StudyDescription?: string;
    Modality?: string;
  }): Promise<{ studies: DicomStudy[]; count: number; searchCriteria: any; timestamp: string }> {
    const response = await api.post('/dicom/studies/search', params);
    return response.data;
  }

  static async getStudyById(studyId: string) {
    const response = await api.get(`/dicom/studies/${studyId}`);
    return response.data;
  }

  // Synchronization operations
  static async syncExamination(examinationId: string): Promise<DicomSyncResult> {
    const response = await api.post(`/dicom/sync-examination/${examinationId}`);
    return {
      examinationId: response.data.examinationId,
      success: response.data.success,
      studiesFound: response.data.studiesFound || 0,
      studyInstanceUID: response.data.studyInstanceUID,
      imagesAvailable: response.data.imagesAvailable || false,
      error: response.data.error,
      syncedAt: response.data.timestamp
    };
  }

  static async syncExaminations(examinationIds: string[]): Promise<{
    success: boolean;
    message: string;
    summary: {
      totalExaminations: number;
      successfulSyncs: number;
      failedSyncs: number;
      totalStudiesFound: number;
      duration: number;
    };
    results: DicomSyncResult[];
    timestamp: string;
  }> {
    const response = await api.post('/dicom/sync-bulk', { examinationIds });
    return response.data;
  }

  static async syncAllPending(): Promise<{
    success: boolean;
    message: string;
    summary: {
      totalExaminations: number;
      successfulSyncs: number;
      failedSyncs: number;
      totalStudiesFound: number;
      duration: number;
    };
    timestamp: string;
  }> {
    const response = await api.post('/dicom/sync-all-pending');
    return response.data;
  }

  static async syncDateRange(startDate: string, endDate: string): Promise<{
    success: boolean;
    message: string;
    dateRange: { startDate: string; endDate: string };
    summary: {
      totalExaminations: number;
      successfulSyncs: number;
      failedSyncs: number;
      totalStudiesFound: number;
      duration: number;
    };
    timestamp: string;
  }> {
    const response = await api.post('/dicom/sync-date-range', { startDate, endDate });
    return response.data;
  }

  // Viewer operations
  static async getViewerConfig(examinationId: string): Promise<ViewerConfig> {
    const response = await api.get(`/dicom/viewer-config/${examinationId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get viewer configuration');
    }
    return response.data.data;
  }

  static async getOrthancIdFromStudyUID(studyInstanceUID: string): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:8042/studies');
      const studyIds = await response.json();
      
      for (const studyId of studyIds) {
        const studyResponse = await fetch(`http://localhost:8042/studies/${studyId}`);
        const studyData = await studyResponse.json();
        
        if (studyData.MainDicomTags?.StudyInstanceUID === studyInstanceUID) {
          return studyId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error mapping StudyInstanceUID to Orthanc ID:', error);
      return null;
    }
  }

  static openOhifViewer(studyInstanceUID: string): void {
    const ohifUrl = `http://localhost:3005/viewer?StudyInstanceUIDs=${studyInstanceUID}&datasources=dicomweb`;
    window.open(ohifUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
  }

  // Generate OHIF viewer URL without opening window
  static generateOhifViewerUrl(studyInstanceUID: string): string {
    return `http://localhost:3005/viewer?StudyInstanceUIDs=${studyInstanceUID}&datasources=dicomweb`;
  }

  // Test DICOMweb connectivity
  static async testDicomWebConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    studiesCount?: number;
    sampleStudyUID?: string;
  }> {
    try {
      const corsProxyUrl = 'http://localhost:8043';
      const response = await fetch(`${corsProxyUrl}/dicom-web/studies`);
      
      if (!response.ok) {
        return {
          success: false,
          message: `DICOMweb endpoint not accessible: ${response.status} ${response.statusText}`
        };
      }
      
      const studies = await response.json();
      const sampleStudy = studies.length > 0 ? studies[0] : null;
      const sampleStudyUID = sampleStudy?.['0020000D']?.Value?.[0];
      
      return {
        success: true,
        message: `DICOMweb is working! Found ${studies.length} studies`,
        studiesCount: studies.length,
        sampleStudyUID
      };
    } catch (error) {
      return {
        success: false,
        message: `DICOMweb connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async openOrthancViewer(studyInstanceUID: string): Promise<void> {
    const orthancId = await this.getOrthancIdFromStudyUID(studyInstanceUID);
    if (orthancId) {
      const orthancUrl = `http://localhost:8042/app/explorer.html#study?uuid=${orthancId}`;
      window.open(orthancUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    } else {
      console.error('Could not find Orthanc ID for StudyInstanceUID:', studyInstanceUID);
      alert('Impossible de trouver l\'étude dans Orthanc PACS');
    }
  }

  static async openStoneViewer(studyInstanceUID: string): Promise<void> {
    const orthancId = await this.getOrthancIdFromStudyUID(studyInstanceUID);
    if (orthancId) {
      const stoneUrl = `http://localhost:8042/ui/app/stone-webviewer/index.html?study=${orthancId}`;
      window.open(stoneUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    } else {
      console.error('Could not find Orthanc ID for StudyInstanceUID:', studyInstanceUID);
      alert('Impossible de trouver l\'étude dans Orthanc PACS');
    }
  }

  // Utility methods
  static formatDicomDate(dicomDate: string): string {
    if (!dicomDate || dicomDate.length !== 8) return '';
    return `${dicomDate.substring(0, 4)}-${dicomDate.substring(4, 6)}-${dicomDate.substring(6, 8)}`;
  }

  static formatDicomTime(dicomTime: string): string {
    if (!dicomTime || dicomTime.length < 6) return '';
    return `${dicomTime.substring(0, 2)}:${dicomTime.substring(2, 4)}:${dicomTime.substring(4, 6)}`;
  }

  static formatDicomDateTime(dicomDate: string, dicomTime: string): Date | null {
    try {
      const formattedDate = this.formatDicomDate(dicomDate);
      const formattedTime = this.formatDicomTime(dicomTime);
      if (!formattedDate) return null;
      
      const dateTimeString = formattedTime ? `${formattedDate}T${formattedTime}` : formattedDate;
      return new Date(dateTimeString);
    } catch (error) {
      console.error('Error formatting DICOM date/time:', error);
      return null;
    }
  }

  static getModalityDisplayName(modality: string): string {
    const modalityNames: Record<string, string> = {
      'CT': 'Scanner',
      'MR': 'IRM',
      'XR': 'Radiographie',
      'US': 'Échographie',
      'MG': 'Mammographie',
      'NM': 'Médecine Nucléaire',
      'PT': 'TEP',
      'RF': 'Radioscopie',
      'DX': 'Radiographie Numérique',
      'CR': 'Radiographie Numérisée',
      'DR': 'Radiographie Directe'
    };
    return modalityNames[modality] || modality;
  }

  // Auto-discovery operations
  static async runAutoDiscovery(): Promise<{
    success: boolean;
    message: string;
    data?: {
      newStudiesFound: number;
      matchedExaminations: number;
      unmatchedStudies: number;
      syncResults: any[];
    };
    timestamp: string;
  }> {
    const response = await api.post('/dicom/auto-discovery/discover');
    return response.data;
  }

  static async getUnmatchedStudies(): Promise<{
    unmatchedStudies: any[];
    count: number;
  }> {
    const response = await api.get('/dicom/auto-discovery/unmatched-studies');
    return response.data.data;
  }

  static async manualLinkStudy(studyInstanceUID: string, examinationId: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      examinationId: string;
      studyInstanceUID: string;
    };
  }> {
    const response = await api.post('/dicom/auto-discovery/manual-link', {
      studyInstanceUID,
      examinationId
    });
    return response.data;
  }

  static async runScheduledAutoDiscovery(): Promise<{
    success: boolean;
    message: string;
    data?: any;
    timestamp: string;
  }> {
    const response = await api.post('/dicom/auto-discovery/scheduled');
    return response.data;
  }
}
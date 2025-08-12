import axios, { AxiosInstance } from 'axios';

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

export interface DicomSeries {
  ID: string;
  SeriesInstanceUID: string;
  SeriesNumber: string;
  SeriesDescription: string;
  Modality: string;
  SeriesDate: string;
  SeriesTime: string;
  NumberOfSeriesRelatedInstances: number;
}

export interface DicomInstance {
  ID: string;
  SOPInstanceUID: string;
  InstanceNumber: string;
  ImagePositionPatient?: number[];
  ImageOrientationPatient?: number[];
  PixelSpacing?: number[];
  SliceThickness?: number;
}

export interface DicomPatient {
  ID: string;
  PatientID: string;
  PatientName: string;
  PatientBirthDate?: string;
  PatientSex?: string;
  Studies: string[];
}

export class DicomService {
  private orthancClient: AxiosInstance;
  private baseUrl: string;

  constructor(orthancUrl: string = process.env.ORTHANC_URL || 'http://orthanc:8042') {
    this.baseUrl = orthancUrl;
    this.orthancClient = axios.create({
      baseURL: orthancUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  // System Information
  async getSystemInfo() {
    try {
      const response = await this.orthancClient.get('/system');
      return response.data;
    } catch (error) {
      console.error('Error fetching Orthanc system info:', error);
      throw new Error('Failed to connect to PACS system');
    }
  }

  // Patient Operations
  async getAllPatients(): Promise<DicomPatient[]> {
    try {
      const response = await this.orthancClient.get('/patients');
      const patientIds = response.data;
      
      const patients = await Promise.all(
        patientIds.map(async (id: string) => {
          const patientData = await this.orthancClient.get(`/patients/${id}`);
          return {
            ID: id,
            PatientID: patientData.data.MainDicomTags?.PatientID || '',
            PatientName: patientData.data.MainDicomTags?.PatientName || '',
            PatientBirthDate: patientData.data.MainDicomTags?.PatientBirthDate,
            PatientSex: patientData.data.MainDicomTags?.PatientSex,
            Studies: patientData.data.Studies || [],
          };
        })
      );
      
      return patients;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw new Error('Failed to fetch patients from PACS');
    }
  }

  async getPatientById(patientId: string): Promise<DicomPatient | null> {
    try {
      const response = await this.orthancClient.get(`/patients/${patientId}`);
      const data = response.data;
      
      return {
        ID: patientId,
        PatientID: data.MainDicomTags?.PatientID || '',
        PatientName: data.MainDicomTags?.PatientName || '',
        PatientBirthDate: data.MainDicomTags?.PatientBirthDate,
        PatientSex: data.MainDicomTags?.PatientSex,
        Studies: data.Studies || [],
      };
    } catch (error) {
      console.error(`Error fetching patient ${patientId}:`, error);
      return null;
    }
  }

  async findPatientByPatientId(patientId: string): Promise<DicomPatient[]> {
    try {
      const response = await this.orthancClient.post('/tools/find', {
        Level: 'Patient',
        Query: {
          PatientID: patientId
        }
      });
      
      const orthancIds = response.data;
      const patients = await Promise.all(
        orthancIds.map(async (id: string) => {
          return await this.getPatientById(id);
        })
      );
      
      return patients.filter(p => p !== null) as DicomPatient[];
    } catch (error) {
      console.error(`Error finding patient with ID ${patientId}:`, error);
      return [];
    }
  }

  // Study Operations
  async getAllStudies(): Promise<DicomStudy[]> {
    try {
      const response = await this.orthancClient.get('/studies');
      const studyIds = response.data;
      
      const studies = await Promise.all(
        studyIds.map(async (id: string) => {
          const studyData = await this.orthancClient.get(`/studies/${id}`);
          const data = studyData.data;
          
          return {
            ID: id,
            StudyInstanceUID: data.MainDicomTags?.StudyInstanceUID || '',
            PatientID: data.PatientMainDicomTags?.PatientID || '',
            PatientName: data.PatientMainDicomTags?.PatientName || '',
            StudyDate: data.MainDicomTags?.StudyDate || '',
            StudyTime: data.MainDicomTags?.StudyTime || '',
            StudyDescription: data.MainDicomTags?.StudyDescription || '',
            AccessionNumber: data.MainDicomTags?.AccessionNumber || '',
            ModalitiesInStudy: data.MainDicomTags?.ModalitiesInStudy?.split('\\') || [],
            NumberOfStudyRelatedSeries: data.Series?.length || 0,
            NumberOfStudyRelatedInstances: data.Instances?.length || 0,
          };
        })
      );
      
      return studies;
    } catch (error) {
      console.error('Error fetching studies:', error);
      throw new Error('Failed to fetch studies from PACS');
    }
  }

  async getStudyById(studyId: string): Promise<DicomStudy | null> {
    try {
      const response = await this.orthancClient.get(`/studies/${studyId}`);
      const data = response.data;
      
      return {
        ID: studyId,
        StudyInstanceUID: data.MainDicomTags?.StudyInstanceUID || '',
        PatientID: data.PatientMainDicomTags?.PatientID || '',
        PatientName: data.PatientMainDicomTags?.PatientName || '',
        StudyDate: data.MainDicomTags?.StudyDate || '',
        StudyTime: data.MainDicomTags?.StudyTime || '',
        StudyDescription: data.MainDicomTags?.StudyDescription || '',
        AccessionNumber: data.MainDicomTags?.AccessionNumber || '',
        ModalitiesInStudy: data.MainDicomTags?.ModalitiesInStudy?.split('\\') || [],
        NumberOfStudyRelatedSeries: data.Series?.length || 0,
        NumberOfStudyRelatedInstances: data.Instances?.length || 0,
      };
    } catch (error) {
      console.error(`Error fetching study ${studyId}:`, error);
      return null;
    }
  }

  async findStudiesByAccessionNumber(accessionNumber: string): Promise<DicomStudy[]> {
    try {
      const response = await this.orthancClient.post('/tools/find', {
        Level: 'Study',
        Query: {
          AccessionNumber: accessionNumber
        }
      });
      
      const studyIds = response.data;
      const studies = await Promise.all(
        studyIds.map(async (id: string) => {
          return await this.getStudyById(id);
        })
      );
      
      return studies.filter(s => s !== null) as DicomStudy[];
    } catch (error) {
      console.error(`Error finding studies with accession number ${accessionNumber}:`, error);
      return [];
    }
  }

  async findStudiesByPatientId(patientId: string): Promise<DicomStudy[]> {
    try {
      const response = await this.orthancClient.post('/tools/find', {
        Level: 'Study',
        Query: {
          PatientID: patientId
        }
      });
      
      const studyIds = response.data;
      const studies = await Promise.all(
        studyIds.map(async (id: string) => {
          return await this.getStudyById(id);
        })
      );
      
      return studies.filter(s => s !== null) as DicomStudy[];
    } catch (error) {
      console.error(`Error finding studies for patient ${patientId}:`, error);
      return [];
    }
  }

  // Series Operations
  async getSeriesForStudy(studyId: string): Promise<DicomSeries[]> {
    try {
      const response = await this.orthancClient.get(`/studies/${studyId}`);
      const seriesIds = response.data.Series || [];
      
      const series = await Promise.all(
        seriesIds.map(async (id: string) => {
          const seriesData = await this.orthancClient.get(`/series/${id}`);
          const data = seriesData.data;
          
          return {
            ID: id,
            SeriesInstanceUID: data.MainDicomTags?.SeriesInstanceUID || '',
            SeriesNumber: data.MainDicomTags?.SeriesNumber || '',
            SeriesDescription: data.MainDicomTags?.SeriesDescription || '',
            Modality: data.MainDicomTags?.Modality || '',
            SeriesDate: data.MainDicomTags?.SeriesDate || '',
            SeriesTime: data.MainDicomTags?.SeriesTime || '',
            NumberOfSeriesRelatedInstances: data.Instances?.length || 0,
          };
        })
      );
      
      return series;
    } catch (error) {
      console.error(`Error fetching series for study ${studyId}:`, error);
      return [];
    }
  }

  // Instance Operations
  async getInstancesForSeries(seriesId: string): Promise<DicomInstance[]> {
    try {
      const response = await this.orthancClient.get(`/series/${seriesId}`);
      const instanceIds = response.data.Instances || [];
      
      const instances = await Promise.all(
        instanceIds.map(async (id: string) => {
          const instanceData = await this.orthancClient.get(`/instances/${id}`);
          const data = instanceData.data;
          
          return {
            ID: id,
            SOPInstanceUID: data.MainDicomTags?.SOPInstanceUID || '',
            InstanceNumber: data.MainDicomTags?.InstanceNumber || '',
            ImagePositionPatient: data.MainDicomTags?.ImagePositionPatient,
            ImageOrientationPatient: data.MainDicomTags?.ImageOrientationPatient,
            PixelSpacing: data.MainDicomTags?.PixelSpacing,
            SliceThickness: data.MainDicomTags?.SliceThickness,
          };
        })
      );
      
      return instances;
    } catch (error) {
      console.error(`Error fetching instances for series ${seriesId}:`, error);
      return [];
    }
  }

  // OHIF Integration
  getOhifViewerUrl(studyInstanceUID: string): string {
    const baseOhifUrl = process.env.OHIF_VIEWER_URL || 'http://localhost:3005/viewer';
    const params = new URLSearchParams({
      datasources: 'dicomweb',
      StudyInstanceUIDs: studyInstanceUID
    });
    return `${baseOhifUrl}?${params.toString()}`;
  }

  // DICOMweb URLs for direct access
  getDicomWebStudyUrl(studyInstanceUID: string): string {
    return `${this.baseUrl}/dicom-web/studies/${studyInstanceUID}`;
  }

  getDicomWebSeriesUrl(studyInstanceUID: string, seriesInstanceUID: string): string {
    return `${this.baseUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}`;
  }

  // Utility Methods
  async testConnection(): Promise<boolean> {
    try {
      await this.getSystemInfo();
      return true;
    } catch (error) {
      return false;
    }
  }

  formatDicomDate(dicomDate: string): string {
    if (!dicomDate || dicomDate.length !== 8) return '';
    return `${dicomDate.substring(0, 4)}-${dicomDate.substring(4, 6)}-${dicomDate.substring(6, 8)}`;
  }

  formatDicomTime(dicomTime: string): string {
    if (!dicomTime || dicomTime.length < 6) return '';
    return `${dicomTime.substring(0, 2)}:${dicomTime.substring(2, 4)}:${dicomTime.substring(4, 6)}`;
  }

  formatDicomDateTime(dicomDate: string, dicomTime: string): Date | null {
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
}

// Singleton instance
export const dicomService = new DicomService();
import { dicomApi } from '@/lib/api';
import { Examination } from '@/types';
import toast from 'react-hot-toast';

export interface ViewerConfig {
  studyInstanceUID: string;
  wadoRsRoot: string;
  ohifViewerUrl: string;
  orthancViewerUrl: string;
  stoneViewerUrl: string;
  patient: {
    firstName: string;
    lastName: string;
    birthDate: string;
  };
  modality: string;
  accessionNumber: string;
}

export class ViewerService {
  private static readonly OHIF_BASE_URL = process.env.NEXT_PUBLIC_OHIF_URL || 'http://localhost:3005';
  private static readonly DEFAULT_VIEWPORT_CONFIG = {
    viewportType: 'stack',
    background: [0, 0, 0],
  };

  /**
   * Opens the OHIF viewer for a specific examination
   * @param examination - The examination to view
   * @returns Promise<boolean> - Whether the viewer was opened successfully
   */
  static async openExaminationInViewer(examination: Examination): Promise<boolean> {
    try {
      // Check if study instance UID is available
      if (!examination.studyInstanceUID) {
        toast.error('Aucune image DICOM disponible pour cet examen');
        return false;
      }

      let viewerUrl: string;
      let windowTitle = 'RADRIS Viewer';

      try {
        // Try to get viewer configuration from backend
        const response = await dicomApi.getViewerConfig(examination.id);
        const config: ViewerConfig = response.data;
        viewerUrl = this.buildOHIFViewerUrl(config);
        windowTitle = `RADRIS Viewer - ${config.patient.lastName}, ${config.patient.firstName} (${config.accessionNumber})`;
      } catch (apiError: any) {
        // Fallback to simple viewer URL if backend is not available
        console.warn('Backend not available, using fallback viewer URL:', apiError.message);
        
        const patientInfo = {
          name: `${examination.patient.lastName}, ${examination.patient.firstName}`,
          accessionNumber: examination.accessionNumber
        };
        
        viewerUrl = this.buildSimpleOHIFViewerUrl(examination.studyInstanceUID);
        windowTitle = `RADRIS Viewer - ${patientInfo.name} (${patientInfo.accessionNumber})`;
        
        toast.success('Ouverture du visualiseur en mode simplifié');
      }

      // Open viewer in new window
      const viewerWindow = window.open(viewerUrl, '_blank', this.getWindowFeatures());
      
      if (!viewerWindow) {
        toast.error('Impossible d\'ouvrir le visualiseur. Vérifiez que les pop-ups sont autorisés.');
        return false;
      }

      // Set window title and focus
      setTimeout(() => {
        try {
          viewerWindow.document.title = windowTitle;
        } catch (e) {
          // Ignore cross-origin errors when setting title
        }
      }, 1000);
      
      viewerWindow.focus();

      toast.success('Visualiseur DICOM ouvert');
      return true;

    } catch (error: any) {
      console.error('Failed to open DICOM viewer:', error);
      toast.error('Erreur lors de l\'ouverture du visualiseur DICOM');
      return false;
    }
  }

  /**
   * Opens the OHIF viewer with a direct StudyInstanceUID (fallback method)
   * @param studyInstanceUID - The study instance UID
   * @param patientInfo - Optional patient information for window title
   * @returns boolean - Whether the viewer was opened successfully
   */
  static openStudyInViewer(
    studyInstanceUID: string, 
    patientInfo?: { name?: string; accessionNumber?: string }
  ): boolean {
    try {
      const viewerUrl = this.buildSimpleOHIFViewerUrl(studyInstanceUID);
      const viewerWindow = window.open(viewerUrl, '_blank', this.getWindowFeatures());
      
      if (!viewerWindow) {
        toast.error('Impossible d\'ouvrir le visualiseur. Vérifiez que les pop-ups sont autorisés.');
        return false;
      }

      // Set window title if patient info is provided
      if (patientInfo?.name) {
        viewerWindow.document.title = `RADRIS Viewer - ${patientInfo.name}${patientInfo.accessionNumber ? ` (${patientInfo.accessionNumber})` : ''}`;
      }
      
      viewerWindow.focus();
      return true;

    } catch (error) {
      console.error('Failed to open DICOM viewer:', error);
      toast.error('Erreur lors de l\'ouverture du visualiseur DICOM');
      return false;
    }
  }

  /**
   * Builds a complete OHIF viewer URL with configuration
   * @param config - Viewer configuration from backend
   * @returns string - Complete OHIF viewer URL
   */
  private static buildOHIFViewerUrl(config: ViewerConfig): string {
    const baseUrl = `${this.OHIF_BASE_URL}/viewer`;
    const params = new URLSearchParams();

    // Add study instance UID (main parameter for OHIF v3)
    params.append('StudyInstanceUIDs', config.studyInstanceUID);
    
    // Add data source name (uses static configuration from app-config.js)
    params.append('datasources', 'dicomweb');
    
    // Add the DICOMweb URL (required for OHIF to know where to fetch data)
    params.append('url', config.wadoRsRoot || 'http://localhost:8043/dicom-web');
    
    // Add patient context for better UX
    params.append('patientName', `${config.patient.lastName}, ${config.patient.firstName}`);
    params.append('accessionNumber', config.accessionNumber);

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Builds a simple OHIF viewer URL for direct StudyInstanceUID access
   * @param studyInstanceUID - The study instance UID
   * @returns string - Simple OHIF viewer URL
   */
  private static buildSimpleOHIFViewerUrl(studyInstanceUID: string): string {
    const params = new URLSearchParams();
    params.append('StudyInstanceUIDs', studyInstanceUID);
    params.append('datasources', 'dicomweb');
    params.append('url', 'http://localhost:8043/dicom-web');
    
    return `${this.OHIF_BASE_URL}/viewer?${params.toString()}`;
  }

  /**
   * Gets viewport configuration based on modality
   * @param modality - DICOM modality
   * @returns object - Viewport configuration
   */
  private static getModalityViewportConfig(modality: string): object {
    const config = { ...this.DEFAULT_VIEWPORT_CONFIG };

    switch (modality) {
      case 'CT':
        return {
          ...config,
          initialDisplaySetOptions: {
            colormap: 'Grayscale',
            voi: {
              windowWidth: 400,
              windowCenter: 40,
            },
          },
        };
      
      case 'MR':
        return {
          ...config,
          initialDisplaySetOptions: {
            colormap: 'Grayscale',
            voi: {
              windowWidth: 2000,
              windowCenter: 1000,
            },
          },
        };
      
      case 'DX':
      case 'CR':
        return {
          ...config,
          initialDisplaySetOptions: {
            colormap: 'Grayscale',
            voi: {
              windowWidth: 4096,
              windowCenter: 2048,
            },
          },
        };
      
      case 'US':
        return {
          ...config,
          initialDisplaySetOptions: {
            colormap: 'Grayscale',
            interpolationType: 'LINEAR',
          },
        };

      default:
        return config;
    }
  }

  /**
   * Gets window features for the viewer popup
   * @returns string - Window features configuration
   */
  private static getWindowFeatures(): string {
    return [
      'width=1400',
      'height=900',
      'left=100',
      'top=50',
      'toolbar=no',
      'location=no',
      'directories=no',
      'status=yes',
      'menubar=no',
      'scrollbars=yes',
      'resizable=yes',
      'copyhistory=no'
    ].join(',');
  }

  /**
   * Checks if the viewer can be opened (browser compatibility)
   * @returns boolean - Whether viewer can be opened
   */
  static canOpenViewer(): boolean {
    return typeof window !== 'undefined' && !!window.open;
  }

  /**
   * Gets viewer status for an examination
   * @param examination - The examination to check
   * @returns object - Viewer availability status
   */
  static getViewerStatus(examination: Examination): {
    available: boolean;
    reason?: string;
  } {
    if (!examination.imagesAvailable) {
      return {
        available: false,
        reason: 'Images non disponibles',
      };
    }

    if (!examination.studyInstanceUID) {
      return {
        available: false,
        reason: 'Identifiant d\'étude manquant',
      };
    }

    if (!this.canOpenViewer()) {
      return {
        available: false,
        reason: 'Navigateur non compatible',
      };
    }

    return { available: true };
  }
}

export default ViewerService;
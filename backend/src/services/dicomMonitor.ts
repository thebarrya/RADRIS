import { dicomService } from './dicom.js';
import { WebSocketService } from './websocket.js';

interface DicomStudy {
  StudyInstanceUID: string;
  PatientName?: string;
  PatientID?: string;
  StudyDescription?: string;
  ModalitiesInStudy?: string[];
  StudyDate?: string;
  AccessionNumber?: string;
  InstitutionName?: string;
}

export class DicomMonitorService {
  private knownStudies = new Set<string>();
  private monitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private checkIntervalMs = 10000; // Check every 10 seconds

  constructor(
    private websocket?: WebSocketService,
    private onNewStudyCallback?: (study: DicomStudy) => Promise<void>
  ) {}

  // Start monitoring for new DICOM studies
  async startMonitoring() {
    if (this.monitoring) {
      console.log('DICOM monitor already running');
      return;
    }

    console.log('Starting DICOM study monitor...');
    
    try {
      // Initialize with current studies to avoid false positives
      await this.initializeKnownStudies();
      
      this.monitoring = true;
      this.monitorInterval = setInterval(async () => {
        try {
          await this.checkForNewStudies();
        } catch (error) {
          console.error('Error during DICOM monitoring check:', error);
          
          // Send WebSocket error notification
          if (this.websocket) {
            this.websocket.broadcastDicomError({
              operation: 'DICOM monitoring',
              error: error instanceof Error ? error.message : 'Unknown monitoring error',
              details: { monitoringActive: this.monitoring }
            });
          }
        }
      }, this.checkIntervalMs);

      console.log(`DICOM monitor started, checking every ${this.checkIntervalMs / 1000} seconds`);
      
      // Send system notification
      if (this.websocket) {
        this.websocket.broadcastSystemNotification({
          message: 'DICOM monitoring service started',
          level: 'info'
        });
      }

    } catch (error) {
      console.error('Failed to start DICOM monitor:', error);
      throw error;
    }
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }

    console.log('Stopping DICOM study monitor...');
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    this.monitoring = false;
    
    // Send system notification
    if (this.websocket) {
      this.websocket.broadcastSystemNotification({
        message: 'DICOM monitoring service stopped',
        level: 'info'
      });
    }
  }

  // Initialize known studies to prevent false alarms on startup
  private async initializeKnownStudies() {
    try {
      const studies = await dicomService.getAllStudies();
      this.knownStudies.clear();
      
      studies.forEach(study => {
        if (study.StudyInstanceUID) {
          this.knownStudies.add(study.StudyInstanceUID);
        }
      });

      console.log(`Initialized DICOM monitor with ${this.knownStudies.size} known studies`);
    } catch (error) {
      console.error('Failed to initialize known studies:', error);
      throw error;
    }
  }

  // Check for new studies and notify via WebSocket
  private async checkForNewStudies() {
    try {
      const currentStudies = await dicomService.getAllStudies();
      const newStudies: DicomStudy[] = [];

      for (const study of currentStudies) {
        if (study.StudyInstanceUID && !this.knownStudies.has(study.StudyInstanceUID)) {
          newStudies.push(study);
          this.knownStudies.add(study.StudyInstanceUID);
        }
      }

      if (newStudies.length > 0) {
        console.log(`Detected ${newStudies.length} new DICOM studies`);
        
        for (const study of newStudies) {
          await this.processNewStudy(study);
        }
      }

    } catch (error) {
      console.error('Error checking for new studies:', error);
      throw error;
    }
  }

  // Process a newly detected study
  private async processNewStudy(study: DicomStudy) {
    console.log(`Processing new study: ${study.StudyInstanceUID} for patient ${study.PatientName || study.PatientID}`);

    // Send WebSocket notification about new DICOM arrival
    if (this.websocket) {
      this.websocket.broadcastDicomArrival({
        studyInstanceUID: study.StudyInstanceUID,
        patientName: study.PatientName || 'Unknown Patient',
        patientID: study.PatientID || 'Unknown ID',
        studyDescription: study.StudyDescription,
        modality: study.ModalitiesInStudy?.[0],
        studyDate: study.StudyDate,
        accessionNumber: study.AccessionNumber,
        institutionName: study.InstitutionName
      });
    }

    // Call custom callback if provided
    if (this.onNewStudyCallback) {
      try {
        await this.onNewStudyCallback(study);
      } catch (error) {
        console.error('Error in new study callback:', error);
      }
    }
  }

  // Get monitoring status
  getStatus() {
    return {
      monitoring: this.monitoring,
      knownStudiesCount: this.knownStudies.size,
      checkInterval: this.checkIntervalMs,
      lastCheck: new Date().toISOString()
    };
  }

  // Update monitoring interval
  setCheckInterval(intervalMs: number) {
    if (intervalMs < 1000) {
      throw new Error('Check interval must be at least 1000ms');
    }

    this.checkIntervalMs = intervalMs;
    
    if (this.monitoring) {
      // Restart monitoring with new interval
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // Manual check for new studies
  async checkNow(): Promise<number> {
    try {
      const beforeCount = this.knownStudies.size;
      await this.checkForNewStudies();
      const afterCount = this.knownStudies.size;
      
      return afterCount - beforeCount; // Return number of new studies found
    } catch (error) {
      console.error('Error during manual check:', error);
      throw error;
    }
  }

  // Get list of known study UIDs
  getKnownStudies(): string[] {
    return Array.from(this.knownStudies);
  }

  // Reset known studies (useful for testing)
  resetKnownStudies() {
    this.knownStudies.clear();
    console.log('Reset known studies list');
  }
}

// Singleton instance
let dicomMonitorInstance: DicomMonitorService | null = null;

export const createDicomMonitor = (
  websocket?: WebSocketService,
  onNewStudyCallback?: (study: DicomStudy) => Promise<void>
): DicomMonitorService => {
  if (!dicomMonitorInstance) {
    dicomMonitorInstance = new DicomMonitorService(websocket, onNewStudyCallback);
  }
  return dicomMonitorInstance;
};

export const getDicomMonitor = (): DicomMonitorService | null => {
  return dicomMonitorInstance;
};
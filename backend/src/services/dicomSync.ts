import { PrismaClient } from '@prisma/client';
import { dicomService, DicomStudy } from './dicom.js';

export interface SyncResult {
  examinationId: string;
  success: boolean;
  studiesFound: number;
  studyInstanceUID?: string;
  imagesAvailable: boolean;
  error?: string;
  syncedAt: Date;
}

export interface BulkSyncResult {
  totalExaminations: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalStudiesFound: number;
  results: SyncResult[];
  duration: number;
}

export class DicomSyncService {
  constructor(private prisma: PrismaClient) {}

  async syncExaminationById(examinationId: string): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // Get examination details
      const examination = await this.prisma.examination.findUnique({
        where: { id: examinationId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              socialSecurity: true
            }
          }
        }
      });

      if (!examination) {
        return {
          examinationId,
          success: false,
          studiesFound: 0,
          imagesAvailable: false,
          error: 'Examination not found',
          syncedAt: new Date()
        };
      }

      // Try to find DICOM studies
      let studies: DicomStudy[] = [];
      
      // First try by accession number (most reliable)
      if (examination.accessionNumber) {
        studies = await dicomService.findStudiesByAccessionNumber(examination.accessionNumber);
      }
      
      // If no studies found by accession number, try by patient social security (used as DICOM Patient ID)
      if (studies.length === 0 && examination.patient.socialSecurity) {
        studies = await dicomService.findStudiesByPatientId(examination.patient.socialSecurity);
        
        // Filter studies by date if multiple found
        if (studies.length > 1) {
          const examDate = examination.scheduledDate.toISOString().split('T')[0].replace(/-/g, '');
          studies = studies.filter(study => study.StudyDate === examDate);
        }
      }

      // Update examination with sync results
      const updateData: any = {
        imagesAvailable: studies.length > 0,
        updatedAt: new Date()
      };

      // If we found exactly one study, update the StudyInstanceUID
      if (studies.length === 1) {
        updateData.studyInstanceUID = studies[0].StudyInstanceUID;
        
        // Update status if examination was scheduled and now has images
        if (examination.status === 'SCHEDULED') {
          updateData.status = 'ACQUIRED';
        }
      }

      await this.prisma.examination.update({
        where: { id: examinationId },
        data: updateData
      });

      return {
        examinationId,
        success: true,
        studiesFound: studies.length,
        studyInstanceUID: studies.length === 1 ? studies[0].StudyInstanceUID : undefined,
        imagesAvailable: studies.length > 0,
        syncedAt: new Date()
      };

    } catch (error) {
      console.error(`Error syncing examination ${examinationId}:`, error);
      return {
        examinationId,
        success: false,
        studiesFound: 0,
        imagesAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedAt: new Date()
      };
    }
  }

  async syncExaminationsByIds(examinationIds: string[]): Promise<BulkSyncResult> {
    const startTime = Date.now();
    
    const results = await Promise.all(
      examinationIds.map(id => this.syncExaminationById(id))
    );

    const successfulSyncs = results.filter(r => r.success).length;
    const totalStudiesFound = results.reduce((sum, r) => sum + r.studiesFound, 0);

    return {
      totalExaminations: examinationIds.length,
      successfulSyncs,
      failedSyncs: examinationIds.length - successfulSyncs,
      totalStudiesFound,
      results,
      duration: Date.now() - startTime
    };
  }

  async syncAllPendingExaminations(): Promise<BulkSyncResult> {
    try {
      // Get all examinations without StudyInstanceUID or with imagesAvailable = false
      const examinations = await this.prisma.examination.findMany({
        where: {
          OR: [
            { studyInstanceUID: null },
            { imagesAvailable: false }
          ]
        },
        select: { id: true }
      });

      const examinationIds = examinations.map(e => e.id);
      return await this.syncExaminationsByIds(examinationIds);

    } catch (error) {
      console.error('Error in bulk sync:', error);
      return {
        totalExaminations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalStudiesFound: 0,
        results: [],
        duration: 0
      };
    }
  }

  async syncExaminationsByDateRange(startDate: Date, endDate: Date): Promise<BulkSyncResult> {
    try {
      const examinations = await this.prisma.examination.findMany({
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: { id: true }
      });

      const examinationIds = examinations.map(e => e.id);
      return await this.syncExaminationsByIds(examinationIds);

    } catch (error) {
      console.error('Error in date range sync:', error);
      return {
        totalExaminations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalStudiesFound: 0,
        results: [],
        duration: 0
      };
    }
  }

  async getExaminationViewerConfig(examinationId: string) {
    try {
      const examination = await this.prisma.examination.findUnique({
        where: { id: examinationId },
        select: {
          studyInstanceUID: true,
          modality: true,
          accessionNumber: true,
          imagesAvailable: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              birthDate: true,
              socialSecurity: true
            }
          }
        }
      });

      if (!examination) {
        throw new Error('Examination not found');
      }

      if (!examination.studyInstanceUID || !examination.imagesAvailable) {
        throw new Error('No DICOM images available for this examination');
      }

      const ohifViewerUrl = dicomService.getOhifViewerUrl(examination.studyInstanceUID);
      const dicomWebUrl = dicomService.getDicomWebStudyUrl(examination.studyInstanceUID);

      return {
        studyInstanceUID: examination.studyInstanceUID,
        imagesAvailable: examination.imagesAvailable,
        ohifViewerUrl,
        dicomWebUrl,
        wadoRsRoot: 'http://localhost:8042/dicom-web',
        patient: examination.patient,
        modality: examination.modality,
        accessionNumber: examination.accessionNumber,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to get viewer configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSyncStatistics() {
    try {
      const [
        totalExaminations,
        examinationsWithImages,
        examinationsWithStudyUID,
        pendingSync
      ] = await Promise.all([
        this.prisma.examination.count(),
        this.prisma.examination.count({ where: { imagesAvailable: true } }),
        this.prisma.examination.count({ where: { studyInstanceUID: { not: null } } }),
        this.prisma.examination.count({
          where: {
            OR: [
              { studyInstanceUID: null },
              { imagesAvailable: false }
            ]
          }
        })
      ]);

      const syncPercentage = totalExaminations > 0 
        ? Math.round((examinationsWithImages / totalExaminations) * 100) 
        : 0;

      return {
        totalExaminations,
        examinationsWithImages,
        examinationsWithStudyUID,
        pendingSync,
        syncPercentage,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateDicomConnection(): Promise<boolean> {
    try {
      return await dicomService.testConnection();
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const dicomSyncService = new DicomSyncService(new PrismaClient());
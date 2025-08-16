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

  // Auto-discovery functionality
  async discoverNewStudies(): Promise<{
    newStudiesFound: number;
    matchedExaminations: number;
    unmatchedStudies: DicomStudy[];
    syncResults: SyncResult[];
  }> {
    try {
      console.log('Starting auto-discovery of new DICOM studies...');
      
      // Get all studies from Orthanc
      const allStudies = await dicomService.getAllStudies();
      console.log(`Found ${allStudies.length} total studies in Orthanc`);
      
      // Get all examinations that already have StudyInstanceUID
      const existingMappings = await this.prisma.examination.findMany({
        where: {
          studyInstanceUID: { not: null }
        },
        select: {
          studyInstanceUID: true
        }
      });
      
      const existingStudyUIDs = new Set(
        existingMappings.map(e => e.studyInstanceUID).filter(uid => uid !== null)
      );
      
      // Find new studies (not yet mapped to examinations)
      const newStudies = allStudies.filter(
        study => !existingStudyUIDs.has(study.StudyInstanceUID)
      );
      
      console.log(`Found ${newStudies.length} new studies to process`);
      
      const syncResults: SyncResult[] = [];
      const unmatchedStudies: DicomStudy[] = [];
      let matchedExaminations = 0;
      
      // Try to match each new study to existing examinations
      for (const study of newStudies) {
        console.log(`Processing new study: ${study.StudyInstanceUID}`);
        
        const matchResult = await this.matchStudyToExamination(study);
        
        if (matchResult.matched) {
          console.log(`Matched study to examination: ${matchResult.examinationId}`);
          
          // Update the examination with the study
          const syncResult = await this.linkStudyToExamination(
            matchResult.examinationId!,
            study.StudyInstanceUID
          );
          
          syncResults.push(syncResult);
          
          if (syncResult.success) {
            matchedExaminations++;
          }
        } else {
          console.log(`Could not match study: ${study.StudyInstanceUID}`);
          unmatchedStudies.push(study);
        }
      }
      
      console.log(`Auto-discovery complete: ${matchedExaminations} matched, ${unmatchedStudies.length} unmatched`);
      
      return {
        newStudiesFound: newStudies.length,
        matchedExaminations,
        unmatchedStudies,
        syncResults
      };
      
    } catch (error) {
      console.error('Error in auto-discovery:', error);
      throw new Error(`Auto-discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async matchStudyToExamination(study: DicomStudy): Promise<{
    matched: boolean;
    examinationId?: string;
    matchMethod?: string;
  }> {
    try {
      // Method 1: Match by accession number (most reliable)
      if (study.AccessionNumber) {
        const examination = await this.prisma.examination.findFirst({
          where: {
            accessionNumber: study.AccessionNumber,
            studyInstanceUID: null // Only match unlinked examinations
          },
          select: { id: true }
        });
        
        if (examination) {
          return {
            matched: true,
            examinationId: examination.id,
            matchMethod: 'accession_number'
          };
        }
      }
      
      // Method 2: Match by patient ID and study date
      if (study.PatientID && study.StudyDate) {
        const studyDate = this.parseDicomDate(study.StudyDate);
        
        if (studyDate) {
          const examination = await this.prisma.examination.findFirst({
            where: {
              patient: {
                socialSecurity: study.PatientID
              },
              scheduledDate: {
                gte: new Date(studyDate.getTime() - 24 * 60 * 60 * 1000), // 1 day before
                lte: new Date(studyDate.getTime() + 24 * 60 * 60 * 1000)  // 1 day after
              },
              studyInstanceUID: null
            },
            select: { id: true }
          });
          
          if (examination) {
            return {
              matched: true,
              examinationId: examination.id,
              matchMethod: 'patient_id_and_date'
            };
          }
        }
      }
      
      // Method 3: Match by patient name and study date (fuzzy matching)
      if (study.PatientName && study.StudyDate) {
        const studyDate = this.parseDicomDate(study.StudyDate);
        const patientName = study.PatientName.replace(/\^/g, ' ').trim();
        
        if (studyDate && patientName) {
          const examination = await this.prisma.examination.findFirst({
            where: {
              scheduledDate: {
                gte: new Date(studyDate.getTime() - 24 * 60 * 60 * 1000),
                lte: new Date(studyDate.getTime() + 24 * 60 * 60 * 1000)
              },
              studyInstanceUID: null,
              patient: {
                OR: [
                  {
                    firstName: {
                      contains: patientName.split(' ')[0],
                      mode: 'insensitive'
                    }
                  },
                  {
                    lastName: {
                      contains: patientName.split(' ').slice(1).join(' '),
                      mode: 'insensitive'
                    }
                  }
                ]
              }
            },
            select: { id: true }
          });
          
          if (examination) {
            return {
              matched: true,
              examinationId: examination.id,
              matchMethod: 'patient_name_and_date'
            };
          }
        }
      }
      
      return { matched: false };
      
    } catch (error) {
      console.error(`Error matching study ${study.StudyInstanceUID}:`, error);
      return { matched: false };
    }
  }

  private async linkStudyToExamination(examinationId: string, studyInstanceUID: string): Promise<SyncResult> {
    try {
      // Update examination with study information
      await this.prisma.examination.update({
        where: { id: examinationId },
        data: {
          studyInstanceUID,
          imagesAvailable: true,
          status: 'ACQUIRED', // Update status if it was SCHEDULED
          updatedAt: new Date()
        }
      });
      
      return {
        examinationId,
        success: true,
        studiesFound: 1,
        studyInstanceUID,
        imagesAvailable: true,
        syncedAt: new Date()
      };
      
    } catch (error) {
      console.error(`Error linking study to examination ${examinationId}:`, error);
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

  private parseDicomDate(dicomDate: string): Date | null {
    try {
      if (!dicomDate || dicomDate.length !== 8) return null;
      
      const year = parseInt(dicomDate.substring(0, 4));
      const month = parseInt(dicomDate.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(dicomDate.substring(6, 8));
      
      return new Date(year, month, day);
    } catch (error) {
      return null;
    }
  }

  // Scheduled auto-discovery (can be called periodically)
  async runScheduledAutoDiscovery(): Promise<{
    success: boolean;
    discoveryResult?: any;
    error?: string;
    timestamp: string;
  }> {
    try {
      console.log('Running scheduled auto-discovery...');
      
      const result = await this.discoverNewStudies();
      
      // Log the results
      console.log(`Scheduled auto-discovery completed:`, {
        newStudiesFound: result.newStudiesFound,
        matchedExaminations: result.matchedExaminations,
        unmatchedStudies: result.unmatchedStudies.length
      });
      
      return {
        success: true,
        discoveryResult: result,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Scheduled auto-discovery failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
export const dicomSyncService = new DicomSyncService(new PrismaClient());
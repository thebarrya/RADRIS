import { PrismaClient, Patient, Examination } from '@prisma/client';
import { dicomService } from './dicom.js';
import { WebSocketService } from './websocket.js';
import { patientIdentificationService } from './patientIdentification.js';

export interface PatientSyncData {
  id?: string;
  firstName: string;
  lastName: string;
  socialSecurity: string;
  birthDate: Date;
  sex?: string;
  // DICOM equivalents
  dicomPatientID: string;
  dicomPatientName: string;
  dicomBirthDate: string;
  dicomSex: string;
}

export interface StudySyncData {
  studyInstanceUID: string;
  accessionNumber?: string;
  studyDate: string;
  studyTime?: string;
  studyDescription?: string;
  referringPhysician?: string;
  institutionName?: string;
  patientID: string;
  // RIS examination data
  examinationId?: string;
  scheduledDate?: Date;
  modality?: string;
}

export interface MetadataSyncResult {
  success: boolean;
  patientsProcessed: number;
  studiesProcessed: number;
  patientsUpdated: number;
  studiesLinked: number;
  errors: string[];
  timestamp: Date;
}

export class MetadataSyncService {
  constructor(private prisma: PrismaClient, private websocket?: WebSocketService) {}

  // Main synchronization method
  async synchronizeMetadata(): Promise<MetadataSyncResult> {
    const startTime = Date.now();
    const result: MetadataSyncResult = {
      success: true,
      patientsProcessed: 0,
      studiesProcessed: 0,
      patientsUpdated: 0,
      studiesLinked: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      console.log('Starting comprehensive metadata synchronization...');

      // Step 1: Sync patient metadata from PACS to RIS
      const patientSyncResult = await this.syncPatientsFromPACS();
      result.patientsProcessed = patientSyncResult.processed;
      result.patientsUpdated = patientSyncResult.updated;
      result.errors.push(...patientSyncResult.errors);

      // Step 2: Sync study metadata and link to examinations
      const studySyncResult = await this.syncStudiesFromPACS();
      result.studiesProcessed = studySyncResult.processed;
      result.studiesLinked = studySyncResult.linked;
      result.errors.push(...studySyncResult.errors);

      // Step 3: Update RIS examination data with PACS metadata
      const examinationUpdateResult = await this.updateExaminationsWithPACSMetadata();
      result.errors.push(...examinationUpdateResult.errors);

      const duration = Date.now() - startTime;
      console.log(`Metadata sync completed in ${duration}ms`);
      console.log(`Patients: ${result.patientsUpdated}/${result.patientsProcessed} updated`);
      console.log(`Studies: ${result.studiesLinked}/${result.studiesProcessed} linked`);
      
      if (result.errors.length > 0) {
        console.warn(`${result.errors.length} errors occurred during sync`);
        result.success = false;
      }

      // Send WebSocket notification about sync completion
      if (this.websocket) {
        this.websocket.broadcastMetadataSync({
          patientsUpdated: result.patientsUpdated,
          studiesLinked: result.studiesLinked,
          patientsProcessed: result.patientsProcessed,
          studiesProcessed: result.studiesProcessed,
          errors: result.errors,
          success: result.success,
          duration
        });
      }

    } catch (error) {
      console.error('Critical error during metadata synchronization:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown critical error');
      
      // Send WebSocket error notification
      if (this.websocket) {
        this.websocket.broadcastDicomError({
          operation: 'metadata synchronization',
          error: error instanceof Error ? error.message : 'Unknown critical error',
          details: { 
            patientsProcessed: result.patientsProcessed,
            studiesProcessed: result.studiesProcessed
          }
        });
      }
    }

    return result;
  }

  // Sync patient data from PACS to RIS
  private async syncPatientsFromPACS(): Promise<{
    processed: number;
    updated: number;
    errors: string[];
  }> {
    const result = { processed: 0, updated: 0, errors: [] as string[] };

    try {
      // Get all studies from PACS to extract patient information
      const studies = await dicomService.getAllStudies();
      const patientMap = new Map<string, PatientSyncData>();

      // Extract unique patients from studies
      for (const study of studies) {
        result.processed++;
        
        if (!study.PatientID) {
          result.errors.push(`Study ${study.StudyInstanceUID} has no PatientID`);
          continue;
        }

        // Convert DICOM patient data to normalized format
        const patientData: PatientSyncData = {
          dicomPatientID: study.PatientID,
          dicomPatientName: study.PatientName || 'Unknown',
          dicomBirthDate: study.PatientBirthDate || '',
          dicomSex: this.mapDicomSex(study.PatientSex || ''),
          firstName: this.extractFirstName(study.PatientName || ''),
          lastName: this.extractLastName(study.PatientName || ''),
          socialSecurity: study.PatientID, // Use PatientID as social security for matching
          birthDate: this.parseDicomDate(study.PatientBirthDate || '') || new Date(),
          sex: this.mapDicomSex(study.PatientSex || '')
        };

        patientMap.set(study.PatientID, patientData);
      }

      // Sync each unique patient
      for (const [patientID, patientData] of patientMap) {
        try {
          await this.syncIndividualPatient(patientData);
          result.updated++;
        } catch (error) {
          result.errors.push(`Failed to sync patient ${patientID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Failed to sync patients from PACS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async syncIndividualPatient(patientData: PatientSyncData): Promise<void> {
    try {
      // Check if patient exists in RIS
      const existingPatient = await this.prisma.patient.findFirst({
        where: {
          OR: [
            { socialSecurity: patientData.socialSecurity },
            { 
              firstName: patientData.firstName,
              lastName: patientData.lastName,
              birthDate: patientData.birthDate
            }
          ]
        }
      });

      if (existingPatient) {
        // Update existing patient with PACS metadata if missing
        const updateData: any = {};
        
        if (!existingPatient.socialSecurity && patientData.socialSecurity) {
          updateData.socialSecurity = patientData.socialSecurity;
        }
        
        if (!existingPatient.gender && patientData.sex) {
          updateData.gender = patientData.sex as 'M' | 'F' | 'OTHER';
        }

        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await this.prisma.patient.update({
            where: { id: existingPatient.id },
            data: updateData
          });
        }
      } else {
        // Create new patient from PACS data
        // First, ensure we have a system user for metadata sync
        const systemUser = await this.ensureSystemUser();
        
        // Injecter le service WebSocket si disponible
        if (this.websocket && !patientIdentificationService['websocket']) {
          patientIdentificationService['websocket'] = this.websocket;
        }

        // Utiliser le service d'identification pour créer le patient avec UPI
        const result = await patientIdentificationService.createPatientWithIdentifiers({
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          birthDate: patientData.birthDate,
          gender: patientData.sex as 'M' | 'F' | 'OTHER',
          createdById: systemUser.id
        });

        const newPatient = result.patient;

        // Send WebSocket notification for new patient creation with identifiers
        if (this.websocket) {
          this.websocket.broadcastPatientUpdate(newPatient.id, {
            ...newPatient,
            identifiers: result.identifiers
          }, 'created');
        }
      }
    } catch (error) {
      throw new Error(`Patient sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Sync studies and link to examinations
  private async syncStudiesFromPACS(): Promise<{
    processed: number;
    linked: number;
    errors: string[];
  }> {
    const result = { processed: 0, linked: 0, errors: [] as string[] };

    try {
      const studies = await dicomService.getAllStudies();

      for (const study of studies) {
        result.processed++;

        try {
          // Convert study to sync format
          const studyData: StudySyncData = {
            studyInstanceUID: study.StudyInstanceUID,
            accessionNumber: study.AccessionNumber,
            studyDate: study.StudyDate || '',
            studyTime: study.StudyTime || '',
            studyDescription: study.StudyDescription || '',
            referringPhysician: study.ReferringPhysicianName || '',
            institutionName: study.InstitutionName || '',
            patientID: study.PatientID || '',
            scheduledDate: this.parseDicomDate(study.StudyDate || '') || undefined,
            modality: study.ModalitiesInStudy?.[0] || ''
          };

          // Try to link to existing examination
          const linked = await this.linkStudyToExamination(studyData);
          if (linked) {
            result.linked++;
          }

        } catch (error) {
          result.errors.push(`Failed to process study ${study.StudyInstanceUID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Failed to sync studies from PACS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  private async linkStudyToExamination(studyData: StudySyncData): Promise<boolean> {
    try {
      // Find matching examination
      let examination = null;

      // Method 1: Match by accession number
      if (studyData.accessionNumber) {
        examination = await this.prisma.examination.findFirst({
          where: {
            accessionNumber: studyData.accessionNumber,
            studyInstanceUID: null
          }
        });
      }

      // Method 2: Match by patient and date
      if (!examination && studyData.patientID && studyData.scheduledDate) {
        examination = await this.prisma.examination.findFirst({
          where: {
            patient: {
              socialSecurity: studyData.patientID
            },
            scheduledDate: {
              gte: new Date(studyData.scheduledDate.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(studyData.scheduledDate.getTime() + 24 * 60 * 60 * 1000)
            },
            studyInstanceUID: null
          }
        });
      }

      if (examination) {
        // Update examination with study metadata
        const updatedExamination = await this.prisma.examination.update({
          where: { id: examination.id },
          data: {
            studyInstanceUID: studyData.studyInstanceUID,
            imagesAvailable: true,
            status: 'ACQUIRED',
            updatedAt: new Date()
          },
          include: {
            patient: true
          }
        });

        // Send WebSocket notification for study linking
        if (this.websocket) {
          this.websocket.broadcastStudyLinked({
            examinationId: examination.id,
            studyInstanceUID: studyData.studyInstanceUID,
            patientName: `${updatedExamination.patient.firstName} ${updatedExamination.patient.lastName}`,
            accessionNumber: studyData.accessionNumber,
            modality: studyData.modality,
            studyDescription: studyData.studyDescription
          });
        }
        
        return true;
      }

      return false;
    } catch (error) {
      throw new Error(`Failed to link study: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async updateExaminationsWithPACSMetadata(): Promise<{
    errors: string[];
  }> {
    const result = { errors: [] as string[] };

    try {
      // Get all examinations that have studyInstanceUID but might be missing PACS metadata
      const examinations = await this.prisma.examination.findMany({
        where: {
          studyInstanceUID: { not: null },
          imagesAvailable: true
        },
        include: {
          patient: true
        }
      });

      for (const examination of examinations) {
        try {
          if (!examination.studyInstanceUID) continue;

          // Get PACS metadata for this study
          const studies = await dicomService.getAllStudies();
          const pacsStudy = studies.find(s => s.StudyInstanceUID === examination.studyInstanceUID);

          if (pacsStudy) {
            // Update examination with additional PACS metadata
            const updateData: any = {};

            if (!examination.accessionNumber && pacsStudy.AccessionNumber) {
              updateData.accessionNumber = pacsStudy.AccessionNumber;
            }

            if (pacsStudy.StudyDescription && pacsStudy.StudyDescription !== examination.modality) {
              // Could update examination description/notes
              updateData.notes = pacsStudy.StudyDescription;
            }

            if (Object.keys(updateData).length > 0) {
              updateData.updatedAt = new Date();
              await this.prisma.examination.update({
                where: { id: examination.id },
                data: updateData
              });
            }
          }

        } catch (error) {
          result.errors.push(`Failed to update examination ${examination.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      result.errors.push(`Failed to update examinations with PACS metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // System user management
  private async ensureSystemUser() {
    // Try to find existing system user
    let systemUser = await this.prisma.user.findFirst({
      where: {
        email: 'system@radris.local',
        role: 'ADMIN'
      }
    });

    if (!systemUser) {
      // Create system user for metadata sync operations
      systemUser = await this.prisma.user.create({
        data: {
          email: 'system@radris.local',
          firstName: 'System',
          lastName: 'MetaSync',
          role: 'ADMIN',
          active: true,
          password: 'system_user_no_login', // This user cannot login
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    return systemUser;
  }

  // Utility methods
  private extractFirstName(dicomPatientName: string): string {
    if (!dicomPatientName) return 'Unknown';
    
    // DICOM format is usually "LastName^FirstName^MiddleName"
    const parts = dicomPatientName.split('^');
    return parts.length > 1 ? parts[1].trim() : parts[0].trim();
  }

  private extractLastName(dicomPatientName: string): string {
    if (!dicomPatientName) return 'Unknown';
    
    // DICOM format is usually "LastName^FirstName^MiddleName"  
    const parts = dicomPatientName.split('^');
    return parts[0].trim();
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

  private mapDicomSex(dicomSex: string): string {
    switch (dicomSex.toUpperCase()) {
      case 'M': return 'M';
      case 'F': return 'F';
      case 'O': return 'OTHER';
      default: return 'OTHER';
    }
  }

  // Get synchronization statistics
  async getSyncStatistics() {
    try {
      const [
        totalPatients,
        totalExaminations,
        examinationsWithStudyUID,
        examinationsWithImages,
        patientsWithSocialSecurity
      ] = await Promise.all([
        this.prisma.patient.count(),
        this.prisma.examination.count(),
        this.prisma.examination.count({ where: { studyInstanceUID: { not: null } } }),
        this.prisma.examination.count({ where: { imagesAvailable: true } }),
        this.prisma.patient.count({ where: { socialSecurity: { not: null } } })
      ]);

      // Get PACS statistics
      const pacsStudies = await dicomService.getAllStudies();
      const uniquePatientsInPACS = new Set(pacsStudies.map(s => s.PatientID).filter(id => id)).size;

      return {
        ris: {
          totalPatients,
          totalExaminations,
          examinationsWithStudyUID,
          examinationsWithImages,
          patientsWithSocialSecurity,
          syncPercentage: totalExaminations > 0 ? Math.round((examinationsWithStudyUID / totalExaminations) * 100) : 0
        },
        pacs: {
          totalStudies: pacsStudies.length,
          uniquePatients: uniquePatientsInPACS
        },
        synchronization: {
          linkedExaminations: examinationsWithStudyUID,
          availableForLinking: totalExaminations - examinationsWithStudyUID,
          potentialMatches: Math.min(pacsStudies.length, totalExaminations)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance - WebSocket service will be injected at runtime
export const metadataSyncService = new MetadataSyncService(new PrismaClient());
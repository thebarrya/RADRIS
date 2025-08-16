import { PrismaClient } from '@prisma/client';
import { dicomService } from './dicom.js';
import { WebSocketService } from './websocket.js';

export interface PatientIdentifier {
  upi: string; // Universal Patient Identifier
  internalId: string; // RIS internal ID (cuid)
  dicomPatientId: string; // DICOM PatientID
  socialSecurity?: string; // Social Security Number
  nationalId?: string; // National Health ID
  institutionId?: string; // Institution-specific ID
}

export interface PatientIdentificationSync {
  patientId: string;
  identifiers: PatientIdentifier;
  syncedSystems: string[];
  lastSync: Date;
  conflicts: Array<{
    system: string;
    field: string;
    value: string;
    conflict: string;
  }>;
}

export class PatientIdentificationService {
  private institutionCode = 'RAD'; // Code institution pour préfixe
  private currentYear = new Date().getFullYear();

  constructor(
    private prisma: PrismaClient,
    private websocket?: WebSocketService
  ) {}

  /**
   * Génère un identifiant patient universel (UPI)
   * Format: [INSTITUTION]-[YEAR]-[SEQUENTIAL]-[CHECKSUM]
   * Example: RAD-2025-000001-C4
   */
  async generateUPI(patientData: {
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: string;
  }): Promise<string> {
    try {
      // Obtenir le prochain numéro séquentiel pour l'année
      const sequential = await this.getNextSequentialNumber();
      
      // Générer le checksum basé sur les données patient
      const checksum = this.calculateChecksum(patientData, sequential);
      
      // Format final: RAD-2025-000001-C4
      const upi = `${this.institutionCode}-${this.currentYear}-${sequential.toString().padStart(6, '0')}-${checksum}`;
      
      console.log(`Generated UPI: ${upi} for ${patientData.firstName} ${patientData.lastName}`);
      return upi;
      
    } catch (error) {
      console.error('Error generating UPI:', error);
      throw new Error('Failed to generate Universal Patient Identifier');
    }
  }

  /**
   * Obtient le prochain numéro séquentiel pour l'année courante
   */
  private async getNextSequentialNumber(): Promise<number> {
    // Chercher le dernier UPI généré cette année
    const lastPatient = await this.prisma.patient.findFirst({
      where: {
        socialSecurity: {
          startsWith: `${this.institutionCode}-${this.currentYear}-`
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!lastPatient?.socialSecurity) {
      return 1; // Premier patient de l'année
    }

    // Extraire le numéro séquentiel du dernier UPI
    const upiParts = lastPatient.socialSecurity.split('-');
    if (upiParts.length >= 3) {
      const lastSequential = parseInt(upiParts[2]);
      return lastSequential + 1;
    }

    return 1;
  }

  /**
   * Calcule un checksum pour valider l'intégrité de l'UPI
   */
  private calculateChecksum(patientData: {
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: string;
  }, sequential: number): string {
    const dataString = [
      patientData.firstName.toLowerCase(),
      patientData.lastName.toLowerCase(),
      patientData.birthDate.toISOString().split('T')[0],
      patientData.gender,
      sequential.toString()
    ].join('|');

    // Simple checksum basé sur les caractères ASCII
    let sum = 0;
    for (let i = 0; i < dataString.length; i++) {
      sum += dataString.charCodeAt(i);
    }

    // Convertir en base 36 et prendre les 2 premiers caractères
    return (sum % 1296).toString(36).toUpperCase().padStart(2, '0');
  }

  /**
   * Valide un UPI existant
   */
  validateUPI(upi: string): boolean {
    const upiRegex = /^[A-Z]{2,4}-\d{4}-\d{6}-[A-Z0-9]{2}$/;
    return upiRegex.test(upi);
  }

  /**
   * Crée un patient avec identifiants complets
   */
  async createPatientWithIdentifiers(patientData: {
    firstName: string;
    lastName: string;
    birthDate: Date;
    gender: 'M' | 'F' | 'OTHER';
    phoneNumber?: string;
    email?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    insuranceNumber?: string;
    emergencyContact?: string;
    createdById: string;
  }): Promise<{
    patient: any;
    identifiers: PatientIdentifier;
  }> {
    try {
      // Générer l'UPI
      const upi = await this.generateUPI(patientData);
      
      // Créer le patient dans RIS avec UPI comme socialSecurity
      const { createdById, ...patientCreateData } = patientData;
      const patient = await this.prisma.patient.create({
        data: {
          ...patientCreateData,
          socialSecurity: upi, // UPI stocké comme socialSecurity
          createdBy: {
            connect: { id: createdById }
          }
        }
      });

      // Créer les identifiants structurés
      const identifiers: PatientIdentifier = {
        upi,
        internalId: patient.id,
        dicomPatientId: upi, // Utiliser UPI comme PatientID DICOM
        socialSecurity: upi,
        nationalId: undefined, // À remplir si fourni
        institutionId: patient.id // Fallback sur l'ID interne
      };

      // Synchroniser avec PACS si disponible
      await this.syncPatientToPACS(identifiers, patient);

      // Notification WebSocket
      if (this.websocket) {
        this.websocket.broadcastPatientUpdate(patient.id, {
          ...patient,
          identifiers
        }, 'created');
      }

      console.log(`Patient created with UPI: ${upi}`);
      
      return { patient, identifiers };
      
    } catch (error) {
      console.error('Error creating patient with identifiers:', error);
      throw new Error('Failed to create patient with identifiers');
    }
  }

  /**
   * Met à jour les identifiants d'un patient existant
   */
  async updatePatientIdentifiers(patientId: string, updates: {
    socialSecurity?: string;
    nationalId?: string;
    insuranceNumber?: string;
  }): Promise<PatientIdentifier> {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Si pas d'UPI, en générer un
      let upi = patient.socialSecurity;
      if (!upi || !this.validateUPI(upi)) {
        upi = await this.generateUPI({
          firstName: patient.firstName,
          lastName: patient.lastName,
          birthDate: patient.birthDate,
          gender: patient.gender
        });
      }

      // Mettre à jour le patient
      const updatedPatient = await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          socialSecurity: upi,
          insuranceNumber: updates.insuranceNumber || patient.insuranceNumber
        }
      });

      const identifiers: PatientIdentifier = {
        upi,
        internalId: patient.id,
        dicomPatientId: upi,
        socialSecurity: upi,
        nationalId: updates.nationalId,
        institutionId: patient.id
      };

      // Synchroniser avec PACS
      await this.syncPatientToPACS(identifiers, updatedPatient);

      return identifiers;
      
    } catch (error) {
      console.error('Error updating patient identifiers:', error);
      throw error;
    }
  }

  /**
   * Synchronise un patient vers PACS avec son UPI
   */
  private async syncPatientToPACS(identifiers: PatientIdentifier, patient: any): Promise<void> {
    try {
      // Note: Orthanc ne permet pas la création directe de patients
      // Les patients sont créés automatiquement lors de l'upload d'études DICOM
      // Cette méthode prépare les métadonnées pour future synchronisation
      
      console.log(`Prepared PACS sync for patient UPI: ${identifiers.upi}`);
      
      // Log des identifiants pour traçabilité
      console.log('Patient Identifiers:', {
        upi: identifiers.upi,
        internalId: identifiers.internalId,
        dicomPatientId: identifiers.dicomPatientId
      });
      
    } catch (error) {
      console.error('Error syncing patient to PACS:', error);
      // Ne pas faire échouer la création du patient pour une erreur PACS
    }
  }

  /**
   * Recherche un patient par n'importe quel identifiant
   */
  async findPatientByIdentifier(identifier: string): Promise<{
    patient: any;
    identifiers: PatientIdentifier;
  } | null> {
    try {
      // Recherche par UPI (socialSecurity)
      let patient = await this.prisma.patient.findFirst({
        where: {
          OR: [
            { socialSecurity: identifier },
            { id: identifier },
            { insuranceNumber: identifier }
          ]
        },
        include: {
          createdBy: true
        }
      });

      if (!patient) {
        return null;
      }

      const identifiers: PatientIdentifier = {
        upi: patient.socialSecurity || patient.id,
        internalId: patient.id,
        dicomPatientId: patient.socialSecurity || patient.id,
        socialSecurity: patient.socialSecurity || undefined,
        nationalId: undefined,
        institutionId: patient.id
      };

      return { patient, identifiers };
      
    } catch (error) {
      console.error('Error finding patient by identifier:', error);
      return null;
    }
  }

  /**
   * Synchronise les identifiants avec le PACS existant
   */
  async syncWithExistingPACS(): Promise<{
    synchronized: number;
    conflicts: Array<{
      upi: string;
      dicomPatientId: string;
      conflict: string;
    }>;
    errors: string[];
  }> {
    const result = {
      synchronized: 0,
      conflicts: [] as Array<{
        upi: string;
        dicomPatientId: string;
        conflict: string;
      }>,
      errors: [] as string[]
    };

    try {
      // Obtenir tous les patients RIS
      const risPatients = await this.prisma.patient.findMany({
        where: { active: true }
      });

      // Obtenir toutes les études PACS
      const pacsStudies = await dicomService.getAllStudies();
      const pacsPatientIds = new Set(pacsStudies.map(s => s.PatientID).filter(id => id));

      for (const patient of risPatients) {
        try {
          let needsUpdate = false;
          let upi = patient.socialSecurity;

          // Générer UPI si manquant ou invalide
          if (!upi || !this.validateUPI(upi)) {
            upi = await this.generateUPI({
              firstName: patient.firstName,
              lastName: patient.lastName,
              birthDate: patient.birthDate,
              gender: patient.gender
            });
            needsUpdate = true;
          }

          // Vérifier les conflits avec PACS
          if (pacsPatientIds.has(patient.socialSecurity || '') && patient.socialSecurity !== upi) {
            result.conflicts.push({
              upi,
              dicomPatientId: patient.socialSecurity || '',
              conflict: 'DICOM PatientID differs from generated UPI'
            });
          }

          // Mettre à jour si nécessaire
          if (needsUpdate) {
            await this.prisma.patient.update({
              where: { id: patient.id },
              data: { socialSecurity: upi }
            });
            result.synchronized++;
          }

        } catch (error) {
          result.errors.push(`Failed to sync patient ${patient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Notification WebSocket
      if (this.websocket) {
        this.websocket.broadcastSystemNotification({
          message: `Patient ID synchronization completed: ${result.synchronized} patients updated`,
          level: 'info'
        });
      }

      return result;
      
    } catch (error) {
      console.error('Error syncing with existing PACS:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      return result;
    }
  }

  /**
   * Obtient les statistiques d'identification
   */
  async getIdentificationStatistics(): Promise<{
    totalPatients: number;
    patientsWithUPI: number;
    patientsWithValidUPI: number;
    pacsPatients: number;
    synchronized: number;
    conflicts: number;
    coverage: number;
  }> {
    try {
      const [
        totalPatients,
        patientsWithSocialSecurity,
        pacsStudies
      ] = await Promise.all([
        this.prisma.patient.count({ where: { active: true } }),
        this.prisma.patient.count({ 
          where: { 
            active: true,
            socialSecurity: { not: null }
          }
        }),
        dicomService.getAllStudies()
      ]);

      // Compter les UPI valides
      const patientsWithUPI = await this.prisma.patient.findMany({
        where: {
          active: true,
          socialSecurity: { not: null }
        },
        select: { socialSecurity: true }
      });

      const patientsWithValidUPI = patientsWithUPI.filter(p => 
        p.socialSecurity && this.validateUPI(p.socialSecurity)
      ).length;

      const pacsPatients = new Set(pacsStudies.map(s => s.PatientID).filter(id => id)).size;
      const coverage = totalPatients > 0 ? Math.round((patientsWithValidUPI / totalPatients) * 100) : 0;

      return {
        totalPatients,
        patientsWithUPI: patientsWithSocialSecurity,
        patientsWithValidUPI,
        pacsPatients,
        synchronized: patientsWithValidUPI, // Patients avec UPI valide sont considérés synchronisés
        conflicts: patientsWithSocialSecurity - patientsWithValidUPI, // Patients avec SS invalide
        coverage
      };
      
    } catch (error) {
      console.error('Error getting identification statistics:', error);
      throw error;
    }
  }

  /**
   * Recherche des doublons potentiels
   */
  async findPotentialDuplicates(): Promise<Array<{
    patients: any[];
    matchType: 'name_birthdate' | 'name_similar' | 'partial_identifiers';
    confidence: number;
  }>> {
    try {
      const duplicates: Array<{
        patients: any[];
        matchType: 'name_birthdate' | 'name_similar' | 'partial_identifiers';
        confidence: number;
      }> = [];

      // Recherche par nom + date de naissance
      const nameAndBirthMatches = await this.prisma.$queryRaw`
        SELECT firstName, lastName, birthDate, COUNT(*) as count, 
               ARRAY_AGG(id) as patient_ids
        FROM "patients" 
        WHERE active = true
        GROUP BY firstName, lastName, birthDate
        HAVING COUNT(*) > 1
      ` as Array<{
        firstName: string;
        lastName: string;
        birthDate: Date;
        count: number;
        patient_ids: string[];
      }>;

      for (const match of nameAndBirthMatches) {
        const patients = await this.prisma.patient.findMany({
          where: {
            id: { in: match.patient_ids }
          }
        });

        duplicates.push({
          patients,
          matchType: 'name_birthdate',
          confidence: 0.9
        });
      }

      return duplicates;
      
    } catch (error) {
      console.error('Error finding potential duplicates:', error);
      return [];
    }
  }
}

// Export du singleton
export const patientIdentificationService = new PatientIdentificationService(new PrismaClient());
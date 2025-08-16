import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { patientIdentificationService } from '../services/patientIdentification.js';
import { createAuthHandler } from '../utils/auth.js';

export const patientIdentificationRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = createAuthHandler();

  // Injecter le service WebSocket si disponible
  if (fastify.websocket && !patientIdentificationService['websocket']) {
    patientIdentificationService['websocket'] = fastify.websocket;
  }

  // Générer un UPI pour un patient existant
  fastify.post('/generate-upi/:patientId', { preHandler: authenticate }, async (request) => {
    const { patientId } = request.params as { patientId: string };

    try {
      const patient = await fastify.prisma.patient.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      const upi = await patientIdentificationService.generateUPI({
        firstName: patient.firstName,
        lastName: patient.lastName,
        birthDate: patient.birthDate,
        gender: patient.gender
      });

      return {
        success: true,
        data: {
          patientId,
          upi,
          generated: true
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`UPI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to generate UPI');
    }
  });

  // Créer un patient avec identifiants complets
  fastify.post('/create-with-identifiers', { preHandler: authenticate }, async (request) => {
    const patientSchema = z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      birthDate: z.string().transform(str => new Date(str)),
      gender: z.enum(['M', 'F', 'OTHER']),
      phoneNumber: z.string().optional(),
      email: z.string().email().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      zipCode: z.string().optional(),
      insuranceNumber: z.string().optional(),
      emergencyContact: z.string().optional(),
    });

    const patientData = patientSchema.parse(request.body);

    try {
      // TODO: Récupérer l'utilisateur authentifié au lieu d'utiliser un ID hardcodé
      const systemUser = await fastify.prisma.user.findFirst({
        where: { email: 'system@radris.local', role: 'ADMIN' }
      });

      if (!systemUser) {
        throw new Error('System user not found');
      }

      const result = await patientIdentificationService.createPatientWithIdentifiers({
        ...patientData,
        createdById: systemUser.id
      });

      return {
        success: true,
        data: {
          patient: result.patient,
          identifiers: result.identifiers
        },
        message: `Patient created with UPI: ${result.identifiers.upi}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Patient creation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to create patient with identifiers');
    }
  });

  // Mettre à jour les identifiants d'un patient
  fastify.put('/update-identifiers/:patientId', { preHandler: authenticate }, async (request) => {
    const { patientId } = request.params as { patientId: string };
    
    const updateSchema = z.object({
      socialSecurity: z.string().optional(),
      nationalId: z.string().optional(),
      insuranceNumber: z.string().optional(),
    });

    const updates = updateSchema.parse(request.body);

    try {
      const identifiers = await patientIdentificationService.updatePatientIdentifiers(patientId, updates);

      return {
        success: true,
        data: { identifiers },
        message: 'Patient identifiers updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Update identifiers error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to update patient identifiers');
    }
  });

  // Rechercher un patient par identifiant
  fastify.get('/find/:identifier', { preHandler: authenticate }, async (request) => {
    const { identifier } = request.params as { identifier: string };

    try {
      const result = await patientIdentificationService.findPatientByIdentifier(identifier);

      if (!result) {
        return {
          success: false,
          message: 'Patient not found with provided identifier',
          timestamp: new Date().toISOString()
        };
      }

      return {
        success: true,
        data: {
          patient: result.patient,
          identifiers: result.identifiers
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Find patient error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to find patient by identifier');
    }
  });

  // Valider un UPI
  fastify.post('/validate-upi', { preHandler: authenticate }, async (request) => {
    const upiSchema = z.object({
      upi: z.string()
    });

    const { upi } = upiSchema.parse(request.body);

    try {
      const isValid = patientIdentificationService.validateUPI(upi);

      return {
        success: true,
        data: {
          upi,
          valid: isValid,
          format: 'INSTITUTION-YEAR-SEQUENTIAL-CHECKSUM'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`UPI validation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to validate UPI');
    }
  });

  // Synchroniser avec PACS existant
  fastify.post('/sync-with-pacs', { preHandler: authenticate }, async () => {
    try {
      const result = await patientIdentificationService.syncWithExistingPACS();

      return {
        success: true,
        data: result,
        message: `Synchronization completed: ${result.synchronized} patients updated, ${result.conflicts.length} conflicts found`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`PACS sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to synchronize with PACS');
    }
  });

  // Obtenir les statistiques d'identification
  fastify.get('/statistics', { preHandler: authenticate }, async () => {
    try {
      const stats = await patientIdentificationService.getIdentificationStatistics();

      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Statistics error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get identification statistics');
    }
  });

  // Rechercher les doublons potentiels
  fastify.get('/duplicates', { preHandler: authenticate }, async () => {
    try {
      const duplicates = await patientIdentificationService.findPotentialDuplicates();

      return {
        success: true,
        data: {
          duplicates,
          count: duplicates.length,
          totalDuplicatedPatients: duplicates.reduce((sum, dup) => sum + dup.patients.length, 0)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Duplicates detection error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to find potential duplicates');
    }
  });

  // Obtenir l'état de santé du système d'identification
  fastify.get('/health', { preHandler: authenticate }, async () => {
    try {
      const stats = await patientIdentificationService.getIdentificationStatistics();
      
      const health = {
        status: stats.coverage >= 95 ? 'healthy' : stats.coverage >= 80 ? 'warning' : 'critical',
        coverage: stats.coverage,
        totalPatients: stats.totalPatients,
        validUPIs: stats.patientsWithValidUPI,
        conflicts: stats.conflicts,
        synchronized: stats.synchronized,
        lastCheck: new Date().toISOString()
      };

      return {
        success: true,
        data: health,
        message: `Patient identification system is ${health.status}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Health check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to check system health');
    }
  });

  // Migration : Générer des UPIs pour tous les patients existants
  fastify.post('/migrate-existing-patients', { preHandler: authenticate }, async () => {
    try {
      let migratedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Obtenir tous les patients sans UPI valide
      const patients = await fastify.prisma.patient.findMany({
        where: {
          active: true,
          OR: [
            { socialSecurity: null },
            { socialSecurity: '' }
          ]
        }
      });

      for (const patient of patients) {
        try {
          await patientIdentificationService.updatePatientIdentifiers(patient.id, {});
          migratedCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Patient ${patient.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: true,
        data: {
          totalPatients: patients.length,
          migratedCount,
          errorCount,
          errors: errors.slice(0, 10) // Limiter les erreurs affichées
        },
        message: `Migration completed: ${migratedCount}/${patients.length} patients migrated`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Migration error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to migrate existing patients');
    }
  });

  // Endpoint pour tester la génération d'UPI
  fastify.post('/test-upi-generation', { preHandler: authenticate }, async (request) => {
    const testSchema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      birthDate: z.string().transform(str => new Date(str)),
      gender: z.string()
    });

    const testData = testSchema.parse(request.body);

    try {
      const upi = await patientIdentificationService.generateUPI(testData);
      const isValid = patientIdentificationService.validateUPI(upi);

      return {
        success: true,
        data: {
          testData,
          generatedUPI: upi,
          valid: isValid,
          explanation: {
            format: 'INSTITUTION-YEAR-SEQUENTIAL-CHECKSUM',
            institution: 'RAD',
            year: new Date().getFullYear(),
            note: 'This is a test generation - no patient was created'
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Test UPI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to test UPI generation');
    }
  });
};
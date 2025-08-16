import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dicomService } from '../services/dicom.js';
import { dicomSyncService } from '../services/dicomSync.js';
import { metadataSyncService } from '../services/metadataSync.js';
import { createDicomMonitor, getDicomMonitor } from '../services/dicomMonitor.js';
import { createAuthHandler } from '../utils/auth.js';

export const dicomRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = createAuthHandler();

  // Test Orthanc connectivity
  fastify.get('/echo', { preHandler: authenticate }, async () => {
    try {
      const systemInfo = await dicomService.getSystemInfo();
      const isConnected = await dicomService.testConnection();
      return {
        status: isConnected ? 'connected' : 'disconnected',
        orthanc: systemInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to connect to Orthanc PACS');
    }
  });

  // Get Orthanc statistics
  fastify.get('/stats', { preHandler: authenticate }, async () => {
    try {
      const systemInfo = await dicomService.getSystemInfo();
      return {
        system: systemInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to retrieve Orthanc statistics');
    }
  });

  // Search studies
  fastify.post('/studies/search', { preHandler: authenticate }, async (request) => {
    const searchSchema = z.object({
      PatientName: z.string().optional(),
      PatientID: z.string().optional(),
      StudyDate: z.string().optional(),
      StudyDescription: z.string().optional(),
      Modality: z.string().optional(),
      AccessionNumber: z.string().optional(),
      limit: z.number().default(25),
      offset: z.number().default(0),
    });

    const params = searchSchema.parse(request.body);
    const { PatientID, AccessionNumber } = params;

    try {
      let studies = [];
      
      if (PatientID) {
        studies = await dicomService.findStudiesByPatientId(PatientID);
      } else if (AccessionNumber) {
        studies = await dicomService.findStudiesByAccessionNumber(AccessionNumber);
      } else {
        studies = await dicomService.getAllStudies();
      }
      
      return {
        studies,
        count: studies.length,
        searchCriteria: params,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`DICOM search error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to search DICOM studies');
    }
  });

  // Get viewer configuration for an examination
  fastify.get('/viewer/config/:examinationId', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };

    try {
      // Get examination from database
      const examination = await fastify.prisma.examination.findUnique({
        where: { id: examinationId },
        include: {
          patient: true
        }
      });

      if (!examination) {
        throw new Error('Examination not found');
      }

      if (!examination.studyInstanceUID) {
        throw new Error('No DICOM study available for this examination');
      }

      // Build viewer configuration
      const config = {
        studyInstanceUID: examination.studyInstanceUID,
        wadoRsRoot: 'http://localhost:8043/dicom-web',
        ohifViewerUrl: 'http://localhost:3005',
        orthancViewerUrl: 'http://localhost:8042/orthanc-explorer-2',
        stoneViewerUrl: 'http://localhost:8042/stone-webviewer',
        patient: {
          firstName: examination.patient.firstName,
          lastName: examination.patient.lastName,
          birthDate: examination.patient.birthDate.toISOString().split('T')[0]
        },
        modality: examination.modality,
        accessionNumber: examination.accessionNumber
      };

      return config;
    } catch (error) {
      fastify.log.error(`Failed to get viewer config: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get viewer configuration');
    }
  });

  // Get study details
  fastify.get('/studies/:studyUID', { preHandler: authenticate }, async (request) => {
    const { studyUID } = request.params as { studyUID: string };

    try {
      const study = await dicomService.getStudyById(studyUID);
      if (!study) {
        throw new Error('Study not found');
      }
      
      const series = await dicomService.getSeriesForStudy(studyUID);
      
      return {
        study,
        series,
        seriesCount: series.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to retrieve study details');
    }
  });

  // Get series details
  fastify.get('/studies/:studyUID/series/:seriesUID', { preHandler: authenticate }, async (request) => {
    const { studyUID, seriesUID } = request.params as { studyUID: string; seriesUID: string };

    try {
      const series = await dicomService.getSeriesForStudy(studyUID);
      const targetSeries = series.find(s => s.SeriesInstanceUID === seriesUID);
      
      if (!targetSeries) {
        throw new Error('Series not found');
      }

      const instances = await dicomService.getInstancesForSeries(targetSeries.ID);

      return {
        series: targetSeries,
        instances,
      };
    } catch (error) {
      throw new Error('Failed to retrieve series details');
    }
  });

  // Get DICOM instance metadata
  fastify.get('/studies/:studyUID/series/:seriesUID/instances/:instanceUID/metadata', 
    { preHandler: authenticate }, 
    async (request) => {
      const { studyUID, seriesUID, instanceUID } = request.params as { 
        studyUID: string; 
        seriesUID: string; 
        instanceUID: string; 
      };

      try {
        // Find the series first
        const series = await dicomService.getSeriesForStudy(studyUID);
        const targetSeries = series.find(s => s.SeriesInstanceUID === seriesUID);
        
        if (!targetSeries) {
          throw new Error('Series not found');
        }

        const instances = await dicomService.getInstancesForSeries(targetSeries.ID);
        const targetInstance = instances.find(i => i.SOPInstanceUID === instanceUID);
        
        if (!targetInstance) {
          throw new Error('Instance not found');
        }

        return {
          metadata: targetInstance,
        };
      } catch (error) {
        throw new Error('Failed to retrieve instance metadata');
      }
    }
  );

  // Get WADO-URI for image retrieval
  fastify.get('/studies/:studyUID/wado-uri', { preHandler: authenticate }, async (request) => {
    const { studyUID } = request.params as { studyUID: string };

    const paramsSchema = z.object({
      seriesUID: z.string().optional(),
      instanceUID: z.string().optional(),
      contentType: z.string().default('application/dicom'),
    });

    const { seriesUID, instanceUID, contentType } = paramsSchema.parse(request.query);

    const orthancUrl = process.env.ORTHANC_URL || 'http://orthanc:8042';
    let wadoUrl = `${orthancUrl}/wado?requestType=WADO&studyUID=${studyUID}&contentType=${contentType}`;

    if (seriesUID) {
      wadoUrl += `&seriesUID=${seriesUID}`;
    }

    if (instanceUID) {
      wadoUrl += `&objectUID=${instanceUID}`;
    }

    return {
      wadoUrl,
      studyUID,
      seriesUID,
      instanceUID,
    };
  });

  // Store DICOM file
  fastify.post('/store', { preHandler: authenticate }, async (request) => {
    const bodySchema = z.object({
      dicomData: z.string(), // Base64 encoded DICOM data
    });

    const { dicomData } = bodySchema.parse(request.body);

    try {
      // This would require a store method in the dicomService
      // For now, return an error indicating this feature needs implementation
      throw new Error('DICOM store functionality requires implementation in dicomService');
    } catch (error) {
      fastify.log.error(`DICOM store error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to store DICOM instance');
    }
  });

  // Create modality worklist entry
  fastify.post('/worklist', { preHandler: authenticate }, async (request) => {
    const worklistSchema = z.object({
      patientName: z.string(),
      patientId: z.string(),
      accessionNumber: z.string(),
      modality: z.string(),
      scheduledDate: z.string(),
      scheduledTime: z.string(),
      scheduledAET: z.string(),
      procedure: z.string().optional(),
      studyDescription: z.string().optional(),
    });

    const data = worklistSchema.parse(request.body);

    try {
      // Create worklist item in Orthanc
      // Note: This requires proper worklist plugin configuration
      const worklistItem = {
        '0008,0050': data.accessionNumber,  // Accession Number
        '0010,0010': data.patientName,      // Patient Name
        '0010,0020': data.patientId,        // Patient ID
        '0008,0060': data.modality,         // Modality
        '0040,0100': [{                     // Scheduled Procedure Step Sequence
          '0040,0001': data.scheduledDate,  // Scheduled Station AE Title
          '0040,0002': data.scheduledDate,  // Scheduled Procedure Step Start Date
          '0040,0003': data.scheduledTime,  // Scheduled Procedure Step Start Time
          '0040,0006': data.procedure,      // Scheduled Performing Physician Name
          '0008,1030': data.studyDescription, // Study Description
        }],
      };

      // Store worklist item
      // This would require a worklist creation method in the dicomService
      // For now, return an error indicating this feature needs implementation
      throw new Error('Worklist creation functionality requires implementation in dicomService');
    } catch (error) {
      fastify.log.error(`Worklist creation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to create worklist entry');
    }
  });

  // Synchronize single examination with PACS
  fastify.post('/sync-examination/:examinationId', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };

    try {
      const result = await dicomSyncService.syncExaminationById(examinationId);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          examinationId,
          timestamp: result.syncedAt
        };
      }

      return {
        success: true,
        message: result.studiesFound > 0 
          ? `Found ${result.studiesFound} DICOM study(ies) for examination`
          : 'No DICOM studies found for examination',
        examinationId,
        studiesFound: result.studiesFound,
        studyInstanceUID: result.studyInstanceUID,
        imagesAvailable: result.imagesAvailable,
        timestamp: result.syncedAt
      };
    } catch (error) {
      fastify.log.error(`PACS sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to synchronize examination with PACS');
    }
  });

  // Bulk synchronization endpoints
  fastify.post('/sync-bulk', { preHandler: authenticate }, async (request) => {
    const bodySchema = z.object({
      examinationIds: z.array(z.string()).min(1).max(100)
    });

    const { examinationIds } = bodySchema.parse(request.body);

    try {
      const result = await dicomSyncService.syncExaminationsByIds(examinationIds);
      
      return {
        success: true,
        message: `Synchronized ${result.successfulSyncs}/${result.totalExaminations} examinations`,
        summary: {
          totalExaminations: result.totalExaminations,
          successfulSyncs: result.successfulSyncs,
          failedSyncs: result.failedSyncs,
          totalStudiesFound: result.totalStudiesFound,
          duration: result.duration
        },
        results: result.results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Bulk PACS sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to perform bulk synchronization with PACS');
    }
  });

  // Sync all pending examinations
  fastify.post('/sync-all-pending', { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.syncAllPendingExaminations();
      
      return {
        success: true,
        message: `Synchronized ${result.successfulSyncs}/${result.totalExaminations} pending examinations`,
        summary: {
          totalExaminations: result.totalExaminations,
          successfulSyncs: result.successfulSyncs,
          failedSyncs: result.failedSyncs,
          totalStudiesFound: result.totalStudiesFound,
          duration: result.duration
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Sync all pending error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to synchronize pending examinations');
    }
  });

  // Sync examinations by date range
  fastify.post('/sync-date-range', { preHandler: authenticate }, async (request) => {
    const bodySchema = z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    });

    const { startDate, endDate } = bodySchema.parse(request.body);

    try {
      const result = await dicomSyncService.syncExaminationsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
      
      return {
        success: true,
        message: `Synchronized ${result.successfulSyncs}/${result.totalExaminations} examinations in date range`,
        dateRange: { startDate, endDate },
        summary: {
          totalExaminations: result.totalExaminations,
          successfulSyncs: result.successfulSyncs,
          failedSyncs: result.failedSyncs,
          totalStudiesFound: result.totalStudiesFound,
          duration: result.duration
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Date range sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to synchronize examinations in date range');
    }
  });

  // Get sync statistics
  fastify.get('/sync-stats', { preHandler: authenticate }, async () => {
    try {
      const stats = await dicomSyncService.getSyncStatistics();
      const isConnected = await dicomSyncService.validateDicomConnection();
      
      return {
        success: true,
        pacsConnected: isConnected,
        statistics: stats
      };
    } catch (error) {
      fastify.log.error(`Sync stats error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get synchronization statistics');
    }
  });

  // Get viewer configuration for examination
  fastify.get('/viewer-config/:examinationId', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };

    try {
      const config = await dicomSyncService.getExaminationViewerConfig(examinationId);
      
      return {
        success: true,
        data: {
          ...config,
          orthancViewerUrl: `http://localhost:8042/app/explorer.html#study?uuid=${config.studyInstanceUID}`,
          stoneViewerUrl: `http://localhost:8042/ui/app/stone-webviewer/index.html?study=${config.studyInstanceUID}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get viewer configuration',
        examinationId
      };
    }
  });

  // Get study images for Cornerstone viewer
  fastify.get('/study-images/:studyInstanceUID', { preHandler: authenticate }, async (request) => {
    const { studyInstanceUID } = request.params as { studyInstanceUID: string };

    try {
      const orthancUrl = process.env.ORTHANC_URL || 'http://orthanc:8042';
      
      // First, get all studies from Orthanc
      const studiesResponse = await fetch(`${orthancUrl}/studies`);
      if (!studiesResponse.ok) {
        throw new Error('Failed to fetch studies from Orthanc');
      }
      
      const studyIds = await studiesResponse.json();
      let orthancStudyId = null;
      
      // Find the Orthanc study ID that matches our StudyInstanceUID
      for (const id of studyIds as string[]) {
        const studyResponse = await fetch(`${orthancUrl}/studies/${id}`);
        if (studyResponse.ok) {
          const studyData = await studyResponse.json() as any;
          if (studyData.MainDicomTags?.StudyInstanceUID === studyInstanceUID) {
            orthancStudyId = id;
            break;
          }
        }
      }
      
      if (!orthancStudyId) {
        return {
          success: false,
          error: `Study not found in Orthanc: ${studyInstanceUID}`,
          imageIds: []
        };
      }
      
      // Get all series in the study
      const seriesResponse = await fetch(`${orthancUrl}/studies/${orthancStudyId}/series`);
      if (!seriesResponse.ok) {
        throw new Error('Failed to fetch series');
      }
      
      const seriesData = await seriesResponse.json();
      const imageIds: string[] = [];
      
      // Get all instances from all series
      for (const seriesId of seriesData as string[]) {
        // Get instances for each series
        const instancesResponse = await fetch(`${orthancUrl}/series/${seriesId}/instances`);
        if (instancesResponse.ok) {
          const instances = await instancesResponse.json() as string[];
          
          // Create image IDs for each instance using direct Orthanc access
          for (const instanceId of instances) {
            // Use direct Orthanc URL that should work with CORS headers already configured
            const orthancDirectUrl = process.env.NEXT_PUBLIC_ORTHANC_URL || 'http://localhost:8042';
            const imageId = `wadouri:${orthancDirectUrl}/instances/${instanceId}/file`;
            imageIds.push(imageId);
          }
        }
      }
      
      if (imageIds.length === 0) {
        return {
          success: false,
          error: 'No images found in study',
          imageIds: []
        };
      }
      
      return {
        success: true,
        studyInstanceUID,
        orthancStudyId,
        imageIds,
        imageCount: imageIds.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error(`Study images error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load study images',
        imageIds: []
      };
    }
  });

  // Proxy endpoint for DICOM instances (CORS-safe)
  fastify.get('/proxy/instances/:instanceId/file', async (request, reply) => {
    const { instanceId } = request.params as { instanceId: string };
    
    try {
      const orthancUrl = process.env.ORTHANC_URL || 'http://orthanc:8042';
      const instanceUrl = `${orthancUrl}/instances/${instanceId}/file`;
      
      const response = await fetch(instanceUrl);
      if (!response.ok) {
        reply.code(response.status);
        return { error: 'Failed to fetch DICOM instance' };
      }
      
      // Set appropriate CORS headers
      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      reply.header('Content-Type', response.headers.get('content-type') || 'application/dicom');
      
      // Stream the DICOM file
      const buffer = await response.arrayBuffer();
      return reply.send(Buffer.from(buffer));
      
    } catch (error) {
      fastify.log.error(`Proxy instance error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: 'Failed to proxy DICOM instance' };
    }
  });

  // Add annotations endpoint  
  fastify.get('/examinations/:examinationId/annotations', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };
    
    try {
      // For now, return empty annotations as the feature is being developed
      return {
        success: true,
        annotations: [],
        examinationId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get annotations',
        annotations: []
      };
    }
  });

  // Auto-discovery endpoints
  fastify.post('/auto-discovery/discover', { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.discoverNewStudies();
      
      return {
        success: true,
        message: `Discovery complete: ${result.matchedExaminations} examinations matched to new studies`,
        data: {
          newStudiesFound: result.newStudiesFound,
          matchedExaminations: result.matchedExaminations,
          unmatchedStudies: result.unmatchedStudies.length,
          syncResults: result.syncResults
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Auto-discovery error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to run auto-discovery');
    }
  });

  fastify.post('/auto-discovery/scheduled', { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.runScheduledAutoDiscovery();
      
      return {
        success: result.success,
        message: result.success 
          ? `Scheduled discovery completed successfully`
          : `Scheduled discovery failed: ${result.error}`,
        data: result.discoveryResult,
        timestamp: result.timestamp
      };
    } catch (error) {
      fastify.log.error(`Scheduled auto-discovery error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to run scheduled auto-discovery');
    }
  });

  // Get unmatched studies (studies in Orthanc without corresponding examinations)
  fastify.get('/auto-discovery/unmatched-studies', { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.discoverNewStudies();
      
      return {
        success: true,
        data: {
          unmatchedStudies: result.unmatchedStudies,
          count: result.unmatchedStudies.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Get unmatched studies error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get unmatched studies');
    }
  });

  // Manual linking endpoint (for unmatched studies)
  fastify.post('/auto-discovery/manual-link', { preHandler: authenticate }, async (request) => {
    const bodySchema = z.object({
      studyInstanceUID: z.string(),
      examinationId: z.string()
    });

    const { studyInstanceUID, examinationId } = bodySchema.parse(request.body);

    try {
      // Check if examination exists and is not already linked
      const examination = await fastify.prisma.examination.findUnique({
        where: { id: examinationId },
        select: { studyInstanceUID: true }
      });

      if (!examination) {
        throw new Error('Examination not found');
      }

      if (examination.studyInstanceUID) {
        throw new Error('Examination is already linked to a study');
      }

      // Update examination with study
      await fastify.prisma.examination.update({
        where: { id: examinationId },
        data: {
          studyInstanceUID,
          imagesAvailable: true,
          status: 'ACQUIRED',
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        message: 'Study successfully linked to examination',
        data: {
          examinationId,
          studyInstanceUID
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Manual link error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to link study to examination: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Metadata synchronization endpoints
  fastify.post('/metadata-sync/synchronize', { preHandler: authenticate }, async () => {
    try {
      // Inject WebSocket service if available
      if (fastify.websocket && !metadataSyncService['websocket']) {
        metadataSyncService['websocket'] = fastify.websocket;
      }
      
      const result = await metadataSyncService.synchronizeMetadata();
      
      return {
        success: result.success,
        message: result.success 
          ? `Metadata sync completed: ${result.patientsUpdated} patients updated, ${result.studiesLinked} studies linked`
          : `Metadata sync failed with ${result.errors.length} errors`,
        data: {
          patientsProcessed: result.patientsProcessed,
          patientsUpdated: result.patientsUpdated,
          studiesProcessed: result.studiesProcessed,
          studiesLinked: result.studiesLinked,
          errors: result.errors.slice(0, 10), // Limit errors in response
          totalErrors: result.errors.length
        },
        timestamp: result.timestamp.toISOString()
      };
    } catch (error) {
      fastify.log.error(`Metadata sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to run metadata synchronization');
    }
  });

  fastify.get('/metadata-sync/statistics', { preHandler: authenticate }, async () => {
    try {
      const stats = await metadataSyncService.getSyncStatistics();
      
      return {
        success: true,
        data: stats,
        timestamp: stats.timestamp
      };
    } catch (error) {
      fastify.log.error(`Metadata sync stats error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get metadata synchronization statistics');
    }
  });

  // Bulk metadata operations
  fastify.post('/metadata-sync/sync-patients', { preHandler: authenticate }, async () => {
    try {
      // This would call a specific patient sync method
      const result = await metadataSyncService.synchronizeMetadata();
      
      return {
        success: result.success,
        message: `Patient sync completed: ${result.patientsUpdated}/${result.patientsProcessed} patients updated`,
        data: {
          patientsProcessed: result.patientsProcessed,
          patientsUpdated: result.patientsUpdated,
          errors: result.errors.filter(e => e.includes('patient')).slice(0, 5)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Patient sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to sync patient metadata');
    }
  });

  fastify.post('/metadata-sync/sync-studies', { preHandler: authenticate }, async () => {
    try {
      // This would call a specific study sync method
      const result = await metadataSyncService.synchronizeMetadata();
      
      return {
        success: result.success,
        message: `Study sync completed: ${result.studiesLinked}/${result.studiesProcessed} studies linked`,
        data: {
          studiesProcessed: result.studiesProcessed,
          studiesLinked: result.studiesLinked,
          errors: result.errors.filter(e => e.includes('study')).slice(0, 5)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Study sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to sync study metadata');
    }
  });

  // Validation and health check for metadata sync
  fastify.get('/metadata-sync/health', { preHandler: authenticate }, async () => {
    try {
      const [risHealth, pacsHealth] = await Promise.all([
        // Check RIS database connectivity
        fastify.prisma.patient.count().then(() => true).catch(() => false),
        // Check PACS connectivity  
        dicomService.testConnection()
      ]);

      const isHealthy = risHealth && pacsHealth;
      
      return {
        success: isHealthy,
        data: {
          ris: {
            connected: risHealth,
            status: risHealth ? 'healthy' : 'disconnected'
          },
          pacs: {
            connected: pacsHealth,
            status: pacsHealth ? 'healthy' : 'disconnected'
          },
          overall: {
            status: isHealthy ? 'healthy' : 'degraded',
            readyForSync: isHealthy
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`Metadata sync health check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to check metadata sync health');
    }
  });

  // DICOM monitoring endpoints
  
  // Initialize DICOM monitor
  fastify.post('/monitor/initialize', { preHandler: authenticate }, async () => {
    try {
      const monitor = createDicomMonitor(fastify.websocket);
      
      return {
        success: true,
        message: 'DICOM monitor initialized',
        status: monitor.getStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`DICOM monitor initialization error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to initialize DICOM monitor');
    }
  });

  // Start DICOM monitoring
  fastify.post('/monitor/start', { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor() || createDicomMonitor(fastify.websocket);
      await monitor.startMonitoring();
      
      return {
        success: true,
        message: 'DICOM monitoring started',
        status: monitor.getStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`DICOM monitor start error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to start DICOM monitoring');
    }
  });

  // Stop DICOM monitoring
  fastify.post('/monitor/stop', { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      if (monitor) {
        monitor.stopMonitoring();
        
        return {
          success: true,
          message: 'DICOM monitoring stopped',
          status: monitor.getStatus(),
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'DICOM monitor not initialized',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      fastify.log.error(`DICOM monitor stop error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to stop DICOM monitoring');
    }
  });

  // Get DICOM monitor status
  fastify.get('/monitor/status', { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      
      if (monitor) {
        return {
          success: true,
          data: monitor.getStatus(),
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: true,
          data: {
            monitoring: false,
            knownStudiesCount: 0,
            checkInterval: 0,
            lastCheck: null,
            message: 'Monitor not initialized'
          },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      fastify.log.error(`DICOM monitor status error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to get DICOM monitor status');
    }
  });

  // Manually trigger study check
  fastify.post('/monitor/check', { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      
      if (!monitor) {
        throw new Error('DICOM monitor not initialized');
      }

      const newStudiesCount = await monitor.checkNow();
      
      return {
        success: true,
        message: `Manual check completed, found ${newStudiesCount} new studies`,
        data: {
          newStudiesFound: newStudiesCount,
          status: monitor.getStatus()
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`DICOM monitor manual check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to perform manual check');
    }
  });

  // Configure monitoring interval
  fastify.post('/monitor/configure', { preHandler: authenticate }, async (request) => {
    const configSchema = z.object({
      checkIntervalSeconds: z.number().min(1).max(3600)
    });

    const { checkIntervalSeconds } = configSchema.parse(request.body);

    try {
      const monitor = getDicomMonitor();
      
      if (!monitor) {
        throw new Error('DICOM monitor not initialized');
      }

      monitor.setCheckInterval(checkIntervalSeconds * 1000);
      
      return {
        success: true,
        message: `DICOM monitoring interval updated to ${checkIntervalSeconds} seconds`,
        status: monitor.getStatus(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error(`DICOM monitor configuration error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to configure DICOM monitor');
    }
  });
};
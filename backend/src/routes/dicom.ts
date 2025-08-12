import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dicomService } from '../services/dicom.js';
import { dicomSyncService } from '../services/dicomSync.js';

export const dicomRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };

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
        wadoRsRoot: 'http://localhost:8042/dicom-web',
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
};
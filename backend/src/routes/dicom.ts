import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import { z } from 'zod';

export const dicomRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };

  const orthancUrl = process.env.ORTHANC_URL || 'http://localhost:8042';
  
  // Create axios instance for Orthanc communication
  const orthancClient = axios.create({
    baseURL: orthancUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Test Orthanc connectivity
  fastify.get('/echo', { preHandler: authenticate }, async () => {
    try {
      const response = await orthancClient.get('/system');
      return {
        status: 'connected',
        orthanc: response.data,
      };
    } catch (error) {
      throw new Error('Failed to connect to Orthanc PACS');
    }
  });

  // Get Orthanc statistics
  fastify.get('/stats', { preHandler: authenticate }, async () => {
    try {
      const [system, statistics] = await Promise.all([
        orthancClient.get('/system'),
        orthancClient.get('/statistics'),
      ]);

      return {
        system: system.data,
        statistics: statistics.data,
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
    const { limit, offset, ...searchParams } = params;

    try {
      // Use QIDO-RS for study search
      const qidoParams = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
          qidoParams.append(key, value);
        }
      });

      qidoParams.append('limit', limit.toString());
      qidoParams.append('offset', offset.toString());

      const response = await orthancClient.get(`/dicom-web/studies?${qidoParams}`);
      
      return {
        studies: response.data,
        pagination: {
          limit,
          offset,
          hasMore: response.data.length === limit,
        },
      };
    } catch (error) {
      fastify.log.error('DICOM search error:', error);
      throw new Error('Failed to search DICOM studies');
    }
  });

  // Get study details
  fastify.get('/studies/:studyUID', { preHandler: authenticate }, async (request) => {
    const { studyUID } = request.params as { studyUID: string };

    try {
      const [study, series] = await Promise.all([
        orthancClient.get(`/dicom-web/studies/${studyUID}`),
        orthancClient.get(`/dicom-web/studies/${studyUID}/series`),
      ]);

      return {
        study: study.data[0],
        series: series.data,
      };
    } catch (error) {
      throw new Error('Failed to retrieve study details');
    }
  });

  // Get series details
  fastify.get('/studies/:studyUID/series/:seriesUID', { preHandler: authenticate }, async (request) => {
    const { studyUID, seriesUID } = request.params as { studyUID: string; seriesUID: string };

    try {
      const [series, instances] = await Promise.all([
        orthancClient.get(`/dicom-web/studies/${studyUID}/series/${seriesUID}`),
        orthancClient.get(`/dicom-web/studies/${studyUID}/series/${seriesUID}/instances`),
      ]);

      return {
        series: series.data[0],
        instances: instances.data,
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
        const response = await orthancClient.get(
          `/dicom-web/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/metadata`
        );

        return {
          metadata: response.data,
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
      // Convert base64 to buffer
      const dicomBuffer = Buffer.from(dicomData, 'base64');

      const response = await orthancClient.post('/instances', dicomBuffer, {
        headers: {
          'Content-Type': 'application/dicom',
        },
      });

      return {
        message: 'DICOM instance stored successfully',
        orthancId: response.data.ID,
        status: response.data.Status,
      };
    } catch (error) {
      fastify.log.error('DICOM store error:', error);
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
      // Implementation depends on Orthanc worklist plugin configuration
      const response = await orthancClient.post('/tools/create-dicom', {
        Tags: worklistItem,
        PrivateCreator: 'RADRIS',
      });

      return {
        message: 'Worklist entry created successfully',
        worklistId: response.data.ID,
      };
    } catch (error) {
      fastify.log.error('Worklist creation error:', error);
      throw new Error('Failed to create worklist entry');
    }
  });

  // Synchronize examination with PACS
  fastify.post('/sync-examination/:examinationId', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };

    try {
      // Get examination details
      const examination = await fastify.prisma.examination.findUnique({
        where: { id: examinationId },
        include: {
          patient: true,
        },
      });

      if (!examination) {
        throw new Error('Examination not found');
      }

      // Search for corresponding DICOM study
      if (examination.studyInstanceUID) {
        try {
          const response = await orthancClient.get(`/dicom-web/studies/${examination.studyInstanceUID}`);
          
          if (response.data && response.data.length > 0) {
            // Update examination with DICOM availability
            await fastify.prisma.examination.update({
              where: { id: examinationId },
              data: {
                imagesAvailable: true,
                status: examination.status === 'SCHEDULED' ? 'ACQUIRED' : examination.status,
              },
            });

            return {
              message: 'Examination synchronized with PACS',
              imagesAvailable: true,
              study: response.data[0],
            };
          }
        } catch (dicomError) {
          // Study not found in PACS
          return {
            message: 'No corresponding DICOM study found',
            imagesAvailable: false,
          };
        }
      }

      return {
        message: 'No StudyInstanceUID available for synchronization',
        imagesAvailable: false,
      };
    } catch (error) {
      fastify.log.error('PACS sync error:', error);
      throw new Error('Failed to synchronize examination with PACS');
    }
  });

  // Get viewer configuration for examination
  fastify.get('/viewer-config/:examinationId', { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params as { examinationId: string };

    try {
      const examination = await fastify.prisma.examination.findUnique({
        where: { id: examinationId },
        select: {
          studyInstanceUID: true,
          modality: true,
          accessionNumber: true,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              birthDate: true,
            },
          },
        },
      });

      if (!examination || !examination.studyInstanceUID) {
        throw new Error('Study not available for viewing');
      }

      return {
        studyInstanceUID: examination.studyInstanceUID,
        wadoRsRoot: `${orthancUrl}/dicom-web`,
        ohifViewerUrl: `http://localhost:3005/viewer?StudyInstanceUIDs=${examination.studyInstanceUID}`,
        orthancViewerUrl: `${orthancUrl}/app/explorer.html#study?uuid=${examination.studyInstanceUID}`,
        stoneViewerUrl: `${orthancUrl}/ui/app/stone-webviewer/index.html?study=${examination.studyInstanceUID}`,
        patient: examination.patient,
        modality: examination.modality,
        accessionNumber: examination.accessionNumber,
      };
    } catch (error) {
      throw new Error('Failed to get viewer configuration');
    }
  });
};
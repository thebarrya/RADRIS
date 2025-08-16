import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuthHandler } from '../utils/auth';

const createExaminationSchema = z.object({
  patientId: z.string(),
  scheduledDate: z.string().transform((str) => new Date(str)),
  modality: z.enum(['CR', 'CT', 'MR', 'US', 'MG', 'RF', 'DX', 'NM', 'PT', 'XA']),
  examType: z.string(),
  bodyPart: z.string(),
  procedure: z.string(),
  contrast: z.boolean().default(false),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY']).default('NORMAL'),
  clinicalInfo: z.string().optional(),
  preparation: z.string().optional(),
  referrerId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateExaminationSchema = createExaminationSchema.partial().extend({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'ACQUIRED', 'REPORTING', 'VALIDATED', 'CANCELLED', 'EMERGENCY']).optional(),
  accessionTime: z.string().transform((str) => new Date(str)).optional(),
  acquisitionTime: z.string().transform((str) => new Date(str)).optional(),
  completedAt: z.string().transform((str) => new Date(str)).optional(),
  studyInstanceUID: z.string().optional(),
  imagesAvailable: z.boolean().optional(),
  locked: z.boolean().optional(),
  lockReason: z.string().optional(),
  comments: z.array(z.string()).optional(),
});

const worklistParamsSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('25'),
  status: z.string().optional(),
  modality: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  query: z.string().optional(),
  sortBy: z.string().default('scheduledDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const examinationRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = createAuthHandler();

  // Generate unique accession number
  const generateAccessionNumber = async (): Promise<string> => {
    const prefix = new Date().getFullYear().toString().slice(-2);
    const date = new Date().toISOString().slice(5, 10).replace('-', '');
    
    let counter = 1;
    let accessionNumber: string;
    
    do {
      const counterStr = counter.toString().padStart(4, '0');
      accessionNumber = `${prefix}${date}${counterStr}`;
      
      const existing = await fastify.prisma.examination.findUnique({
        where: { accessionNumber },
      });
      
      if (!existing) break;
      counter++;
    } while (counter < 10000);
    
    return accessionNumber;
  };

  // Get worklist with advanced filtering
  fastify.get('/worklist', { preHandler: authenticate }, async (request) => {
    const params = worklistParamsSchema.parse(request.query);
    const { page, limit, status, modality, priority, assignedTo, dateFrom, dateTo, query, sortBy, sortOrder } = params;
    
    const skip = (page - 1) * limit;
    const where: any = {};

    // Status filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // Modality filter
    if (modality && modality !== 'all') {
      where.modality = modality;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    // Assigned user filter
    if (assignedTo && assignedTo !== 'all') {
      where.assignedToId = assignedTo;
    }

    // Date range filter
    if (dateFrom) {
      where.scheduledDate = { ...where.scheduledDate, gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.scheduledDate = { ...where.scheduledDate, lte: new Date(dateTo) };
    }

    // Text search
    if (query) {
      where.OR = [
        { accessionNumber: { contains: query, mode: 'insensitive' } },
        { patient: { firstName: { contains: query, mode: 'insensitive' } } },
        { patient: { lastName: { contains: query, mode: 'insensitive' } } },
        { examType: { contains: query, mode: 'insensitive' } },
        { procedure: { contains: query, mode: 'insensitive' } },
      ];
    }

    const [examinations, total] = await Promise.all([
      fastify.prisma.examination.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              birthDate: true,
              gender: true,
              warnings: true,
              allergies: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          referrer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          reports: {
            select: {
              id: true,
              status: true,
              validatedAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      fastify.prisma.examination.count({ where }),
    ]);

    return {
      examinations: examinations.map(exam => ({
        ...exam,
        patient: {
          ...exam.patient,
          age: new Date().getFullYear() - new Date(exam.patient.birthDate).getFullYear(),
        },
        currentReport: exam.reports[0] || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  });

  // Get examination by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    const examination = await fastify.prisma.examination.findUnique({
      where: { id },
      include: {
        patient: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reports: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            validatedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!examination) {
      throw new Error('Examination not found');
    }

    return {
      examination: {
        ...examination,
        patient: {
          ...examination.patient,
          age: new Date().getFullYear() - new Date(examination.patient.birthDate).getFullYear(),
        },
      },
    };
  });

  // Create examination
  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = createExaminationSchema.parse(request.body);
    let userId = (request.user as any)?.userId;

    // En développement, utiliser l'admin par défaut si pas d'utilisateur authentifié
    if (!userId && process.env.NODE_ENV === 'development') {
      const defaultUser = await fastify.prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });
      userId = defaultUser?.id;
    }

    if (!userId) {
      throw new Error('User authentication required');
    }

    const accessionNumber = await generateAccessionNumber();

    const examination = await fastify.prisma.examination.create({
      data: {
        ...data,
        accessionNumber,
        createdById: userId,
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
            warnings: true,
            allergies: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Broadcast WebSocket update (if available)
    if (fastify.websocket) {
      fastify.websocket.broadcastExaminationUpdate(
        examination.id, 
        {
          ...examination,
          patient: {
            ...examination.patient,
            age: new Date().getFullYear() - new Date(examination.patient.birthDate).getFullYear(),
          }
        }, 
        'created'
      );
    }

    return { examination };
  });

  // Update examination
  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const data = updateExaminationSchema.parse(request.body);

    // If changing status to ACQUIRED, set acquisition time
    if (data.status === 'ACQUIRED' && !data.acquisitionTime) {
      data.acquisitionTime = new Date();
    }

    // If changing status to VALIDATED, set completed time
    if (data.status === 'VALIDATED' && !data.completedAt) {
      data.completedAt = new Date();
    }

    const examination = await fastify.prisma.examination.update({
      where: { id },
      data,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
            warnings: true,
            allergies: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reports: {
          select: {
            id: true,
            status: true,
            validatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Broadcast WebSocket update (if available)
    if (fastify.websocket) {
      fastify.websocket.broadcastExaminationUpdate(
        examination.id, 
        {
          ...examination,
          patient: {
            ...examination.patient,
            age: new Date().getFullYear() - new Date(examination.patient.birthDate).getFullYear(),
          },
          currentReport: examination.reports[0] || null,
        }, 
        'updated'
      );
    }

    return { examination };
  });

  // Delete examination
  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    // Get examination data before deletion for WebSocket broadcast
    const examination = await fastify.prisma.examination.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await fastify.prisma.examination.delete({
      where: { id },
    });

    // Broadcast WebSocket update (if available)
    if (fastify.websocket && examination) {
      fastify.websocket.broadcastExaminationDeleted(
        examination.id,
        {
          patientName: `${examination.patient.firstName} ${examination.patient.lastName}`,
          accessionNumber: examination.accessionNumber,
        }
      );
    }

    return { message: 'Examination deleted successfully' };
  });

  // Bulk actions
  fastify.post('/bulk-action', { preHandler: authenticate }, async (request) => {
    const schema = z.object({
      action: z.enum(['assign', 'change-status', 'change-priority', 'cancel']),
      examinationIds: z.array(z.string()),
      data: z.record(z.any()).optional(),
    });

    const { action, examinationIds, data } = schema.parse(request.body);

    let updateData: any = {};

    switch (action) {
      case 'assign':
        updateData = { assignedToId: data?.assignedToId };
        break;
      case 'change-status':
        updateData = { status: data?.status };
        break;
      case 'change-priority':
        updateData = { priority: data?.priority };
        break;
      case 'cancel':
        updateData = { status: 'CANCELLED' };
        break;
    }

    const result = await fastify.prisma.examination.updateMany({
      where: { id: { in: examinationIds } },
      data: updateData,
    });

    // Fetch updated examinations for broadcasting
    const updatedExaminations = await fastify.prisma.examination.findMany({
      where: { id: { in: examinationIds } },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
            warnings: true,
            allergies: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        reports: {
          select: {
            id: true,
            status: true,
            validatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Broadcast updates for each examination (if WebSocket is available)
    if (fastify.websocket) {
      updatedExaminations.forEach(examination => {
        fastify.websocket.broadcastExaminationUpdate(
          examination.id,
          {
            ...examination,
            patient: {
              ...examination.patient,
              age: new Date().getFullYear() - new Date(examination.patient.birthDate).getFullYear(),
            },
            currentReport: examination.reports[0] || null,
          },
          'updated'
        );
      });
    }

    return {
      message: `Bulk action '${action}' applied to ${result.count} examinations`,
      count: result.count,
    };
  });

  // Get annotations for examination
  fastify.get('/:id/annotations', { preHandler: authenticate }, async (request) => {
    const { id: examinationId } = request.params as { id: string };
    
    try {
      // For now, return empty annotations as the feature is being developed
      // In the future, this would fetch annotations from the database
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

  // Get statistics
  fastify.get('/stats/dashboard', { preHandler: authenticate }, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todayExams,
      pendingReports,
      statusDistribution,
      modalityStats,
      avgReportingTime,
    ] = await Promise.all([
      // Today's exams
      fastify.prisma.examination.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Pending reports
      fastify.prisma.examination.count({
        where: {
          status: 'REPORTING',
        },
      }),
      // Status distribution
      fastify.prisma.examination.groupBy({
        by: ['status'],
        _count: true,
        where: {
          scheduledDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      // Modality stats
      fastify.prisma.examination.groupBy({
        by: ['modality'],
        _count: true,
        where: {
          scheduledDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      // Average reporting time (placeholder)
      fastify.prisma.examination.findMany({
        where: {
          status: 'VALIDATED',
          acquisitionTime: { not: null },
          completedAt: { not: null },
        },
        select: {
          acquisitionTime: true,
          completedAt: true,
        },
        take: 100,
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    // Calculate average reporting time
    const reportingTimes = avgReportingTime
      .filter(exam => exam.acquisitionTime && exam.completedAt)
      .map(exam => 
        (exam.completedAt!.getTime() - exam.acquisitionTime!.getTime()) / (1000 * 60 * 60) // hours
      );
    
    const avgHours = reportingTimes.length > 0 
      ? reportingTimes.reduce((sum, time) => sum + time, 0) / reportingTimes.length
      : 0;

    return {
      todayExams,
      pendingReports,
      avgReportingTime: avgHours,
      statusDistribution: statusDistribution.map(item => ({
        status: item.status,
        count: item._count,
      })),
      modalityStats: modalityStats.map(item => ({
        modality: item.modality,
        count: item._count,
      })),
    };
  });
};
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createReportSchema = z.object({
  examinationId: z.string(),
  templateId: z.string().optional(),
  indication: z.string().optional(),
  technique: z.string().optional(),
  findings: z.string().optional(),
  impression: z.string().optional(),
  recommendation: z.string().optional(),
  ccamCodes: z.array(z.string()).default([]),
  cim10Codes: z.array(z.string()).default([]),
  adicapCodes: z.array(z.string()).default([]),
});

const updateReportSchema = createReportSchema.partial().extend({
  status: z.enum(['DRAFT', 'PRELIMINARY', 'FINAL', 'AMENDED']).optional(),
});

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };

  // Get reports with filtering
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const paramsSchema = z.object({
      page: z.string().transform(Number).default('1'),
      limit: z.string().transform(Number).default('25'),
      status: z.string().optional(),
      examinationId: z.string().optional(),
      createdById: z.string().optional(),
      sortBy: z.string().default('createdAt'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    });

    const { page, limit, status, examinationId, createdById, sortBy, sortOrder } = paramsSchema.parse(request.query);
    
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (examinationId) {
      where.examinationId = examinationId;
    }

    if (createdById) {
      where.createdById = createdById;
    }

    const [reports, total] = await Promise.all([
      fastify.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          examination: {
            select: {
              id: true,
              accessionNumber: true,
              modality: true,
              examType: true,
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                  birthDate: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          validatedBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      }),
      fastify.prisma.report.count({ where }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total,
      },
    };
  });

  // Get report by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    const report = await fastify.prisma.report.findUnique({
      where: { id },
      include: {
        examination: {
          include: {
            patient: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        validatedBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return { report };
  });

  // Create report
  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = createReportSchema.parse(request.body);
    const { userId } = request.user as any;

    // Check if examination exists and user has permission
    const examination = await fastify.prisma.examination.findUnique({
      where: { id: data.examinationId },
      select: { id: true, status: true, assignedToId: true },
    });

    if (!examination) {
      throw new Error('Examination not found');
    }

    // Update examination status to REPORTING if not already
    if (examination.status === 'ACQUIRED') {
      await fastify.prisma.examination.update({
        where: { id: data.examinationId },
        data: { status: 'REPORTING' },
      });
    }

    const report = await fastify.prisma.report.create({
      data: {
        ...data,
        createdById: userId,
        draftedAt: new Date(),
      },
      include: {
        examination: {
          select: {
            accessionNumber: true,
            modality: true,
            examType: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Broadcast WebSocket update (if available)
    if (fastify.websocket) {
      fastify.websocket.broadcastReportCreated(
        report.id,
        report,
        data.examinationId
      );
    }

    return { report };
  });

  // Update report
  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const data = updateReportSchema.parse(request.body);

    const report = await fastify.prisma.report.update({
      where: { id },
      data,
      include: {
        examination: {
          select: {
            accessionNumber: true,
            modality: true,
            examType: true,
          },
        },
      },
    });

    // Broadcast WebSocket update (if available)
    if (fastify.websocket) {
      fastify.websocket.broadcastReportUpdate(
        report.id,
        report,
        report.examinationId
      );
    }

    return { report };
  });

  // Validate report (senior radiologist action)
  fastify.post('/:id/validate', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.user as any;

    // Check if user has permission to validate
    if (!['RADIOLOGIST_SENIOR', 'ADMIN'].includes(role)) {
      throw new Error('Insufficient permissions to validate reports');
    }

    const bodySchema = z.object({
      status: z.enum(['PRELIMINARY', 'FINAL']).default('FINAL'),
      comments: z.string().optional(),
    });

    const { status, comments } = bodySchema.parse(request.body);

    const report = await fastify.prisma.report.update({
      where: { id },
      data: {
        status,
        validatedById: userId,
        validatedAt: new Date(),
      },
      include: {
        examination: true,
      },
    });

    // Update examination status to VALIDATED
    await fastify.prisma.examination.update({
      where: { id: report.examinationId },
      data: { 
        status: 'VALIDATED',
        completedAt: new Date(),
      },
    });

    // Add validation comment if provided
    if (comments) {
      await fastify.prisma.examination.update({
        where: { id: report.examinationId },
        data: {
          comments: {
            push: `Validation: ${comments}`,
          },
        },
      });
    }

    // Broadcast WebSocket update (if available)
    if (fastify.websocket) {
      fastify.websocket.broadcastReportValidated(
        report.id,
        report,
        report.examinationId,
        userId
      );
    }

    return { report };
  });

  // Delete report
  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    const report = await fastify.prisma.report.findUnique({
      where: { id },
      select: { examinationId: true, status: true },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Don't allow deletion of validated reports
    if (report.status === 'FINAL') {
      throw new Error('Cannot delete validated reports');
    }

    await fastify.prisma.report.delete({
      where: { id },
    });

    // Update examination status back to ACQUIRED if this was the only report
    const remainingReports = await fastify.prisma.report.count({
      where: { examinationId: report.examinationId },
    });

    if (remainingReports === 0) {
      await fastify.prisma.examination.update({
        where: { id: report.examinationId },
        data: { status: 'ACQUIRED' },
      });
    }

    return { message: 'Report deleted successfully' };
  });

  // Get report templates
  fastify.get('/templates', { preHandler: authenticate }, async (request) => {
    const paramsSchema = z.object({
      modality: z.string().optional(),
      examType: z.string().optional(),
    });

    const { modality, examType } = paramsSchema.parse(request.query);
    const where: any = { active: true };

    if (modality) {
      where.modality = modality;
    }

    if (examType) {
      where.examType = { contains: examType, mode: 'insensitive' };
    }

    const templates = await fastify.prisma.reportTemplate.findMany({
      where,
      orderBy: [
        { modality: 'asc' },
        { examType: 'asc' },
        { name: 'asc' },
      ],
    });

    return { templates };
  });

  // Create report template
  fastify.post('/templates', { preHandler: authenticate }, async (request) => {
    const templateSchema = z.object({
      name: z.string().min(2),
      modality: z.enum(['CR', 'CT', 'MR', 'US', 'MG', 'RF', 'DX', 'NM', 'PT', 'XA']),
      examType: z.string(),
      indication: z.string().optional(),
      technique: z.string().optional(),
      findings: z.string().optional(),
      impression: z.string().optional(),
    });

    const data = templateSchema.parse(request.body);

    const template = await fastify.prisma.reportTemplate.create({
      data,
    });

    return { template };
  });

  // Update report template
  fastify.put('/templates/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    
    const templateSchema = z.object({
      name: z.string().min(2).optional(),
      modality: z.enum(['CR', 'CT', 'MR', 'US', 'MG', 'RF', 'DX', 'NM', 'PT', 'XA']).optional(),
      examType: z.string().optional(),
      indication: z.string().optional(),
      technique: z.string().optional(),
      findings: z.string().optional(),
      impression: z.string().optional(),
      active: z.boolean().optional(),
    });

    const data = templateSchema.parse(request.body);

    const template = await fastify.prisma.reportTemplate.update({
      where: { id },
      data,
    });

    return { template };
  });

  // Get reporting statistics
  fastify.get('/stats/reporting', { preHandler: authenticate }, async () => {
    const [
      totalReports,
      draftReports,
      pendingValidation,
      validatedReports,
      averageReportingTime,
      reportsByModality,
    ] = await Promise.all([
      fastify.prisma.report.count(),
      fastify.prisma.report.count({ where: { status: 'DRAFT' } }),
      fastify.prisma.report.count({ where: { status: 'PRELIMINARY' } }),
      fastify.prisma.report.count({ where: { status: 'FINAL' } }),
      // Calculate average time from draft to validation
      fastify.prisma.report.findMany({
        where: {
          status: 'FINAL',
          draftedAt: { not: null },
          validatedAt: { not: null },
        },
        select: {
          draftedAt: true,
          validatedAt: true,
        },
        take: 100,
        orderBy: { validatedAt: 'desc' },
      }),
      // Reports by modality (using findMany instead of groupBy since groupBy doesn't support include)
      fastify.prisma.report.findMany({
        select: {
          id: true,
          examination: {
            select: { modality: true },
          },
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    // Calculate average reporting time
    const reportingTimes = averageReportingTime
      .filter(report => report.draftedAt && report.validatedAt)
      .map(report => 
        (report.validatedAt!.getTime() - report.draftedAt!.getTime()) / (1000 * 60 * 60) // hours
      );
    
    const avgHours = reportingTimes.length > 0 
      ? reportingTimes.reduce((sum, time) => sum + time, 0) / reportingTimes.length
      : 0;

    return {
      totalReports,
      draftReports,
      pendingValidation,
      validatedReports,
      averageReportingTime: avgHours,
      reportsByModality,
    };
  });
};
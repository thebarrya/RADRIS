import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createPatientSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  birthDate: z.string().transform((str) => new Date(str)),
  gender: z.enum(['M', 'F', 'OTHER']),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  socialSecurity: z.string().optional(),
  insuranceNumber: z.string().optional(),
  emergencyContact: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  medicalHistory: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

const updatePatientSchema = createPatientSchema.partial();

const searchParamsSchema = z.object({
  query: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('25'),
  sortBy: z.string().default('lastName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const patientRoutes: FastifyPluginAsync = async (fastify) => {
  // Authentication middleware
  const authenticate = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };

  // Get all patients with search and pagination
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { query, page, limit, sortBy, sortOrder } = searchParamsSchema.parse(request.query);
    
    const skip = (page - 1) * limit;
    
    const where: any = { active: true };
    
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { socialSecurity: { contains: query } },
      ];
    }

    const [patients, total] = await Promise.all([
      fastify.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          phoneNumber: true,
          email: true,
          socialSecurity: true,
          warnings: true,
          createdAt: true,
          _count: {
            select: {
              examinations: true,
            },
          },
        },
      }),
      fastify.prisma.patient.count({ where }),
    ]);

    return {
      patients: patients.map(patient => ({
        ...patient,
        age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear(),
        examinationCount: patient._count.examinations,
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

  // Get patient by ID
  fastify.get('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    const patient = await fastify.prisma.patient.findUnique({
      where: { id },
      include: {
        examinations: {
          select: {
            id: true,
            accessionNumber: true,
            scheduledDate: true,
            status: true,
            modality: true,
            examType: true,
            createdAt: true,
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patient || !patient.active) {
      throw new Error('Patient not found');
    }

    return {
      patient: {
        ...patient,
        age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear(),
      },
    };
  });

  // Create patient
  fastify.post('/', { preHandler: authenticate }, async (request) => {
    const data = createPatientSchema.parse(request.body);
    const { userId } = request.user as any;

    const patient = await fastify.prisma.patient.create({
      data: {
        ...data,
        createdById: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        phoneNumber: true,
        email: true,
        socialSecurity: true,
        createdAt: true,
      },
    });

    return { patient };
  });

  // Update patient
  fastify.put('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };
    const data = updatePatientSchema.parse(request.body);

    const patient = await fastify.prisma.patient.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        gender: true,
        phoneNumber: true,
        email: true,
        socialSecurity: true,
        updatedAt: true,
      },
    });

    return { patient };
  });

  // Soft delete patient
  fastify.delete('/:id', { preHandler: authenticate }, async (request) => {
    const { id } = request.params as { id: string };

    await fastify.prisma.patient.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Patient deactivated successfully' };
  });

  // Advanced search
  fastify.post('/search', { preHandler: authenticate }, async (request) => {
    const searchSchema = z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      birthDate: z.string().optional(),
      gender: z.enum(['M', 'F', 'OTHER']).optional(),
      phoneNumber: z.string().optional(),
      socialSecurity: z.string().optional(),
      ageRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      hasWarnings: z.boolean().optional(),
      page: z.number().default(1),
      limit: z.number().default(25),
    });

    const params = searchSchema.parse(request.body);
    const { page, limit, ageRange, hasWarnings, ...searchFields } = params;
    
    const skip = (page - 1) * limit;
    const where: any = { active: true };

    // Add search conditions with proper field handling
    Object.entries(searchFields).forEach(([key, value]) => {
      if (value) {
        // Handle different field types appropriately
        if (key === 'gender') {
          // Enum field - exact match
          where[key] = value;
        } else if (key === 'birthDate') {
          // Date field - exact match for specific date
          where[key] = new Date(value);
        } else {
          // Text fields - case insensitive contains
          where[key] = { contains: value, mode: 'insensitive' };
        }
      }
    });

    // Age range filter
    if (ageRange?.min || ageRange?.max) {
      const currentYear = new Date().getFullYear();
      if (ageRange.max) {
        where.birthDate = { ...where.birthDate, gte: new Date(`${currentYear - ageRange.max}-01-01`) };
      }
      if (ageRange.min) {
        where.birthDate = { ...where.birthDate, lte: new Date(`${currentYear - ageRange.min}-12-31`) };
      }
    }

    // Warnings filter
    if (hasWarnings !== undefined) {
      where.warnings = hasWarnings ? { not: { equals: [] } } : { equals: [] };
    }

    const [patients, total] = await Promise.all([
      fastify.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          phoneNumber: true,
          email: true,
          warnings: true,
          _count: { select: { examinations: true } },
        },
      }),
      fastify.prisma.patient.count({ where }),
    ]);

    return {
      patients: patients.map(patient => ({
        ...patient,
        age: new Date().getFullYear() - new Date(patient.birthDate).getFullYear(),
        examinationCount: patient._count.examinations,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
};
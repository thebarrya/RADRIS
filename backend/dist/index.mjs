// src/index.ts
import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt2 from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient as PrismaClient4 } from "@prisma/client";
import Redis from "ioredis";

// src/routes/auth.ts
import bcrypt from "bcryptjs";
import { z } from "zod";
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
var registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["ADMIN", "RADIOLOGIST_SENIOR", "RADIOLOGIST_JUNIOR", "TECHNICIAN", "SECRETARY"]).optional()
});
var authRoutes = async (fastify2) => {
  fastify2.post("/login", async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const user = await fastify2.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          password: true,
          active: true
        }
      });
      if (!user || !user.active) {
        fastify2.log.warn({ email }, "Failed login attempt - user not found or inactive");
        return reply.status(401).send({
          error: "Invalid credentials",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        fastify2.log.warn({ email, userId: user.id }, "Failed login attempt - invalid password");
        return reply.status(401).send({
          error: "Invalid credentials",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      fastify2.log.info({ email, userId: user.id, role: user.role }, "User logged in successfully");
      const token = fastify2.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        { expiresIn: "24h" }
      );
      await fastify2.redis.setex(
        `session:${user.id}`,
        24 * 60 * 60,
        // 24 hours
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          loginTime: (/* @__PURE__ */ new Date()).toISOString()
        })
      );
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      };
    } catch (error) {
      fastify2.log.error({ error: error.message, stack: error.stack }, "Login error");
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Invalid request data",
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return reply.status(500).send({
        error: "Internal server error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  fastify2.post("/register", async (request, reply) => {
    try {
      const { email, password, firstName, lastName, role } = registerSchema.parse(request.body);
      const existingUser = await fastify2.prisma.user.findUnique({
        where: { email }
      });
      if (existingUser) {
        return reply.status(409).send({ error: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await fastify2.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || "TECHNICIAN"
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true
        }
      });
      return { user };
    } catch (error) {
      fastify2.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: "Invalid request data", details: error.errors });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
  fastify2.get("/me", {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    }
  }, async (request) => {
    const { userId } = request.user;
    const user = await fastify2.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return { user };
  });
  fastify2.post("/logout", {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    }
  }, async (request) => {
    const { userId } = request.user;
    await fastify2.redis.del(`session:${userId}`);
    return { message: "Logged out successfully" };
  });
};

// src/routes/patients.ts
import { z as z2 } from "zod";

// src/utils/auth.ts
var createAuthHandler = () => {
  return async (request, reply) => {
    if (process.env.NODE_ENV === "development") {
      return;
    }
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
};

// src/routes/patients.ts
var createPatientSchema = z2.object({
  firstName: z2.string().min(2),
  lastName: z2.string().min(2),
  birthDate: z2.string().transform((str) => new Date(str)),
  gender: z2.enum(["M", "F", "OTHER"]),
  phoneNumber: z2.string().optional(),
  email: z2.string().email().optional(),
  address: z2.string().optional(),
  city: z2.string().optional(),
  zipCode: z2.string().optional(),
  socialSecurity: z2.string().optional(),
  insuranceNumber: z2.string().optional(),
  emergencyContact: z2.string().optional(),
  allergies: z2.array(z2.string()).default([]),
  medicalHistory: z2.array(z2.string()).default([]),
  warnings: z2.array(z2.string()).default([])
});
var updatePatientSchema = createPatientSchema.partial();
var searchParamsSchema = z2.object({
  query: z2.string().optional(),
  page: z2.string().transform(Number).default("1"),
  limit: z2.string().transform(Number).default("25"),
  sortBy: z2.string().default("lastName"),
  sortOrder: z2.enum(["asc", "desc"]).default("asc")
});
var patientRoutes = async (fastify2) => {
  const authenticate = createAuthHandler();
  fastify2.get("/", { preHandler: authenticate }, async (request) => {
    const { query, page, limit, sortBy, sortOrder } = searchParamsSchema.parse(request.query);
    const skip = (page - 1) * limit;
    const where = { active: true };
    if (query) {
      where.OR = [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { socialSecurity: { contains: query } }
      ];
    }
    const [patients, total] = await Promise.all([
      fastify2.prisma.patient.findMany({
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
              examinations: true
            }
          }
        }
      }),
      fastify2.prisma.patient.count({ where })
    ]);
    return {
      patients: patients.map((patient) => ({
        ...patient,
        age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(patient.birthDate).getFullYear(),
        examinationCount: patient._count.examinations
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    };
  });
  fastify2.get("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const patient = await fastify2.prisma.patient.findUnique({
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
            studyInstanceUID: true,
            imagesAvailable: true,
            createdAt: true
          },
          orderBy: { scheduledDate: "desc" },
          take: 10
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    if (!patient || !patient.active) {
      throw new Error("Patient not found");
    }
    return {
      patient: {
        ...patient,
        age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(patient.birthDate).getFullYear()
      }
    };
  });
  fastify2.post("/", { preHandler: authenticate }, async (request) => {
    const data = createPatientSchema.parse(request.body);
    let userId = request.user?.userId;
    if (!userId && process.env.NODE_ENV === "development") {
      const defaultUser = await fastify2.prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true }
      });
      userId = defaultUser?.id;
    }
    if (!userId) {
      throw new Error("User authentication required");
    }
    const patient = await fastify2.prisma.patient.create({
      data: {
        ...data,
        createdById: userId
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
        createdAt: true
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastPatientUpdate(
        patient.id,
        {
          ...patient,
          age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(patient.birthDate).getFullYear()
        },
        "created"
      );
    }
    return { patient };
  });
  fastify2.put("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const data = updatePatientSchema.parse(request.body);
    const patient = await fastify2.prisma.patient.update({
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
        updatedAt: true
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastPatientUpdate(
        patient.id,
        {
          ...patient,
          age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(patient.birthDate).getFullYear()
        },
        "updated"
      );
    }
    return { patient };
  });
  fastify2.delete("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    await fastify2.prisma.patient.update({
      where: { id },
      data: { active: false }
    });
    return { message: "Patient deactivated successfully" };
  });
  fastify2.post("/search", { preHandler: authenticate }, async (request) => {
    const searchSchema = z2.object({
      firstName: z2.string().optional(),
      lastName: z2.string().optional(),
      birthDate: z2.string().optional(),
      gender: z2.enum(["M", "F", "OTHER"]).optional(),
      phoneNumber: z2.string().optional(),
      socialSecurity: z2.string().optional(),
      ageRange: z2.object({
        min: z2.number().optional(),
        max: z2.number().optional()
      }).optional(),
      hasWarnings: z2.boolean().optional(),
      page: z2.number().default(1),
      limit: z2.number().default(25)
    });
    const params = searchSchema.parse(request.body);
    const { page, limit, ageRange, hasWarnings, ...searchFields } = params;
    const skip = (page - 1) * limit;
    const where = { active: true };
    Object.entries(searchFields).forEach(([key, value]) => {
      if (value) {
        if (key === "gender") {
          where[key] = value;
        } else if (key === "birthDate") {
          where[key] = new Date(value);
        } else {
          where[key] = { contains: value, mode: "insensitive" };
        }
      }
    });
    if (ageRange?.min || ageRange?.max) {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      if (ageRange.max) {
        where.birthDate = { ...where.birthDate, gte: /* @__PURE__ */ new Date(`${currentYear - ageRange.max}-01-01`) };
      }
      if (ageRange.min) {
        where.birthDate = { ...where.birthDate, lte: /* @__PURE__ */ new Date(`${currentYear - ageRange.min}-12-31`) };
      }
    }
    if (hasWarnings !== void 0) {
      where.warnings = hasWarnings ? { not: { equals: [] } } : { equals: [] };
    }
    const [patients, total] = await Promise.all([
      fastify2.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: "asc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          phoneNumber: true,
          email: true,
          warnings: true,
          _count: { select: { examinations: true } }
        }
      }),
      fastify2.prisma.patient.count({ where })
    ]);
    return {
      patients: patients.map((patient) => ({
        ...patient,
        age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(patient.birthDate).getFullYear(),
        examinationCount: patient._count.examinations
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  });
};

// src/routes/examinations.ts
import { z as z3 } from "zod";
var createExaminationSchema = z3.object({
  patientId: z3.string(),
  scheduledDate: z3.string().transform((str) => new Date(str)),
  modality: z3.enum(["CR", "CT", "MR", "US", "MG", "RF", "DX", "NM", "PT", "XA"]),
  examType: z3.string(),
  bodyPart: z3.string(),
  procedure: z3.string(),
  contrast: z3.boolean().default(false),
  priority: z3.enum(["LOW", "NORMAL", "HIGH", "URGENT", "EMERGENCY"]).default("NORMAL"),
  clinicalInfo: z3.string().optional(),
  preparation: z3.string().optional(),
  referrerId: z3.string().optional(),
  assignedToId: z3.string().optional()
});
var updateExaminationSchema = createExaminationSchema.partial().extend({
  status: z3.enum(["SCHEDULED", "IN_PROGRESS", "ACQUIRED", "REPORTING", "VALIDATED", "CANCELLED", "EMERGENCY"]).optional(),
  accessionTime: z3.string().transform((str) => new Date(str)).optional(),
  acquisitionTime: z3.string().transform((str) => new Date(str)).optional(),
  completedAt: z3.string().transform((str) => new Date(str)).optional(),
  studyInstanceUID: z3.string().optional(),
  imagesAvailable: z3.boolean().optional(),
  locked: z3.boolean().optional(),
  lockReason: z3.string().optional(),
  comments: z3.array(z3.string()).optional()
});
var worklistParamsSchema = z3.object({
  page: z3.string().transform(Number).default("1"),
  limit: z3.string().transform(Number).default("25"),
  status: z3.string().optional(),
  modality: z3.string().optional(),
  priority: z3.string().optional(),
  assignedTo: z3.string().optional(),
  dateFrom: z3.string().optional(),
  dateTo: z3.string().optional(),
  query: z3.string().optional(),
  sortBy: z3.string().default("scheduledDate"),
  sortOrder: z3.enum(["asc", "desc"]).default("desc")
});
var examinationRoutes = async (fastify2) => {
  const authenticate = createAuthHandler();
  const generateAccessionNumber = async () => {
    const prefix = (/* @__PURE__ */ new Date()).getFullYear().toString().slice(-2);
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(5, 10).replace("-", "");
    let counter = 1;
    let accessionNumber;
    do {
      const counterStr = counter.toString().padStart(4, "0");
      accessionNumber = `${prefix}${date}${counterStr}`;
      const existing = await fastify2.prisma.examination.findUnique({
        where: { accessionNumber }
      });
      if (!existing)
        break;
      counter++;
    } while (counter < 1e4);
    return accessionNumber;
  };
  fastify2.get("/worklist", { preHandler: authenticate }, async (request) => {
    const params = worklistParamsSchema.parse(request.query);
    const { page, limit, status, modality, priority, assignedTo, dateFrom, dateTo, query, sortBy, sortOrder } = params;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (modality && modality !== "all") {
      where.modality = modality;
    }
    if (priority && priority !== "all") {
      where.priority = priority;
    }
    if (assignedTo && assignedTo !== "all") {
      where.assignedToId = assignedTo;
    }
    if (dateFrom) {
      where.scheduledDate = { ...where.scheduledDate, gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.scheduledDate = { ...where.scheduledDate, lte: new Date(dateTo) };
    }
    if (query) {
      where.OR = [
        { accessionNumber: { contains: query, mode: "insensitive" } },
        { patient: { firstName: { contains: query, mode: "insensitive" } } },
        { patient: { lastName: { contains: query, mode: "insensitive" } } },
        { examType: { contains: query, mode: "insensitive" } },
        { procedure: { contains: query, mode: "insensitive" } }
      ];
    }
    const [examinations, total] = await Promise.all([
      fastify2.prisma.examination.findMany({
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
              allergies: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          referrer: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          reports: {
            select: {
              id: true,
              status: true,
              validatedAt: true
            },
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }),
      fastify2.prisma.examination.count({ where })
    ]);
    return {
      examinations: examinations.map((exam) => ({
        ...exam,
        patient: {
          ...exam.patient,
          age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(exam.patient.birthDate).getFullYear()
        },
        currentReport: exam.reports[0] || null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    };
  });
  fastify2.get("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const examination = await fastify2.prisma.examination.findUnique({
      where: { id },
      include: {
        patient: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        reports: {
          include: {
            createdBy: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            validatedBy: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!examination) {
      throw new Error("Examination not found");
    }
    return {
      examination: {
        ...examination,
        patient: {
          ...examination.patient,
          age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(examination.patient.birthDate).getFullYear()
        }
      }
    };
  });
  fastify2.post("/", { preHandler: authenticate }, async (request) => {
    const data = createExaminationSchema.parse(request.body);
    let userId = request.user?.userId;
    if (!userId && process.env.NODE_ENV === "development") {
      const defaultUser = await fastify2.prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true }
      });
      userId = defaultUser?.id;
    }
    if (!userId) {
      throw new Error("User authentication required");
    }
    const accessionNumber = await generateAccessionNumber();
    const examination = await fastify2.prisma.examination.create({
      data: {
        ...data,
        accessionNumber,
        createdById: userId
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
            warnings: true,
            allergies: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastExaminationUpdate(
        examination.id,
        {
          ...examination,
          patient: {
            ...examination.patient,
            age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(examination.patient.birthDate).getFullYear()
          }
        },
        "created"
      );
    }
    return { examination };
  });
  fastify2.put("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const data = updateExaminationSchema.parse(request.body);
    if (data.status === "ACQUIRED" && !data.acquisitionTime) {
      data.acquisitionTime = /* @__PURE__ */ new Date();
    }
    if (data.status === "VALIDATED" && !data.completedAt) {
      data.completedAt = /* @__PURE__ */ new Date();
    }
    const examination = await fastify2.prisma.examination.update({
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
            allergies: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        reports: {
          select: {
            id: true,
            status: true,
            validatedAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastExaminationUpdate(
        examination.id,
        {
          ...examination,
          patient: {
            ...examination.patient,
            age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(examination.patient.birthDate).getFullYear()
          },
          currentReport: examination.reports[0] || null
        },
        "updated"
      );
    }
    return { examination };
  });
  fastify2.delete("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const examination = await fastify2.prisma.examination.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    await fastify2.prisma.examination.delete({
      where: { id }
    });
    if (fastify2.websocket && examination) {
      fastify2.websocket.broadcastExaminationDeleted(
        examination.id,
        {
          patientName: `${examination.patient.firstName} ${examination.patient.lastName}`,
          accessionNumber: examination.accessionNumber
        }
      );
    }
    return { message: "Examination deleted successfully" };
  });
  fastify2.post("/bulk-action", { preHandler: authenticate }, async (request) => {
    const schema = z3.object({
      action: z3.enum(["assign", "change-status", "change-priority", "cancel"]),
      examinationIds: z3.array(z3.string()),
      data: z3.record(z3.any()).optional()
    });
    const { action, examinationIds, data } = schema.parse(request.body);
    let updateData = {};
    switch (action) {
      case "assign":
        updateData = { assignedToId: data?.assignedToId };
        break;
      case "change-status":
        updateData = { status: data?.status };
        break;
      case "change-priority":
        updateData = { priority: data?.priority };
        break;
      case "cancel":
        updateData = { status: "CANCELLED" };
        break;
    }
    const result = await fastify2.prisma.examination.updateMany({
      where: { id: { in: examinationIds } },
      data: updateData
    });
    const updatedExaminations = await fastify2.prisma.examination.findMany({
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
            allergies: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        referrer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        reports: {
          select: {
            id: true,
            status: true,
            validatedAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
    if (fastify2.websocket) {
      updatedExaminations.forEach((examination) => {
        fastify2.websocket.broadcastExaminationUpdate(
          examination.id,
          {
            ...examination,
            patient: {
              ...examination.patient,
              age: (/* @__PURE__ */ new Date()).getFullYear() - new Date(examination.patient.birthDate).getFullYear()
            },
            currentReport: examination.reports[0] || null
          },
          "updated"
        );
      });
    }
    return {
      message: `Bulk action '${action}' applied to ${result.count} examinations`,
      count: result.count
    };
  });
  fastify2.get("/:id/annotations", { preHandler: authenticate }, async (request) => {
    const { id: examinationId } = request.params;
    try {
      return {
        success: true,
        annotations: [],
        examinationId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get annotations",
        annotations: []
      };
    }
  });
  fastify2.get("/stats/dashboard", { preHandler: authenticate }, async () => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      todayExams,
      pendingReports,
      statusDistribution,
      modalityStats,
      avgReportingTime
    ] = await Promise.all([
      // Today's exams
      fastify2.prisma.examination.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      // Pending reports
      fastify2.prisma.examination.count({
        where: {
          status: "REPORTING"
        }
      }),
      // Status distribution
      fastify2.prisma.examination.groupBy({
        by: ["status"],
        _count: true,
        where: {
          scheduledDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3)
            // Last 7 days
          }
        }
      }),
      // Modality stats
      fastify2.prisma.examination.groupBy({
        by: ["modality"],
        _count: true,
        where: {
          scheduledDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3)
            // Last 30 days
          }
        }
      }),
      // Average reporting time (placeholder)
      fastify2.prisma.examination.findMany({
        where: {
          status: "VALIDATED",
          acquisitionTime: { not: null },
          completedAt: { not: null }
        },
        select: {
          acquisitionTime: true,
          completedAt: true
        },
        take: 100,
        orderBy: { completedAt: "desc" }
      })
    ]);
    const reportingTimes = avgReportingTime.filter((exam) => exam.acquisitionTime && exam.completedAt).map(
      (exam) => (exam.completedAt.getTime() - exam.acquisitionTime.getTime()) / (1e3 * 60 * 60)
      // hours
    );
    const avgHours = reportingTimes.length > 0 ? reportingTimes.reduce((sum, time) => sum + time, 0) / reportingTimes.length : 0;
    return {
      todayExams,
      pendingReports,
      avgReportingTime: avgHours,
      statusDistribution: statusDistribution.map((item) => ({
        status: item.status,
        count: item._count
      })),
      modalityStats: modalityStats.map((item) => ({
        modality: item.modality,
        count: item._count
      }))
    };
  });
};

// src/routes/reports.ts
import { z as z4 } from "zod";
var createReportSchema = z4.object({
  examinationId: z4.string(),
  templateId: z4.string().optional(),
  indication: z4.string().optional(),
  technique: z4.string().optional(),
  findings: z4.string().optional(),
  impression: z4.string().optional(),
  recommendation: z4.string().optional(),
  ccamCodes: z4.array(z4.string()).default([]),
  cim10Codes: z4.array(z4.string()).default([]),
  adicapCodes: z4.array(z4.string()).default([])
});
var updateReportSchema = createReportSchema.partial().extend({
  status: z4.enum(["DRAFT", "PRELIMINARY", "FINAL", "AMENDED"]).optional()
});
var reportRoutes = async (fastify2) => {
  const authenticate = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
  fastify2.get("/", { preHandler: authenticate }, async (request) => {
    const paramsSchema = z4.object({
      page: z4.string().transform(Number).default("1"),
      limit: z4.string().transform(Number).default("25"),
      status: z4.string().optional(),
      examinationId: z4.string().optional(),
      createdById: z4.string().optional(),
      sortBy: z4.string().default("createdAt"),
      sortOrder: z4.enum(["asc", "desc"]).default("desc")
    });
    const { page, limit, status, examinationId, createdById, sortBy, sortOrder } = paramsSchema.parse(request.query);
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (examinationId) {
      where.examinationId = examinationId;
    }
    if (createdById) {
      where.createdById = createdById;
    }
    const [reports, total] = await Promise.all([
      fastify2.prisma.report.findMany({
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
                  birthDate: true
                }
              }
            }
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          },
          validatedBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      }),
      fastify2.prisma.report.count({ where })
    ]);
    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    };
  });
  fastify2.get("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const report = await fastify2.prisma.report.findUnique({
      where: { id },
      include: {
        examination: {
          include: {
            patient: true,
            assignedTo: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        validatedBy: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });
    if (!report) {
      throw new Error("Report not found");
    }
    return { report };
  });
  fastify2.post("/", { preHandler: authenticate }, async (request) => {
    const data = createReportSchema.parse(request.body);
    const { userId } = request.user;
    const examination = await fastify2.prisma.examination.findUnique({
      where: { id: data.examinationId },
      select: { id: true, status: true, assignedToId: true }
    });
    if (!examination) {
      throw new Error("Examination not found");
    }
    if (examination.status === "ACQUIRED") {
      await fastify2.prisma.examination.update({
        where: { id: data.examinationId },
        data: { status: "REPORTING" }
      });
    }
    const report = await fastify2.prisma.report.create({
      data: {
        ...data,
        createdById: userId,
        draftedAt: /* @__PURE__ */ new Date()
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
                lastName: true
              }
            }
          }
        }
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastReportCreated(
        report.id,
        report,
        data.examinationId
      );
    }
    return { report };
  });
  fastify2.put("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const data = updateReportSchema.parse(request.body);
    const report = await fastify2.prisma.report.update({
      where: { id },
      data,
      include: {
        examination: {
          select: {
            accessionNumber: true,
            modality: true,
            examType: true
          }
        }
      }
    });
    if (fastify2.websocket) {
      fastify2.websocket.broadcastReportUpdate(
        report.id,
        report,
        report.examinationId
      );
    }
    return { report };
  });
  fastify2.post("/:id/validate", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const { userId, role } = request.user;
    if (!["RADIOLOGIST_SENIOR", "ADMIN"].includes(role)) {
      throw new Error("Insufficient permissions to validate reports");
    }
    const bodySchema = z4.object({
      status: z4.enum(["PRELIMINARY", "FINAL"]).default("FINAL"),
      comments: z4.string().optional()
    });
    const { status, comments } = bodySchema.parse(request.body);
    const report = await fastify2.prisma.report.update({
      where: { id },
      data: {
        status,
        validatedById: userId,
        validatedAt: /* @__PURE__ */ new Date()
      },
      include: {
        examination: true
      }
    });
    await fastify2.prisma.examination.update({
      where: { id: report.examinationId },
      data: {
        status: "VALIDATED",
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    if (comments) {
      await fastify2.prisma.examination.update({
        where: { id: report.examinationId },
        data: {
          comments: {
            push: `Validation: ${comments}`
          }
        }
      });
    }
    if (fastify2.websocket) {
      fastify2.websocket.broadcastReportValidated(
        report.id,
        report,
        report.examinationId,
        userId
      );
    }
    return { report };
  });
  fastify2.delete("/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const report = await fastify2.prisma.report.findUnique({
      where: { id },
      select: { examinationId: true, status: true }
    });
    if (!report) {
      throw new Error("Report not found");
    }
    if (report.status === "FINAL") {
      throw new Error("Cannot delete validated reports");
    }
    await fastify2.prisma.report.delete({
      where: { id }
    });
    const remainingReports = await fastify2.prisma.report.count({
      where: { examinationId: report.examinationId }
    });
    if (remainingReports === 0) {
      await fastify2.prisma.examination.update({
        where: { id: report.examinationId },
        data: { status: "ACQUIRED" }
      });
    }
    return { message: "Report deleted successfully" };
  });
  fastify2.get("/templates", { preHandler: authenticate }, async (request) => {
    const paramsSchema = z4.object({
      modality: z4.string().optional(),
      examType: z4.string().optional()
    });
    const { modality, examType } = paramsSchema.parse(request.query);
    const where = { active: true };
    if (modality) {
      where.modality = modality;
    }
    if (examType) {
      where.examType = { contains: examType, mode: "insensitive" };
    }
    const templates = await fastify2.prisma.reportTemplate.findMany({
      where,
      orderBy: [
        { modality: "asc" },
        { examType: "asc" },
        { name: "asc" }
      ]
    });
    return { templates };
  });
  fastify2.post("/templates", { preHandler: authenticate }, async (request) => {
    const templateSchema = z4.object({
      name: z4.string().min(2),
      modality: z4.enum(["CR", "CT", "MR", "US", "MG", "RF", "DX", "NM", "PT", "XA"]),
      examType: z4.string(),
      indication: z4.string().optional(),
      technique: z4.string().optional(),
      findings: z4.string().optional(),
      impression: z4.string().optional()
    });
    const data = templateSchema.parse(request.body);
    const template = await fastify2.prisma.reportTemplate.create({
      data
    });
    return { template };
  });
  fastify2.put("/templates/:id", { preHandler: authenticate }, async (request) => {
    const { id } = request.params;
    const templateSchema = z4.object({
      name: z4.string().min(2).optional(),
      modality: z4.enum(["CR", "CT", "MR", "US", "MG", "RF", "DX", "NM", "PT", "XA"]).optional(),
      examType: z4.string().optional(),
      indication: z4.string().optional(),
      technique: z4.string().optional(),
      findings: z4.string().optional(),
      impression: z4.string().optional(),
      active: z4.boolean().optional()
    });
    const data = templateSchema.parse(request.body);
    const template = await fastify2.prisma.reportTemplate.update({
      where: { id },
      data
    });
    return { template };
  });
  fastify2.get("/stats/reporting", { preHandler: authenticate }, async () => {
    const [
      totalReports,
      draftReports,
      pendingValidation,
      validatedReports,
      averageReportingTime,
      reportsByModality
    ] = await Promise.all([
      fastify2.prisma.report.count(),
      fastify2.prisma.report.count({ where: { status: "DRAFT" } }),
      fastify2.prisma.report.count({ where: { status: "PRELIMINARY" } }),
      fastify2.prisma.report.count({ where: { status: "FINAL" } }),
      // Calculate average time from draft to validation
      fastify2.prisma.report.findMany({
        where: {
          status: "FINAL",
          draftedAt: { not: null },
          validatedAt: { not: null }
        },
        select: {
          draftedAt: true,
          validatedAt: true
        },
        take: 100,
        orderBy: { validatedAt: "desc" }
      }),
      // Reports by modality (using findMany instead of groupBy since groupBy doesn't support include)
      fastify2.prisma.report.findMany({
        select: {
          id: true,
          examination: {
            select: { modality: true }
          }
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3)
            // Last 30 days
          }
        }
      })
    ]);
    const reportingTimes = averageReportingTime.filter((report) => report.draftedAt && report.validatedAt).map(
      (report) => (report.validatedAt.getTime() - report.draftedAt.getTime()) / (1e3 * 60 * 60)
      // hours
    );
    const avgHours = reportingTimes.length > 0 ? reportingTimes.reduce((sum, time) => sum + time, 0) / reportingTimes.length : 0;
    return {
      totalReports,
      draftReports,
      pendingValidation,
      validatedReports,
      averageReportingTime: avgHours,
      reportsByModality
    };
  });
};

// src/routes/dicom.ts
import { z as z5 } from "zod";

// src/services/dicom.ts
import axios from "axios";
var DicomService = class {
  constructor(orthancUrl = process.env.ORTHANC_URL || "http://orthanc:8042") {
    this.baseUrl = orthancUrl;
    this.orthancClient = axios.create({
      baseURL: orthancUrl,
      timeout: 3e4,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
  }
  // System Information
  async getSystemInfo() {
    try {
      const response = await this.orthancClient.get("/system");
      return response.data;
    } catch (error) {
      console.error("Error fetching Orthanc system info:", error);
      throw new Error("Failed to connect to PACS system");
    }
  }
  // Patient Operations
  async getAllPatients() {
    try {
      const response = await this.orthancClient.get("/patients");
      const patientIds = response.data;
      const patients = await Promise.all(
        patientIds.map(async (id) => {
          const patientData = await this.orthancClient.get(`/patients/${id}`);
          return {
            ID: id,
            PatientID: patientData.data.MainDicomTags?.PatientID || "",
            PatientName: patientData.data.MainDicomTags?.PatientName || "",
            PatientBirthDate: patientData.data.MainDicomTags?.PatientBirthDate,
            PatientSex: patientData.data.MainDicomTags?.PatientSex,
            Studies: patientData.data.Studies || []
          };
        })
      );
      return patients;
    } catch (error) {
      console.error("Error fetching patients:", error);
      throw new Error("Failed to fetch patients from PACS");
    }
  }
  async getPatientById(patientId) {
    try {
      const response = await this.orthancClient.get(`/patients/${patientId}`);
      const data = response.data;
      return {
        ID: patientId,
        PatientID: data.MainDicomTags?.PatientID || "",
        PatientName: data.MainDicomTags?.PatientName || "",
        PatientBirthDate: data.MainDicomTags?.PatientBirthDate,
        PatientSex: data.MainDicomTags?.PatientSex,
        Studies: data.Studies || []
      };
    } catch (error) {
      console.error(`Error fetching patient ${patientId}:`, error);
      return null;
    }
  }
  async findPatientByPatientId(patientId) {
    try {
      const response = await this.orthancClient.post("/tools/find", {
        Level: "Patient",
        Query: {
          PatientID: patientId
        }
      });
      const orthancIds = response.data;
      const patients = await Promise.all(
        orthancIds.map(async (id) => {
          return await this.getPatientById(id);
        })
      );
      return patients.filter((p) => p !== null);
    } catch (error) {
      console.error(`Error finding patient with ID ${patientId}:`, error);
      return [];
    }
  }
  // Study Operations
  async getAllStudies() {
    try {
      const response = await this.orthancClient.get("/studies");
      const studyIds = response.data;
      const studies = await Promise.all(
        studyIds.map(async (id) => {
          const studyData = await this.orthancClient.get(`/studies/${id}`);
          const data = studyData.data;
          return {
            ID: id,
            StudyInstanceUID: data.MainDicomTags?.StudyInstanceUID || "",
            PatientID: data.PatientMainDicomTags?.PatientID || "",
            PatientName: data.PatientMainDicomTags?.PatientName || "",
            StudyDate: data.MainDicomTags?.StudyDate || "",
            StudyTime: data.MainDicomTags?.StudyTime || "",
            StudyDescription: data.MainDicomTags?.StudyDescription || "",
            AccessionNumber: data.MainDicomTags?.AccessionNumber || "",
            ModalitiesInStudy: data.MainDicomTags?.ModalitiesInStudy?.split("\\") || [],
            NumberOfStudyRelatedSeries: data.Series?.length || 0,
            NumberOfStudyRelatedInstances: data.Instances?.length || 0
          };
        })
      );
      return studies;
    } catch (error) {
      console.error("Error fetching studies:", error);
      throw new Error("Failed to fetch studies from PACS");
    }
  }
  async getStudyById(studyId) {
    try {
      const response = await this.orthancClient.get(`/studies/${studyId}`);
      const data = response.data;
      return {
        ID: studyId,
        StudyInstanceUID: data.MainDicomTags?.StudyInstanceUID || "",
        PatientID: data.PatientMainDicomTags?.PatientID || "",
        PatientName: data.PatientMainDicomTags?.PatientName || "",
        StudyDate: data.MainDicomTags?.StudyDate || "",
        StudyTime: data.MainDicomTags?.StudyTime || "",
        StudyDescription: data.MainDicomTags?.StudyDescription || "",
        AccessionNumber: data.MainDicomTags?.AccessionNumber || "",
        ModalitiesInStudy: data.MainDicomTags?.ModalitiesInStudy?.split("\\") || [],
        NumberOfStudyRelatedSeries: data.Series?.length || 0,
        NumberOfStudyRelatedInstances: data.Instances?.length || 0
      };
    } catch (error) {
      console.error(`Error fetching study ${studyId}:`, error);
      return null;
    }
  }
  async findStudiesByAccessionNumber(accessionNumber) {
    try {
      const response = await this.orthancClient.post("/tools/find", {
        Level: "Study",
        Query: {
          AccessionNumber: accessionNumber
        }
      });
      const studyIds = response.data;
      const studies = await Promise.all(
        studyIds.map(async (id) => {
          return await this.getStudyById(id);
        })
      );
      return studies.filter((s) => s !== null);
    } catch (error) {
      console.error(`Error finding studies with accession number ${accessionNumber}:`, error);
      return [];
    }
  }
  async findStudiesByPatientId(patientId) {
    try {
      const response = await this.orthancClient.post("/tools/find", {
        Level: "Study",
        Query: {
          PatientID: patientId
        }
      });
      const studyIds = response.data;
      const studies = await Promise.all(
        studyIds.map(async (id) => {
          return await this.getStudyById(id);
        })
      );
      return studies.filter((s) => s !== null);
    } catch (error) {
      console.error(`Error finding studies for patient ${patientId}:`, error);
      return [];
    }
  }
  // Series Operations
  async getSeriesForStudy(studyId) {
    try {
      const response = await this.orthancClient.get(`/studies/${studyId}`);
      const seriesIds = response.data.Series || [];
      const series = await Promise.all(
        seriesIds.map(async (id) => {
          const seriesData = await this.orthancClient.get(`/series/${id}`);
          const data = seriesData.data;
          return {
            ID: id,
            SeriesInstanceUID: data.MainDicomTags?.SeriesInstanceUID || "",
            SeriesNumber: data.MainDicomTags?.SeriesNumber || "",
            SeriesDescription: data.MainDicomTags?.SeriesDescription || "",
            Modality: data.MainDicomTags?.Modality || "",
            SeriesDate: data.MainDicomTags?.SeriesDate || "",
            SeriesTime: data.MainDicomTags?.SeriesTime || "",
            NumberOfSeriesRelatedInstances: data.Instances?.length || 0
          };
        })
      );
      return series;
    } catch (error) {
      console.error(`Error fetching series for study ${studyId}:`, error);
      return [];
    }
  }
  // Instance Operations
  async getInstancesForSeries(seriesId) {
    try {
      const response = await this.orthancClient.get(`/series/${seriesId}`);
      const instanceIds = response.data.Instances || [];
      const instances = await Promise.all(
        instanceIds.map(async (id) => {
          const instanceData = await this.orthancClient.get(`/instances/${id}`);
          const data = instanceData.data;
          return {
            ID: id,
            SOPInstanceUID: data.MainDicomTags?.SOPInstanceUID || "",
            InstanceNumber: data.MainDicomTags?.InstanceNumber || "",
            ImagePositionPatient: data.MainDicomTags?.ImagePositionPatient,
            ImageOrientationPatient: data.MainDicomTags?.ImageOrientationPatient,
            PixelSpacing: data.MainDicomTags?.PixelSpacing,
            SliceThickness: data.MainDicomTags?.SliceThickness
          };
        })
      );
      return instances;
    } catch (error) {
      console.error(`Error fetching instances for series ${seriesId}:`, error);
      return [];
    }
  }
  // OHIF Integration
  getOhifViewerUrl(studyInstanceUID) {
    const baseOhifUrl = process.env.OHIF_VIEWER_URL || "http://localhost:3005/viewer";
    const params = new URLSearchParams({
      datasources: "dicomweb",
      StudyInstanceUIDs: studyInstanceUID
    });
    return `${baseOhifUrl}?${params.toString()}`;
  }
  // DICOMweb URLs for direct access (using CORS proxy for frontend compatibility)
  getDicomWebStudyUrl(studyInstanceUID) {
    const corsProxyUrl = process.env.ORTHANC_CORS_PROXY_URL || "http://localhost:8043";
    return `${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}`;
  }
  getDicomWebSeriesUrl(studyInstanceUID, seriesInstanceUID) {
    const corsProxyUrl = process.env.ORTHANC_CORS_PROXY_URL || "http://localhost:8043";
    return `${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}`;
  }
  // Get WADO-RS URLs for image retrieval
  getWadoRsInstanceUrl(studyInstanceUID, seriesInstanceUID, instanceUID) {
    const corsProxyUrl = process.env.ORTHANC_CORS_PROXY_URL || "http://localhost:8043";
    return `${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}/instances/${instanceUID}`;
  }
  // Get WADO-URI URL (legacy but widely supported)
  getWadoUriUrl(studyInstanceUID, seriesInstanceUID, instanceUID) {
    const corsProxyUrl = process.env.ORTHANC_CORS_PROXY_URL || "http://localhost:8043";
    let url = `${corsProxyUrl}/wado?requestType=WADO&studyUID=${studyInstanceUID}&contentType=application/dicom`;
    if (seriesInstanceUID) {
      url += `&seriesUID=${seriesInstanceUID}`;
    }
    if (instanceUID) {
      url += `&objectUID=${instanceUID}`;
    }
    return url;
  }
  // Get metadata for DICOMweb
  async getDicomWebStudyMetadata(studyInstanceUID) {
    try {
      const corsProxyUrl = process.env.ORTHANC_CORS_PROXY_URL || "http://localhost:8043";
      const response = await this.orthancClient.get(`${corsProxyUrl}/dicom-web/studies/${studyInstanceUID}/metadata`, {
        baseURL: "",
        // Override baseURL for this request
        headers: {
          "Accept": "application/dicom+json"
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching DICOMweb metadata for study ${studyInstanceUID}:`, error);
      throw new Error("Failed to fetch study metadata");
    }
  }
  // Utility Methods
  async testConnection() {
    try {
      await this.getSystemInfo();
      return true;
    } catch (error) {
      return false;
    }
  }
  formatDicomDate(dicomDate) {
    if (!dicomDate || dicomDate.length !== 8)
      return "";
    return `${dicomDate.substring(0, 4)}-${dicomDate.substring(4, 6)}-${dicomDate.substring(6, 8)}`;
  }
  formatDicomTime(dicomTime) {
    if (!dicomTime || dicomTime.length < 6)
      return "";
    return `${dicomTime.substring(0, 2)}:${dicomTime.substring(2, 4)}:${dicomTime.substring(4, 6)}`;
  }
  formatDicomDateTime(dicomDate, dicomTime) {
    try {
      const formattedDate = this.formatDicomDate(dicomDate);
      const formattedTime = this.formatDicomTime(dicomTime);
      if (!formattedDate)
        return null;
      const dateTimeString = formattedTime ? `${formattedDate}T${formattedTime}` : formattedDate;
      return new Date(dateTimeString);
    } catch (error) {
      console.error("Error formatting DICOM date/time:", error);
      return null;
    }
  }
};
var dicomService = new DicomService();

// src/services/dicomSync.ts
import { PrismaClient } from "@prisma/client";
var DicomSyncService = class {
  constructor(prisma2) {
    this.prisma = prisma2;
  }
  async syncExaminationById(examinationId) {
    const startTime = Date.now();
    try {
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
          error: "Examination not found",
          syncedAt: /* @__PURE__ */ new Date()
        };
      }
      let studies = [];
      if (examination.accessionNumber) {
        studies = await dicomService.findStudiesByAccessionNumber(examination.accessionNumber);
      }
      if (studies.length === 0 && examination.patient.socialSecurity) {
        studies = await dicomService.findStudiesByPatientId(examination.patient.socialSecurity);
        if (studies.length > 1) {
          const examDate = examination.scheduledDate.toISOString().split("T")[0].replace(/-/g, "");
          studies = studies.filter((study) => study.StudyDate === examDate);
        }
      }
      const updateData = {
        imagesAvailable: studies.length > 0,
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (studies.length === 1) {
        updateData.studyInstanceUID = studies[0].StudyInstanceUID;
        if (examination.status === "SCHEDULED") {
          updateData.status = "ACQUIRED";
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
        studyInstanceUID: studies.length === 1 ? studies[0].StudyInstanceUID : void 0,
        imagesAvailable: studies.length > 0,
        syncedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error(`Error syncing examination ${examinationId}:`, error);
      return {
        examinationId,
        success: false,
        studiesFound: 0,
        imagesAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
        syncedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  async syncExaminationsByIds(examinationIds) {
    const startTime = Date.now();
    const results = await Promise.all(
      examinationIds.map((id) => this.syncExaminationById(id))
    );
    const successfulSyncs = results.filter((r) => r.success).length;
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
  async syncAllPendingExaminations() {
    try {
      const examinations = await this.prisma.examination.findMany({
        where: {
          OR: [
            { studyInstanceUID: null },
            { imagesAvailable: false }
          ]
        },
        select: { id: true }
      });
      const examinationIds = examinations.map((e) => e.id);
      return await this.syncExaminationsByIds(examinationIds);
    } catch (error) {
      console.error("Error in bulk sync:", error);
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
  async syncExaminationsByDateRange(startDate, endDate) {
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
      const examinationIds = examinations.map((e) => e.id);
      return await this.syncExaminationsByIds(examinationIds);
    } catch (error) {
      console.error("Error in date range sync:", error);
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
  async getExaminationViewerConfig(examinationId) {
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
        throw new Error("Examination not found");
      }
      if (!examination.studyInstanceUID || !examination.imagesAvailable) {
        throw new Error("No DICOM images available for this examination");
      }
      const ohifViewerUrl = dicomService.getOhifViewerUrl(examination.studyInstanceUID);
      const dicomWebUrl = dicomService.getDicomWebStudyUrl(examination.studyInstanceUID);
      return {
        studyInstanceUID: examination.studyInstanceUID,
        imagesAvailable: examination.imagesAvailable,
        ohifViewerUrl,
        dicomWebUrl,
        wadoRsRoot: "http://localhost:8042/dicom-web",
        patient: examination.patient,
        modality: examination.modality,
        accessionNumber: examination.accessionNumber,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get viewer configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
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
      const syncPercentage = totalExaminations > 0 ? Math.round(examinationsWithImages / totalExaminations * 100) : 0;
      return {
        totalExaminations,
        examinationsWithImages,
        examinationsWithStudyUID,
        pendingSync,
        syncPercentage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async validateDicomConnection() {
    try {
      return await dicomService.testConnection();
    } catch (error) {
      return false;
    }
  }
  // Auto-discovery functionality
  async discoverNewStudies() {
    try {
      console.log("Starting auto-discovery of new DICOM studies...");
      const allStudies = await dicomService.getAllStudies();
      console.log(`Found ${allStudies.length} total studies in Orthanc`);
      const existingMappings = await this.prisma.examination.findMany({
        where: {
          studyInstanceUID: { not: null }
        },
        select: {
          studyInstanceUID: true
        }
      });
      const existingStudyUIDs = new Set(
        existingMappings.map((e) => e.studyInstanceUID).filter((uid) => uid !== null)
      );
      const newStudies = allStudies.filter(
        (study) => !existingStudyUIDs.has(study.StudyInstanceUID)
      );
      console.log(`Found ${newStudies.length} new studies to process`);
      const syncResults = [];
      const unmatchedStudies = [];
      let matchedExaminations = 0;
      for (const study of newStudies) {
        console.log(`Processing new study: ${study.StudyInstanceUID}`);
        const matchResult = await this.matchStudyToExamination(study);
        if (matchResult.matched) {
          console.log(`Matched study to examination: ${matchResult.examinationId}`);
          const syncResult = await this.linkStudyToExamination(
            matchResult.examinationId,
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
      console.error("Error in auto-discovery:", error);
      throw new Error(`Auto-discovery failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async matchStudyToExamination(study) {
    try {
      if (study.AccessionNumber) {
        const examination = await this.prisma.examination.findFirst({
          where: {
            accessionNumber: study.AccessionNumber,
            studyInstanceUID: null
            // Only match unlinked examinations
          },
          select: { id: true }
        });
        if (examination) {
          return {
            matched: true,
            examinationId: examination.id,
            matchMethod: "accession_number"
          };
        }
      }
      if (study.PatientID && study.StudyDate) {
        const studyDate = this.parseDicomDate(study.StudyDate);
        if (studyDate) {
          const examination = await this.prisma.examination.findFirst({
            where: {
              patient: {
                socialSecurity: study.PatientID
              },
              scheduledDate: {
                gte: new Date(studyDate.getTime() - 24 * 60 * 60 * 1e3),
                // 1 day before
                lte: new Date(studyDate.getTime() + 24 * 60 * 60 * 1e3)
                // 1 day after
              },
              studyInstanceUID: null
            },
            select: { id: true }
          });
          if (examination) {
            return {
              matched: true,
              examinationId: examination.id,
              matchMethod: "patient_id_and_date"
            };
          }
        }
      }
      if (study.PatientName && study.StudyDate) {
        const studyDate = this.parseDicomDate(study.StudyDate);
        const patientName = study.PatientName.replace(/\^/g, " ").trim();
        if (studyDate && patientName) {
          const examination = await this.prisma.examination.findFirst({
            where: {
              scheduledDate: {
                gte: new Date(studyDate.getTime() - 24 * 60 * 60 * 1e3),
                lte: new Date(studyDate.getTime() + 24 * 60 * 60 * 1e3)
              },
              studyInstanceUID: null,
              patient: {
                OR: [
                  {
                    firstName: {
                      contains: patientName.split(" ")[0],
                      mode: "insensitive"
                    }
                  },
                  {
                    lastName: {
                      contains: patientName.split(" ").slice(1).join(" "),
                      mode: "insensitive"
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
              matchMethod: "patient_name_and_date"
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
  async linkStudyToExamination(examinationId, studyInstanceUID) {
    try {
      await this.prisma.examination.update({
        where: { id: examinationId },
        data: {
          studyInstanceUID,
          imagesAvailable: true,
          status: "ACQUIRED",
          // Update status if it was SCHEDULED
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      return {
        examinationId,
        success: true,
        studiesFound: 1,
        studyInstanceUID,
        imagesAvailable: true,
        syncedAt: /* @__PURE__ */ new Date()
      };
    } catch (error) {
      console.error(`Error linking study to examination ${examinationId}:`, error);
      return {
        examinationId,
        success: false,
        studiesFound: 0,
        imagesAvailable: false,
        error: error instanceof Error ? error.message : "Unknown error",
        syncedAt: /* @__PURE__ */ new Date()
      };
    }
  }
  parseDicomDate(dicomDate) {
    try {
      if (!dicomDate || dicomDate.length !== 8)
        return null;
      const year = parseInt(dicomDate.substring(0, 4));
      const month = parseInt(dicomDate.substring(4, 6)) - 1;
      const day = parseInt(dicomDate.substring(6, 8));
      return new Date(year, month, day);
    } catch (error) {
      return null;
    }
  }
  // Scheduled auto-discovery (can be called periodically)
  async runScheduledAutoDiscovery() {
    try {
      console.log("Running scheduled auto-discovery...");
      const result = await this.discoverNewStudies();
      console.log(`Scheduled auto-discovery completed:`, {
        newStudiesFound: result.newStudiesFound,
        matchedExaminations: result.matchedExaminations,
        unmatchedStudies: result.unmatchedStudies.length
      });
      return {
        success: true,
        discoveryResult: result,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      console.error("Scheduled auto-discovery failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
  }
};
var dicomSyncService = new DicomSyncService(new PrismaClient());

// src/services/metadataSync.ts
import { PrismaClient as PrismaClient3 } from "@prisma/client";

// src/services/patientIdentification.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";
var PatientIdentificationService = class {
  constructor(prisma2, websocket) {
    this.prisma = prisma2;
    this.websocket = websocket;
    this.institutionCode = "RAD";
    // Code institution pour préfixe
    this.currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  }
  /**
   * Génère un identifiant patient universel (UPI)
   * Format: [INSTITUTION]-[YEAR]-[SEQUENTIAL]-[CHECKSUM]
   * Example: RAD-2025-000001-C4
   */
  async generateUPI(patientData) {
    try {
      const sequential = await this.getNextSequentialNumber();
      const checksum = this.calculateChecksum(patientData, sequential);
      const upi = `${this.institutionCode}-${this.currentYear}-${sequential.toString().padStart(6, "0")}-${checksum}`;
      console.log(`Generated UPI: ${upi} for ${patientData.firstName} ${patientData.lastName}`);
      return upi;
    } catch (error) {
      console.error("Error generating UPI:", error);
      throw new Error("Failed to generate Universal Patient Identifier");
    }
  }
  /**
   * Obtient le prochain numéro séquentiel pour l'année courante
   */
  async getNextSequentialNumber() {
    const lastPatient = await this.prisma.patient.findFirst({
      where: {
        socialSecurity: {
          startsWith: `${this.institutionCode}-${this.currentYear}-`
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    if (!lastPatient?.socialSecurity) {
      return 1;
    }
    const upiParts = lastPatient.socialSecurity.split("-");
    if (upiParts.length >= 3) {
      const lastSequential = parseInt(upiParts[2]);
      return lastSequential + 1;
    }
    return 1;
  }
  /**
   * Calcule un checksum pour valider l'intégrité de l'UPI
   */
  calculateChecksum(patientData, sequential) {
    const dataString = [
      patientData.firstName.toLowerCase(),
      patientData.lastName.toLowerCase(),
      patientData.birthDate.toISOString().split("T")[0],
      patientData.gender,
      sequential.toString()
    ].join("|");
    let sum = 0;
    for (let i = 0; i < dataString.length; i++) {
      sum += dataString.charCodeAt(i);
    }
    return (sum % 1296).toString(36).toUpperCase().padStart(2, "0");
  }
  /**
   * Valide un UPI existant
   */
  validateUPI(upi) {
    const upiRegex = /^[A-Z]{2,4}-\d{4}-\d{6}-[A-Z0-9]{2}$/;
    return upiRegex.test(upi);
  }
  /**
   * Crée un patient avec identifiants complets
   */
  async createPatientWithIdentifiers(patientData) {
    try {
      const upi = await this.generateUPI(patientData);
      const { createdById, ...patientCreateData } = patientData;
      const patient = await this.prisma.patient.create({
        data: {
          ...patientCreateData,
          socialSecurity: upi,
          // UPI stocké comme socialSecurity
          createdBy: {
            connect: { id: createdById }
          }
        }
      });
      const identifiers = {
        upi,
        internalId: patient.id,
        dicomPatientId: upi,
        // Utiliser UPI comme PatientID DICOM
        socialSecurity: upi,
        nationalId: void 0,
        // À remplir si fourni
        institutionId: patient.id
        // Fallback sur l'ID interne
      };
      await this.syncPatientToPACS(identifiers, patient);
      if (this.websocket) {
        this.websocket.broadcastPatientUpdate(patient.id, {
          ...patient,
          identifiers
        }, "created");
      }
      console.log(`Patient created with UPI: ${upi}`);
      return { patient, identifiers };
    } catch (error) {
      console.error("Error creating patient with identifiers:", error);
      throw new Error("Failed to create patient with identifiers");
    }
  }
  /**
   * Met à jour les identifiants d'un patient existant
   */
  async updatePatientIdentifiers(patientId, updates) {
    try {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId }
      });
      if (!patient) {
        throw new Error("Patient not found");
      }
      let upi = patient.socialSecurity;
      if (!upi || !this.validateUPI(upi)) {
        upi = await this.generateUPI({
          firstName: patient.firstName,
          lastName: patient.lastName,
          birthDate: patient.birthDate,
          gender: patient.gender
        });
      }
      const updatedPatient = await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          socialSecurity: upi,
          insuranceNumber: updates.insuranceNumber || patient.insuranceNumber
        }
      });
      const identifiers = {
        upi,
        internalId: patient.id,
        dicomPatientId: upi,
        socialSecurity: upi,
        nationalId: updates.nationalId,
        institutionId: patient.id
      };
      await this.syncPatientToPACS(identifiers, updatedPatient);
      return identifiers;
    } catch (error) {
      console.error("Error updating patient identifiers:", error);
      throw error;
    }
  }
  /**
   * Synchronise un patient vers PACS avec son UPI
   */
  async syncPatientToPACS(identifiers, patient) {
    try {
      console.log(`Prepared PACS sync for patient UPI: ${identifiers.upi}`);
      console.log("Patient Identifiers:", {
        upi: identifiers.upi,
        internalId: identifiers.internalId,
        dicomPatientId: identifiers.dicomPatientId
      });
    } catch (error) {
      console.error("Error syncing patient to PACS:", error);
    }
  }
  /**
   * Recherche un patient par n'importe quel identifiant
   */
  async findPatientByIdentifier(identifier) {
    try {
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
      const identifiers = {
        upi: patient.socialSecurity || patient.id,
        internalId: patient.id,
        dicomPatientId: patient.socialSecurity || patient.id,
        socialSecurity: patient.socialSecurity || void 0,
        nationalId: void 0,
        institutionId: patient.id
      };
      return { patient, identifiers };
    } catch (error) {
      console.error("Error finding patient by identifier:", error);
      return null;
    }
  }
  /**
   * Synchronise les identifiants avec le PACS existant
   */
  async syncWithExistingPACS() {
    const result = {
      synchronized: 0,
      conflicts: [],
      errors: []
    };
    try {
      const risPatients = await this.prisma.patient.findMany({
        where: { active: true }
      });
      const pacsStudies = await dicomService.getAllStudies();
      const pacsPatientIds = new Set(pacsStudies.map((s) => s.PatientID).filter((id) => id));
      for (const patient of risPatients) {
        try {
          let needsUpdate = false;
          let upi = patient.socialSecurity;
          if (!upi || !this.validateUPI(upi)) {
            upi = await this.generateUPI({
              firstName: patient.firstName,
              lastName: patient.lastName,
              birthDate: patient.birthDate,
              gender: patient.gender
            });
            needsUpdate = true;
          }
          if (pacsPatientIds.has(patient.socialSecurity || "") && patient.socialSecurity !== upi) {
            result.conflicts.push({
              upi,
              dicomPatientId: patient.socialSecurity || "",
              conflict: "DICOM PatientID differs from generated UPI"
            });
          }
          if (needsUpdate) {
            await this.prisma.patient.update({
              where: { id: patient.id },
              data: { socialSecurity: upi }
            });
            result.synchronized++;
          }
        } catch (error) {
          result.errors.push(`Failed to sync patient ${patient.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      if (this.websocket) {
        this.websocket.broadcastSystemNotification({
          message: `Patient ID synchronization completed: ${result.synchronized} patients updated`,
          level: "info"
        });
      }
      return result;
    } catch (error) {
      console.error("Error syncing with existing PACS:", error);
      result.errors.push(error instanceof Error ? error.message : "Unknown sync error");
      return result;
    }
  }
  /**
   * Obtient les statistiques d'identification
   */
  async getIdentificationStatistics() {
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
      const patientsWithUPI = await this.prisma.patient.findMany({
        where: {
          active: true,
          socialSecurity: { not: null }
        },
        select: { socialSecurity: true }
      });
      const patientsWithValidUPI = patientsWithUPI.filter(
        (p) => p.socialSecurity && this.validateUPI(p.socialSecurity)
      ).length;
      const pacsPatients = new Set(pacsStudies.map((s) => s.PatientID).filter((id) => id)).size;
      const coverage = totalPatients > 0 ? Math.round(patientsWithValidUPI / totalPatients * 100) : 0;
      return {
        totalPatients,
        patientsWithUPI: patientsWithSocialSecurity,
        patientsWithValidUPI,
        pacsPatients,
        synchronized: patientsWithValidUPI,
        // Patients avec UPI valide sont considérés synchronisés
        conflicts: patientsWithSocialSecurity - patientsWithValidUPI,
        // Patients avec SS invalide
        coverage
      };
    } catch (error) {
      console.error("Error getting identification statistics:", error);
      throw error;
    }
  }
  /**
   * Recherche des doublons potentiels
   */
  async findPotentialDuplicates() {
    try {
      const duplicates = [];
      const nameAndBirthMatches = await this.prisma.$queryRaw`
        SELECT firstName, lastName, birthDate, COUNT(*) as count, 
               ARRAY_AGG(id) as patient_ids
        FROM "patients" 
        WHERE active = true
        GROUP BY firstName, lastName, birthDate
        HAVING COUNT(*) > 1
      `;
      for (const match of nameAndBirthMatches) {
        const patients = await this.prisma.patient.findMany({
          where: {
            id: { in: match.patient_ids }
          }
        });
        duplicates.push({
          patients,
          matchType: "name_birthdate",
          confidence: 0.9
        });
      }
      return duplicates;
    } catch (error) {
      console.error("Error finding potential duplicates:", error);
      return [];
    }
  }
};
var patientIdentificationService = new PatientIdentificationService(new PrismaClient2());

// src/services/metadataSync.ts
var MetadataSyncService = class {
  constructor(prisma2, websocket) {
    this.prisma = prisma2;
    this.websocket = websocket;
  }
  // Main synchronization method
  async synchronizeMetadata() {
    const startTime = Date.now();
    const result = {
      success: true,
      patientsProcessed: 0,
      studiesProcessed: 0,
      patientsUpdated: 0,
      studiesLinked: 0,
      errors: [],
      timestamp: /* @__PURE__ */ new Date()
    };
    try {
      console.log("Starting comprehensive metadata synchronization...");
      const patientSyncResult = await this.syncPatientsFromPACS();
      result.patientsProcessed = patientSyncResult.processed;
      result.patientsUpdated = patientSyncResult.updated;
      result.errors.push(...patientSyncResult.errors);
      const studySyncResult = await this.syncStudiesFromPACS();
      result.studiesProcessed = studySyncResult.processed;
      result.studiesLinked = studySyncResult.linked;
      result.errors.push(...studySyncResult.errors);
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
      console.error("Critical error during metadata synchronization:", error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : "Unknown critical error");
      if (this.websocket) {
        this.websocket.broadcastDicomError({
          operation: "metadata synchronization",
          error: error instanceof Error ? error.message : "Unknown critical error",
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
  async syncPatientsFromPACS() {
    const result = { processed: 0, updated: 0, errors: [] };
    try {
      const studies = await dicomService.getAllStudies();
      const patientMap = /* @__PURE__ */ new Map();
      for (const study of studies) {
        result.processed++;
        if (!study.PatientID) {
          result.errors.push(`Study ${study.StudyInstanceUID} has no PatientID`);
          continue;
        }
        const patientData = {
          dicomPatientID: study.PatientID,
          dicomPatientName: study.PatientName || "Unknown",
          dicomBirthDate: study.PatientBirthDate || "",
          dicomSex: this.mapDicomSex(study.PatientSex || ""),
          firstName: this.extractFirstName(study.PatientName || ""),
          lastName: this.extractLastName(study.PatientName || ""),
          socialSecurity: study.PatientID,
          // Use PatientID as social security for matching
          birthDate: this.parseDicomDate(study.PatientBirthDate || "") || /* @__PURE__ */ new Date(),
          sex: this.mapDicomSex(study.PatientSex || "")
        };
        patientMap.set(study.PatientID, patientData);
      }
      for (const [patientID, patientData] of patientMap) {
        try {
          await this.syncIndividualPatient(patientData);
          result.updated++;
        } catch (error) {
          result.errors.push(`Failed to sync patient ${patientID}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to sync patients from PACS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return result;
  }
  async syncIndividualPatient(patientData) {
    try {
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
        const updateData = {};
        if (!existingPatient.socialSecurity && patientData.socialSecurity) {
          updateData.socialSecurity = patientData.socialSecurity;
        }
        if (!existingPatient.gender && patientData.sex) {
          updateData.gender = patientData.sex;
        }
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = /* @__PURE__ */ new Date();
          await this.prisma.patient.update({
            where: { id: existingPatient.id },
            data: updateData
          });
        }
      } else {
        const systemUser = await this.ensureSystemUser();
        if (this.websocket && !patientIdentificationService["websocket"]) {
          patientIdentificationService["websocket"] = this.websocket;
        }
        const result = await patientIdentificationService.createPatientWithIdentifiers({
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          birthDate: patientData.birthDate,
          gender: patientData.sex,
          createdById: systemUser.id
        });
        const newPatient = result.patient;
        if (this.websocket) {
          this.websocket.broadcastPatientUpdate(newPatient.id, {
            ...newPatient,
            identifiers: result.identifiers
          }, "created");
        }
      }
    } catch (error) {
      throw new Error(`Patient sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  // Sync studies and link to examinations
  async syncStudiesFromPACS() {
    const result = { processed: 0, linked: 0, errors: [] };
    try {
      const studies = await dicomService.getAllStudies();
      for (const study of studies) {
        result.processed++;
        try {
          const studyData = {
            studyInstanceUID: study.StudyInstanceUID,
            accessionNumber: study.AccessionNumber,
            studyDate: study.StudyDate || "",
            studyTime: study.StudyTime || "",
            studyDescription: study.StudyDescription || "",
            referringPhysician: study.ReferringPhysicianName || "",
            institutionName: study.InstitutionName || "",
            patientID: study.PatientID || "",
            scheduledDate: this.parseDicomDate(study.StudyDate || "") || void 0,
            modality: study.ModalitiesInStudy?.[0] || ""
          };
          const linked = await this.linkStudyToExamination(studyData);
          if (linked) {
            result.linked++;
          }
        } catch (error) {
          result.errors.push(`Failed to process study ${study.StudyInstanceUID}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to sync studies from PACS: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return result;
  }
  async linkStudyToExamination(studyData) {
    try {
      let examination = null;
      if (studyData.accessionNumber) {
        examination = await this.prisma.examination.findFirst({
          where: {
            accessionNumber: studyData.accessionNumber,
            studyInstanceUID: null
          }
        });
      }
      if (!examination && studyData.patientID && studyData.scheduledDate) {
        examination = await this.prisma.examination.findFirst({
          where: {
            patient: {
              socialSecurity: studyData.patientID
            },
            scheduledDate: {
              gte: new Date(studyData.scheduledDate.getTime() - 24 * 60 * 60 * 1e3),
              lte: new Date(studyData.scheduledDate.getTime() + 24 * 60 * 60 * 1e3)
            },
            studyInstanceUID: null
          }
        });
      }
      if (examination) {
        const updatedExamination = await this.prisma.examination.update({
          where: { id: examination.id },
          data: {
            studyInstanceUID: studyData.studyInstanceUID,
            imagesAvailable: true,
            status: "ACQUIRED",
            updatedAt: /* @__PURE__ */ new Date()
          },
          include: {
            patient: true
          }
        });
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
      throw new Error(`Failed to link study: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async updateExaminationsWithPACSMetadata() {
    const result = { errors: [] };
    try {
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
          if (!examination.studyInstanceUID)
            continue;
          const studies = await dicomService.getAllStudies();
          const pacsStudy = studies.find((s) => s.StudyInstanceUID === examination.studyInstanceUID);
          if (pacsStudy) {
            const updateData = {};
            if (!examination.accessionNumber && pacsStudy.AccessionNumber) {
              updateData.accessionNumber = pacsStudy.AccessionNumber;
            }
            if (pacsStudy.StudyDescription && pacsStudy.StudyDescription !== examination.modality) {
              updateData.notes = pacsStudy.StudyDescription;
            }
            if (Object.keys(updateData).length > 0) {
              updateData.updatedAt = /* @__PURE__ */ new Date();
              await this.prisma.examination.update({
                where: { id: examination.id },
                data: updateData
              });
            }
          }
        } catch (error) {
          result.errors.push(`Failed to update examination ${examination.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to update examinations with PACS metadata: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    return result;
  }
  // System user management
  async ensureSystemUser() {
    let systemUser = await this.prisma.user.findFirst({
      where: {
        email: "system@radris.local",
        role: "ADMIN"
      }
    });
    if (!systemUser) {
      systemUser = await this.prisma.user.create({
        data: {
          email: "system@radris.local",
          firstName: "System",
          lastName: "MetaSync",
          role: "ADMIN",
          active: true,
          password: "system_user_no_login",
          // This user cannot login
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    return systemUser;
  }
  // Utility methods
  extractFirstName(dicomPatientName) {
    if (!dicomPatientName)
      return "Unknown";
    const parts = dicomPatientName.split("^");
    return parts.length > 1 ? parts[1].trim() : parts[0].trim();
  }
  extractLastName(dicomPatientName) {
    if (!dicomPatientName)
      return "Unknown";
    const parts = dicomPatientName.split("^");
    return parts[0].trim();
  }
  parseDicomDate(dicomDate) {
    try {
      if (!dicomDate || dicomDate.length !== 8)
        return null;
      const year = parseInt(dicomDate.substring(0, 4));
      const month = parseInt(dicomDate.substring(4, 6)) - 1;
      const day = parseInt(dicomDate.substring(6, 8));
      return new Date(year, month, day);
    } catch (error) {
      return null;
    }
  }
  mapDicomSex(dicomSex) {
    switch (dicomSex.toUpperCase()) {
      case "M":
        return "M";
      case "F":
        return "F";
      case "O":
        return "OTHER";
      default:
        return "OTHER";
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
      const pacsStudies = await dicomService.getAllStudies();
      const uniquePatientsInPACS = new Set(pacsStudies.map((s) => s.PatientID).filter((id) => id)).size;
      return {
        ris: {
          totalPatients,
          totalExaminations,
          examinationsWithStudyUID,
          examinationsWithImages,
          patientsWithSocialSecurity,
          syncPercentage: totalExaminations > 0 ? Math.round(examinationsWithStudyUID / totalExaminations * 100) : 0
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get sync statistics: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
};
var metadataSyncService = new MetadataSyncService(new PrismaClient3());

// src/services/dicomMonitor.ts
var DicomMonitorService = class {
  // Check every 10 seconds
  constructor(websocket, onNewStudyCallback) {
    this.websocket = websocket;
    this.onNewStudyCallback = onNewStudyCallback;
    this.knownStudies = /* @__PURE__ */ new Set();
    this.monitoring = false;
    this.monitorInterval = null;
    this.checkIntervalMs = 1e4;
  }
  // Start monitoring for new DICOM studies
  async startMonitoring() {
    if (this.monitoring) {
      console.log("DICOM monitor already running");
      return;
    }
    console.log("Starting DICOM study monitor...");
    try {
      await this.initializeKnownStudies();
      this.monitoring = true;
      this.monitorInterval = setInterval(async () => {
        try {
          await this.checkForNewStudies();
        } catch (error) {
          console.error("Error during DICOM monitoring check:", error);
          if (this.websocket) {
            this.websocket.broadcastDicomError({
              operation: "DICOM monitoring",
              error: error instanceof Error ? error.message : "Unknown monitoring error",
              details: { monitoringActive: this.monitoring }
            });
          }
        }
      }, this.checkIntervalMs);
      console.log(`DICOM monitor started, checking every ${this.checkIntervalMs / 1e3} seconds`);
      if (this.websocket) {
        this.websocket.broadcastSystemNotification({
          message: "DICOM monitoring service started",
          level: "info"
        });
      }
    } catch (error) {
      console.error("Failed to start DICOM monitor:", error);
      throw error;
    }
  }
  // Stop monitoring
  stopMonitoring() {
    if (!this.monitoring) {
      return;
    }
    console.log("Stopping DICOM study monitor...");
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.monitoring = false;
    if (this.websocket) {
      this.websocket.broadcastSystemNotification({
        message: "DICOM monitoring service stopped",
        level: "info"
      });
    }
  }
  // Initialize known studies to prevent false alarms on startup
  async initializeKnownStudies() {
    try {
      const studies = await dicomService.getAllStudies();
      this.knownStudies.clear();
      studies.forEach((study) => {
        if (study.StudyInstanceUID) {
          this.knownStudies.add(study.StudyInstanceUID);
        }
      });
      console.log(`Initialized DICOM monitor with ${this.knownStudies.size} known studies`);
    } catch (error) {
      console.error("Failed to initialize known studies:", error);
      throw error;
    }
  }
  // Check for new studies and notify via WebSocket
  async checkForNewStudies() {
    try {
      const currentStudies = await dicomService.getAllStudies();
      const newStudies = [];
      for (const study of currentStudies) {
        if (study.StudyInstanceUID && !this.knownStudies.has(study.StudyInstanceUID)) {
          newStudies.push(study);
          this.knownStudies.add(study.StudyInstanceUID);
        }
      }
      if (newStudies.length > 0) {
        console.log(`Detected ${newStudies.length} new DICOM studies`);
        for (const study of newStudies) {
          await this.processNewStudy(study);
        }
      }
    } catch (error) {
      console.error("Error checking for new studies:", error);
      throw error;
    }
  }
  // Process a newly detected study
  async processNewStudy(study) {
    console.log(`Processing new study: ${study.StudyInstanceUID} for patient ${study.PatientName || study.PatientID}`);
    if (this.websocket) {
      this.websocket.broadcastDicomArrival({
        studyInstanceUID: study.StudyInstanceUID,
        patientName: study.PatientName || "Unknown Patient",
        patientID: study.PatientID || "Unknown ID",
        studyDescription: study.StudyDescription,
        modality: study.ModalitiesInStudy?.[0],
        studyDate: study.StudyDate,
        accessionNumber: study.AccessionNumber,
        institutionName: study.InstitutionName
      });
    }
    if (this.onNewStudyCallback) {
      try {
        await this.onNewStudyCallback(study);
      } catch (error) {
        console.error("Error in new study callback:", error);
      }
    }
  }
  // Get monitoring status
  getStatus() {
    return {
      monitoring: this.monitoring,
      knownStudiesCount: this.knownStudies.size,
      checkInterval: this.checkIntervalMs,
      lastCheck: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  // Update monitoring interval
  setCheckInterval(intervalMs) {
    if (intervalMs < 1e3) {
      throw new Error("Check interval must be at least 1000ms");
    }
    this.checkIntervalMs = intervalMs;
    if (this.monitoring) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }
  // Manual check for new studies
  async checkNow() {
    try {
      const beforeCount = this.knownStudies.size;
      await this.checkForNewStudies();
      const afterCount = this.knownStudies.size;
      return afterCount - beforeCount;
    } catch (error) {
      console.error("Error during manual check:", error);
      throw error;
    }
  }
  // Get list of known study UIDs
  getKnownStudies() {
    return Array.from(this.knownStudies);
  }
  // Reset known studies (useful for testing)
  resetKnownStudies() {
    this.knownStudies.clear();
    console.log("Reset known studies list");
  }
};
var dicomMonitorInstance = null;
var createDicomMonitor = (websocket, onNewStudyCallback) => {
  if (!dicomMonitorInstance) {
    dicomMonitorInstance = new DicomMonitorService(websocket, onNewStudyCallback);
  }
  return dicomMonitorInstance;
};
var getDicomMonitor = () => {
  return dicomMonitorInstance;
};

// src/routes/dicom.ts
var dicomRoutes = async (fastify2) => {
  const authenticate = createAuthHandler();
  fastify2.get("/echo", { preHandler: authenticate }, async () => {
    try {
      const systemInfo = await dicomService.getSystemInfo();
      const isConnected = await dicomService.testConnection();
      return {
        status: isConnected ? "connected" : "disconnected",
        orthanc: systemInfo,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error("Failed to connect to Orthanc PACS");
    }
  });
  fastify2.get("/stats", { preHandler: authenticate }, async () => {
    try {
      const systemInfo = await dicomService.getSystemInfo();
      return {
        system: systemInfo,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error("Failed to retrieve Orthanc statistics");
    }
  });
  fastify2.post("/studies/search", { preHandler: authenticate }, async (request) => {
    const searchSchema = z5.object({
      PatientName: z5.string().optional(),
      PatientID: z5.string().optional(),
      StudyDate: z5.string().optional(),
      StudyDescription: z5.string().optional(),
      Modality: z5.string().optional(),
      AccessionNumber: z5.string().optional(),
      limit: z5.number().default(25),
      offset: z5.number().default(0)
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`DICOM search error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to search DICOM studies");
    }
  });
  fastify2.get("/viewer/config/:examinationId", { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params;
    try {
      const examination = await fastify2.prisma.examination.findUnique({
        where: { id: examinationId },
        include: {
          patient: true
        }
      });
      if (!examination) {
        throw new Error("Examination not found");
      }
      if (!examination.studyInstanceUID) {
        throw new Error("No DICOM study available for this examination");
      }
      const config = {
        studyInstanceUID: examination.studyInstanceUID,
        wadoRsRoot: "http://localhost:8043/dicom-web",
        ohifViewerUrl: "http://localhost:3005",
        orthancViewerUrl: "http://localhost:8042/orthanc-explorer-2",
        stoneViewerUrl: "http://localhost:8042/stone-webviewer",
        patient: {
          firstName: examination.patient.firstName,
          lastName: examination.patient.lastName,
          birthDate: examination.patient.birthDate.toISOString().split("T")[0]
        },
        modality: examination.modality,
        accessionNumber: examination.accessionNumber
      };
      return config;
    } catch (error) {
      fastify2.log.error(`Failed to get viewer config: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get viewer configuration");
    }
  });
  fastify2.get("/studies/:studyUID", { preHandler: authenticate }, async (request) => {
    const { studyUID } = request.params;
    try {
      const study = await dicomService.getStudyById(studyUID);
      if (!study) {
        throw new Error("Study not found");
      }
      const series = await dicomService.getSeriesForStudy(studyUID);
      return {
        study,
        series,
        seriesCount: series.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error("Failed to retrieve study details");
    }
  });
  fastify2.get("/studies/:studyUID/series/:seriesUID", { preHandler: authenticate }, async (request) => {
    const { studyUID, seriesUID } = request.params;
    try {
      const series = await dicomService.getSeriesForStudy(studyUID);
      const targetSeries = series.find((s) => s.SeriesInstanceUID === seriesUID);
      if (!targetSeries) {
        throw new Error("Series not found");
      }
      const instances = await dicomService.getInstancesForSeries(targetSeries.ID);
      return {
        series: targetSeries,
        instances
      };
    } catch (error) {
      throw new Error("Failed to retrieve series details");
    }
  });
  fastify2.get(
    "/studies/:studyUID/series/:seriesUID/instances/:instanceUID/metadata",
    { preHandler: authenticate },
    async (request) => {
      const { studyUID, seriesUID, instanceUID } = request.params;
      try {
        const series = await dicomService.getSeriesForStudy(studyUID);
        const targetSeries = series.find((s) => s.SeriesInstanceUID === seriesUID);
        if (!targetSeries) {
          throw new Error("Series not found");
        }
        const instances = await dicomService.getInstancesForSeries(targetSeries.ID);
        const targetInstance = instances.find((i) => i.SOPInstanceUID === instanceUID);
        if (!targetInstance) {
          throw new Error("Instance not found");
        }
        return {
          metadata: targetInstance
        };
      } catch (error) {
        throw new Error("Failed to retrieve instance metadata");
      }
    }
  );
  fastify2.get("/studies/:studyUID/wado-uri", { preHandler: authenticate }, async (request) => {
    const { studyUID } = request.params;
    const paramsSchema = z5.object({
      seriesUID: z5.string().optional(),
      instanceUID: z5.string().optional(),
      contentType: z5.string().default("application/dicom")
    });
    const { seriesUID, instanceUID, contentType } = paramsSchema.parse(request.query);
    const orthancUrl = process.env.ORTHANC_URL || "http://orthanc:8042";
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
      instanceUID
    };
  });
  fastify2.post("/store", { preHandler: authenticate }, async (request) => {
    const bodySchema = z5.object({
      dicomData: z5.string()
      // Base64 encoded DICOM data
    });
    const { dicomData } = bodySchema.parse(request.body);
    try {
      throw new Error("DICOM store functionality requires implementation in dicomService");
    } catch (error) {
      fastify2.log.error(`DICOM store error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to store DICOM instance");
    }
  });
  fastify2.post("/worklist", { preHandler: authenticate }, async (request) => {
    const worklistSchema = z5.object({
      patientName: z5.string(),
      patientId: z5.string(),
      accessionNumber: z5.string(),
      modality: z5.string(),
      scheduledDate: z5.string(),
      scheduledTime: z5.string(),
      scheduledAET: z5.string(),
      procedure: z5.string().optional(),
      studyDescription: z5.string().optional()
    });
    const data = worklistSchema.parse(request.body);
    try {
      const worklistItem = {
        "0008,0050": data.accessionNumber,
        // Accession Number
        "0010,0010": data.patientName,
        // Patient Name
        "0010,0020": data.patientId,
        // Patient ID
        "0008,0060": data.modality,
        // Modality
        "0040,0100": [{
          // Scheduled Procedure Step Sequence
          "0040,0001": data.scheduledDate,
          // Scheduled Station AE Title
          "0040,0002": data.scheduledDate,
          // Scheduled Procedure Step Start Date
          "0040,0003": data.scheduledTime,
          // Scheduled Procedure Step Start Time
          "0040,0006": data.procedure,
          // Scheduled Performing Physician Name
          "0008,1030": data.studyDescription
          // Study Description
        }]
      };
      throw new Error("Worklist creation functionality requires implementation in dicomService");
    } catch (error) {
      fastify2.log.error(`Worklist creation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to create worklist entry");
    }
  });
  fastify2.post("/sync-examination/:examinationId", { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params;
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
        message: result.studiesFound > 0 ? `Found ${result.studiesFound} DICOM study(ies) for examination` : "No DICOM studies found for examination",
        examinationId,
        studiesFound: result.studiesFound,
        studyInstanceUID: result.studyInstanceUID,
        imagesAvailable: result.imagesAvailable,
        timestamp: result.syncedAt
      };
    } catch (error) {
      fastify2.log.error(`PACS sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to synchronize examination with PACS");
    }
  });
  fastify2.post("/sync-bulk", { preHandler: authenticate }, async (request) => {
    const bodySchema = z5.object({
      examinationIds: z5.array(z5.string()).min(1).max(100)
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Bulk PACS sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to perform bulk synchronization with PACS");
    }
  });
  fastify2.post("/sync-all-pending", { preHandler: authenticate }, async () => {
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Sync all pending error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to synchronize pending examinations");
    }
  });
  fastify2.post("/sync-date-range", { preHandler: authenticate }, async (request) => {
    const bodySchema = z5.object({
      startDate: z5.string().datetime(),
      endDate: z5.string().datetime()
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Date range sync error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to synchronize examinations in date range");
    }
  });
  fastify2.get("/sync-stats", { preHandler: authenticate }, async () => {
    try {
      const stats = await dicomSyncService.getSyncStatistics();
      const isConnected = await dicomSyncService.validateDicomConnection();
      return {
        success: true,
        pacsConnected: isConnected,
        statistics: stats
      };
    } catch (error) {
      fastify2.log.error(`Sync stats error:: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get synchronization statistics");
    }
  });
  fastify2.get("/viewer-config/:examinationId", { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params;
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
        error: error instanceof Error ? error.message : "Failed to get viewer configuration",
        examinationId
      };
    }
  });
  fastify2.get("/study-images/:studyInstanceUID", { preHandler: authenticate }, async (request) => {
    const { studyInstanceUID } = request.params;
    try {
      const orthancUrl = process.env.ORTHANC_URL || "http://orthanc:8042";
      const studiesResponse = await fetch(`${orthancUrl}/studies`);
      if (!studiesResponse.ok) {
        throw new Error("Failed to fetch studies from Orthanc");
      }
      const studyIds = await studiesResponse.json();
      let orthancStudyId = null;
      for (const id of studyIds) {
        const studyResponse = await fetch(`${orthancUrl}/studies/${id}`);
        if (studyResponse.ok) {
          const studyData = await studyResponse.json();
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
      const seriesResponse = await fetch(`${orthancUrl}/studies/${orthancStudyId}/series`);
      if (!seriesResponse.ok) {
        throw new Error("Failed to fetch series");
      }
      const seriesData = await seriesResponse.json();
      const imageIds = [];
      for (const seriesId of seriesData) {
        const instancesResponse = await fetch(`${orthancUrl}/series/${seriesId}/instances`);
        if (instancesResponse.ok) {
          const instances = await instancesResponse.json();
          for (const instanceId of instances) {
            const orthancDirectUrl = process.env.NEXT_PUBLIC_ORTHANC_URL || "http://localhost:8042";
            const imageId = `wadouri:${orthancDirectUrl}/instances/${instanceId}/file`;
            imageIds.push(imageId);
          }
        }
      }
      if (imageIds.length === 0) {
        return {
          success: false,
          error: "No images found in study",
          imageIds: []
        };
      }
      return {
        success: true,
        studyInstanceUID,
        orthancStudyId,
        imageIds,
        imageCount: imageIds.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Study images error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load study images",
        imageIds: []
      };
    }
  });
  fastify2.get("/proxy/instances/:instanceId/file", async (request, reply) => {
    const { instanceId } = request.params;
    try {
      const orthancUrl = process.env.ORTHANC_URL || "http://orthanc:8042";
      const instanceUrl = `${orthancUrl}/instances/${instanceId}/file`;
      const response = await fetch(instanceUrl);
      if (!response.ok) {
        reply.code(response.status);
        return { error: "Failed to fetch DICOM instance" };
      }
      reply.header("Access-Control-Allow-Origin", "*");
      reply.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      reply.header("Content-Type", response.headers.get("content-type") || "application/dicom");
      const buffer = await response.arrayBuffer();
      return reply.send(Buffer.from(buffer));
    } catch (error) {
      fastify2.log.error(`Proxy instance error: ${error instanceof Error ? error.message : String(error)}`);
      reply.code(500);
      return { error: "Failed to proxy DICOM instance" };
    }
  });
  fastify2.get("/examinations/:examinationId/annotations", { preHandler: authenticate }, async (request) => {
    const { examinationId } = request.params;
    try {
      return {
        success: true,
        annotations: [],
        examinationId,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get annotations",
        annotations: []
      };
    }
  });
  fastify2.post("/auto-discovery/discover", { preHandler: authenticate }, async () => {
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Auto-discovery error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to run auto-discovery");
    }
  });
  fastify2.post("/auto-discovery/scheduled", { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.runScheduledAutoDiscovery();
      return {
        success: result.success,
        message: result.success ? `Scheduled discovery completed successfully` : `Scheduled discovery failed: ${result.error}`,
        data: result.discoveryResult,
        timestamp: result.timestamp
      };
    } catch (error) {
      fastify2.log.error(`Scheduled auto-discovery error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to run scheduled auto-discovery");
    }
  });
  fastify2.get("/auto-discovery/unmatched-studies", { preHandler: authenticate }, async () => {
    try {
      const result = await dicomSyncService.discoverNewStudies();
      return {
        success: true,
        data: {
          unmatchedStudies: result.unmatchedStudies,
          count: result.unmatchedStudies.length
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Get unmatched studies error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get unmatched studies");
    }
  });
  fastify2.post("/auto-discovery/manual-link", { preHandler: authenticate }, async (request) => {
    const bodySchema = z5.object({
      studyInstanceUID: z5.string(),
      examinationId: z5.string()
    });
    const { studyInstanceUID, examinationId } = bodySchema.parse(request.body);
    try {
      const examination = await fastify2.prisma.examination.findUnique({
        where: { id: examinationId },
        select: { studyInstanceUID: true }
      });
      if (!examination) {
        throw new Error("Examination not found");
      }
      if (examination.studyInstanceUID) {
        throw new Error("Examination is already linked to a study");
      }
      await fastify2.prisma.examination.update({
        where: { id: examinationId },
        data: {
          studyInstanceUID,
          imagesAvailable: true,
          status: "ACQUIRED",
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
      return {
        success: true,
        message: "Study successfully linked to examination",
        data: {
          examinationId,
          studyInstanceUID
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Manual link error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to link study to examination: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
  fastify2.post("/metadata-sync/synchronize", { preHandler: authenticate }, async () => {
    try {
      if (fastify2.websocket && !metadataSyncService["websocket"]) {
        metadataSyncService["websocket"] = fastify2.websocket;
      }
      const result = await metadataSyncService.synchronizeMetadata();
      return {
        success: result.success,
        message: result.success ? `Metadata sync completed: ${result.patientsUpdated} patients updated, ${result.studiesLinked} studies linked` : `Metadata sync failed with ${result.errors.length} errors`,
        data: {
          patientsProcessed: result.patientsProcessed,
          patientsUpdated: result.patientsUpdated,
          studiesProcessed: result.studiesProcessed,
          studiesLinked: result.studiesLinked,
          errors: result.errors.slice(0, 10),
          // Limit errors in response
          totalErrors: result.errors.length
        },
        timestamp: result.timestamp.toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Metadata sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to run metadata synchronization");
    }
  });
  fastify2.get("/metadata-sync/statistics", { preHandler: authenticate }, async () => {
    try {
      const stats = await metadataSyncService.getSyncStatistics();
      return {
        success: true,
        data: stats,
        timestamp: stats.timestamp
      };
    } catch (error) {
      fastify2.log.error(`Metadata sync stats error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get metadata synchronization statistics");
    }
  });
  fastify2.post("/metadata-sync/sync-patients", { preHandler: authenticate }, async () => {
    try {
      const result = await metadataSyncService.synchronizeMetadata();
      return {
        success: result.success,
        message: `Patient sync completed: ${result.patientsUpdated}/${result.patientsProcessed} patients updated`,
        data: {
          patientsProcessed: result.patientsProcessed,
          patientsUpdated: result.patientsUpdated,
          errors: result.errors.filter((e) => e.includes("patient")).slice(0, 5)
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Patient sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to sync patient metadata");
    }
  });
  fastify2.post("/metadata-sync/sync-studies", { preHandler: authenticate }, async () => {
    try {
      const result = await metadataSyncService.synchronizeMetadata();
      return {
        success: result.success,
        message: `Study sync completed: ${result.studiesLinked}/${result.studiesProcessed} studies linked`,
        data: {
          studiesProcessed: result.studiesProcessed,
          studiesLinked: result.studiesLinked,
          errors: result.errors.filter((e) => e.includes("study")).slice(0, 5)
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Study sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to sync study metadata");
    }
  });
  fastify2.get("/metadata-sync/health", { preHandler: authenticate }, async () => {
    try {
      const [risHealth, pacsHealth] = await Promise.all([
        // Check RIS database connectivity
        fastify2.prisma.patient.count().then(() => true).catch(() => false),
        // Check PACS connectivity  
        dicomService.testConnection()
      ]);
      const isHealthy = risHealth && pacsHealth;
      return {
        success: isHealthy,
        data: {
          ris: {
            connected: risHealth,
            status: risHealth ? "healthy" : "disconnected"
          },
          pacs: {
            connected: pacsHealth,
            status: pacsHealth ? "healthy" : "disconnected"
          },
          overall: {
            status: isHealthy ? "healthy" : "degraded",
            readyForSync: isHealthy
          }
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Metadata sync health check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to check metadata sync health");
    }
  });
  fastify2.post("/monitor/initialize", { preHandler: authenticate }, async () => {
    try {
      const monitor = createDicomMonitor(fastify2.websocket);
      return {
        success: true,
        message: "DICOM monitor initialized",
        status: monitor.getStatus(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`DICOM monitor initialization error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to initialize DICOM monitor");
    }
  });
  fastify2.post("/monitor/start", { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor() || createDicomMonitor(fastify2.websocket);
      await monitor.startMonitoring();
      return {
        success: true,
        message: "DICOM monitoring started",
        status: monitor.getStatus(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`DICOM monitor start error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to start DICOM monitoring");
    }
  });
  fastify2.post("/monitor/stop", { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      if (monitor) {
        monitor.stopMonitoring();
        return {
          success: true,
          message: "DICOM monitoring stopped",
          status: monitor.getStatus(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      } else {
        return {
          success: false,
          message: "DICOM monitor not initialized",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch (error) {
      fastify2.log.error(`DICOM monitor stop error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to stop DICOM monitoring");
    }
  });
  fastify2.get("/monitor/status", { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      if (monitor) {
        return {
          success: true,
          data: monitor.getStatus(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      } else {
        return {
          success: true,
          data: {
            monitoring: false,
            knownStudiesCount: 0,
            checkInterval: 0,
            lastCheck: null,
            message: "Monitor not initialized"
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch (error) {
      fastify2.log.error(`DICOM monitor status error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get DICOM monitor status");
    }
  });
  fastify2.post("/monitor/check", { preHandler: authenticate }, async () => {
    try {
      const monitor = getDicomMonitor();
      if (!monitor) {
        throw new Error("DICOM monitor not initialized");
      }
      const newStudiesCount = await monitor.checkNow();
      return {
        success: true,
        message: `Manual check completed, found ${newStudiesCount} new studies`,
        data: {
          newStudiesFound: newStudiesCount,
          status: monitor.getStatus()
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`DICOM monitor manual check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to perform manual check");
    }
  });
  fastify2.post("/monitor/configure", { preHandler: authenticate }, async (request) => {
    const configSchema = z5.object({
      checkIntervalSeconds: z5.number().min(1).max(3600)
    });
    const { checkIntervalSeconds } = configSchema.parse(request.body);
    try {
      const monitor = getDicomMonitor();
      if (!monitor) {
        throw new Error("DICOM monitor not initialized");
      }
      monitor.setCheckInterval(checkIntervalSeconds * 1e3);
      return {
        success: true,
        message: `DICOM monitoring interval updated to ${checkIntervalSeconds} seconds`,
        status: monitor.getStatus(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`DICOM monitor configuration error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to configure DICOM monitor");
    }
  });
};

// src/routes/patientIdentification.ts
import { z as z6 } from "zod";
var patientIdentificationRoutes = async (fastify2) => {
  const authenticate = createAuthHandler();
  if (fastify2.websocket && !patientIdentificationService["websocket"]) {
    patientIdentificationService["websocket"] = fastify2.websocket;
  }
  fastify2.post("/generate-upi/:patientId", { preHandler: authenticate }, async (request) => {
    const { patientId } = request.params;
    try {
      const patient = await fastify2.prisma.patient.findUnique({
        where: { id: patientId }
      });
      if (!patient) {
        throw new Error("Patient not found");
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`UPI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to generate UPI");
    }
  });
  fastify2.post("/create-with-identifiers", { preHandler: authenticate }, async (request) => {
    const patientSchema = z6.object({
      firstName: z6.string().min(1, "First name is required"),
      lastName: z6.string().min(1, "Last name is required"),
      birthDate: z6.string().transform((str) => new Date(str)),
      gender: z6.enum(["M", "F", "OTHER"]),
      phoneNumber: z6.string().optional(),
      email: z6.string().email().optional(),
      address: z6.string().optional(),
      city: z6.string().optional(),
      zipCode: z6.string().optional(),
      insuranceNumber: z6.string().optional(),
      emergencyContact: z6.string().optional()
    });
    const patientData = patientSchema.parse(request.body);
    try {
      const systemUser = await fastify2.prisma.user.findFirst({
        where: { email: "system@radris.local", role: "ADMIN" }
      });
      if (!systemUser) {
        throw new Error("System user not found");
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Patient creation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to create patient with identifiers");
    }
  });
  fastify2.put("/update-identifiers/:patientId", { preHandler: authenticate }, async (request) => {
    const { patientId } = request.params;
    const updateSchema = z6.object({
      socialSecurity: z6.string().optional(),
      nationalId: z6.string().optional(),
      insuranceNumber: z6.string().optional()
    });
    const updates = updateSchema.parse(request.body);
    try {
      const identifiers = await patientIdentificationService.updatePatientIdentifiers(patientId, updates);
      return {
        success: true,
        data: { identifiers },
        message: "Patient identifiers updated successfully",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Update identifiers error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to update patient identifiers");
    }
  });
  fastify2.get("/find/:identifier", { preHandler: authenticate }, async (request) => {
    const { identifier } = request.params;
    try {
      const result = await patientIdentificationService.findPatientByIdentifier(identifier);
      if (!result) {
        return {
          success: false,
          message: "Patient not found with provided identifier",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return {
        success: true,
        data: {
          patient: result.patient,
          identifiers: result.identifiers
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Find patient error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to find patient by identifier");
    }
  });
  fastify2.post("/validate-upi", { preHandler: authenticate }, async (request) => {
    const upiSchema = z6.object({
      upi: z6.string()
    });
    const { upi } = upiSchema.parse(request.body);
    try {
      const isValid = patientIdentificationService.validateUPI(upi);
      return {
        success: true,
        data: {
          upi,
          valid: isValid,
          format: "INSTITUTION-YEAR-SEQUENTIAL-CHECKSUM"
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`UPI validation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to validate UPI");
    }
  });
  fastify2.post("/sync-with-pacs", { preHandler: authenticate }, async () => {
    try {
      const result = await patientIdentificationService.syncWithExistingPACS();
      return {
        success: true,
        data: result,
        message: `Synchronization completed: ${result.synchronized} patients updated, ${result.conflicts.length} conflicts found`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`PACS sync error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to synchronize with PACS");
    }
  });
  fastify2.get("/statistics", { preHandler: authenticate }, async () => {
    try {
      const stats = await patientIdentificationService.getIdentificationStatistics();
      return {
        success: true,
        data: stats,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Statistics error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to get identification statistics");
    }
  });
  fastify2.get("/duplicates", { preHandler: authenticate }, async () => {
    try {
      const duplicates = await patientIdentificationService.findPotentialDuplicates();
      return {
        success: true,
        data: {
          duplicates,
          count: duplicates.length,
          totalDuplicatedPatients: duplicates.reduce((sum, dup) => sum + dup.patients.length, 0)
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Duplicates detection error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to find potential duplicates");
    }
  });
  fastify2.get("/health", { preHandler: authenticate }, async () => {
    try {
      const stats = await patientIdentificationService.getIdentificationStatistics();
      const health = {
        status: stats.coverage >= 95 ? "healthy" : stats.coverage >= 80 ? "warning" : "critical",
        coverage: stats.coverage,
        totalPatients: stats.totalPatients,
        validUPIs: stats.patientsWithValidUPI,
        conflicts: stats.conflicts,
        synchronized: stats.synchronized,
        lastCheck: (/* @__PURE__ */ new Date()).toISOString()
      };
      return {
        success: true,
        data: health,
        message: `Patient identification system is ${health.status}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Health check error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to check system health");
    }
  });
  fastify2.post("/migrate-existing-patients", { preHandler: authenticate }, async () => {
    try {
      let migratedCount = 0;
      let errorCount = 0;
      const errors = [];
      const patients = await fastify2.prisma.patient.findMany({
        where: {
          active: true,
          OR: [
            { socialSecurity: null },
            { socialSecurity: "" }
          ]
        }
      });
      for (const patient of patients) {
        try {
          await patientIdentificationService.updatePatientIdentifiers(patient.id, {});
          migratedCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Patient ${patient.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      return {
        success: true,
        data: {
          totalPatients: patients.length,
          migratedCount,
          errorCount,
          errors: errors.slice(0, 10)
          // Limiter les erreurs affichées
        },
        message: `Migration completed: ${migratedCount}/${patients.length} patients migrated`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Migration error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to migrate existing patients");
    }
  });
  fastify2.post("/test-upi-generation", { preHandler: authenticate }, async (request) => {
    const testSchema = z6.object({
      firstName: z6.string(),
      lastName: z6.string(),
      birthDate: z6.string().transform((str) => new Date(str)),
      gender: z6.string()
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
            format: "INSTITUTION-YEAR-SEQUENTIAL-CHECKSUM",
            institution: "RAD",
            year: (/* @__PURE__ */ new Date()).getFullYear(),
            note: "This is a test generation - no patient was created"
          }
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      fastify2.log.error(`Test UPI generation error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to test UPI generation");
    }
  });
};

// src/services/websocket.ts
import { Server } from "ws";
import * as jwt from "jsonwebtoken";
var WebSocketService = class {
  constructor(fastify2) {
    this.clients = /* @__PURE__ */ new Map();
    this.fastify = fastify2;
    this.wss = new Server({
      port: 3002,
      path: "/ws"
    });
    this.setupWebSocketServer();
    this.setupHeartbeat();
    fastify2.log.info("\u{1F50C} WebSocket server started on port 3002");
  }
  setupWebSocketServer() {
    this.wss.on("connection", (ws, request) => {
      this.handleConnection(ws, request);
    });
    this.wss.on("error", (error) => {
      this.fastify.log.error(`WebSocket server error:: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
  async handleConnection(ws, request) {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get("token") || request.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        ws.close(1008, "No authentication token provided");
        return;
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-super-secret-jwt-key");
      ws.userId = decoded.userId;
      ws.userRole = decoded.role;
      ws.userEmail = decoded.email;
      ws.isAlive = true;
      ws.subscriptions = /* @__PURE__ */ new Set();
      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, /* @__PURE__ */ new Set());
      }
      this.clients.get(decoded.userId).add(ws);
      this.fastify.log.info(`WebSocket client connected: ${decoded.email} (${decoded.role})`);
      this.sendToClient(ws, {
        type: "system_notification",
        payload: { message: "Connected to RADRIS real-time updates" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          this.fastify.log.error(`Error parsing WebSocket message:: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
      ws.on("close", () => {
        this.handleDisconnection(ws);
      });
      ws.on("pong", () => {
        ws.isAlive = true;
      });
    } catch (error) {
      this.fastify.log.error(`WebSocket authentication failed:: ${error instanceof Error ? error.message : String(error)}`);
      ws.close(1008, "Authentication failed");
    }
  }
  handleDisconnection(ws) {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      this.fastify.log.info(`WebSocket client disconnected: ${ws.userId}`);
    }
  }
  handleClientMessage(ws, message) {
    switch (message.type) {
      case "ping":
        this.sendToClient(ws, {
          type: "system_notification",
          payload: { message: "pong" },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        break;
      case "subscribe_examination":
        if (message.examinationId && ws.subscriptions) {
          ws.subscriptions.add(message.examinationId);
          this.fastify.log.info(`User ${ws.userId} subscribed to examination ${message.examinationId}`);
        }
        break;
      case "unsubscribe_examination":
        if (message.examinationId && ws.subscriptions) {
          ws.subscriptions.delete(message.examinationId);
          this.fastify.log.info(`User ${ws.userId} unsubscribed from examination ${message.examinationId}`);
        }
        break;
      case "subscribe_worklist":
        this.sendToClient(ws, {
          type: "system_notification",
          payload: { message: "Subscribed to worklist updates" },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        break;
      case "user_status":
        if (message.status) {
          this.broadcastUserStatusChange(ws.userId, message.status, ws.userEmail);
        }
        break;
      default:
        this.fastify.log.warn("Unknown WebSocket message type:", message.type);
    }
  }
  sendToClient(ws, message) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  setupHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 3e4);
  }
  // Public methods for broadcasting updates
  broadcastExaminationUpdate(examinationId, examination, updateType = "updated") {
    const message = {
      type: updateType === "created" ? "examination_created" : "examination_updated",
      payload: {
        examinationId,
        examination,
        updateType
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastReportUpdate(reportId, report, examinationId) {
    const message = {
      type: "report_updated",
      payload: {
        reportId,
        report,
        examinationId
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastSystemNotification(notification) {
    const message = {
      type: "system_notification",
      payload: notification,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastPatientUpdate(patientId, patient, updateType = "updated") {
    const message = {
      type: updateType === "created" ? "patient_created" : "patient_updated",
      payload: {
        patientId,
        patient,
        updateType
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastReportCreated(reportId, report, examinationId) {
    const message = {
      type: "report_created",
      payload: {
        reportId,
        report,
        examinationId
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastReportValidated(reportId, report, examinationId, validatorId) {
    const message = {
      type: "report_validated",
      payload: {
        reportId,
        report,
        examinationId,
        validatorId
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastAssignmentChange(examinationId, oldAssigneeId, newAssigneeId, examination) {
    const message = {
      type: "assignment_changed",
      payload: {
        examinationId,
        oldAssigneeId,
        newAssigneeId,
        examination
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastWorklistRefresh() {
    const message = {
      type: "worklist_refresh",
      payload: {
        message: "Worklist data has been updated"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastUserStatusChange(userId, status, email) {
    const message = {
      type: "user_status_changed",
      payload: {
        userId,
        status,
        email
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastExaminationDeleted(examinationId, patientInfo) {
    const message = {
      type: "examination_deleted",
      payload: {
        examinationId,
        patientInfo
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastToAll(message) {
    let sentCount = 0;
    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });
    this.fastify.log.info(`Broadcasted ${message.type} to ${sentCount} clients`);
  }
  broadcastToRole(message, roles) {
    let sentCount = 0;
    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.userRole && roles.includes(ws.userRole)) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });
    this.fastify.log.info(`Broadcasted ${message.type} to ${sentCount} clients with roles: ${roles.join(", ")}`);
  }
  getConnectedClientsCount() {
    let count = 0;
    this.clients.forEach((clientSet) => {
      count += clientSet.size;
    });
    return count;
  }
  getUsersOnline() {
    return Array.from(this.clients.keys());
  }
  broadcastToSubscribers(examinationId, message) {
    let sentCount = 0;
    this.clients.forEach((clientSet) => {
      clientSet.forEach((ws) => {
        if (ws.readyState === ws.OPEN && ws.subscriptions?.has(examinationId)) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
    });
    this.fastify.log.info(`Broadcasted ${message.type} for examination ${examinationId} to ${sentCount} subscribers`);
  }
  broadcastToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      let sentCount = 0;
      userClients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          this.sendToClient(ws, message);
          sentCount++;
        }
      });
      this.fastify.log.info(`Sent ${message.type} to user ${userId} (${sentCount} connections)`);
    }
  }
  getClientInfo() {
    const info = Array.from(this.clients.entries()).map(([userId, clientSet]) => {
      const clients = Array.from(clientSet).map((ws) => ({
        role: ws.userRole,
        email: ws.userEmail,
        isAlive: ws.isAlive,
        subscriptions: ws.subscriptions ? Array.from(ws.subscriptions) : []
      }));
      return { userId, clients };
    });
    return {
      totalClients: this.getConnectedClientsCount(),
      totalUsers: this.clients.size,
      clientDetails: info
    };
  }
  // DICOM-specific notification methods
  broadcastDicomArrival(studyData) {
    const message = {
      type: "dicom_arrival",
      payload: {
        ...studyData,
        message: `New ${studyData.modality || "DICOM"} study arrived for ${studyData.patientName}`,
        title: "New DICOM Study"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastStudyLinked(linkData) {
    const message = {
      type: "study_linked",
      payload: {
        ...linkData,
        message: `DICOM study linked to examination for ${linkData.patientName}`,
        title: "Study Linked"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastMetadataSync(syncData) {
    const message = {
      type: "metadata_sync",
      payload: {
        ...syncData,
        message: syncData.success ? `Metadata sync completed: ${syncData.patientsUpdated} patients updated, ${syncData.studiesLinked} studies linked` : `Metadata sync failed with ${syncData.errors.length} errors`,
        title: "Metadata Synchronization"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToAll(message);
  }
  broadcastDicomError(errorData) {
    const message = {
      type: "dicom_error",
      payload: {
        ...errorData,
        message: `DICOM ${errorData.operation} failed: ${errorData.error}`,
        title: "DICOM Operation Error"
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.broadcastToRole(message, ["ADMIN", "TECHNICIAN"]);
  }
  close() {
    this.wss.close();
  }
};

// src/index.ts
var prisma = new PrismaClient4();
var redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
var server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info"
  }
});
async function start() {
  try {
    await server.register(helmet);
    await server.register(cors, {
      origin: process.env.NODE_ENV === "development" ? true : ["http://localhost:3000"],
      credentials: true
    });
    await server.register(jwt2, {
      secret: process.env.JWT_SECRET || "your-super-secret-jwt-key"
    });
    await server.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute"
    });
    server.decorate("prisma", prisma);
    server.decorate("redis", redis);
    server.setErrorHandler(async (error, request, reply) => {
      server.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body
      }, "Unhandled error");
      if (process.env.NODE_ENV === "production") {
        reply.status(500).send({
          error: "Internal Server Error",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        reply.status(500).send({
          error: error.message,
          stack: error.stack,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
    server.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        error: "Resource not found",
        path: request.url,
        method: request.method,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
    const wsService = new WebSocketService(server);
    server.decorate("websocket", wsService);
    server.get("/health", async (request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        return {
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          services: {
            database: "connected",
            redis: "connected",
            websocket: {
              status: "connected",
              clients: server.websocket?.getConnectedClientsCount() || 0,
              usersOnline: server.websocket?.getUsersOnline()?.length || 0
            }
          }
        };
      } catch (error) {
        reply.status(500);
        return {
          status: "error",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          error: "Database or Redis connection failed"
        };
      }
    });
    await server.register(authRoutes, { prefix: "/api/auth" });
    await server.register(patientRoutes, { prefix: "/api/patients" });
    await server.register(examinationRoutes, { prefix: "/api/examinations" });
    await server.register(reportRoutes, { prefix: "/api/reports" });
    await server.register(dicomRoutes, { prefix: "/api/dicom" });
    await server.register(patientIdentificationRoutes, { prefix: "/api/patient-identification" });
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`\u{1F680} RADRIS Backend API server ready at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.websocket?.close();
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  server.websocket?.close();
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
start();

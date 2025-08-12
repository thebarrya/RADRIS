// src/index.ts
import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient as PrismaClient2 } from "@prisma/client";
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
  const authenticate = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
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
    const { userId } = request.user;
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
  const authenticate = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
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
    const { userId } = request.user;
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
    await fastify2.prisma.examination.delete({
      where: { id }
    });
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
  // DICOMweb URLs for direct access
  getDicomWebStudyUrl(studyInstanceUID) {
    return `${this.baseUrl}/dicom-web/studies/${studyInstanceUID}`;
  }
  getDicomWebSeriesUrl(studyInstanceUID, seriesInstanceUID) {
    return `${this.baseUrl}/dicom-web/studies/${studyInstanceUID}/series/${seriesInstanceUID}`;
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
};
var dicomSyncService = new DicomSyncService(new PrismaClient());

// src/routes/dicom.ts
var dicomRoutes = async (fastify2) => {
  const authenticate = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  };
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
        wadoRsRoot: "http://localhost:8042/dicom-web",
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
};

// src/index.ts
var prisma = new PrismaClient2();
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
    await server.register(jwt, {
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
    server.get("/health", async (request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        return {
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          services: {
            database: "connected",
            redis: "connected"
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
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
start();

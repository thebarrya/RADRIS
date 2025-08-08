import fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { authRoutes } from './routes/auth';
import { patientRoutes } from './routes/patients';
import { examinationRoutes } from './routes/examinations';
import { reportRoutes } from './routes/reports';
import { dicomRoutes } from './routes/dicom';
// import { WebSocketService } from './services/websocket';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

async function start() {
  try {
    // Register plugins
    await server.register(helmet);
    await server.register(cors, {
      origin: process.env.NODE_ENV === 'development' ? true : ['http://localhost:3000'],
      credentials: true,
    });
    
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    });

    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Add context
    server.decorate('prisma', prisma);
    server.decorate('redis', redis);

    // Global error handler
    server.setErrorHandler(async (error, request, reply) => {
      server.log.error({
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body,
      }, 'Unhandled error');

      // Don't leak internal errors to client in production
      if (process.env.NODE_ENV === 'production') {
        reply.status(500).send({
          error: 'Internal Server Error',
          timestamp: new Date().toISOString(),
        });
      } else {
        reply.status(500).send({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Global not found handler
    server.setNotFoundHandler(async (request, reply) => {
      reply.status(404).send({
        error: 'Resource not found',
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      });
    });

    // Initialize WebSocket service
    // const wsService = new WebSocketService(server);
    // server.decorate('websocket', wsService);

    // Health check
    server.get('/health', async (request, reply) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        
        return {
          status: 'ok',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            redis: 'connected',
          },
        };
      } catch (error) {
        reply.status(500);
        return {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Database or Redis connection failed',
        };
      }
    });

    // Register routes
    await server.register(authRoutes, { prefix: '/api/auth' });
    await server.register(patientRoutes, { prefix: '/api/patients' });
    await server.register(examinationRoutes, { prefix: '/api/examinations' });
    await server.register(reportRoutes, { prefix: '/api/reports' });
    await server.register(dicomRoutes, { prefix: '/api/dicom' });

    // Start server
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: '0.0.0.0' });
    
    console.log(`🚀 RADRIS Backend API server ready at http://localhost:${port}`);
    
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

start();

// Extend Fastify interface
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    // websocket: WebSocketService;
  }
}
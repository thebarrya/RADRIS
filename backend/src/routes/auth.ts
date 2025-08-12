import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(['ADMIN', 'RADIOLOGIST_SENIOR', 'RADIOLOGIST_JUNIOR', 'TECHNICIAN', 'SECRETARY']).optional(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          password: true,
          active: true,
        },
      });

      if (!user || !user.active) {
        fastify.log.warn({ email }, 'Failed login attempt - user not found or inactive');
        return reply.status(401).send({ 
          error: 'Invalid credentials',
          timestamp: new Date().toISOString()
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        fastify.log.warn({ email, userId: user.id }, 'Failed login attempt - invalid password');
        return reply.status(401).send({ 
          error: 'Invalid credentials',
          timestamp: new Date().toISOString()
        });
      }

      fastify.log.info({ email, userId: user.id, role: user.role }, 'User logged in successfully');

      const token = fastify.jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        { expiresIn: '24h' }
      );

      // Store session in Redis
      await fastify.redis.setex(
        `session:${user.id}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          loginTime: new Date().toISOString(),
        })
      );

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    } catch (error: any) {
      fastify.log.error({ error: error.message, stack: error.stack }, 'Login error');
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ 
          error: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          timestamp: new Date().toISOString()
        });
      }
      
      return reply.status(500).send({ 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Register
  fastify.post('/register', async (request, reply) => {
    try {
      const { email, password, firstName, lastName, role } = registerSchema.parse(request.body);

      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return reply.status(409).send({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await fastify.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || 'TECHNICIAN',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      return { user };
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  }, async (request) => {
    const { userId } = request.user as any;
    
    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { user };
  });

  // Logout
  fastify.post('/logout', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  }, async (request) => {
    const { userId } = request.user as any;
    
    // Remove session from Redis
    await fastify.redis.del(`session:${userId}`);
    
    return { message: 'Logged out successfully' };
  });
};
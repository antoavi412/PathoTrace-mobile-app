import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env';
import { ApiError } from './lib/errors';
import { alertRoutes } from './modules/alerts/routes';
import { assessmentRoutes } from './modules/assessments/routes';
import { authRoutes } from './modules/auth/routes';
import { cattleRoutes } from './modules/cattle/routes';
import { deviceRoutes } from './modules/devices/routes';
import { exportRoutes } from './modules/exports/routes';
import { healthRecordRoutes } from './modules/health/routes';
import { ingestRoutes } from './modules/ingest/routes';
import { readingRoutes } from './modules/readings/routes';
import { userRoutes } from './modules/users/routes';
import { healthRoutes } from './routes/health';

function corsOrigin(): boolean | string[] {
  if (env.CORS_ORIGIN.trim() === '*') return true;
  return env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    bodyLimit: 128 * 1024,
    trustProxy: true,
  });

  app.decorateRequest('user', null);
  app.decorateRequest('device', null);

  await app.register(cors, { origin: corsOrigin() });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${request.method} ${request.url}.`,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The request payload is invalid.',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode === 429) {
      return reply.code(429).send({
        error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.' },
      });
    }

    if (statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      });
    }

    request.log.error({ err: error }, 'Unhandled request error');
    return reply.code(500).send({
      error: { code: 'SERVER_ERROR', message: 'Internal server error.' },
    });
  });

  await app.register(healthRoutes);

  await app.register(
    async (v1) => {
      await v1.register(authRoutes);
      await v1.register(userRoutes);
      await v1.register(cattleRoutes);
      await v1.register(assessmentRoutes);
      await v1.register(alertRoutes);
      await v1.register(healthRecordRoutes);
      await v1.register(deviceRoutes);
      await v1.register(readingRoutes);
      await v1.register(ingestRoutes);
      await v1.register(exportRoutes);

      v1.get('/', async () => ({
        name: 'PathoTrace API',
        version: 'v1',
        docs: '/v1',
        health: '/health',
      }));
    },
    { prefix: '/v1' }
  );

  return app;
}

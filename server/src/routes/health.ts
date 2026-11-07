import type { FastifyInstance } from 'fastify';
import { query } from '../db/client';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async (_request, reply) => {
    try {
      await query('SELECT 1');
      return reply.send({ status: 'ready', timestamp: new Date().toISOString() });
    } catch {
      return reply.code(503).send({ status: 'not-ready', timestamp: new Date().toISOString() });
    }
  });
}

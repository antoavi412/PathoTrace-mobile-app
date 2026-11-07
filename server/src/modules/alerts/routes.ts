import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../../db/client';
import { authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';

interface AlertRow {
  id: string;
  cow_id: string;
  cow_tag_id: string;
  cow_name: string | null;
  category: 'low' | 'medium' | 'high';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  created_at: Date;
  read_at: Date | null;
  assessment_id: string | null;
}

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.get('/alerts', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({ limit: z.coerce.number().int().min(1).max(500).default(200) })
      .parse(request.query);

    const values: unknown[] = [];
    let where = '';
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where = `WHERE a.farm_id = $${values.length}`;
    }
    values.push(params.limit);

    const rows = await query<AlertRow>(
      `SELECT a.id, a.cow_id, c.tag_id AS cow_tag_id, c.name AS cow_name,
              a.category, a.severity, a.title, a.message, a.created_at,
              a.read_at, a.assessment_id
         FROM alerts a
         JOIN cattle c ON c.id = a.cow_id
         ${where}
        ORDER BY a.created_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        cowId: row.cow_id,
        cowTagId: row.cow_tag_id,
        cowName: row.cow_name ?? undefined,
        category: row.category,
        severity: row.severity,
        title: row.title,
        message: row.message,
        createdAt: row.created_at.toISOString(),
        read: row.read_at !== null,
        assessmentId: row.assessment_id ?? undefined,
      }))
    );
  });

  app.patch('/alerts/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ read: z.boolean().optional() }).parse(request.body);

    const alert = await queryOne<{ id: string; farm_id: string }>(
      'SELECT id, farm_id FROM alerts WHERE id = $1',
      [params.id]
    );
    if (!alert) throw ApiError.notFound('Alert not found.');
    if (user.role !== 'admin' && alert.farm_id !== user.farmId) {
      throw ApiError.forbidden('This alert belongs to another farm.');
    }

    if (body.read !== undefined) {
      await query('UPDATE alerts SET read_at = $1 WHERE id = $2', [
        body.read ? new Date() : null,
        params.id,
      ]);
    }

    return reply.send({ ok: true });
  });
}

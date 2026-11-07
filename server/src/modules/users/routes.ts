import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../../db/client';
import { audit } from '../../lib/audit';
import { authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { serializeUser } from '../../lib/serializers';
import { loadUserById } from '../../lib/auth';

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(200).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No fields to update.');

const preferencesSchema = z.object({
  language: z.enum(['en']).optional(),
  notifications: z
    .object({
      high: z.boolean(),
      medium: z.boolean(),
      low: z.boolean(),
    })
    .optional(),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.patch('/users/me', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const body = profileSchema.parse(request.body);

    const sets: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) {
      values.push(body.name);
      sets.push(`name = $${values.length}`);
    }
    if (body.phone !== undefined) {
      values.push(body.phone || null);
      sets.push(`phone = $${values.length}`);
    }
    if (body.email !== undefined) {
      values.push(body.email.toLowerCase());
      sets.push(`email = $${values.length}`);
    }

    values.push(user.id);
    try {
      await query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
        values
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw ApiError.conflict('That email or phone is already in use.');
      }
      throw error;
    }

    const updated = await loadUserById(user.id);
    if (!updated) throw ApiError.notFound('User not found.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'user.update',
      entity: 'user',
      entityId: user.id,
      metadata: { fields: Object.keys(body) },
    });

    return reply.send(serializeUser(updated));
  });

  app.get('/users/me/preferences', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const row = await queryOne<{ preferences: Record<string, unknown> }>(
      'SELECT preferences FROM users WHERE id = $1',
      [user.id]
    );
    return reply.send({ preferences: row?.preferences ?? {} });
  });

  app.put('/users/me/preferences', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const body = preferencesSchema.parse(request.body);

    const row = await queryOne<{ preferences: Record<string, unknown> }>(
      `UPDATE users
          SET preferences = preferences || $1::jsonb, updated_at = now()
        WHERE id = $2
        RETURNING preferences`,
      [JSON.stringify(body), user.id]
    );

    return reply.send({ preferences: row?.preferences ?? {} });
  });
}

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../../db/client';
import { audit } from '../../lib/audit';
import { assertFarmScope, assertRole, authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import type { AuthUser } from '../../types/domain';

const healthRecordSchema = z.object({
  cowId: z.string().uuid(),
  kind: z.enum(['checkup', 'illness', 'treatment', 'observation', 'vaccination']),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
});

const observationSchema = z.object({
  cowId: z.string().uuid(),
  note: z.string().trim().min(1).max(4000),
});

async function assertCowInScope(user: AuthUser, cowId: string): Promise<{ farmId: string }> {
  const cow = await queryOne<{ farm_id: string }>('SELECT farm_id FROM cattle WHERE id = $1', [
    cowId,
  ]);
  if (!cow) throw ApiError.notFound('Cattle record not found.');
  assertFarmScope(user, cow.farm_id);
  return { farmId: cow.farm_id };
}

export async function healthRecordRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health-records', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({
        cowId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`hr.farm_id = $${values.length}`);
    }
    if (params.cowId) {
      values.push(params.cowId);
      where.push(`hr.cow_id = $${values.length}`);
    }
    values.push(params.limit);

    const rows = await query<{
      id: string;
      cow_id: string;
      kind: string;
      title: string;
      description: string | null;
      recorded_at: Date;
      recorded_by: string | null;
    }>(
      `SELECT hr.id, hr.cow_id, hr.kind, hr.title, hr.description, hr.recorded_at, hr.recorded_by
         FROM health_records hr
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY hr.recorded_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        cowId: row.cow_id,
        kind: row.kind,
        title: row.title,
        description: row.description ?? undefined,
        recordedAt: row.recorded_at.toISOString(),
        recordedBy: row.recorded_by ?? undefined,
        isDemonstration: false,
      }))
    );
  });

  app.post('/health-records', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'veterinarian', 'admin']);
    const body = healthRecordSchema.parse(request.body);
    const { farmId } = await assertCowInScope(user, body.cowId);

    const row = await queryOne<{
      id: string;
      cow_id: string;
      kind: string;
      title: string;
      description: string | null;
      recorded_at: Date;
      recorded_by: string | null;
    }>(
      `INSERT INTO health_records (farm_id, cow_id, kind, title, description, recorded_at, recorded_by)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7)
       RETURNING id, cow_id, kind, title, description, recorded_at, recorded_by`,
      [
        farmId,
        body.cowId,
        body.kind,
        body.title,
        body.description ?? null,
        body.recordedAt ?? null,
        user.name,
      ]
    );
    if (!row) throw ApiError.internal('Could not create health record.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'health_record.create',
      entity: 'health_record',
      entityId: row.id,
    });

    return reply.code(201).send({
      id: row.id,
      cowId: row.cow_id,
      kind: row.kind,
      title: row.title,
      description: row.description ?? undefined,
      recordedAt: row.recorded_at.toISOString(),
      recordedBy: row.recorded_by ?? undefined,
      isDemonstration: false,
    });
  });

  app.get('/observations', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({
        cowId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`o.farm_id = $${values.length}`);
    }
    if (params.cowId) {
      values.push(params.cowId);
      where.push(`o.cow_id = $${values.length}`);
    }
    values.push(params.limit);

    const rows = await query<{
      id: string;
      cow_id: string;
      veterinarian_id: string | null;
      veterinarian_name: string | null;
      note: string;
      created_at: Date;
    }>(
      `SELECT o.id, o.cow_id, o.veterinarian_id, u.name AS veterinarian_name,
              o.note, o.created_at
         FROM observations o
         LEFT JOIN users u ON u.id = o.veterinarian_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY o.created_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        cowId: row.cow_id,
        veterinarianId: row.veterinarian_id ?? '',
        veterinarianName: row.veterinarian_name ?? 'Veterinarian',
        note: row.note,
        createdAt: row.created_at.toISOString(),
        syncStatus: 'synced',
        isDemonstration: false,
      }))
    );
  });

  app.post('/observations', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['veterinarian', 'admin']);
    const body = observationSchema.parse(request.body);
    const { farmId } = await assertCowInScope(user, body.cowId);

    const idempotencyKey =
      typeof request.headers['idempotency-key'] === 'string'
        ? request.headers['idempotency-key'].slice(0, 200)
        : null;

    const row = await queryOne<{
      id: string;
      cow_id: string;
      veterinarian_id: string | null;
      note: string;
      created_at: Date;
    }>(
      `INSERT INTO observations (farm_id, cow_id, veterinarian_id, note, idempotency_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (veterinarian_id, idempotency_key) WHERE idempotency_key IS NOT NULL
       DO UPDATE SET note = observations.note
       RETURNING id, cow_id, veterinarian_id, note, created_at`,
      [farmId, body.cowId, user.id, body.note, idempotencyKey]
    );
    if (!row) throw ApiError.internal('Could not create observation.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'observation.create',
      entity: 'observation',
      entityId: row.id,
    });

    return reply.code(201).send({
      id: row.id,
      cowId: row.cow_id,
      veterinarianId: row.veterinarian_id ?? '',
      veterinarianName: user.name,
      note: row.note,
      createdAt: row.created_at.toISOString(),
      syncStatus: 'synced',
      isDemonstration: false,
    });
  });
}

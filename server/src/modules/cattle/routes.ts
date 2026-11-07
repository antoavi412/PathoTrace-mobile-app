import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne } from '../../db/client';
import { audit } from '../../lib/audit';
import {
  assertFarmScope,
  assertRole,
  authenticate,
  canManageFarm,
  requireUser,
} from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { COW_SELECT, serializeCow, type CowRow } from './serialize';
import type { AuthUser } from '../../types/domain';

const cowCreateSchema = z.object({
  tagId: z.string().trim().min(1).max(64),
  name: z.string().trim().max(120).optional(),
  breed: z.string().trim().max(120).optional(),
  ageMonths: z.number().int().min(0).max(400).optional(),
  lactationNumber: z.number().int().min(0).max(20).optional(),
  lactationStage: z.string().trim().max(60).optional(),
  daysInMilk: z.number().int().min(0).max(1000).optional(),
  notes: z.string().max(4000).optional(),
  status: z.enum(['active', 'sold', 'dead']).optional(),
  farmId: z.string().uuid().optional(),
});

const cowUpdateSchema = cowCreateSchema
  .omit({ farmId: true })
  .partial()
  .extend({ status: z.enum(['active', 'sold', 'dead', 'archived']).optional() });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  risk: z.enum(['low', 'medium', 'high', 'unknown', 'all']).optional(),
  status: z.enum(['active', 'sold', 'dead', 'archived', 'all']).optional(),
  farmId: z.string().uuid().optional(),
});

function resolveFarmId(user: AuthUser, requested: string | undefined): string | null {
  if (user.role === 'admin') {
    if (requested) return requested;
    return null;
  }
  if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
  if (requested && requested !== user.farmId) {
    throw ApiError.forbidden('You cannot access another farm.');
  }
  return user.farmId;
}

async function findCow(id: string): Promise<CowRow | null> {
  return queryOne<CowRow>(`${COW_SELECT} WHERE c.id = $1`, [id]);
}

async function loadCowForUser(user: AuthUser, id: string): Promise<CowRow> {
  const row = await findCow(id);
  if (!row) throw ApiError.notFound('Cattle record not found.');
  assertFarmScope(user, row.farm_id);
  return row;
}

export async function cattleRoutes(app: FastifyInstance): Promise<void> {
  app.get('/cattle', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = listQuerySchema.parse(request.query);
    const farmId = resolveFarmId(user, params.farmId);

    const values: unknown[] = [];
    const where: string[] = [];

    if (farmId) {
      values.push(farmId);
      where.push(`c.farm_id = $${values.length}`);
    }

    // Archived animals are hidden unless explicitly requested.
    if (params.status && params.status !== 'all') {
      values.push(params.status);
      where.push(`c.status = $${values.length}`);
    } else if (!params.status) {
      where.push(`c.status <> 'archived'`);
    }

    if (params.q) {
      values.push(`%${params.q}%`);
      where.push(`(c.tag_id ILIKE $${values.length} OR c.name ILIKE $${values.length})`);
    }

    if (params.risk && params.risk !== 'all') {
      values.push(params.risk);
      where.push(`c.risk_status = $${values.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await queryOne<{ total: string }>(
      `SELECT count(*)::text AS total FROM cattle c ${whereSql}`,
      values
    );
    const total = Number(countRow?.total ?? 0);

    const offset = (params.page - 1) * params.pageSize;
    values.push(params.pageSize, offset);
    const rows = await query<CowRow>(
      `${COW_SELECT} ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return reply.send({
      items: rows.map(serializeCow),
      page: params.page,
      pageSize: params.pageSize,
      total,
      hasMore: offset + rows.length < total,
    });
  });

  app.get('/cattle/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const row = await loadCowForUser(user, params.id);
    return reply.send(serializeCow(row));
  });

  app.post('/cattle', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const body = cowCreateSchema.parse(request.body);

    const farmId = resolveFarmId(user, body.farmId);
    if (!farmId) throw ApiError.badRequest('farmId is required for administrators.');

    let row: CowRow | null;
    try {
      row = await queryOne<CowRow>(
        `WITH inserted AS (
           INSERT INTO cattle (farm_id, tag_id, name, breed, age_months, lactation_number,
                               lactation_stage, days_in_milk, notes, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *
         )
         SELECT i.id, i.tag_id, i.name, i.breed, i.age_months, i.lactation_number,
                i.lactation_stage, i.days_in_milk, i.farm_id, f.name AS farm_name,
                i.risk_status, i.status, i.last_assessment_at, i.last_assessment_id,
                i.notes, i.created_at, i.updated_at
           FROM inserted i JOIN farms f ON f.id = i.farm_id`,
        [
          farmId,
          body.tagId,
          body.name ?? null,
          body.breed ?? null,
          body.ageMonths ?? null,
          body.lactationNumber ?? null,
          body.lactationStage ?? null,
          body.daysInMilk ?? null,
          body.notes ?? null,
          body.status ?? 'active',
        ]
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw ApiError.conflict(`Tag ${body.tagId} already exists on this farm.`);
      }
      throw error;
    }

    if (!row) throw ApiError.internal('Could not create cattle record.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'cattle.create',
      entity: 'cattle',
      entityId: row.id,
    });

    return reply.code(201).send(serializeCow(row));
  });

  app.patch('/cattle/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    if (!canManageFarm(user)) throw ApiError.forbidden();

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = cowUpdateSchema.parse(request.body);
    await loadCowForUser(user, params.id);

    const columns: Record<string, string> = {
      tagId: 'tag_id',
      name: 'name',
      breed: 'breed',
      ageMonths: 'age_months',
      lactationNumber: 'lactation_number',
      lactationStage: 'lactation_stage',
      daysInMilk: 'days_in_milk',
      notes: 'notes',
      status: 'status',
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columns)) {
      if (body[key as keyof typeof body] !== undefined) {
        values.push(body[key as keyof typeof body]);
        sets.push(`${column} = $${values.length}`);
      }
    }

    if (sets.length === 0) throw ApiError.badRequest('No fields to update.');

    values.push(params.id);
    let updated: CowRow | null;
    try {
      updated = await queryOne<CowRow>(
        `WITH changed AS (
           UPDATE cattle
              SET ${sets.join(', ')}, updated_at = now()
            WHERE id = $${values.length}
            RETURNING *
         )
         SELECT c.id, c.tag_id, c.name, c.breed, c.age_months, c.lactation_number,
                c.lactation_stage, c.days_in_milk, c.farm_id, f.name AS farm_name,
                c.risk_status, c.status, c.last_assessment_at, c.last_assessment_id,
                c.notes, c.created_at, c.updated_at
           FROM changed c JOIN farms f ON f.id = c.farm_id`,
        values
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw ApiError.conflict('That tag or identifier is already in use on this farm.');
      }
      throw error;
    }

    if (!updated) throw ApiError.notFound('Cattle record not found.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'cattle.update',
      entity: 'cattle',
      entityId: updated.id,
      metadata: { fields: Object.keys(body) },
    });

    return reply.send(serializeCow(updated));
  });

  app.delete('/cattle/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    await loadCowForUser(user, params.id);

    await query(
      `UPDATE cattle SET status = 'archived', updated_at = now() WHERE id = $1`,
      [params.id]
    );
    await query(
      `UPDATE device_assignments SET removed_at = now()
        WHERE cow_id = $1 AND removed_at IS NULL`,
      [params.id]
    );

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'cattle.archive',
      entity: 'cattle',
      entityId: params.id,
    });

    return reply.send({ ok: true, id: params.id, status: 'archived' });
  });

  app.post('/cattle/:id/restore', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    await loadCowForUser(user, params.id);

    const row = await queryOne<CowRow>(
      `WITH changed AS (
         UPDATE cattle SET status = 'active', updated_at = now()
          WHERE id = $1
          RETURNING *
       )
       SELECT c.id, c.tag_id, c.name, c.breed, c.age_months, c.lactation_number,
              c.lactation_stage, c.days_in_milk, c.farm_id, f.name AS farm_name,
              c.risk_status, c.status, c.last_assessment_at, c.last_assessment_id,
              c.notes, c.created_at, c.updated_at
         FROM changed c JOIN farms f ON f.id = c.farm_id`,
      [params.id]
    );

    if (!row) throw ApiError.notFound('Cattle record not found.');
    return reply.send(serializeCow(row));
  });
}

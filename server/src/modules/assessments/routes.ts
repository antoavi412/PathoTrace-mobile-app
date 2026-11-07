import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../../db/client';
import { audit } from '../../lib/audit';
import { assertFarmScope, assertRole, authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { COW_SELECT, type CowRow } from '../cattle/serialize';
import { scoreMastitisRisk } from './risk';
import { ASSESSMENT_SELECT, serializeAssessment, type AssessmentRow } from './serialize';
import type { AuthUser } from '../../types/domain';

const assessmentSchema = z.object({
  cowId: z.string().uuid(),
  milkYieldLiters: z.number().finite().min(0).max(100),
  somaticCellCount: z.number().finite().min(0).max(10_000_000),
  milkTemperatureC: z.number().finite().min(0).max(60),
  daysInMilk: z.number().int().min(0).max(1000),
  lactationNumber: z.number().int().min(0).max(20),
});

const listQuerySchema = z.object({
  cowId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

async function loadCow(user: AuthUser, cowId: string): Promise<CowRow> {
  const cow = await queryOne<CowRow>(`${COW_SELECT} WHERE c.id = $1`, [cowId]);
  if (!cow) throw ApiError.notFound('Cattle record not found.');
  assertFarmScope(user, cow.farm_id);
  return cow;
}

function alertCopy(category: 'medium' | 'high', tagId: string): { title: string; message: string } {
  if (category === 'high') {
    return {
      title: `High mastitis risk for ${tagId}`,
      message:
        'The latest assessment indicates high risk. Inspect the animal and contact a veterinarian.',
    };
  }
  return {
    title: `Medium mastitis risk for ${tagId}`,
    message: 'The latest assessment indicates medium risk. Monitor the animal and re-test soon.',
  };
}

export async function assessmentRoutes(app: FastifyInstance): Promise<void> {
  app.get('/assessments', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = listQuerySchema.parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];

    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`a.farm_id = $${values.length}`);
    }
    if (params.cowId) {
      values.push(params.cowId);
      where.push(`a.cow_id = $${values.length}`);
    }

    values.push(params.limit);
    const rows = await query<AssessmentRow>(
      `${ASSESSMENT_SELECT}
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY a.created_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(rows.map(serializeAssessment));
  });

  app.get('/assessments/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const row = await queryOne<AssessmentRow>(`${ASSESSMENT_SELECT} WHERE a.id = $1`, [params.id]);
    if (!row) throw ApiError.notFound('Assessment not found.');
    if (user.role !== 'admin' && row.farm_id !== user.farmId) {
      throw ApiError.forbidden('This assessment belongs to another farm.');
    }
    return reply.send(serializeAssessment(row));
  });

  app.post('/assessments', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'veterinarian', 'admin']);
    const body = assessmentSchema.parse(request.body);
    const cow = await loadCow(user, body.cowId);

    const risk = scoreMastitisRisk(body);

    const assessment = await withTransaction(async (client) => {
      const inserted = await client.query<{ id: string; created_at: Date }>(
        `INSERT INTO assessments (
           farm_id, cow_id, category, probability, model_version,
           milk_yield_liters, somatic_cell_count, milk_temperature_c,
           days_in_milk, lactation_number, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, created_at`,
        [
          cow.farm_id,
          cow.id,
          risk.category,
          risk.probability,
          'heuristic-v1',
          body.milkYieldLiters,
          body.somaticCellCount,
          body.milkTemperatureC,
          body.daysInMilk,
          body.lactationNumber,
          user.id,
        ]
      );

      const created = inserted.rows[0];
      if (!created) throw ApiError.internal('Could not store assessment.');

      await client.query(
        `UPDATE cattle
            SET risk_status = $1,
                days_in_milk = $2,
                lactation_number = $3,
                last_assessment_at = $4,
                last_assessment_id = $5,
                updated_at = now()
          WHERE id = $6`,
        [
          risk.category,
          body.daysInMilk,
          body.lactationNumber,
          created.created_at,
          created.id,
          cow.id,
        ]
      );

      if (risk.category === 'medium' || risk.category === 'high') {
        const copy = alertCopy(risk.category, cow.tag_id);
        await client.query(
          `INSERT INTO alerts (farm_id, cow_id, assessment_id, category, severity, title, message)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [cow.farm_id, cow.id, created.id, risk.category, risk.category, copy.title, copy.message]
        );
      }

      return created;
    });

    const row = await queryOne<AssessmentRow>(`${ASSESSMENT_SELECT} WHERE a.id = $1`, [
      assessment.id,
    ]);
    if (!row) throw ApiError.internal('Assessment could not be read back.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'assessment.create',
      entity: 'assessment',
      entityId: row.id,
      metadata: { category: row.category },
    });

    return reply.code(201).send(serializeAssessment(row));
  });
}

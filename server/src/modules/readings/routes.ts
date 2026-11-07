import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { query, queryOne } from '../../db/client';
import { assertFarmScope, authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { parseBucketSeconds, parseDateRange } from '../../lib/time';

const readingsQuerySchema = z.object({
  metric: z.string().trim().max(40).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  bucket: z.string().trim().max(10).optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
});

interface ReadingRow {
  id: string;
  device_id: string;
  cow_id: string | null;
  metric: string;
  value: number;
  unit: string;
  quality: string;
  recorded_at: Date;
  received_at: Date;
}

interface BucketRow {
  metric: string;
  bucket: Date;
  avg_value: number;
  min_value: number;
  max_value: number;
  count: string;
}

async function assertDeviceScope(
  userId: string,
  role: string,
  farmId: string | null,
  deviceId: string
): Promise<void> {
  const device = await queryOne<{ farm_id: string }>('SELECT farm_id FROM devices WHERE id = $1', [
    deviceId,
  ]);
  if (!device) throw ApiError.notFound('Device not found.');
  if (role !== 'admin' && device.farm_id !== farmId) {
    throw ApiError.forbidden('This device belongs to another farm.');
  }
  if (!farmId && role !== 'admin') {
    throw ApiError.forbidden('Your account is not linked to a farm.');
  }
  void userId;
}

async function fetchReadings(params: {
  deviceId?: string;
  cowId?: string;
  metric?: string;
  from: Date;
  to: Date;
  bucketSeconds: number | null;
  limit: number;
}): Promise<Array<Record<string, unknown>>> {
  const values: unknown[] = [params.from, params.to];
  const where = ['recorded_at >= $1', 'recorded_at <= $2'];

  if (params.deviceId) {
    values.push(params.deviceId);
    where.push(`device_id = $${values.length}`);
  }
  if (params.cowId) {
    values.push(params.cowId);
    where.push(`cow_id = $${values.length}`);
  }
  if (params.metric) {
    values.push(params.metric);
    where.push(`metric = $${values.length}`);
  }

  if (params.bucketSeconds) {
    values.push(params.bucketSeconds, params.limit);
    const bucketIndex = values.length - 1;
    const limitIndex = values.length;
    const rows = await query<BucketRow>(
      `SELECT metric,
              to_timestamp(floor(extract(epoch FROM recorded_at) / $${bucketIndex}) * $${bucketIndex}) AS bucket,
              avg(value) AS avg_value,
              min(value) AS min_value,
              max(value) AS max_value,
              count(*)::text AS count
         FROM readings
        WHERE ${where.join(' AND ')}
        GROUP BY metric, bucket
        ORDER BY bucket ASC
        LIMIT $${limitIndex}`,
      values
    );

    return rows.map((row) => ({
      metric: row.metric,
      timestamp: row.bucket.toISOString(),
      avg: Number(row.avg_value),
      min: Number(row.min_value),
      max: Number(row.max_value),
      count: Number(row.count),
    }));
  }

  values.push(params.limit);
  const rows = await query<ReadingRow>(
    `SELECT id::text, device_id, cow_id, metric, value, unit, quality, recorded_at, received_at
       FROM readings
      WHERE ${where.join(' AND ')}
      ORDER BY recorded_at ASC
      LIMIT $${values.length}`,
    values
  );

  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    cowId: row.cow_id ?? undefined,
    metric: row.metric,
    value: row.value,
    unit: row.unit,
    quality: row.quality,
    recordedAt: row.recorded_at.toISOString(),
    receivedAt: row.received_at.toISOString(),
  }));
}

export async function readingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/devices/:id/readings', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const queryParams = readingsQuerySchema.parse(request.query);
    await assertDeviceScope(user.id, user.role, user.farmId, params.id);

    const range = parseDateRange(
      queryParams.from,
      queryParams.to,
      env.EXPORT_MAX_RANGE_DAYS,
      1
    );
    const bucketSeconds = parseBucketSeconds(queryParams.bucket);

    const points = await fetchReadings({
      deviceId: params.id,
      metric: queryParams.metric,
      from: range.from,
      to: range.to,
      bucketSeconds,
      limit: queryParams.limit,
    });

    return reply.send({
      deviceId: params.id,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      bucket: queryParams.bucket ?? null,
      points,
    });
  });

  app.get('/cattle/:id/readings', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const queryParams = readingsQuerySchema.parse(request.query);

    const cow = await queryOne<{ farm_id: string }>('SELECT farm_id FROM cattle WHERE id = $1', [
      params.id,
    ]);
    if (!cow) throw ApiError.notFound('Cattle record not found.');
    assertFarmScope(user, cow.farm_id);

    const range = parseDateRange(
      queryParams.from,
      queryParams.to,
      env.EXPORT_MAX_RANGE_DAYS,
      1
    );
    const bucketSeconds = parseBucketSeconds(queryParams.bucket);

    const points = await fetchReadings({
      cowId: params.id,
      metric: queryParams.metric,
      from: range.from,
      to: range.to,
      bucketSeconds,
      limit: queryParams.limit,
    });

    return reply.send({
      cowId: params.id,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      bucket: queryParams.bucket ?? null,
      points,
    });
  });
}

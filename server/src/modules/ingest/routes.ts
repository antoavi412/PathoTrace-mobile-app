import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getMetric } from '../../config/metrics';
import { env } from '../../config/env';
import { query, queryOne, withTransaction } from '../../db/client';
import { authenticateDevice, requireDevice } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { sha256 } from '../../lib/security';

const readingSchema = z.object({
  metric: z.string().trim().min(1).max(40),
  value: z.number().finite(),
  unit: z.string().trim().min(1).max(20),
  quality: z.enum(['good', 'suspect', 'missing']).default('good'),
  recordedAt: z.string().optional(),
});

const batchSchema = z.object({
  source: z.string().trim().max(40).optional(),
  bootId: z.string().trim().max(64).optional(),
  sequence: z.number().int().nonnegative().optional(),
  recordedAt: z.string().optional(),
  readings: z.array(readingSchema).min(1).max(100),
});

const heartbeatSchema = z.object({
  batteryPercent: z.number().int().min(0).max(100).optional(),
  signalStrength: z.number().int().min(-140).max(0).optional(),
  firmware: z.string().trim().max(100).optional(),
  recordedAt: z.string().optional(),
  bootId: z.string().max(64).optional(),
  sequence: z.number().int().nonnegative().optional(),
});

const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_BACKFILL_MS = 31 * 24 * 60 * 60 * 1000;

function parseTimestamp(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid timestamp');
  }
  return parsed;
}

function unitMatches(expected: string, provided: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[°\s]/g, '');
  const left = normalize(expected);
  const right = normalize(provided);
  if (left === right) return true;

  const aliases: Record<string, string[]> = {
    c: ['celsius', 'degc'],
    '%': ['percent', 'pct'],
    dbm: ['rssi'],
    index: ['count', 'steps'],
    'cells/ml': ['cells', 'count/ml'],
    minutes: ['min', 'mins'],
    l: ['liter', 'liters', 'litre', 'litres'],
    count: ['index'],
  };

  return (aliases[left] ?? []).includes(right) || (aliases[right] ?? []).includes(left);
}

interface ValidReading {
  metric: string;
  value: number;
  unit: string;
  quality: 'good' | 'suspect' | 'missing';
  recordedAt: Date;
}

interface RejectedReading {
  index: number;
  metric?: string;
  reason: string;
}

function validateReadings(
  readings: z.infer<typeof readingSchema>[],
  batchRecordedAt: Date
): { valid: ValidReading[]; rejected: RejectedReading[] } {
  const now = Date.now();
  const valid: ValidReading[] = [];
  const rejected: RejectedReading[] = [];

  readings.forEach((reading, index) => {
    const definition = getMetric(reading.metric);
    if (!definition) {
      rejected.push({ index, metric: reading.metric, reason: 'Unknown metric.' });
      return;
    }

    if (!unitMatches(definition.unit, reading.unit)) {
      rejected.push({
        index,
        metric: reading.metric,
        reason: `Unit mismatch: expected ${definition.unit}.`,
      });
      return;
    }

    if (reading.value < definition.min || reading.value > definition.max) {
      rejected.push({
        index,
        metric: reading.metric,
        reason: `Value out of range ${definition.min}..${definition.max}.`,
      });
      return;
    }

    let recordedAt: Date;
    try {
      recordedAt = parseTimestamp(reading.recordedAt, batchRecordedAt);
    } catch {
      rejected.push({ index, metric: reading.metric, reason: 'Invalid recordedAt timestamp.' });
      return;
    }

    if (recordedAt.getTime() > now + MAX_FUTURE_SKEW_MS) {
      rejected.push({ index, metric: reading.metric, reason: 'Timestamp too far in the future.' });
      return;
    }
    if (recordedAt.getTime() < now - MAX_BACKFILL_MS) {
      rejected.push({ index, metric: reading.metric, reason: 'Timestamp older than retention limit.' });
      return;
    }

    valid.push({
      metric: reading.metric,
      value: reading.value,
      unit: definition.unit,
      quality: reading.quality,
      recordedAt,
    });
  });

  return { valid, rejected };
}

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/ingest/readings',
    {
      preHandler: authenticateDevice,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: (request) => sha256(request.headers.authorization ?? request.ip),
        },
      },
    },
    async (request, reply) => {
      const device = requireDevice(request);
      const body = batchSchema.parse(request.body);

      const serverTime = new Date();
      let batchRecordedAt: Date;
      try {
        batchRecordedAt = parseTimestamp(body.recordedAt, serverTime);
      } catch {
        throw ApiError.badRequest('Invalid `recordedAt` timestamp.');
      }

      const { valid, rejected } = validateReadings(body.readings, batchRecordedAt);

      const batchId = randomUUID();
      const activeAssignment = await queryOne<{ cow_id: string }>(
        `SELECT cow_id FROM device_assignments
          WHERE device_id = $1 AND removed_at IS NULL
          LIMIT 1`,
        [device.id]
      );
      const cowId = activeAssignment?.cow_id ?? null;

      let accepted = 0;
      let duplicates = 0;

      await withTransaction(async (client) => {
        for (const reading of valid) {
          const inserted = await client.query(
            `INSERT INTO readings
               (device_id, cow_id, metric, value, unit, quality, recorded_at, batch_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (device_id, metric, recorded_at) DO NOTHING
             RETURNING id`,
            [
              device.id,
              cowId,
              reading.metric,
              reading.value,
              reading.unit,
              reading.quality,
              reading.recordedAt,
              batchId,
            ]
          );
          if (inserted.rowCount) accepted += 1;
          else duplicates += 1;
        }

        const latestBattery = valid.find((reading) => reading.metric === 'battery');
        const latestSignal = valid.find((reading) => reading.metric === 'signal');
        const newest = valid.reduce<Date | null>(
          (latest, reading) =>
            !latest || reading.recordedAt > latest ? reading.recordedAt : latest,
          null
        );

        await client.query(
          `UPDATE devices
              SET last_seen_at = $1,
                  status = 'online',
                  battery_percent = COALESCE($2, battery_percent),
                  signal_strength = COALESCE($3, signal_strength),
                  updated_at = now()
            WHERE id = $4`,
          [
            newest ?? serverTime,
            latestBattery ? Math.round(latestBattery.value) : null,
            latestSignal ? Math.round(latestSignal.value) : null,
            device.id,
          ]
        );

        await client.query(
          `INSERT INTO ingest_batches
             (id, device_id, boot_id, sequence, source, accepted, duplicates, rejected)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            batchId,
            device.id,
            body.bootId ?? null,
            body.sequence ?? null,
            body.source ?? 'cellular',
            accepted,
            duplicates,
            rejected.length,
          ]
        );
      });

      return reply.code(202).send({
        accepted,
        duplicates,
        rejected: rejected.length,
        batchId,
        serverTime: serverTime.toISOString(),
        errors: rejected.length > 0 ? rejected : undefined,
      });
    }
  );

  app.post(
    '/ingest/heartbeat',
    {
      preHandler: authenticateDevice,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
          keyGenerator: (request) => sha256(request.headers.authorization ?? request.ip),
        },
      },
    },
    async (request, reply) => {
      const device = requireDevice(request);
      const body = heartbeatSchema.parse(request.body);

      let recordedAt = new Date();
      if (body.recordedAt) {
        try {
          recordedAt = parseTimestamp(body.recordedAt, recordedAt);
        } catch {
          throw ApiError.badRequest('Invalid `recordedAt` timestamp.');
        }
      }

      await query(
        `UPDATE devices
            SET last_seen_at = GREATEST(COALESCE(last_seen_at, $1), $1),
                status = 'online',
                battery_percent = COALESCE($2, battery_percent),
                signal_strength = COALESCE($3, signal_strength),
                firmware = COALESCE($4, firmware),
                updated_at = now()
          WHERE id = $5`,
        [
          recordedAt,
          body.batteryPercent ?? null,
          body.signalStrength ?? null,
          body.firmware ?? null,
          device.id,
        ]
      );

      return reply.send({
        ok: true,
        serverTime: new Date().toISOString(),
        expectedIntervalSeconds: device.expectedIntervalSeconds,
      });
    }
  );

  app.get('/device/config', { preHandler: authenticateDevice }, async (request, reply) => {
    const device = requireDevice(request);
    return reply.send({
      deviceId: device.id,
      serialNumber: device.serialNumber,
      expectedIntervalSeconds: device.expectedIntervalSeconds,
      temperatureHighC: env.TEMPERATURE_HIGH_C,
      serverTime: new Date().toISOString(),
    });
  });
}

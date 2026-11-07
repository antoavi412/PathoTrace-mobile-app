import { Readable } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env';
import { query } from '../../db/client';
import { authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { csvEscape } from '../../lib/csv';
import { formatIst, parseDateRange } from '../../lib/time';

const exportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  farmId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  cowId: z.string().uuid().optional(),
  metric: z.string().trim().max(40).optional(),
});

const HEADERS = [
  'reading_id',
  'farm_id',
  'farm_name',
  'device_id',
  'device_serial',
  'cow_id',
  'cow_tag_id',
  'metric',
  'value',
  'unit',
  'quality',
  'recorded_at_utc',
  'recorded_at_ist',
  'received_at_utc',
];

interface ExportRow {
  id: string;
  farm_id: string;
  farm_name: string;
  device_id: string;
  serial_number: string;
  cow_id: string | null;
  cow_tag_id: string | null;
  metric: string;
  value: number;
  unit: string;
  quality: string;
  recorded_at: Date;
  received_at: Date;
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/exports/readings.csv',
    {
      preHandler: authenticate,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const user = requireUser(request);
      const params = exportQuerySchema.parse(request.query);

      let farmId: string | null = null;
      if (user.role === 'admin') {
        farmId = params.farmId ?? null;
      } else {
        if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
        if (params.farmId && params.farmId !== user.farmId) {
          throw ApiError.forbidden('You cannot export another farm.');
        }
        farmId = user.farmId;
      }

      const range = parseDateRange(params.from, params.to, env.EXPORT_MAX_RANGE_DAYS, 7);

      const filename = `pathotrace-readings-${isoDate(range.from)}_${isoDate(range.to)}.csv`;

      async function* rows(): AsyncGenerator<string> {
        yield '\uFEFF';
        yield `${HEADERS.map(csvEscape).join(',')}\r\n`;

        let cursorTime = range.from;
        let cursorId = '0';
        let emitted = 0;

        while (emitted < env.EXPORT_MAX_ROWS) {
          const batch = await query<ExportRow>(
            `SELECT r.id::text, r.farm_id, f.name AS farm_name, r.device_id,
                    d.serial_number, r.cow_id, c.tag_id AS cow_tag_id, r.metric,
                    r.value, r.unit, r.quality, r.recorded_at, r.received_at
               FROM readings r
               JOIN devices d ON d.id = r.device_id
               JOIN farms f ON f.id = r.farm_id
               LEFT JOIN cattle c ON c.id = r.cow_id
              WHERE r.recorded_at >= $1
                AND r.recorded_at <= $2
                AND ($3::uuid IS NULL OR r.farm_id = $3)
                AND ($4::uuid IS NULL OR r.device_id = $4)
                AND ($5::uuid IS NULL OR r.cow_id = $5)
                AND ($6::text IS NULL OR r.metric = $6)
                AND (r.recorded_at, r.id) > ($7::timestamptz, $8::bigint)
              ORDER BY r.recorded_at ASC, r.id ASC
              LIMIT 2000`,
            [
              range.from,
              range.to,
              farmId,
              params.deviceId ?? null,
              params.cowId ?? null,
              params.metric ?? null,
              cursorTime,
              cursorId,
            ]
          );

          if (batch.length === 0) break;

          const lines = batch.map((row) =>
            [
              row.id,
              row.farm_id,
              row.farm_name,
              row.device_id,
              row.serial_number,
              row.cow_id ?? '',
              row.cow_tag_id ?? '',
              row.metric,
              row.value,
              row.unit,
              row.quality,
              row.recorded_at.toISOString(),
              formatIst(row.recorded_at),
              row.received_at.toISOString(),
            ]
              .map(csvEscape)
              .join(',')
          );

          yield `${lines.join('\r\n')}\r\n`;
          emitted += batch.length;

          const last = batch[batch.length - 1];
          if (!last) break;
          cursorTime = last.recorded_at;
          cursorId = last.id;
        }

        if (emitted >= env.EXPORT_MAX_ROWS) {
          request.log.warn(
            { rows: emitted, maxRows: env.EXPORT_MAX_ROWS },
            'CSV export truncated at EXPORT_MAX_ROWS'
          );
        }
      }

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Cache-Control', 'no-store')
        .header('X-Export-Max-Rows', String(env.EXPORT_MAX_ROWS))
        .send(Readable.from(rows()));
    }
  );
}

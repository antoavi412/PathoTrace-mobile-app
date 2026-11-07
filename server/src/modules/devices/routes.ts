import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query, queryOne, withTransaction } from '../../db/client';
import { audit } from '../../lib/audit';
import { assertFarmScope, assertRole, authenticate, requireUser } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { generateToken, hashDeviceToken } from '../../lib/security';
import { DEVICE_SELECT, serializeDevice, type DeviceRow } from './serialize';
import type { AuthUser } from '../../types/domain';

const deviceCreateSchema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(50),
  model: z.string().trim().max(100).optional(),
  firmware: z.string().trim().max(100).optional(),
  expectedIntervalSeconds: z.number().int().min(10).max(86400).optional(),
  farmId: z.string().uuid().optional(),
});

const deviceUpdateSchema = z
  .object({
    type: z.string().trim().min(1).max(50).optional(),
    model: z.string().trim().max(100).optional(),
    firmware: z.string().trim().max(100).optional(),
    status: z.enum(['online', 'offline', 'maintenance']).optional(),
    expectedIntervalSeconds: z.number().int().min(10).max(86400).optional(),
    batteryPercent: z.number().int().min(0).max(100).optional(),
    signalStrength: z.number().int().min(-140).max(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No fields to update.');

function resolveFarmId(user: AuthUser, requested: string | undefined): string {
  if (user.role === 'admin') {
    if (!requested) throw ApiError.badRequest('farmId is required for administrators.');
    return requested;
  }
  if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
  if (requested && requested !== user.farmId) {
    throw ApiError.forbidden('You cannot access another farm.');
  }
  return user.farmId;
}

async function loadDevice(user: AuthUser, id: string): Promise<DeviceRow> {
  const row = await queryOne<DeviceRow>(`${DEVICE_SELECT} WHERE d.id = $1`, [id]);
  if (!row) throw ApiError.notFound('Device not found.');
  assertFarmScope(user, row.farm_id);
  return row;
}

export async function deviceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/devices', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({
        farmId: z.string().uuid().optional(),
        status: z.enum(['online', 'offline', 'maintenance']).optional(),
      })
      .parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`d.farm_id = $${values.length}`);
    } else if (params.farmId) {
      values.push(params.farmId);
      where.push(`d.farm_id = $${values.length}`);
    }
    if (params.status) {
      values.push(params.status);
      where.push(`d.status = $${values.length}`);
    }

    const rows = await query<DeviceRow>(
      `${DEVICE_SELECT}
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY d.last_seen_at DESC NULLS LAST, d.created_at DESC`,
      values
    );

    const counts = {
      total: rows.length,
      online: rows.filter((row) => row.status === 'online').length,
      offline: rows.filter((row) => row.status === 'offline').length,
      maintenance: rows.filter((row) => row.status === 'maintenance').length,
      lowBattery: rows.filter((row) => (row.battery_percent ?? 100) < 20).length,
    };

    return reply.send({ items: rows.map(serializeDevice), total: rows.length, counts });
  });

  app.get('/devices/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    return reply.send(serializeDevice(await loadDevice(user, params.id)));
  });

  app.post('/devices', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const body = deviceCreateSchema.parse(request.body);
    const farmId = resolveFarmId(user, body.farmId);

    const token = generateToken(32);
    let row: DeviceRow | null;
    try {
      const inserted = await queryOne<{ id: string }>(
        `INSERT INTO devices
           (farm_id, serial_number, type, model, firmware, expected_interval_seconds, token_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          farmId,
          body.serialNumber,
          body.type,
          body.model ?? null,
          body.firmware ?? null,
          body.expectedIntervalSeconds ?? 900,
          hashDeviceToken(token),
        ]
      );
      if (!inserted) throw ApiError.internal('Could not create device.');
      row = await queryOne<DeviceRow>(`${DEVICE_SELECT} WHERE d.id = $1`, [inserted.id]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw ApiError.conflict('A device with that serial number already exists.');
      }
      throw error;
    }

    if (!row) throw ApiError.internal('Could not read the created device.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'device.create',
      entity: 'device',
      entityId: row.id,
    });

    // The raw token is returned exactly once. Store it in the device firmware.
    return reply.code(201).send({ device: serializeDevice(row), token });
  });

  app.patch('/devices/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = deviceUpdateSchema.parse(request.body);
    await loadDevice(user, params.id);

    const columns: Record<string, string> = {
      type: 'type',
      model: 'model',
      firmware: 'firmware',
      status: 'status',
      expectedIntervalSeconds: 'expected_interval_seconds',
      batteryPercent: 'battery_percent',
      signalStrength: 'signal_strength',
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(columns)) {
      if (body[key as keyof typeof body] !== undefined) {
        values.push(body[key as keyof typeof body]);
        sets.push(`${column} = $${values.length}`);
      }
    }
    values.push(params.id);

    await query(
      `UPDATE devices SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length}`,
      values
    );

    const row = await queryOne<DeviceRow>(`${DEVICE_SELECT} WHERE d.id = $1`, [params.id]);
    if (!row) throw ApiError.notFound('Device not found.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'device.update',
      entity: 'device',
      entityId: params.id,
      metadata: { fields: Object.keys(body) },
    });

    return reply.send(serializeDevice(row));
  });

  app.post('/devices/:id/rotate-token', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const device = await loadDevice(user, params.id);

    const token = generateToken(32);
    await query(
      `UPDATE devices
          SET token_hash = $1, secret_rotated_at = now(), updated_at = now()
        WHERE id = $2`,
      [hashDeviceToken(token), device.id]
    );

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'device.rotate_token',
      entity: 'device',
      entityId: device.id,
    });

    return reply.send({ id: device.id, token });
  });

  app.post('/devices/:id/assign', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ cowId: z.string().uuid() }).parse(request.body);
    const device = await loadDevice(user, params.id);

    const cow = await queryOne<{ id: string; farm_id: string }>(
      'SELECT id, farm_id FROM cattle WHERE id = $1',
      [body.cowId]
    );
    if (!cow) throw ApiError.notFound('Cattle record not found.');
    if (cow.farm_id !== device.farm_id) {
      throw ApiError.badRequest('Device and cattle must belong to the same farm.');
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE device_assignments
            SET removed_at = now()
          WHERE removed_at IS NULL AND (device_id = $1 OR cow_id = $2)`,
        [device.id, cow.id]
      );
      await client.query(
        `INSERT INTO device_assignments (device_id, cow_id) VALUES ($1, $2)`,
        [device.id, cow.id]
      );
    });

    const row = await queryOne<DeviceRow>(`${DEVICE_SELECT} WHERE d.id = $1`, [device.id]);
    if (!row) throw ApiError.notFound('Device not found.');

    await audit({
      actorType: 'user',
      actorId: user.id,
      action: 'device.assign',
      entity: 'device',
      entityId: device.id,
      metadata: { cowId: cow.id },
    });

    return reply.send(serializeDevice(row));
  });

  app.delete('/devices/:id/assign', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    assertRole(user, ['farmer', 'admin']);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const device = await loadDevice(user, params.id);

    await query(
      `UPDATE device_assignments SET removed_at = now()
        WHERE device_id = $1 AND removed_at IS NULL`,
      [device.id]
    );

    const row = await queryOne<DeviceRow>(`${DEVICE_SELECT} WHERE d.id = $1`, [device.id]);
    if (!row) throw ApiError.notFound('Device not found.');
    return reply.send(serializeDevice(row));
  });

  app.get('/farms/:farmId/devices/status', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ farmId: z.string().uuid() }).parse(request.params);
    assertFarmScope(user, params.farmId);

    const row = await queryOne<{
      total: string;
      online: string;
      offline: string;
      maintenance: string;
      low_battery: string;
      silent: string;
    }>(
      `SELECT count(*)::text AS total,
              count(*) FILTER (WHERE status = 'online')::text AS online,
              count(*) FILTER (WHERE status = 'offline')::text AS offline,
              count(*) FILTER (WHERE status = 'maintenance')::text AS maintenance,
              count(*) FILTER (WHERE battery_percent < 20)::text AS low_battery,
              count(*) FILTER (
                WHERE last_seen_at IS NULL
                   OR last_seen_at < now() - (expected_interval_seconds * 2) * interval '1 second'
              )::text AS silent
         FROM devices
        WHERE farm_id = $1`,
      [params.farmId]
    );

    const alerts = await queryOne<{ open: string }>(
      `SELECT count(*)::text AS open FROM hardware_alerts
        WHERE farm_id = $1 AND status = 'open'`,
      [params.farmId]
    );

    return reply.send({
      farmId: params.farmId,
      total: Number(row?.total ?? 0),
      online: Number(row?.online ?? 0),
      offline: Number(row?.offline ?? 0),
      maintenance: Number(row?.maintenance ?? 0),
      lowBattery: Number(row?.low_battery ?? 0),
      silent: Number(row?.silent ?? 0),
      openAlerts: Number(alerts?.open ?? 0),
    });
  });

  app.get('/device-events', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({
        status: z.enum(['open', 'acknowledged', 'all']).default('all'),
        deviceId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`e.farm_id = $${values.length}`);
    }
    if (params.status === 'open') where.push('e.acknowledged_at IS NULL');
    if (params.status === 'acknowledged') where.push('e.acknowledged_at IS NOT NULL');
    if (params.deviceId) {
      values.push(params.deviceId);
      where.push(`e.device_id = $${values.length}`);
    }
    values.push(params.limit);

    const rows = await query<{
      id: string;
      device_id: string;
      serial_number: string;
      type: string;
      severity: string;
      message: string;
      created_at: Date;
      acknowledged_at: Date | null;
    }>(
      `SELECT e.id, e.device_id, d.serial_number, e.type, e.severity, e.message,
              e.created_at, e.acknowledged_at
         FROM device_events e
         JOIN devices d ON d.id = e.device_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY e.created_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        deviceId: row.device_id,
        deviceSerial: row.serial_number,
        type: row.type,
        severity: row.severity,
        message: row.message,
        createdAt: row.created_at.toISOString(),
        acknowledgedAt: row.acknowledged_at?.toISOString(),
      }))
    );
  });

  app.patch('/device-events/:id/ack', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const event = await queryOne<{ id: string; farm_id: string }>(
      'SELECT id, farm_id FROM device_events WHERE id = $1',
      [params.id]
    );
    if (!event) throw ApiError.notFound('Device event not found.');
    assertFarmScope(user, event.farm_id);

    await query(
      `UPDATE device_events
          SET acknowledged_at = COALESCE(acknowledged_at, now()), acknowledged_by = $1
        WHERE id = $2`,
      [user.id, params.id]
    );

    return reply.send({ ok: true });
  });

  app.get('/hardware-alerts', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({
        status: z.enum(['open', 'resolved', 'all']).default('open'),
        limit: z.coerce.number().int().min(1).max(500).default(200),
      })
      .parse(request.query);

    const values: unknown[] = [];
    const where: string[] = [];
    if (user.role !== 'admin') {
      if (!user.farmId) throw ApiError.forbidden('Your account is not linked to a farm.');
      values.push(user.farmId);
      where.push(`h.farm_id = $${values.length}`);
    }
    if (params.status !== 'all') {
      values.push(params.status);
      where.push(`h.status = $${values.length}`);
    }
    values.push(params.limit);

    const rows = await query<{
      id: string;
      device_id: string;
      serial_number: string;
      cow_id: string | null;
      cow_tag_id: string | null;
      rule_key: string;
      severity: string;
      message: string;
      status: string;
      opened_at: Date;
      resolved_at: Date | null;
      acknowledged_at: Date | null;
    }>(
      `SELECT h.id, h.device_id, d.serial_number, h.cow_id, c.tag_id AS cow_tag_id,
              h.rule_key, h.severity, h.message, h.status, h.opened_at,
              h.resolved_at, h.acknowledged_at
         FROM hardware_alerts h
         JOIN devices d ON d.id = h.device_id
         LEFT JOIN cattle c ON c.id = h.cow_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY h.opened_at DESC
        LIMIT $${values.length}`,
      values
    );

    return reply.send(
      rows.map((row) => ({
        id: row.id,
        deviceId: row.device_id,
        deviceSerial: row.serial_number,
        cowId: row.cow_id ?? undefined,
        cowTagId: row.cow_tag_id ?? undefined,
        ruleKey: row.rule_key,
        severity: row.severity,
        message: row.message,
        status: row.status,
        openedAt: row.opened_at.toISOString(),
        resolvedAt: row.resolved_at?.toISOString(),
        acknowledgedAt: row.acknowledged_at?.toISOString(),
      }))
    );
  });

  app.patch('/hardware-alerts/:id/ack', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const alert = await queryOne<{ id: string; farm_id: string }>(
      'SELECT id, farm_id FROM hardware_alerts WHERE id = $1',
      [params.id]
    );
    if (!alert) throw ApiError.notFound('Hardware alert not found.');
    assertFarmScope(user, alert.farm_id);

    await query(
      `UPDATE hardware_alerts
          SET acknowledged_at = COALESCE(acknowledged_at, now()), acknowledged_by = $1
        WHERE id = $2`,
      [user.id, params.id]
    );

    return reply.send({ ok: true });
  });

  app.patch('/hardware-alerts/:id/resolve', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const alert = await queryOne<{ id: string; farm_id: string }>(
      'SELECT id, farm_id FROM hardware_alerts WHERE id = $1',
      [params.id]
    );
    if (!alert) throw ApiError.notFound('Hardware alert not found.');
    assertFarmScope(user, alert.farm_id);

    await query(
      `UPDATE hardware_alerts
          SET status = 'resolved', resolved_at = COALESCE(resolved_at, now())
        WHERE id = $1`,
      [params.id]
    );

    return reply.send({ ok: true });
  });
}

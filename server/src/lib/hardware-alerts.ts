import { query, queryOne } from '../db/client';
import type { AlertSeverity } from '../types/domain';

/**
 * Open (or refresh) a hardware alert.
 *
 * The partial unique index `(device_id, rule_key) WHERE status = 'open'`
 * guarantees a single open alert per rule per device.
 */
export async function openHardwareAlert(params: {
  farmId: string;
  deviceId: string;
  cowId?: string | null;
  ruleKey: string;
  severity: AlertSeverity;
  message: string;
}): Promise<void> {
  await query(
    `INSERT INTO hardware_alerts (farm_id, device_id, cow_id, rule_key, severity, message)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (device_id, rule_key) WHERE status = 'open'
     DO UPDATE SET
       severity = EXCLUDED.severity,
       message = EXCLUDED.message,
       cow_id = COALESCE(EXCLUDED.cow_id, hardware_alerts.cow_id)`,
    [
      params.farmId,
      params.deviceId,
      params.cowId ?? null,
      params.ruleKey,
      params.severity,
      params.message,
    ]
  );
}

export async function resolveHardwareAlert(deviceId: string, ruleKey: string): Promise<void> {
  await query(
    `UPDATE hardware_alerts
        SET status = 'resolved', resolved_at = now()
      WHERE device_id = $1 AND rule_key = $2 AND status = 'open'`,
    [deviceId, ruleKey]
  );
}

/**
 * Record a diagnostic device event, avoiding a flood of identical events.
 * At most one event of a given type is stored per device per hour.
 */
export async function recordDeviceEvent(params: {
  farmId: string;
  deviceId: string;
  type: string;
  severity: AlertSeverity;
  message: string;
}): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id
       FROM device_events
      WHERE device_id = $1 AND type = $2 AND created_at > now() - interval '1 hour'
      LIMIT 1`,
    [params.deviceId, params.type]
  );
  if (existing) return;

  await query(
    `INSERT INTO device_events (farm_id, device_id, type, severity, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.farmId, params.deviceId, params.type, params.severity, params.message]
  );
}

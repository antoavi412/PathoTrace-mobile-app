import type { DeviceStatus } from '../../types/domain';

export interface DeviceRow {
  id: string;
  farm_id: string;
  farm_name: string | null;
  serial_number: string;
  type: string;
  model: string | null;
  firmware: string | null;
  status: DeviceStatus;
  battery_percent: number | null;
  signal_strength: number | null;
  last_seen_at: Date | null;
  expected_interval_seconds: number;
  created_at: Date;
  updated_at: Date;
  cow_id: string | null;
  cow_tag_id: string | null;
  cow_name: string | null;
}

export const DEVICE_SELECT = `
  SELECT d.id, d.farm_id, f.name AS farm_name, d.serial_number, d.type, d.model,
         d.firmware, d.status, d.battery_percent, d.signal_strength, d.last_seen_at,
         d.expected_interval_seconds, d.created_at, d.updated_at,
         a.cow_id, c.tag_id AS cow_tag_id, c.name AS cow_name
    FROM devices d
    JOIN farms f ON f.id = d.farm_id
    LEFT JOIN LATERAL (
      SELECT da.cow_id
        FROM device_assignments da
       WHERE da.device_id = d.id AND da.removed_at IS NULL
       ORDER BY da.assigned_at DESC
       LIMIT 1
    ) a ON TRUE
    LEFT JOIN cattle c ON c.id = a.cow_id
`;

export function serializeDevice(row: DeviceRow): Record<string, unknown> {
  return {
    id: row.id,
    farmId: row.farm_id,
    farmName: row.farm_name ?? undefined,
    serialNumber: row.serial_number,
    type: row.type,
    model: row.model ?? undefined,
    firmware: row.firmware ?? undefined,
    status: row.status,
    batteryPercent: row.battery_percent ?? undefined,
    signalStrength: row.signal_strength ?? undefined,
    lastSeenAt: row.last_seen_at?.toISOString(),
    expectedIntervalSeconds: row.expected_interval_seconds,
    cowId: row.cow_id ?? undefined,
    cowTagId: row.cow_tag_id ?? undefined,
    cowName: row.cow_name ?? undefined,
    assignedCow: row.cow_id
      ? { id: row.cow_id, tagId: row.cow_tag_id, name: row.cow_name ?? undefined }
      : undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

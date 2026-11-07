import { query } from '../../db/client';
import {
  openHardwareAlert,
  recordDeviceEvent,
  resolveHardwareAlert,
} from '../../lib/hardware-alerts';

interface SilentDeviceRow {
  id: string;
  farm_id: string;
  serial_number: string;
  last_seen_at: Date | null;
  expected_interval_seconds: number;
  cow_id: string | null;
}

interface RecoveredDeviceRow {
  id: string;
  farm_id: string;
  serial_number: string;
  cow_id: string | null;
}

/**
 * Mark devices offline when they miss two expected reporting intervals, and
 * bring them back online when data resumes.
 */
export async function deviceSilenceHandler(): Promise<void> {
  const silent = await query<SilentDeviceRow>(
    `SELECT d.id, d.farm_id, d.serial_number, d.last_seen_at, d.expected_interval_seconds,
            (SELECT da.cow_id
               FROM device_assignments da
              WHERE da.device_id = d.id AND da.removed_at IS NULL
              LIMIT 1) AS cow_id
       FROM devices d
      WHERE d.status <> 'maintenance'
        AND (
          d.last_seen_at IS NULL
          OR d.last_seen_at < now() - (d.expected_interval_seconds * 2) * interval '1 second'
        )`
  );

  for (const device of silent) {
    if (device.last_seen_at !== null) {
      await query(`UPDATE devices SET status = 'offline', updated_at = now() WHERE id = $1`, [
        device.id,
      ]);
    }

    const lastSeen = device.last_seen_at
      ? `Last seen ${device.last_seen_at.toISOString()}`
      : 'No reading has ever been received';

    await openHardwareAlert({
      farmId: device.farm_id,
      deviceId: device.id,
      cowId: device.cow_id,
      ruleKey: 'device-silent',
      severity: 'critical',
      message: `${device.serial_number} is not reporting. ${lastSeen}.`,
    });

    await recordDeviceEvent({
      farmId: device.farm_id,
      deviceId: device.id,
      type: 'device-silent',
      severity: 'critical',
      message: `${device.serial_number} stopped reporting.`,
    });
  }

  const recovered = await query<RecoveredDeviceRow>(
    `SELECT d.id, d.farm_id, d.serial_number,
            (SELECT da.cow_id
               FROM device_assignments da
              WHERE da.device_id = d.id AND da.removed_at IS NULL
              LIMIT 1) AS cow_id
       FROM devices d
      WHERE d.status = 'offline'
        AND d.last_seen_at IS NOT NULL
        AND d.last_seen_at >= now() - (d.expected_interval_seconds * 2) * interval '1 second'`
  );

  for (const device of recovered) {
    await query(`UPDATE devices SET status = 'online', updated_at = now() WHERE id = $1`, [
      device.id,
    ]);
    await resolveHardwareAlert(device.id, 'device-silent');
    await recordDeviceEvent({
      farmId: device.farm_id,
      deviceId: device.id,
      type: 'device-recovered',
      severity: 'info',
      message: `${device.serial_number} is reporting again.`,
    });
  }
}

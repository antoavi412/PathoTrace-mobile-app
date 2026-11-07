import { env } from '../../config/env';
import { query } from '../../db/client';
import {
  openHardwareAlert,
  recordDeviceEvent,
  resolveHardwareAlert,
} from '../../lib/hardware-alerts';

interface DeviceAlertRow {
  id: string;
  farm_id: string;
  serial_number: string;
  battery_percent: number | null;
  cow_id: string | null;
}

interface TemperatureRow {
  device_id: string;
  farm_id: string;
  serial_number: string;
  cow_id: string | null;
  value: number;
  recorded_at: Date;
  rank: string;
}

/** Evaluate battery and temperature rules. Safe to run repeatedly. */
export async function alertEvaluateHandler(): Promise<void> {
  const devices = await query<DeviceAlertRow>(
    `SELECT d.id, d.farm_id, d.serial_number, d.battery_percent,
            (SELECT da.cow_id
               FROM device_assignments da
              WHERE da.device_id = d.id AND da.removed_at IS NULL
              LIMIT 1) AS cow_id
       FROM devices d
      WHERE d.status <> 'maintenance'`
  );

  for (const device of devices) {
    if (device.battery_percent !== null && device.battery_percent < 20) {
      await openHardwareAlert({
        farmId: device.farm_id,
        deviceId: device.id,
        cowId: device.cow_id,
        ruleKey: 'battery-low',
        severity: device.battery_percent < 10 ? 'critical' : 'warning',
        message: `${device.serial_number} battery is at ${device.battery_percent}%.`,
      });
      await recordDeviceEvent({
        farmId: device.farm_id,
        deviceId: device.id,
        type: 'battery-low',
        severity: device.battery_percent < 10 ? 'critical' : 'warning',
        message: `Battery low (${device.battery_percent}%).`,
      });
    } else {
      await resolveHardwareAlert(device.id, 'battery-low');
    }
  }

  // Two consecutive temperature readings above the threshold open the alert.
  const temperatures = await query<TemperatureRow>(
    `WITH latest AS (
       SELECT r.device_id, r.value, r.recorded_at,
              row_number() OVER (PARTITION BY r.device_id ORDER BY r.recorded_at DESC) AS rank
         FROM readings r
        WHERE r.metric = 'temperature'
          AND r.recorded_at > now() - interval '2 hours'
     )
     SELECT l.device_id, d.farm_id, d.serial_number,
            (SELECT da.cow_id
               FROM device_assignments da
              WHERE da.device_id = d.id AND da.removed_at IS NULL
              LIMIT 1) AS cow_id,
            l.value, l.recorded_at, l.rank::text
       FROM latest l
       JOIN devices d ON d.id = l.device_id
      WHERE l.rank <= 2
      ORDER BY l.device_id, l.rank`
  );

  const byDevice = new Map<string, TemperatureRow[]>();
  for (const row of temperatures) {
    const list = byDevice.get(row.device_id) ?? [];
    list.push(row);
    byDevice.set(row.device_id, list);
  }

  for (const [deviceId, rows] of byDevice) {
    const latest = rows[0];
    if (!latest) continue;
    const previous = rows[1];

    if (
      latest.value > env.TEMPERATURE_HIGH_C &&
      previous &&
      previous.value > env.TEMPERATURE_HIGH_C
    ) {
      await openHardwareAlert({
        farmId: latest.farm_id,
        deviceId,
        cowId: latest.cow_id,
        ruleKey: 'temperature-high',
        severity: 'critical',
        message: `${latest.serial_number} temperature is ${latest.value.toFixed(1)}C, above ${env.TEMPERATURE_HIGH_C}C.`,
      });
      await recordDeviceEvent({
        farmId: latest.farm_id,
        deviceId,
        type: 'temperature-high',
        severity: 'critical',
        message: `High temperature: ${latest.value.toFixed(1)}C.`,
      });
    } else if (latest.value <= env.TEMPERATURE_HIGH_C) {
      await resolveHardwareAlert(deviceId, 'temperature-high');
    }
  }
}

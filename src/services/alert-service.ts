import { IS_DEMO_MODE } from '@/constants/config';
import type { HealthAlert, Resource } from '@/types';
import { DEMO_ALERTS } from './demo/demo-data';
import { readAlertReadIds, saveAlertReadId, saveAlertReadIds } from './local-store';
import { remoteAlerts, remoteMarkAlertRead } from './remote/api';
import { resolveResource } from './resource';
import { isNetworkAvailable } from './network';

export function applyAlertReadOverrides(alerts: HealthAlert[], readIds: string[]): HealthAlert[] {
  return alerts.map((alert) => ({
    ...alert,
    read: alert.read || readIds.includes(alert.id),
  }));
}

export async function fetchAlerts(): Promise<Resource<HealthAlert[]>> {
  const readIds = await readAlertReadIds();
  return resolveResource({
    key: 'alerts',
    demo: () => applyAlertReadOverrides(DEMO_ALERTS, readIds),
    remote: async () => applyAlertReadOverrides(await remoteAlerts(), readIds),
  });
}

export async function markAlertRead(id: string): Promise<void> {
  if (!IS_DEMO_MODE && (await isNetworkAvailable())) {
    try {
      await remoteMarkAlertRead(id);
    } catch {
      await saveAlertReadId(id);
      return;
    }
  }
  await saveAlertReadId(id);
}

export async function markAllAlertsRead(ids: string[]): Promise<void> {
  await saveAlertReadIds(ids);
  if (!IS_DEMO_MODE && (await isNetworkAvailable())) {
    await Promise.all(ids.map((id) => remoteMarkAlertRead(id).catch(() => undefined)));
  }
}

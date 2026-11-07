import { readValue, writeValue } from '@/database';
import type { VeterinaryObservation } from '@/types';

const ALERT_READS_KEY = 'alert-reads';
const localObservationsKey = (cowId: string) => `local-observations:${cowId}`;

export async function readAlertReadIds(): Promise<string[]> {
  const entry = await readValue<string[]>(ALERT_READS_KEY);
  return entry?.value ?? [];
}

export async function saveAlertReadId(id: string): Promise<void> {
  const current = await readAlertReadIds();
  if (current.includes(id)) return;
  await writeValue(ALERT_READS_KEY, [...current, id]);
}

export async function saveAlertReadIds(ids: string[]): Promise<void> {
  const current = await readAlertReadIds();
  const merged = Array.from(new Set([...current, ...ids]));
  await writeValue(ALERT_READS_KEY, merged);
}

export async function readLocalObservations(cowId: string): Promise<VeterinaryObservation[]> {
  const entry = await readValue<VeterinaryObservation[]>(localObservationsKey(cowId));
  return entry?.value ?? [];
}

export async function saveLocalObservation(observation: VeterinaryObservation): Promise<void> {
  const current = await readLocalObservations(observation.cowId);
  await writeValue(localObservationsKey(observation.cowId), [
    observation,
    ...current.filter((item) => item.id !== observation.id),
  ]);
}

export async function removeLocalObservation(cowId: string, id: string): Promise<void> {
  const current = await readLocalObservations(cowId);
  await writeValue(
    localObservationsKey(cowId),
    current.filter((item) => item.id !== id)
  );
}

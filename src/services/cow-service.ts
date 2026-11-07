import { IS_DEMO_MODE } from '@/constants/config';
import { enqueueSync } from '@/database';
import type { HealthRecord, Resource, User, VeterinaryObservation } from '@/types';
import { getDemoBaseObservations, getDemoHealthRecords } from './demo/demo-data';
import {
  readLocalObservations,
  removeLocalObservation,
  saveLocalObservation,
} from './local-store';
import { isNetworkAvailable } from './network';
import {
  remoteCreateObservation,
  remoteHealthRecords,
  remoteObservations,
} from './remote/api';
import { resolveResource, requireOnline } from './resource';

export function fetchHealthRecords(cowId: string): Promise<Resource<HealthRecord[]>> {
  return resolveResource({
    key: `health-records:${cowId}`,
    demo: () => getDemoHealthRecords(cowId),
    remote: () => remoteHealthRecords(cowId),
  });
}

export function fetchObservations(cowId: string): Promise<Resource<VeterinaryObservation[]>> {
  return resolveResource({
    key: `observations:${cowId}`,
    demo: async () => {
      const local = await readLocalObservations(cowId);
      return [...local, ...getDemoBaseObservations(cowId)].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    remote: async () => {
      const local = await readLocalObservations(cowId);
      const server = await remoteObservations(cowId);
      return [...local, ...server].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
  });
}

export async function addObservation(
  cowId: string,
  note: string,
  user: User
): Promise<VeterinaryObservation> {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error('Enter an observation before saving.');
  }
  if (user.role !== 'veterinarian') {
    throw new Error('Only authorized veterinarians can add observations.');
  }

  const now = new Date().toISOString();
  const online = await isNetworkAvailable();

  if (!IS_DEMO_MODE && online) {
    await requireOnline();
    return remoteCreateObservation(cowId, trimmed);
  }

  const local: VeterinaryObservation = {
    id: `local-observation-${Date.now()}`,
    cowId,
    veterinarianId: user.id,
    veterinarianName: user.name,
    note: trimmed,
    createdAt: now,
    syncStatus: 'pending',
    isDemonstration: IS_DEMO_MODE,
  };

  await saveLocalObservation(local);

  if (!IS_DEMO_MODE) {
    await enqueueSync('observation.create', { cowId, note: trimmed, localId: local.id });
  }

  return local;
}

export async function syncObservation(operation: { cowId: string; note: string; localId: string }) {
  const observation = await remoteCreateObservation(operation.cowId, operation.note);
  await removeLocalObservation(operation.cowId, operation.localId);
  return observation;
}

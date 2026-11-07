import { IS_DEMO_MODE } from '@/constants/config';
import { readSyncQueue, removeSyncQueueItem } from '@/database';
import { isNetworkAvailable } from './network';
import { syncObservation } from './cow-service';

export async function flushSyncQueue(): Promise<number> {
  if (IS_DEMO_MODE) return 0;
  if (!(await isNetworkAvailable())) return 0;

  const queue = await readSyncQueue();
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.operation === 'observation.create') {
        await syncObservation(item.payload as { cowId: string; note: string; localId: string });
      }
      await removeSyncQueueItem(item.id);
      processed += 1;
    } catch {
      break;
    }
  }

  return processed;
}

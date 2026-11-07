const WEB_PREFIX = 'pathotrace.store.';

interface StoredEntry {
  value: string;
  updated_at: number;
}

export interface CacheEntry<T> {
  value: T;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: number;
  operation: string;
  payload: unknown;
  createdAt: number;
}

const SYNC_QUEUE_KEY = 'sync-queue';

let activeScope: string | null = null;

function storage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

function scopedKey(key: string): string {
  return activeScope ? `${activeScope}::${key}` : key;
}

function readWebEntry(fullKey: string): StoredEntry | null {
  const target = storage();
  if (!target) return null;
  const raw = target.getItem(`${WEB_PREFIX}${fullKey}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredEntry;
  } catch {
    return null;
  }
}

function writeWebEntry(fullKey: string, value: unknown): void {
  const target = storage();
  if (!target) return;
  target.setItem(
    `${WEB_PREFIX}${fullKey}`,
    JSON.stringify({ value: JSON.stringify(value), updated_at: Date.now() })
  );
}

export function setCacheScope(scope: string | null): void {
  activeScope = scope;
}

export function getCacheScope(): string | null {
  return activeScope;
}

export async function writeValue<T>(key: string, value: T, scoped = true): Promise<void> {
  writeWebEntry(scoped ? scopedKey(key) : key, value);
}

export async function readValue<T>(key: string, scoped = true): Promise<CacheEntry<T> | null> {
  const entry = readWebEntry(scoped ? scopedKey(key) : key);
  if (!entry) return null;
  try {
    return { value: JSON.parse(entry.value) as T, updatedAt: entry.updated_at };
  } catch {
    return null;
  }
}

export async function removeValue(key: string, scoped = true): Promise<void> {
  const target = storage();
  if (!target) return;
  target.removeItem(`${WEB_PREFIX}${scoped ? scopedKey(key) : key}`);
}

export async function clearScopedValues(): Promise<void> {
  const target = storage();
  if (!target || !activeScope) return;
  const prefix = `${WEB_PREFIX}${activeScope}::`;
  const keys: string[] = [];
  for (let index = 0; index < target.length; index += 1) {
    const key = target.key(index);
    if (key && key.startsWith(prefix)) keys.push(key);
  }
  keys.forEach((key) => target.removeItem(key));
}

export async function enqueueSync(operation: string, payload: unknown): Promise<void> {
  const entry = await readValue<SyncQueueItem[]>(SYNC_QUEUE_KEY);
  const queue = entry?.value ?? [];
  const item: SyncQueueItem = {
    id: Date.now(),
    operation,
    payload,
    createdAt: Date.now(),
  };
  await writeValue(SYNC_QUEUE_KEY, [...queue, item]);
}

export async function readSyncQueue(): Promise<SyncQueueItem[]> {
  const entry = await readValue<SyncQueueItem[]>(SYNC_QUEUE_KEY);
  return entry?.value ?? [];
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const entry = await readValue<SyncQueueItem[]>(SYNC_QUEUE_KEY);
  if (!entry) return;
  await writeValue(
    SYNC_QUEUE_KEY,
    entry.value.filter((item) => item.id !== id)
  );
}

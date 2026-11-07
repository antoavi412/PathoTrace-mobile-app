import { Platform } from 'react-native';

interface DatabaseLike {
  execAsync: (sql: string) => Promise<void>;
  getFirstAsync: <T>(sql: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(sql: string, ...params: unknown[]) => Promise<T[]>;
  runAsync: (sql: string, ...params: unknown[]) => Promise<unknown>;
}

interface StoredEntry {
  value: string;
  updated_at: number;
}

export interface CacheEntry<T> {
  value: T;
  updatedAt: number;
}

const WEB_PREFIX = 'pathotrace.store.';
const DATABASE_NAME = 'pathotrace.db';

let databasePromise: Promise<DatabaseLike | null> | null = null;
let activeScope: string | null = null;

function isWeb(): boolean {
  return Platform.OS === 'web';
}

async function getDatabase(): Promise<DatabaseLike | null> {
  if (isWeb() || typeof window === 'undefined') return null;
  if (!databasePromise) {
    databasePromise = (async () => {
      const SQLite = await import('expo-sqlite');
      const db = (await SQLite.openDatabaseAsync(DATABASE_NAME)) as unknown as DatabaseLike;
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS kv_store (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      return db;
    })().catch(() => null);
  }
  return databasePromise;
}

function scopedKey(key: string): string {
  return activeScope ? `${activeScope}::${key}` : key;
}

function readWebEntry(fullKey: string): StoredEntry | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(`${WEB_PREFIX}${fullKey}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredEntry;
  } catch {
    return null;
  }
}

export function setCacheScope(scope: string | null): void {
  activeScope = scope;
}

export function getCacheScope(): string | null {
  return activeScope;
}

export async function writeValue<T>(key: string, value: T, scoped = true): Promise<void> {
  const fullKey = scoped ? scopedKey(key) : key;
  const encoded = JSON.stringify(value);
  const updatedAt = Date.now();

  if (isWeb()) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        `${WEB_PREFIX}${fullKey}`,
        JSON.stringify({ value: encoded, updated_at: updatedAt })
      );
    }
    return;
  }

  const db = await getDatabase();
  if (!db) return;
  await db.runAsync(
    `INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    fullKey,
    encoded,
    updatedAt
  );
}

export async function readValue<T>(key: string, scoped = true): Promise<CacheEntry<T> | null> {
  const fullKey = scoped ? scopedKey(key) : key;

  if (isWeb()) {
    const entry = readWebEntry(fullKey);
    if (!entry) return null;
    try {
      return { value: JSON.parse(entry.value) as T, updatedAt: entry.updated_at };
    } catch {
      return null;
    }
  }

  const db = await getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<StoredEntry>(
    'SELECT value, updated_at FROM kv_store WHERE key = ?',
    fullKey
  );
  if (!row) return null;
  try {
    return { value: JSON.parse(row.value) as T, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function removeValue(key: string, scoped = true): Promise<void> {
  const fullKey = scoped ? scopedKey(key) : key;

  if (isWeb()) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`${WEB_PREFIX}${fullKey}`);
    }
    return;
  }

  const db = await getDatabase();
  if (!db) return;
  await db.runAsync('DELETE FROM kv_store WHERE key = ?', fullKey);
}

export async function clearScopedValues(): Promise<void> {
  if (!activeScope) return;

  if (isWeb()) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const prefix = `${WEB_PREFIX}${activeScope}::`;
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    return;
  }

  const db = await getDatabase();
  if (!db) return;
  await db.runAsync('DELETE FROM kv_store WHERE key LIKE ?', `${activeScope}::%`);
}

export interface SyncQueueItem {
  id: number;
  operation: string;
  payload: unknown;
  createdAt: number;
}

const SYNC_QUEUE_KEY = 'sync-queue';

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

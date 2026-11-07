import { readValue, writeValue } from '@/database';
import type { UserPreferences } from '@/types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  notifications: {
    high: true,
    medium: true,
    low: false,
  },
};

function preferencesKey(userId: string): string {
  return `preferences:${userId}`;
}

export async function loadPreferences(userId: string): Promise<UserPreferences> {
  const entry = await readValue<UserPreferences>(preferencesKey(userId));
  if (!entry) return DEFAULT_PREFERENCES;
  return {
    language: 'en',
    notifications: {
      ...DEFAULT_PREFERENCES.notifications,
      ...entry.value.notifications,
    },
  };
}

export async function savePreferences(
  userId: string,
  preferences: UserPreferences
): Promise<void> {
  await writeValue(preferencesKey(userId), preferences);
}

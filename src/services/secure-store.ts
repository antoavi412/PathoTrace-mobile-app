import { Platform } from 'react-native';

const SESSION_KEY = 'pathotrace.session';
const LEGACY_WEB_PREFIX = 'pathotrace.secure.';

function canUseWebStorage(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && !!window.localStorage;
}

export async function saveSecureValue(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (canUseWebStorage()) {
      window.localStorage.setItem(`${LEGACY_WEB_PREFIX}${key}`, value);
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readSecureValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return canUseWebStorage() ? window.localStorage.getItem(`${LEGACY_WEB_PREFIX}${key}`) : null;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureValue(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(`${LEGACY_WEB_PREFIX}${key}`);
    }
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export const SESSION_STORAGE_KEY = SESSION_KEY;

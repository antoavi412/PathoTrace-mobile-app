import { Platform } from 'react-native';
import * as Network from 'expo-network';

export async function isNetworkAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  try {
    const state = await Network.getNetworkStateAsync();
    return Boolean(state.isConnected) && state.isInternetReachable !== false;
  } catch {
    return true;
  }
}

export function subscribeToNetworkChanges(
  onChange: (isOnline: boolean) => void
): () => void {
  let removeNative: (() => void) | undefined;
  let removeWeb: (() => void) | undefined;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const update = () => onChange(navigator.onLine);
    const handleOnline = () => update();
    const handleOffline = () => update();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    update();
    removeWeb = () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  } else {
    const subscription = Network.addNetworkStateListener((state) => {
      onChange(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    removeNative = () => subscription.remove();
    void isNetworkAvailable().then(onChange);
  }

  return () => {
    removeNative?.();
    removeWeb?.();
  };
}

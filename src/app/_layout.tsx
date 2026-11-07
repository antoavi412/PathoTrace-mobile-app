import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { NetworkProvider } from '@/features/network/network-provider';
import { SyncManager } from '@/features/network/sync-manager';
import { queryClient } from '@/services/query-client';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <AuthProvider>
              <SyncManager />
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'fade',
                }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" options={{ animation: 'fade' }} />
                <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="(app)" options={{ animation: 'fade' }} />
              </Stack>
            </AuthProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

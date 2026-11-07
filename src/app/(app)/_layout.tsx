import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui/states';
import { Screen } from '@/components/ui/screen';
import { colors } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

export default function AppLayout() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <Screen>
        <LoadingState message="Restoring your session…" />
      </Screen>
    );
  }

  if (status === 'unauthenticated') {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="cow/[id]" />
      <Stack.Screen name="assessment/new" />
      <Stack.Screen name="assessment/[id]" />
      <Stack.Screen name="vet" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="about" />
    </Stack>
  );
}

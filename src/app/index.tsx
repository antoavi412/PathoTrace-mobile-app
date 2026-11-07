import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '@/components/ui/app-logo';
import { AppText } from '@/components/ui/app-text';
import { APP_VERSION, IS_DEMO_MODE } from '@/constants/config';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';

export default function SplashRoute() {
  const router = useRouter();
  const { status } = useAuth();
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(16));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setMinimumElapsed(true), 1400);
    return () => clearTimeout(timer);
  }, [opacity, translateY]);

  useEffect(() => {
    if (!minimumElapsed || status === 'loading') return;
    router.replace(status === 'authenticated' ? '/home' : '/login');
  }, [minimumElapsed, status, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glow} />
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
        <AppLogo size={96} />
        <View style={styles.titleContainer}>
          <AppText variant="display" color={colors.textInverse} center>
            PathoTrace
          </AppText>
          <AppText variant="body" color="#CFE3D6" center>
            Smarter Cattle Health.{'\n'}Earlier Detection.
          </AppText>
        </View>
      </Animated.View>
      <View style={styles.footer}>
        <AppText variant="caption" color="#A9C6B5" center>
          {IS_DEMO_MODE ? 'Demonstration build' : 'Connected build'} · v{APP_VERSION}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: colors.primaryLight,
    opacity: 0.55,
    top: -160,
    right: -160,
  },
  content: {
    alignItems: 'center',
    gap: spacing.xxl,
  },
  titleContainer: {
    gap: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xxxl,
  },
});

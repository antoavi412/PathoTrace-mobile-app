import { Ionicons } from '@expo/vector-icons';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, maxContentWidth, spacing } from '@/constants/theme';
import { useNetwork } from '@/features/network/network-provider';
import { AppText } from './app-text';

export function OfflineBanner() {
  const { isOnline } = useNetwork();
  if (isOnline) return null;
  return (
    <View style={styles.offline}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.textInverse} />
      <AppText variant="small" style={styles.offlineText}>
        You are offline. Showing saved data where available.
      </AppText>
    </View>
  );
}

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  style,
}: ScreenProps) {
  const innerStyle = [styles.inner, padded && styles.padded, contentContainerStyle];

  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }>
          <View style={innerStyle}>{children}</View>
        </ScrollView>
      ) : (
        <View style={innerStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  offlineText: {
    color: colors.textInverse,
    flexShrink: 1,
  },
});

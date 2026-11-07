import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AI_DISCLAIMER, DEMO_NOTICE, IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { formatDateTime } from '@/utils/format';
import { AppText } from './app-text';

type NoticeTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const toneStyles = {
  info: { background: colors.infoSoft, color: colors.info, icon: 'information-circle-outline' as const },
  warning: { background: colors.warningSoft, color: colors.warning, icon: 'alert-circle-outline' as const },
  danger: { background: colors.dangerSoft, color: colors.danger, icon: 'warning-outline' as const },
  success: { background: colors.successSoft, color: colors.success, icon: 'checkmark-circle-outline' as const },
  neutral: { background: colors.surfaceMuted, color: colors.textSecondary, icon: 'information-outline' as const },
};

export function NoticeBanner({
  title,
  message,
  tone = 'info',
  icon,
  style,
  actionLabel,
  onAction,
}: {
  title?: string;
  message: string;
  tone?: NoticeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const tokens = toneStyles[tone];
  return (
    <View style={[styles.container, { backgroundColor: tokens.background }, style]}>
      <Ionicons name={icon ?? tokens.icon} size={18} color={tokens.color} style={styles.icon} />
      <View style={styles.textContainer}>
        {title ? (
          <AppText variant="smallStrong" style={{ color: tokens.color }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="small" style={{ color: tokens.color }}>
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={6}>
            <AppText variant="smallStrong" style={{ color: tokens.color, textDecorationLine: 'underline' }}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function DemoModeBanner({ compact = false }: { compact?: boolean }) {
  if (!IS_DEMO_MODE) return null;
  return (
    <NoticeBanner
      title={compact ? undefined : 'Demonstration build'}
      message={compact ? 'Sample data — no live backend connected.' : DEMO_NOTICE}
      tone="warning"
    />
  );
}

export function AiDisclaimer() {
  return <NoticeBanner title="Risk estimate, not a diagnosis" message={AI_DISCLAIMER} tone="info" />;
}

export function StaleDataNotice({
  fetchedAt,
  style,
}: {
  fetchedAt: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <NoticeBanner
      message={`Showing saved data from ${formatDateTime(fetchedAt)}. Reconnect to refresh.`}
      tone="neutral"
      icon="cloud-offline-outline"
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  icon: {
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
});

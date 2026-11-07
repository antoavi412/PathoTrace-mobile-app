import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, riskTone } from '@/constants/theme';
import type { HealthAlert } from '@/types';
import { relativeTime } from '@/utils/format';
import { AppText } from './ui/app-text';

export function AlertListItem({
  alert,
  onPress,
}: {
  alert: HealthAlert;
  onPress?: () => void;
}) {
  const tone = riskTone[alert.category];
  const icon =
    alert.severity === 'high'
      ? 'alert-circle'
      : alert.severity === 'medium'
        ? 'warning'
        : 'information-circle';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${alert.title}, ${alert.cowTagId}, ${alert.read ? 'read' : 'unread'}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        !alert.read && styles.unread,
        pressed && onPress && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: tone.soft }]}>
        <Ionicons name={icon} size={20} color={tone.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant={alert.read ? 'bodyStrong' : 'bodyStrong'} style={styles.title}>
            {alert.title}
          </AppText>
          {!alert.read ? <View style={styles.unreadDot} /> : null}
        </View>
        <AppText variant="small" color={colors.textSecondary} numberOfLines={2}>
          {alert.message}
        </AppText>
        <View style={styles.meta}>
          <AppText variant="caption" color={colors.textMuted}>
            {alert.cowTagId}
            {alert.cowName ? ` · ${alert.cowName}` : ''}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {relativeTime(alert.createdAt)}
          </AppText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  unread: {
    borderColor: colors.borderStrong,
    backgroundColor: '#FCFDFB',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});

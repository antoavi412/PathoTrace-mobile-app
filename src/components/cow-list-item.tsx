import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { Cow } from '@/types';
import { formatAge } from '@/utils/format';
import { AppText } from './ui/app-text';
import { StatusBadge } from './ui/status-badge';

export function CowListItem({
  cow,
  onPress,
  subtitle,
}: {
  cow: Cow;
  onPress?: () => void;
  subtitle?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${cow.tagId}${cow.name ? `, ${cow.name}` : ''}, ${cow.breed}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.container, pressed && onPress && styles.pressed]}>
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="cow" size={24} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            {cow.tagId}
            {cow.name ? ` · ${cow.name}` : ''}
          </AppText>
          <StatusBadge status={cow.riskStatus} size="sm" />
        </View>
        <AppText variant="small" color={colors.textSecondary} numberOfLines={1}>
          {subtitle ?? `${cow.breed} · ${formatAge(cow.ageMonths)}`}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
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
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});

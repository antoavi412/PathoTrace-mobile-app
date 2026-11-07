import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { Assessment } from '@/types';
import { formatDateTime } from '@/utils/format';
import { AppText } from './ui/app-text';
import { StatusBadge } from './ui/status-badge';

export function AssessmentCard({
  assessment,
  onPress,
}: {
  assessment: Assessment;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Assessment for ${assessment.cowTagId}, ${assessment.category} risk`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.container, pressed && onPress && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <AppText variant="bodyStrong">
            {assessment.cowTagId}
            {assessment.cowName ? ` · ${assessment.cowName}` : ''}
          </AppText>
          <AppText variant="small" color={colors.textSecondary}>
            {formatDateTime(assessment.createdAt)}
          </AppText>
        </View>
        <StatusBadge status={assessment.category} size="sm" />
      </View>
      <View style={styles.bottomRow}>
        <AppText variant="caption" color={assessment.isDemonstration ? colors.warning : colors.textMuted}>
          {assessment.isDemonstration ? 'Demonstration sample' : 'Recorded assessment'}
        </AppText>
        {onPress ? (
          <View style={styles.link}>
            <AppText variant="smallStrong" color={colors.primary}>
              View result
            </AppText>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});

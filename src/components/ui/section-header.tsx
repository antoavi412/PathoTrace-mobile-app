import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { AppText } from './app-text';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <AppText variant="subheading">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="smallStrong" color={colors.primary}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
});

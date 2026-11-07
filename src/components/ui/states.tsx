import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { getErrorMessage } from '@/utils/errors';
import { AppText } from './app-text';
import { Button } from './button';
import { Card } from './card';

export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="small" color={colors.textSecondary} center>
        {message}
      </AppText>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Unable to load this information',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.centered}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="alert-circle-outline" size={26} color={colors.danger} />
      </View>
      <AppText variant="subheading" center>
        {title}
      </AppText>
      <AppText variant="small" color={colors.textSecondary} center>
        {getErrorMessage(error)}
      </AppText>
      {onRetry ? (
        <Button label="Try again" variant="secondary" size="sm" icon="refresh" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <AppText variant="subheading" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color={colors.textSecondary} center>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} size="sm" onPress={onAction} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});

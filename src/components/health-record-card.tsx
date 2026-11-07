import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { HealthRecord } from '@/types';
import { formatDate } from '@/utils/format';
import { AppText } from './ui/app-text';

const icons: Record<HealthRecord['kind'], keyof typeof Ionicons.glyphMap> = {
  checkup: 'clipboard-outline',
  illness: 'thermometer-outline',
  treatment: 'medkit-outline',
  observation: 'eye-outline',
  vaccination: 'shield-checkmark-outline',
};

export function HealthRecordCard({ record }: { record: HealthRecord }) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name={icons[record.kind]} size={18} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="smallStrong" style={styles.title}>
            {record.title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatDate(record.recordedAt)}
          </AppText>
        </View>
        {record.description ? (
          <AppText variant="small" color={colors.textSecondary}>
            {record.description}
          </AppText>
        ) : null}
        {record.recordedBy ? (
          <AppText variant="caption" color={colors.textMuted}>
            Recorded by {record.recordedBy}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
});

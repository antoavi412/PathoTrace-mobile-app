import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import type { VeterinaryObservation } from '@/types';
import { formatDateTime } from '@/utils/format';
import { AppText } from './ui/app-text';

export function ObservationCard({ observation }: { observation: VeterinaryObservation }) {
  const pending = observation.syncStatus === 'pending';
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="medkit-outline" size={17} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="smallStrong">{observation.veterinarianName}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {formatDateTime(observation.createdAt)}
          </AppText>
        </View>
        <View style={[styles.sync, { backgroundColor: pending ? colors.warningSoft : colors.successSoft }]}>
          <AppText variant="tiny" style={{ color: pending ? colors.warning : colors.success }}>
            {pending ? 'SAVED LOCALLY' : 'SYNCED'}
          </AppText>
        </View>
      </View>
      <AppText variant="small" color={colors.textSecondary}>
        {observation.note}
      </AppText>
      {observation.isDemonstration ? (
        <AppText variant="caption" color={colors.warning}>
          Demonstration observation
        </AppText>
      ) : null}
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  sync: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});

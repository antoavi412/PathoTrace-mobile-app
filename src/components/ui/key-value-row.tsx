import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { AppText } from './app-text';

export function KeyValueRow({
  label,
  value,
  valueColor,
  stacked = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  stacked?: boolean;
}) {
  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      <AppText variant="small" color={colors.textSecondary}>
        {label}
      </AppText>
      <AppText variant="smallStrong" color={valueColor ?? colors.text} style={stacked ? styles.valueStacked : styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stacked: {
    flexDirection: 'column',
    gap: 2,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  valueStacked: {
    textAlign: 'left',
  },
});

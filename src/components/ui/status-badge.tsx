import { View, StyleSheet } from 'react-native';

import { radius, spacing, riskTone } from '@/constants/theme';
import type { CowRiskStatus } from '@/types';
import { AppText } from './app-text';

export function StatusBadge({
  status,
  label,
  size = 'md',
}: {
  status: CowRiskStatus;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const tone = riskTone[status];
  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.small,
        { backgroundColor: tone.soft },
      ]}>
      <View style={[styles.dot, { backgroundColor: tone.color }]} />
      <AppText
        variant={size === 'sm' ? 'tiny' : 'caption'}
        style={{ color: tone.color, fontWeight: '700' }}>
        {label ?? tone.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

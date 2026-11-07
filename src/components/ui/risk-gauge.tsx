import { StyleSheet, View } from 'react-native';

import { colors, riskTone, spacing } from '@/constants/theme';
import type { CowRiskStatus } from '@/types';
import { AppText } from './app-text';

export function RiskGauge({
  status,
  size = 172,
  caption = 'Risk category',
}: {
  status: CowRiskStatus;
  size?: number;
  caption?: string;
}) {
  const tone = riskTone[status];
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: Math.max(10, size * 0.07),
            borderColor: tone.color,
          },
        ]}>
        <View style={[styles.inner, { width: size * 0.72, height: size * 0.72, borderRadius: size }]}>
          <AppText variant="caption" color={colors.textSecondary}>
            {caption}
          </AppText>
          <AppText style={{ color: tone.color, fontSize: size * 0.14, fontWeight: '700' }}>
            {tone.label.replace(' risk', '')}
          </AppText>
          <View style={[styles.dot, { backgroundColor: tone.soft }]}>
            <AppText variant="tiny" style={{ color: tone.color }}>
              {status === 'unknown' ? 'NO RESULT' : `${status.toUpperCase()} RISK`}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
});

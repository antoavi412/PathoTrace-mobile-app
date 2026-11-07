import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './app-text';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export function FilterChips({
  options,
  value,
  onChange,
  accessibilityLabel = 'Filter options',
}: {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selectedChip,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant="smallStrong"
              style={{ color: selected ? colors.textInverse : colors.textSecondary }}>
              {option.label}
              {option.count !== undefined ? ` · ${option.count}` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
});

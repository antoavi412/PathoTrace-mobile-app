import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './app-text';

export function QuickAction({
  icon,
  title,
  subtitle,
  onPress,
  tone = colors.primary,
  soft = colors.accentSoft,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: string;
  soft?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <AppText variant="smallStrong" numberOfLines={1}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
          {subtitle}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
});

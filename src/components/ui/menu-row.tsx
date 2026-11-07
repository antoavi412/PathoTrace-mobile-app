import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './app-text';

export function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = colors.primary,
  soft = colors.accentSoft,
  trailing,
  destructive = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: string;
  soft?: string;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.icon, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={19} color={tone} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.text}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );

  if (!onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});

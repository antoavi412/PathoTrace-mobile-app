import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { AppText } from './app-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const variantStyles = {
  primary: {
    background: colors.primary,
    border: colors.primary,
    text: colors.textInverse,
    spinner: colors.textInverse,
  },
  secondary: {
    background: colors.surface,
    border: colors.borderStrong,
    text: colors.primary,
    spinner: colors.primary,
  },
  ghost: {
    background: 'transparent',
    border: 'transparent',
    text: colors.primary,
    spinner: colors.primary,
  },
  danger: {
    background: colors.danger,
    border: colors.danger,
    text: colors.textInverse,
    spinner: colors.textInverse,
  },
} as const;

const sizeStyles = {
  sm: { height: 38, paddingHorizontal: spacing.md, fontSize: 13, iconSize: 16 },
  md: { height: 50, paddingHorizontal: spacing.xl, fontSize: 15, iconSize: 18 },
  lg: { height: 56, paddingHorizontal: spacing.xxl, fontSize: 16, iconSize: 20 },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const tone = variantStyles[variant];
  const metrics = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
          backgroundColor: tone.background,
          borderColor: tone.border,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={tone.spinner} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={metrics.iconSize} color={tone.text} />
          ) : null}
          <AppText
            style={{ color: tone.text, fontSize: metrics.fontSize, fontWeight: '600' }}>
            {label}
          </AppText>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={metrics.iconSize} color={tone.text} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.text,
  size = 20,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
});

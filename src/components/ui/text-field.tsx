import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { AppText } from './app-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  secure?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  icon,
  required,
  containerStyle,
  secure,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="smallStrong" color={colors.text}>
        {label}
        {required ? <AppText style={{ color: colors.high }}> *</AppText> : null}
      </AppText>
      <View
        style={[
          styles.inputContainer,
          focused && styles.focused,
          error ? styles.invalid : null,
        ]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !revealed}
          style={[styles.input, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            onPress={() => setRevealed((current) => !current)}
            hitSlop={8}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="small" color={colors.high}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  invalid: {
    borderColor: colors.high,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});

import { Text, type TextProps } from 'react-native';

import { colors, typography } from '@/constants/theme';

export type TextVariant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

export function AppText({
  variant = 'body',
  color = colors.text,
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        typography[variant],
        { color },
        center ? { textAlign: 'center' } : null,
        style,
      ]}
      {...rest}
    />
  );
}

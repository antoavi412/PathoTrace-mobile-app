import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { initials } from '@/utils/format';
import { AppText } from './app-text';

export function Avatar({
  name,
  size = 44,
  tone = 'green',
}: {
  name: string;
  size?: number;
  tone?: 'green' | 'soft';
}) {
  const background = tone === 'green' ? colors.primary : colors.accentSoft;
  const color = tone === 'green' ? colors.textInverse : colors.primary;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
        },
      ]}>
      <AppText style={{ color, fontSize: size * 0.36, fontWeight: '700' }}>
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});

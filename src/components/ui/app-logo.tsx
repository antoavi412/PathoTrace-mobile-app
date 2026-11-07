import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

export function AppLogo({ size = 72 }: { size?: number }) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
        },
      ]}>
      <View
        style={[
          styles.leaf,
          {
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            right: size * 0.12,
            top: size * 0.12,
          },
        ]}
      />
      <MaterialCommunityIcons
        name="cow"
        size={size * 0.52}
        color={colors.textInverse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.lg,
  },
  leaf: {
    position: 'absolute',
    backgroundColor: colors.accent,
    opacity: 0.9,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CowListItem } from '@/components/cow-list-item';
import { AppText } from '@/components/ui/app-text';
import { SearchBar } from '@/components/ui/search-bar';
import { EmptyState } from '@/components/ui/states';
import { colors, radius, spacing } from '@/constants/theme';
import type { Cow } from '@/types';

export function CowPicker({
  visible,
  cows,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  cows: Cow[];
  selectedId?: string;
  onSelect: (cow: Cow) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cows;
    return cows.filter((cow) =>
      [cow.tagId, cow.name, cow.breed, cow.lactationStage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [cows, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="heading">Select an animal</AppText>
              <AppText variant="small" color={colors.textSecondary}>
                Choose the cow this assessment relates to.
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close animal picker"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search tag, name, or breed…"
            accessibilityLabel="Search animals"
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={styles.item}>
                  <CowListItem
                    cow={item}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  />
                </View>
                {selectedId === item.id ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : null}
              </View>
            )}
            ListEmptyComponent={
              <EmptyState
                icon="search-outline"
                title="No animals found"
                message="Try a different search term."
              />
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    maxHeight: '86%',
    gap: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  item: {
    flex: 1,
  },
  separator: {
    height: spacing.sm,
  },
});

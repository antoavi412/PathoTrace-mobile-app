import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { NoticeBanner } from '@/components/ui/notice-banner';
import { TextField } from '@/components/ui/text-field';
import { IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { useAddObservation } from '@/features/cow/use-cow-records';
import { getErrorMessage } from '@/utils/errors';

export function AddObservationModal({
  cowId,
  cowLabel,
  onClose,
}: {
  cowId: string;
  cowLabel: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useAddObservation(cowId);

  async function handleSave() {
    setValidationError(null);
    const trimmed = note.trim();
    if (trimmed.length < 10) {
      setValidationError('Enter a clear observation of at least 10 characters.');
      return;
    }

    try {
      await mutation.mutateAsync(trimmed);
      onClose();
    } catch {
      return;
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="medkit-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.headerText}>
              <AppText variant="heading">Add observation</AppText>
              <AppText variant="small" color={colors.textSecondary}>
                {cowLabel}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close observation form"
              onPress={onClose}
              hitSlop={8}
              style={styles.close}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {IS_DEMO_MODE ? (
              <NoticeBanner
                message="Demonstration build: observations are stored locally on this device and labelled as demo data."
                tone="warning"
              />
            ) : null}

            {mutation.isError ? (
              <NoticeBanner message={getErrorMessage(mutation.error)} tone="danger" />
            ) : null}

            {validationError ? (
              <NoticeBanner message={validationError} tone="danger" />
            ) : null}

            <TextField
              label="Observation"
              value={note}
              onChangeText={setNote}
              placeholder="Record findings, follow-up actions, or guidance…"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={styles.input}
              hint="Visible to authorized users reviewing this animal. Do not record unrelated personal data."
              required
            />
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={mutation.isPending}
              style={styles.action}
            />
            <Button
              label="Save observation"
              onPress={() => void handleSave()}
              loading={mutation.isPending}
              style={styles.action}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
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
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: spacing.md,
  },
  input: {
    minHeight: 120,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  action: {
    flex: 1,
  },
});

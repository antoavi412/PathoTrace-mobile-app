import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/ui/app-header';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AiDisclaimer, DemoModeBanner, NoticeBanner } from '@/components/ui/notice-banner';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { IS_DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing } from '@/constants/theme';
import { CowPicker } from '@/features/assessments/cow-picker';
import { useSubmitAssessment } from '@/features/assessments/use-assessments';
import { useAllCows } from '@/features/herd/use-herd';
import { useNetwork } from '@/features/network/network-provider';
import type { AssessmentInput, Cow } from '@/types';
import { getErrorMessage } from '@/utils/errors';
import {
  ASSESSMENT_NUMERIC_RULES,
  hasErrors,
  parseNumericInput,
  validateAssessmentForm,
  type FieldErrors,
} from '@/utils/validation';

const emptyValues: Record<string, string> = {
  milkYieldLiters: '',
  somaticCellCount: '',
  milkTemperatureC: '',
  daysInMilk: '',
  lactationNumber: '',
};

function defaultsFor(cow: Cow | undefined): Record<string, string> {
  if (!cow) return emptyValues;
  return {
    ...emptyValues,
    daysInMilk: cow.daysInMilk !== undefined ? String(cow.daysInMilk) : '',
    lactationNumber: cow.lactationNumber !== undefined ? String(cow.lactationNumber) : '',
  };
}

export default function NewAssessmentScreen() {
  const params = useLocalSearchParams<{ cowId?: string }>();
  const presetCowId = Array.isArray(params.cowId) ? params.cowId[0] : params.cowId;
  const cowsQuery = useAllCows();
  const cows = useMemo(() => cowsQuery.data?.data ?? [], [cowsQuery.data]);

  if (cowsQuery.isLoading) {
    return (
      <Screen>
        <AppHeader title="Request assessment" showBack />
        <LoadingState message="Loading herd records…" />
      </Screen>
    );
  }

  if (cowsQuery.isError) {
    return (
      <Screen>
        <AppHeader title="Request assessment" showBack />
        <ErrorState
          error={cowsQuery.error}
          onRetry={() => void cowsQuery.refetch()}
          title="Unable to load herd records"
        />
      </Screen>
    );
  }

  return <AssessmentForm key={presetCowId ?? 'new'} cows={cows} presetCowId={presetCowId} />;
}

function AssessmentForm({
  cows,
  presetCowId,
}: {
  cows: Cow[];
  presetCowId?: string;
}) {
  const router = useRouter();
  const { isOnline } = useNetwork();
  const submit = useSubmitAssessment();
  const presetCow = presetCowId ? cows.find((cow) => cow.id === presetCowId) : undefined;

  const [selectedCowId, setSelectedCowId] = useState<string | undefined>(presetCow?.id);
  const [values, setValues] = useState<Record<string, string>>(() => defaultsFor(presetCow));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedCow = cows.find((cow) => cow.id === selectedCowId);

  function applyCowDefaults(cow: Cow) {
    setValues((current) => ({
      ...current,
      daysInMilk: cow.daysInMilk !== undefined ? String(cow.daysInMilk) : current.daysInMilk,
      lactationNumber:
        cow.lactationNumber !== undefined && current.lactationNumber === ''
          ? String(cow.lactationNumber)
          : current.lactationNumber,
    }));
  }

  function handleSelectCow(cow: Cow) {
    setSelectedCowId(cow.id);
    applyCowDefaults(cow);
    setErrors((current) => {
      const next = { ...current };
      delete next.cowId;
      return next;
    });
  }

  async function handleSubmit() {
    setServerError(null);
    const validationErrors = validateAssessmentForm(selectedCowId, values);
    setErrors(validationErrors);
    if (hasErrors(validationErrors) || !selectedCowId) return;
    if (!isOnline) {
      setServerError('Connect to the internet to request an assessment.');
      return;
    }

    const input: AssessmentInput = {
      cowId: selectedCowId,
      milkYieldLiters: parseNumericInput(values.milkYieldLiters) as number,
      somaticCellCount: parseNumericInput(values.somaticCellCount) as number,
      milkTemperatureC: parseNumericInput(values.milkTemperatureC) as number,
      daysInMilk: parseNumericInput(values.daysInMilk) as number,
      lactationNumber: parseNumericInput(values.lactationNumber) as number,
    };

    try {
      const assessment = await submit.mutateAsync(input);
      router.replace({ pathname: '/assessment/[id]', params: { id: assessment.id } });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <Screen scroll>
      <AppHeader
        title="Request assessment"
        subtitle="Record the inputs required for a mastitis risk assessment"
        showBack
      />

      <DemoModeBanner />

      <Card style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.step}>
            <AppText variant="tiny" color={colors.textInverse}>
              1
            </AppText>
          </View>
          <View style={styles.sectionTitle}>
            <AppText variant="subheading">Select the animal</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Only cattle returned for your account are listed.
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Select an animal"
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.selector,
            errors.cowId ? styles.selectorError : null,
            pressed && styles.pressed,
          ]}>
          <View style={styles.selectorIcon}>
            <Ionicons name="paw-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.selectorText}>
            {selectedCow ? (
              <>
                <AppText variant="bodyStrong">
                  {selectedCow.tagId}
                  {selectedCow.name ? ` · ${selectedCow.name}` : ''}
                </AppText>
                <AppText variant="small" color={colors.textSecondary}>
                  {selectedCow.breed}
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="bodyStrong" color={colors.textSecondary}>
                  Choose a cow
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  Tag number or name
                </AppText>
              </>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
        </Pressable>
        {errors.cowId ? (
          <AppText variant="small" color={colors.high}>
            {errors.cowId}
          </AppText>
        ) : null}
      </Card>

      <Card style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.step}>
            <AppText variant="tiny" color={colors.textInverse}>
              2
            </AppText>
          </View>
          <View style={styles.sectionTitle}>
            <AppText variant="subheading">Assessment inputs</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Use values from the herd records, milk testing, or available sensor readings.
            </AppText>
          </View>
        </View>

        {ASSESSMENT_NUMERIC_RULES.map((rule) => (
          <TextField
            key={rule.key}
            label={rule.label}
            value={values[rule.key]}
            onChangeText={(text) =>
              setValues((current) => ({ ...current, [rule.key]: text }))
            }
            placeholder="Enter value"
            keyboardType={rule.key === 'somaticCellCount' ? 'number-pad' : 'decimal-pad'}
            hint={
              rule.unit
                ? `${rule.unit} · allowed ${rule.min.toLocaleString('en-GB')}–${rule.max.toLocaleString('en-GB')}`
                : `Allowed ${rule.min}–${rule.max}`
            }
            error={errors[rule.key]}
            required
          />
        ))}
      </Card>

      <View style={styles.notes}>
        <AiDisclaimer />
        {IS_DEMO_MODE ? (
          <NoticeBanner
            message="Demonstration submission: no ML model is connected. This build records a sample risk category based on existing demo data and does not calculate a probability."
            tone="warning"
          />
        ) : null}
        {!isOnline ? (
          <NoticeBanner
            message="Assessment requests require a connection to the configured inference service. Reconnect to continue."
            tone="danger"
            icon="cloud-offline-outline"
          />
        ) : null}
        {serverError ? (
          <NoticeBanner title="Assessment not submitted" message={serverError} tone="danger" />
        ) : null}
      </View>

      <Button
        label="Request assessment"
        icon="pulse-outline"
        size="lg"
        fullWidth
        loading={submit.isPending}
        disabled={!isOnline}
        onPress={() => void handleSubmit()}
      />

      <AppText variant="caption" color={colors.textMuted} center style={styles.footnote}>
        A failed or unavailable assessment is never replaced with a made-up result.
      </AppText>

      <CowPicker
        visible={pickerOpen}
        cows={cows}
        selectedId={selectedCowId}
        onSelect={handleSelectCow}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  step: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  sectionTitle: {
    flex: 1,
    gap: 2,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  selectorError: {
    borderColor: colors.high,
  },
  selectorIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  notes: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  footnote: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});

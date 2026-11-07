export interface MetricDefinition {
  unit: string;
  min: number;
  max: number;
  /** Human-readable label used in exports and the app. */
  label: string;
}

/**
 * Metrics accepted by the ingestion endpoint.
 *
 * Ranges are deliberately generous: they catch corrupt payloads (NaN, negative
 * batteries, impossible temperatures) without rejecting valid field data.
 */
export const METRICS: Record<string, MetricDefinition> = {
  temperature: { unit: 'C', min: 25, max: 45, label: 'Body temperature' },
  activity: { unit: 'index', min: 0, max: 10000, label: 'Activity index' },
  rumination: { unit: 'minutes', min: 0, max: 1440, label: 'Rumination' },
  battery: { unit: '%', min: 0, max: 100, label: 'Battery' },
  signal: { unit: 'dBm', min: -140, max: 0, label: 'Signal strength' },
  milk_yield: { unit: 'L', min: 0, max: 100, label: 'Milk yield' },
  somatic_cell_count: {
    unit: 'cells/mL',
    min: 0,
    max: 10_000_000,
    label: 'Somatic cell count',
  },
  milk_temperature: { unit: 'C', min: 0, max: 50, label: 'Milk temperature' },
  humidity: { unit: '%', min: 0, max: 100, label: 'Humidity' },
  steps: { unit: 'count', min: 0, max: 100_000, label: 'Steps' },
};

export function getMetric(metric: string): MetricDefinition | undefined {
  return METRICS[metric];
}

import type { AssessmentInput } from '../types/domain';

export interface RiskResult {
  category: 'low' | 'medium' | 'high';
  probability: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Deterministic mastitis risk heuristic used until a trained model is wired in.
 *
 * The score is a weighted sum of clinical signals. It is intentionally simple
 * and fully auditable; replace the body with a model call later without changing
 * the response contract.
 */
export function scoreMastitisRisk(input: AssessmentInput): RiskResult {
  let score = 0;

  // Somatic cell count is the strongest single signal.
  if (input.somaticCellCount >= 400_000) score += 0.42;
  else if (input.somaticCellCount >= 200_000) score += 0.28;
  else if (input.somaticCellCount >= 100_000) score += 0.14;

  // Milk temperature.
  if (input.milkTemperatureC >= 39.5) score += 0.3;
  else if (input.milkTemperatureC >= 39.0) score += 0.2;
  else if (input.milkTemperatureC >= 38.5) score += 0.1;

  // Low yield for the animal.
  if (input.milkYieldLiters < 5) score += 0.18;
  else if (input.milkYieldLiters < 10) score += 0.1;
  else if (input.milkYieldLiters < 15) score += 0.05;

  // Early lactation is a higher-risk window.
  if (input.daysInMilk >= 0 && input.daysInMilk <= 60) score += 0.08;
  else if (input.daysInMilk > 200) score += 0.04;

  // Older animals carry more risk.
  if (input.lactationNumber >= 4) score += 0.06;

  const probability = Math.round(clamp01(score) * 1000) / 1000;
  const category = probability >= 0.66 ? 'high' : probability >= 0.33 ? 'medium' : 'low';

  return { category, probability };
}

import type { AssessmentInput, RiskCategory } from '../../types/domain';

export interface AssessmentRow {
  id: string;
  farm_id: string;
  cow_id: string;
  cow_tag_id: string;
  cow_name: string | null;
  category: RiskCategory;
  probability: number | null;
  model_version: string | null;
  milk_yield_liters: number;
  somatic_cell_count: number;
  milk_temperature_c: number;
  days_in_milk: number;
  lactation_number: number;
  note: string | null;
  created_at: Date;
}

export const ASSESSMENT_SELECT = `
  SELECT a.id, a.farm_id, a.cow_id, c.tag_id AS cow_tag_id, c.name AS cow_name,
         a.category, a.probability, a.model_version, a.milk_yield_liters,
         a.somatic_cell_count, a.milk_temperature_c, a.days_in_milk,
         a.lactation_number, a.note, a.created_at
    FROM assessments a
    JOIN cattle c ON c.id = a.cow_id
`;

export function serializeAssessment(row: AssessmentRow): Record<string, unknown> {
  const input: AssessmentInput = {
    cowId: row.cow_id,
    milkYieldLiters: row.milk_yield_liters,
    somaticCellCount: row.somatic_cell_count,
    milkTemperatureC: row.milk_temperature_c,
    daysInMilk: row.days_in_milk,
    lactationNumber: row.lactation_number,
  };

  return {
    id: row.id,
    cowId: row.cow_id,
    cowTagId: row.cow_tag_id,
    cowName: row.cow_name ?? undefined,
    cow: { id: row.cow_id, tagId: row.cow_tag_id, name: row.cow_name ?? undefined },
    category: row.category,
    createdAt: row.created_at.toISOString(),
    input,
    inputs: input,
    probability: row.probability ?? undefined,
    modelVersion: row.model_version ?? undefined,
    note: row.note ?? undefined,
    isDemonstration: false,
  };
}

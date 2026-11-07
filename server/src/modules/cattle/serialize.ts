import type { CowStatus, RiskStatus } from '../../types/domain';

export interface CowRow {
  id: string;
  tag_id: string;
  name: string | null;
  breed: string | null;
  age_months: number | null;
  lactation_number: number | null;
  lactation_stage: string | null;
  days_in_milk: number | null;
  farm_id: string;
  farm_name: string | null;
  risk_status: RiskStatus;
  status: CowStatus;
  last_assessment_at: Date | null;
  last_assessment_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export function serializeCow(row: CowRow): Record<string, unknown> {
  return {
    id: row.id,
    tagId: row.tag_id,
    name: row.name ?? undefined,
    breed: row.breed ?? 'Not recorded',
    ageMonths: row.age_months ?? undefined,
    lactationNumber: row.lactation_number ?? undefined,
    lactationStage: row.lactation_stage ?? undefined,
    daysInMilk: row.days_in_milk ?? undefined,
    farmId: row.farm_id,
    farmName: row.farm_name ?? undefined,
    riskStatus: row.risk_status,
    status: row.status,
    lastAssessmentAt: row.last_assessment_at?.toISOString(),
    lastAssessmentId: row.last_assessment_id ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const COW_SELECT = `
  SELECT c.id, c.tag_id, c.name, c.breed, c.age_months, c.lactation_number,
         c.lactation_stage, c.days_in_milk, c.farm_id, f.name AS farm_name,
         c.risk_status, c.status, c.last_assessment_at, c.last_assessment_id,
         c.notes, c.created_at, c.updated_at
    FROM cattle c
    JOIN farms f ON f.id = c.farm_id
`;

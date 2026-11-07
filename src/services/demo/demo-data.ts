import type {
  Assessment,
  AssessmentInput,
  Cow,
  HealthAlert,
  HealthRecord,
  HerdQuery,
  Paginated,
  RiskCategory,
  User,
  VeterinaryObservation,
} from '@/types';
import { countRisk, sortAssessmentsByDate, riskWeight } from '@/utils/risk';

const DAY_MS = 86400000;
const baseTime = Date.now();

function daysAgo(days: number, hour = 9): string {
  const date = new Date(baseTime - days * DAY_MS);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const DEMO_FARM_ID = 'farm-green-valley';
export const DEMO_FARM_NAME = 'Green Valley Dairy';

export const DEMO_FARMER: User = {
  id: 'user-farmer-001',
  name: 'Amina Wanjiku',
  email: 'farmer@pathotrace.demo',
  role: 'farmer',
  farmId: DEMO_FARM_ID,
  farmName: DEMO_FARM_NAME,
  phone: '+254 700 000 001',
};

export const DEMO_VETERINARIAN: User = {
  id: 'user-vet-001',
  name: 'Dr. Peter Otieno',
  email: 'vet@pathotrace.demo',
  role: 'veterinarian',
  farmId: DEMO_FARM_ID,
  farmName: DEMO_FARM_NAME,
  phone: '+254 700 000 002',
  assignedCowIds: ['PT-001', 'PT-002', 'PT-003', 'PT-005', 'PT-006', 'PT-009', 'PT-012'],
};

export const DEMO_COWS: Cow[] = [
  {
    id: 'cow-001',
    tagId: 'PT-001',
    name: 'Daisy',
    breed: 'Holstein Friesian',
    ageMonths: 62,
    lactationNumber: 3,
    lactationStage: 'Mid lactation',
    daysInMilk: 142,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'high',
    lastAssessmentAt: daysAgo(1, 7),
    lastAssessmentId: 'demo-assessment-001',
  },
  {
    id: 'cow-002',
    tagId: 'PT-002',
    name: 'Bella',
    breed: 'Jersey',
    ageMonths: 48,
    lactationNumber: 2,
    lactationStage: 'Early lactation',
    daysInMilk: 44,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'medium',
    lastAssessmentAt: daysAgo(1, 15),
    lastAssessmentId: 'demo-assessment-002',
  },
  {
    id: 'cow-003',
    tagId: 'PT-003',
    name: 'Luna',
    breed: 'Holstein Friesian',
    ageMonths: 75,
    lactationNumber: 4,
    lactationStage: 'Late lactation',
    daysInMilk: 284,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'high',
    lastAssessmentAt: daysAgo(2, 8),
    lastAssessmentId: 'demo-assessment-003',
  },
  {
    id: 'cow-004',
    tagId: 'PT-004',
    name: 'Clara',
    breed: 'Ayrshire',
    ageMonths: 36,
    lactationNumber: 1,
    lactationStage: 'Mid lactation',
    daysInMilk: 118,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(3, 10),
    lastAssessmentId: 'demo-assessment-004',
  },
  {
    id: 'cow-005',
    tagId: 'PT-005',
    name: 'Nora',
    breed: 'Jersey',
    ageMonths: 54,
    lactationNumber: 3,
    lactationStage: 'Mid lactation',
    daysInMilk: 160,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'medium',
    lastAssessmentAt: daysAgo(4, 14),
    lastAssessmentId: 'demo-assessment-005',
  },
  {
    id: 'cow-006',
    tagId: 'PT-006',
    name: 'Rosie',
    breed: 'Guernsey',
    ageMonths: 90,
    lactationNumber: 5,
    lactationStage: 'Late lactation',
    daysInMilk: 302,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'high',
    lastAssessmentAt: daysAgo(5, 9),
    lastAssessmentId: 'demo-assessment-006',
  },
  {
    id: 'cow-007',
    tagId: 'PT-007',
    name: 'Hazel',
    breed: 'Holstein Friesian',
    ageMonths: 30,
    lactationNumber: 1,
    lactationStage: 'Early lactation',
    daysInMilk: 32,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(7, 11),
    lastAssessmentId: 'demo-assessment-007',
  },
  {
    id: 'cow-008',
    tagId: 'PT-008',
    name: 'Mabel',
    breed: 'Friesian Cross',
    ageMonths: 68,
    lactationNumber: 3,
    lactationStage: 'Mid lactation',
    daysInMilk: 176,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(9, 13),
    lastAssessmentId: 'demo-assessment-008',
  },
  {
    id: 'cow-009',
    tagId: 'PT-009',
    name: 'Ginger',
    breed: 'Ayrshire',
    ageMonths: 42,
    lactationNumber: 2,
    lactationStage: 'Mid lactation',
    daysInMilk: 130,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'medium',
    lastAssessmentAt: daysAgo(12, 8),
    lastAssessmentId: 'demo-assessment-009',
  },
  {
    id: 'cow-010',
    tagId: 'PT-010',
    name: 'Poppy',
    breed: 'Jersey',
    ageMonths: 27,
    lactationNumber: 1,
    lactationStage: 'Early lactation',
    daysInMilk: 21,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(15, 10),
    lastAssessmentId: 'demo-assessment-010',
  },
  {
    id: 'cow-011',
    tagId: 'PT-011',
    name: 'Star',
    breed: 'Holstein Friesian',
    ageMonths: 84,
    lactationNumber: 4,
    lactationStage: 'Late lactation',
    daysInMilk: 291,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(18, 9),
    lastAssessmentId: 'demo-assessment-011',
  },
  {
    id: 'cow-012',
    tagId: 'PT-012',
    name: 'Willow',
    breed: 'Brown Swiss',
    ageMonths: 39,
    lactationNumber: 2,
    lactationStage: 'Mid lactation',
    daysInMilk: 152,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'medium',
    lastAssessmentAt: daysAgo(22, 12),
    lastAssessmentId: 'demo-assessment-012',
  },
  {
    id: 'cow-013',
    tagId: 'PT-013',
    name: 'Ruby',
    breed: 'Guernsey',
    ageMonths: 57,
    lactationNumber: 3,
    lactationStage: 'Mid lactation',
    daysInMilk: 166,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'low',
    lastAssessmentAt: daysAgo(26, 8),
    lastAssessmentId: 'demo-assessment-013',
  },
  {
    id: 'cow-014',
    tagId: 'PT-014',
    name: 'Ivy',
    breed: 'Holstein Friesian',
    ageMonths: 24,
    lactationNumber: 1,
    lactationStage: 'Early lactation',
    daysInMilk: 12,
    farmId: DEMO_FARM_ID,
    farmName: DEMO_FARM_NAME,
    riskStatus: 'unknown',
  },
];

function assessmentInput(
  cowId: string,
  milkYieldLiters: number,
  somaticCellCount: number,
  milkTemperatureC: number,
  daysInMilk: number,
  lactationNumber: number
): AssessmentInput {
  return {
    cowId,
    milkYieldLiters,
    somaticCellCount,
    milkTemperatureC,
    daysInMilk,
    lactationNumber,
  };
}

function assessmentFor(
  index: number,
  cowIndex: number,
  category: RiskCategory,
  days: number
): Assessment {
  const cow = DEMO_COWS[cowIndex];
  return {
    id: `demo-assessment-${String(index).padStart(3, '0')}`,
    cowId: cow.id,
    cowTagId: cow.tagId,
    cowName: cow.name,
    category,
    createdAt: daysAgo(days, 8 + (index % 8)),
    input: assessmentInput(
      cow.id,
      12 + index * 0.8,
      category === 'high' ? 820000 : category === 'medium' ? 360000 : 140000,
      category === 'high' ? 39.2 : category === 'medium' ? 38.6 : 38.1,
      cow.daysInMilk ?? 120,
      cow.lactationNumber ?? 1
    ),
    isDemonstration: true,
    note: 'Sample assessment record created for the demonstration build.',
  };
}

export const DEMO_ASSESSMENTS: Assessment[] = [
  assessmentFor(1, 0, 'high', 1),
  assessmentFor(2, 1, 'medium', 1),
  assessmentFor(3, 2, 'high', 2),
  assessmentFor(4, 3, 'low', 3),
  assessmentFor(5, 4, 'medium', 4),
  assessmentFor(6, 5, 'high', 5),
  assessmentFor(7, 6, 'low', 7),
  assessmentFor(8, 7, 'low', 9),
  assessmentFor(9, 8, 'medium', 12),
  assessmentFor(10, 9, 'low', 15),
  assessmentFor(11, 10, 'low', 18),
  assessmentFor(12, 11, 'medium', 22),
  assessmentFor(13, 12, 'low', 26),
];

export const DEMO_ALERTS: HealthAlert[] = [
  {
    id: 'demo-alert-001',
    cowId: 'cow-001',
    cowTagId: 'PT-001',
    cowName: 'Daisy',
    category: 'high',
    severity: 'high',
    title: 'High-risk assessment recorded',
    message:
      'A sample high-risk assessment was recorded for PT-001. Review the record and consider a veterinary examination.',
    createdAt: daysAgo(1, 8),
    read: false,
    assessmentId: 'demo-assessment-001',
  },
  {
    id: 'demo-alert-002',
    cowId: 'cow-002',
    cowTagId: 'PT-002',
    cowName: 'Bella',
    category: 'medium',
    severity: 'medium',
    title: 'Medium-risk assessment recorded',
    message:
      'A sample medium-risk assessment was recorded for PT-002. Monitor the cow and review the record.',
    createdAt: daysAgo(1, 16),
    read: false,
    assessmentId: 'demo-assessment-002',
  },
  {
    id: 'demo-alert-003',
    cowId: 'cow-003',
    cowTagId: 'PT-003',
    cowName: 'Luna',
    category: 'high',
    severity: 'high',
    title: 'High-risk assessment recorded',
    message:
      'A sample high-risk assessment was recorded for PT-003. Review the record and consider a veterinary examination.',
    createdAt: daysAgo(2, 9),
    read: false,
    assessmentId: 'demo-assessment-003',
  },
  {
    id: 'demo-alert-004',
    cowId: 'cow-006',
    cowTagId: 'PT-006',
    cowName: 'Rosie',
    category: 'high',
    severity: 'high',
    title: 'High-risk assessment recorded',
    message:
      'A sample high-risk assessment was recorded for PT-006. Review the record and consider a veterinary examination.',
    createdAt: daysAgo(5, 10),
    read: true,
    assessmentId: 'demo-assessment-006',
  },
  {
    id: 'demo-alert-005',
    cowId: 'cow-005',
    cowTagId: 'PT-005',
    cowName: 'Nora',
    category: 'medium',
    severity: 'medium',
    title: 'Medium-risk assessment recorded',
    message:
      'A sample medium-risk assessment was recorded for PT-005. Monitor the cow and review the record.',
    createdAt: daysAgo(4, 15),
    read: true,
    assessmentId: 'demo-assessment-005',
  },
  {
    id: 'demo-alert-006',
    cowId: 'cow-009',
    cowTagId: 'PT-009',
    cowName: 'Ginger',
    category: 'medium',
    severity: 'medium',
    title: 'Medium-risk assessment recorded',
    message:
      'A sample medium-risk assessment was recorded for PT-009. Monitor the cow and review the record.',
    createdAt: daysAgo(12, 9),
    read: true,
    assessmentId: 'demo-assessment-009',
  },
];

export const DEMO_HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'demo-record-001',
    cowId: 'cow-001',
    kind: 'checkup',
    title: 'Routine health check',
    description: 'Sample record: general condition checked during the monthly herd visit.',
    recordedAt: daysAgo(20, 10),
    recordedBy: 'Demo veterinarian',
    isDemonstration: true,
  },
  {
    id: 'demo-record-002',
    cowId: 'cow-001',
    kind: 'treatment',
    title: 'Udder care treatment',
    description: 'Sample record: treatment recorded during a previous demonstration visit.',
    recordedAt: daysAgo(35, 14),
    recordedBy: 'Demo veterinarian',
    isDemonstration: true,
  },
  {
    id: 'demo-record-003',
    cowId: 'cow-003',
    kind: 'illness',
    title: 'Reduced feed intake',
    description: 'Sample record: appetite observation recorded for demonstration purposes.',
    recordedAt: daysAgo(16, 11),
    recordedBy: 'Demo herd manager',
    isDemonstration: true,
  },
  {
    id: 'demo-record-004',
    cowId: 'cow-006',
    kind: 'checkup',
    title: 'Pre-dry-off check',
    description: 'Sample record: pre-dry-off health review for demonstration purposes.',
    recordedAt: daysAgo(41, 9),
    recordedBy: 'Demo veterinarian',
    isDemonstration: true,
  },
  {
    id: 'demo-record-005',
    cowId: 'cow-012',
    kind: 'vaccination',
    title: 'Routine vaccination',
    description: 'Sample record: herd vaccination schedule entry for demonstration purposes.',
    recordedAt: daysAgo(60, 15),
    recordedBy: 'Demo herd manager',
    isDemonstration: true,
  },
];

export const DEMO_OBSERVATIONS: VeterinaryObservation[] = [
  {
    id: 'demo-observation-001',
    cowId: 'cow-001',
    veterinarianId: 'user-vet-001',
    veterinarianName: 'Dr. Peter Otieno',
    note: 'Sample observation: udder quarters appeared slightly uneven during the demonstration visit. Follow-up recommended.',
    createdAt: daysAgo(1, 17),
    syncStatus: 'synced',
    isDemonstration: true,
  },
  {
    id: 'demo-observation-002',
    cowId: 'cow-003',
    veterinarianId: 'user-vet-001',
    veterinarianName: 'Dr. Peter Otieno',
    note: 'Sample observation: appetite and rumination monitored. Recheck scheduled in the demonstration timeline.',
    createdAt: daysAgo(2, 12),
    syncStatus: 'synced',
    isDemonstration: true,
  },
];

let mutableAssessments = [...DEMO_ASSESSMENTS];

function matchesQuery(cow: Cow, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [cow.tagId, cow.name, cow.breed, cow.lactationStage]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term));
}

export function getDemoHerd(query: HerdQuery): Paginated<Cow> {
  const filtered = DEMO_COWS.filter((cow) => {
    const riskMatches = !query.risk || query.risk === 'all' || cow.riskStatus === query.risk;
    return riskMatches && matchesQuery(cow, query.query ?? '');
  }).sort((a, b) => {
    const riskDifference = riskWeight(b.riskStatus) - riskWeight(a.riskStatus);
    if (riskDifference !== 0) return riskDifference;
    return a.tagId.localeCompare(b.tagId);
  });

  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, query.pageSize);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    page,
    pageSize,
    total: filtered.length,
    hasMore: start + items.length < filtered.length,
  };
}

export function getDemoCow(id: string): Cow | undefined {
  return DEMO_COWS.find((cow) => cow.id === id || cow.tagId === id);
}

export function getDemoAssessments(cowId?: string): Assessment[] {
  const items = cowId
    ? mutableAssessments.filter((assessment) => assessment.cowId === cowId)
    : mutableAssessments;
  return sortAssessmentsByDate(items);
}

export function getDemoAssessment(id: string): Assessment | undefined {
  return mutableAssessments.find((assessment) => assessment.id === id);
}

export function getDemoHealthRecords(cowId: string): HealthRecord[] {
  return DEMO_HEALTH_RECORDS.filter((record) => record.cowId === cowId).sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
}

export function getDemoBaseObservations(cowId: string): VeterinaryObservation[] {
  return DEMO_OBSERVATIONS.filter((observation) => observation.cowId === cowId);
}

export function createDemoAssessment(cowId: string, input: AssessmentInput): Assessment {
  const cow = getDemoCow(cowId);
  if (!cow) {
    throw new Error('Cow not found');
  }

  const category: RiskCategory =
    cow.riskStatus === 'high' || cow.riskStatus === 'medium' || cow.riskStatus === 'low'
      ? cow.riskStatus
      : 'medium';

  const assessment: Assessment = {
    id: `demo-assessment-local-${Date.now()}`,
    cowId: cow.id,
    cowTagId: cow.tagId,
    cowName: cow.name,
    category,
    createdAt: new Date().toISOString(),
    input: { ...input, cowId: cow.id },
    isDemonstration: true,
    note: 'Demonstration sample result. No ML model was used to produce this record.',
  };

  mutableAssessments = [assessment, ...mutableAssessments];
  return assessment;
}

export function getDemoDashboard() {
  const counts = countRisk(DEMO_COWS);
  return {
    totalCattle: DEMO_COWS.length,
    highRisk: counts.high,
    mediumRisk: counts.medium,
    lowRisk: counts.low,
    unknownRisk: counts.unknown,
    recentAssessments: getDemoAssessments().slice(0, 4),
    recentAlerts: DEMO_ALERTS.slice(0, 3),
    lastUpdated: new Date().toISOString(),
  };
}

export function resetDemoAssessments(): void {
  mutableAssessments = [...DEMO_ASSESSMENTS];
}

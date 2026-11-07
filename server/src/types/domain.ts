export type UserRole = 'farmer' | 'veterinarian' | 'cooperative' | 'admin';
export type RiskCategory = 'low' | 'medium' | 'high';
export type RiskStatus = RiskCategory | 'unknown';
export type CowStatus = 'active' | 'sold' | 'dead' | 'archived';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AssessmentInput {
  cowId: string;
  milkYieldLiters: number;
  somaticCellCount: number;
  milkTemperatureC: number;
  daysInMilk: number;
  lactationNumber: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  farmId: string | null;
  farmName: string | null;
  assignedCowIds: string[];
}

export interface AuthDevice {
  id: string;
  farmId: string;
  serialNumber: string;
  expectedIntervalSeconds: number;
}

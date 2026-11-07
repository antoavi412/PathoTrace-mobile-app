import type { AuthUser } from '../types/domain';

/** Shape returned to the mobile client. Must match src/services/remote/parsers.ts. */
export function serializeUser(user: AuthUser): Record<string, unknown> {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
    farmId: user.farmId ?? undefined,
    farmName: user.farmName ?? undefined,
    assignedCowIds: user.assignedCowIds,
  };
}

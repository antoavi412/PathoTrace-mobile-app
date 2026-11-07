import type { Cow, User } from '@/types';

export function canAccessVetWorkspace(user: User | null): boolean {
  return user?.role === 'veterinarian';
}

export function canAddVeterinaryObservation(
  user: User | null,
  cow: Pick<Cow, 'id' | 'tagId'> | null | undefined
): boolean {
  if (user?.role !== 'veterinarian' || !cow) return false;

  const assignedCowIds = user.assignedCowIds;
  if (!assignedCowIds) return true;

  return assignedCowIds.some((assigned) => assigned === cow.id || assigned === cow.tagId);
}

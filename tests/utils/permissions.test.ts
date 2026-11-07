import type { User } from '@/types';
import { canAccessVetWorkspace, canAddVeterinaryObservation } from '@/utils/permissions';

const cow = { id: 'cow-1', tagId: 'T-100' };

function user(role: User['role'], assignedCowIds?: string[]): User {
  return {
    id: 'u-1',
    name: 'Test User',
    email: 'user@example.com',
    role,
    assignedCowIds,
  };
}

describe('permission helpers', () => {
  it('limits the veterinary workspace to veterinarians', () => {
    expect(canAccessVetWorkspace(user('veterinarian'))).toBe(true);
    expect(canAccessVetWorkspace(user('farmer'))).toBe(false);
    expect(canAccessVetWorkspace(user('cooperative'))).toBe(false);
    expect(canAccessVetWorkspace(null)).toBe(false);
  });

  it('allows veterinarians without assignments to observe any loaded cow', () => {
    expect(canAddVeterinaryObservation(user('veterinarian'), cow)).toBe(true);
  });

  it('respects assigned cattle by id or ear tag', () => {
    expect(canAddVeterinaryObservation(user('veterinarian', ['cow-1']), cow)).toBe(true);
    expect(canAddVeterinaryObservation(user('veterinarian', ['T-100']), cow)).toBe(true);
    expect(canAddVeterinaryObservation(user('veterinarian', ['cow-2']), cow)).toBe(false);
  });

  it('blocks farmers and missing cattle records', () => {
    expect(canAddVeterinaryObservation(user('farmer'), cow)).toBe(false);
    expect(canAddVeterinaryObservation(user('veterinarian'), null)).toBe(false);
    expect(canAddVeterinaryObservation(null, cow)).toBe(false);
  });
});

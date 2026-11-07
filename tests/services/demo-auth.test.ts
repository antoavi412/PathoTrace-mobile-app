import { demoLogin } from '@/services/demo/demo-auth';
import { ApiError } from '@/types';

describe('demoLogin', () => {
  it('signs in the demo farmer', async () => {
    const session = await demoLogin('farmer@pathotrace.demo', 'demo1234');
    expect(session.user.role).toBe('farmer');
    expect(session.user.name).toBe('Amina Wanjiku');
    expect(session.token).toMatch(/^demo-token-/);
  });

  it('signs in the demo veterinarian', async () => {
    const session = await demoLogin('vet@pathotrace.demo', 'demo1234');
    expect(session.user.role).toBe('veterinarian');
  });

  it('rejects an invalid password', async () => {
    await expect(demoLogin('farmer@pathotrace.demo', 'wrong')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('rejects an unknown account', async () => {
    await expect(demoLogin('unknown@pathotrace.demo', 'demo1234')).rejects.toBeInstanceOf(
      ApiError
    );
  });
});

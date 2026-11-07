import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { durationToSeconds, env } from '../../config/env';
import { audit } from '../../lib/audit';
import { authenticate, loadUserById, requireUser, signAccessToken } from '../../lib/auth';
import { ApiError } from '../../lib/errors';
import { serializeUser } from '../../lib/serializers';
import {
  createRefreshToken,
  findUserByIdentifier,
  revokeUserRefreshTokens,
  rotateRefreshToken,
  verifyPassword,
} from './service';

const loginSchema = z.object({
  identifier: z.string().min(1, 'identifier is required'),
  password: z.string().min(1, 'password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const forgotSchema = z.object({
  identifier: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const user = await findUserByIdentifier(body.identifier);

      // Always run a verification to keep invalid-user timing close to invalid-password.
      const passwordOk =
        user !== null
          ? await verifyPassword(body.password, user.password_hash)
          : await verifyPassword(body.password, 'scrypt$00$00');

      if (!user || !passwordOk) {
        throw ApiError.unauthorized('Invalid email or password.');
      }

      const accessToken = signAccessToken({ id: user.id, role: user.role });
      const refresh = await createRefreshToken(user.id);

      await audit({
        actorType: 'user',
        actorId: user.id,
        action: 'auth.login',
      });

      const authUser = await loadUserById(user.id);
      if (!authUser) throw ApiError.unauthorized('User no longer exists.');

      return reply.send({
        token: accessToken,
        refreshToken: refresh.token,
        expiresIn: durationToSeconds(env.ACCESS_TOKEN_TTL),
        user: serializeUser(authUser),
      });
    }
  );

  app.post(
    '/refresh',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = refreshSchema.parse(request.body);
      const rotated = await rotateRefreshToken(body.refreshToken);
      const user = await loadUserById(rotated.userId);
      if (!user) throw ApiError.unauthorized('User no longer exists.');

      return reply.send({
        token: signAccessToken(user),
        refreshToken: rotated.token,
        expiresIn: durationToSeconds(env.ACCESS_TOKEN_TTL),
        user: serializeUser(user),
      });
    }
  );

  app.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    await revokeUserRefreshTokens(user.id);
    await audit({ actorType: 'user', actorId: user.id, action: 'auth.logout' });
    return reply.send({ ok: true });
  });

  app.post(
    '/forgot-password',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = forgotSchema.parse(request.body);
      // No mail transport is configured in v1. Log without revealing whether the account exists.
      request.log.info({ identifier: body.identifier }, 'Password recovery requested');
      return reply.send({ ok: true });
    }
  );

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = requireUser(request);
    return reply.send(serializeUser(user));
  });
}

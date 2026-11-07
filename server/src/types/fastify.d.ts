import 'fastify';
import type { AuthDevice, AuthUser } from './domain';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
    device: AuthDevice | null;
  }
}

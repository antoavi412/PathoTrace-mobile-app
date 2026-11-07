import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { query, queryOne } from '../db/client';
import { ApiError } from './errors';
import { hashDeviceToken } from './security';
import type { AuthDevice, AuthUser, UserRole } from '../types/domain';

interface UserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  farm_id: string | null;
  farm_name: string | null;
}

interface DeviceRow {
  id: string;
  farm_id: string;
  serial_number: string;
  expected_interval_seconds: number;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(user: Pick<AuthUser, 'id' | 'role'>): string {
  const payload: AccessTokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
  });
}

function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new Error('Missing subject');
    }
    return { sub: String(decoded.sub), role: (decoded as AccessTokenPayload).role };
  } catch {
    throw ApiError.unauthorized('Session is invalid or has expired.');
  }
}

export async function loadUserById(userId: string): Promise<AuthUser | null> {
  const row = await queryOne<UserRow>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.farm_id, f.name AS farm_name
       FROM users u
       LEFT JOIN farms f ON f.id = u.farm_id
      WHERE u.id = $1`,
    [userId]
  );
  if (!row) return null;

  const assigned = await query<{ cow_id: string }>(
    'SELECT cow_id FROM vet_cattle_assignments WHERE vet_id = $1',
    [row.id]
  );

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    farmId: row.farm_id,
    farmName: row.farm_name,
    assignedCowIds: assigned.map((item) => item.cow_id),
  };
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing bearer token.');
  }

  const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
  const user = await loadUserById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists.');

  request.user = user;
}

export async function authenticateDevice(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Device ')) {
    throw ApiError.unauthorized('Missing device token.');
  }

  const token = header.slice('Device '.length).trim();
  if (!token) throw ApiError.unauthorized('Empty device token.');

  const row = await queryOne<DeviceRow>(
    `SELECT id, farm_id, serial_number, expected_interval_seconds
       FROM devices
      WHERE token_hash = $1 AND status <> 'maintenance'`,
    [hashDeviceToken(token)]
  );

  if (!row) throw ApiError.unauthorized('Device token is invalid or revoked.');

  request.device = {
    id: row.id,
    farmId: row.farm_id,
    serialNumber: row.serial_number,
    expectedIntervalSeconds: row.expected_interval_seconds,
  };
}

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw ApiError.unauthorized();
  return request.user;
}

export function requireDevice(request: FastifyRequest): AuthDevice {
  if (!request.device) throw ApiError.unauthorized();
  return request.device;
}

export function assertRole(user: AuthUser, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw ApiError.forbidden(`This action requires one of: ${roles.join(', ')}.`);
  }
}

export function canManageFarm(user: AuthUser): boolean {
  return user.role === 'farmer' || user.role === 'admin';
}

export function assertFarmScope(user: AuthUser, farmId: string): void {
  if (user.role === 'admin') return;
  if (!user.farmId || user.farmId !== farmId) {
    throw ApiError.forbidden('This record belongs to another farm.');
  }
}

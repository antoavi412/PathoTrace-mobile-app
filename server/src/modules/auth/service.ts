import { env } from '../../config/env';
import { query, queryOne, withTransaction } from '../../db/client';
import { ApiError } from '../../lib/errors';
import { generateToken, hashPassword, sha256, verifyPassword } from '../../lib/security';

export interface LoginUserRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'farmer' | 'veterinarian' | 'cooperative' | 'admin';
  farm_id: string | null;
  farm_name: string | null;
  password_hash: string;
  preferences: Record<string, unknown> | null;
}

export async function findUserByIdentifier(identifier: string): Promise<LoginUserRow | null> {
  return queryOne<LoginUserRow>(
    `SELECT u.id, u.email, u.name, u.phone, u.role, u.farm_id, f.name AS farm_name,
            u.password_hash, u.preferences
       FROM users u
       LEFT JOIN farms f ON f.id = u.farm_id
      WHERE lower(u.email) = lower($1) OR u.phone = $1
      LIMIT 1`,
    [identifier.trim()]
  );
}

export async function createRefreshToken(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = generateToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, sha256(token), expiresAt]
  );
  return { token, expiresAt };
}

export async function rotateRefreshToken(rawToken: string): Promise<{
  userId: string;
  token: string;
  expiresAt: Date;
}> {
  const tokenHash = sha256(rawToken);

  return withTransaction(async (client) => {
    const result = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id
         FROM refresh_tokens
        WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
        FOR UPDATE`,
      [tokenHash]
    );

    const existing = result.rows[0];
    if (!existing) {
      throw ApiError.unauthorized('Refresh token is invalid or expired.');
    }

    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [existing.id]);

    const token = generateToken(48);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [existing.user_id, sha256(token), expiresAt]
    );

    return { userId: existing.user_id, token, expiresAt };
  });
}

export async function revokeUserRefreshTokens(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens
        SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

export async function registerUser(params: {
  email: string;
  password: string;
  name: string;
  role?: 'farmer' | 'veterinarian' | 'cooperative';
  farmId?: string | null;
  phone?: string | null;
}): Promise<LoginUserRow> {
  const passwordHash = await hashPassword(params.password);
  const row = await queryOne<LoginUserRow>(
    `INSERT INTO users (email, phone, password_hash, name, role, farm_id)
     VALUES (lower($1), $2, $3, $4, $5, $6)
     RETURNING id, email, name, phone, role, farm_id, NULL::text AS farm_name,
               password_hash, preferences`,
    [
      params.email,
      params.phone ?? null,
      passwordHash,
      params.name,
      params.role ?? 'farmer',
      params.farmId ?? null,
    ]
  );
  if (!row) throw ApiError.internal('Could not create user.');
  return row;
}

export { verifyPassword };

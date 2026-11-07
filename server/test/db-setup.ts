import type { PoolClient } from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { pool } from '../src/db/client';

let client: PoolClient | null = null;

beforeAll(async () => {
  client = await pool.connect();
});

afterAll(async () => {
  if (client) client.release();
  await pool.end();
});

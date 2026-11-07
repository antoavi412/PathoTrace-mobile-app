import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { buildApp } from '../src/app';
import { pool } from '../src/db/client';
import { closePool } from '../src/db/client';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://pathotrace:pathotrace_dev@localhost:5432/pathotrace';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await closePool();
});

beforeEach(async () => {
  await pool.query('BEGIN');
});

afterEach(async () => {
  await pool.query('ROLLBACK');
});

test('health endpoint returns ok', async () => {
  const res = await app.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toMatchObject({ status: 'ok' });
});

test('ready endpoint returns ready', async () => {
  const res = await app.inject({ method: 'GET', url: '/ready' });
  expect(res.statusCode).toBe(200);
});

test('POST /v1/auth/login requires credentials', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: { identifier: '', password: '' },
  });
  expect(res.statusCode).toBe(422);
});

test('POST /v1/ingest/readings requires device auth', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/ingest/readings',
    body: { readings: [{ metric: 'temperature', value: 38.7, unit: 'C' }] },
  });
  expect(res.statusCode).toBe(401);
});

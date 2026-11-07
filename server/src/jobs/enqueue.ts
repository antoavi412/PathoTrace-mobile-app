import { query } from '../db/client';

/** Queue a one-off background job. */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown> = {},
  runAt: Date = new Date()
): Promise<void> {
  await query(
    `INSERT INTO jobs (type, payload, run_at)
     VALUES ($1, $2::jsonb, $3)`,
    [type, JSON.stringify(payload), runAt]
  );
}

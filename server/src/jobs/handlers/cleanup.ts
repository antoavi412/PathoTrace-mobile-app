import { query } from '../../db/client';

/** Remove stale operational data. Runs daily and is safe to repeat. */
export async function cleanupHandler(): Promise<void> {
  await query(
    `DELETE FROM jobs
      WHERE status IN ('done', 'failed')
        AND finished_at IS NOT NULL
        AND finished_at < now() - interval '7 days'`
  );

  await query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < now() - interval '7 days'
         OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '30 days')`
  );

  await query(
    `DELETE FROM ingest_batches
      WHERE received_at < now() - interval '30 days'`
  );

  await query(
    `DELETE FROM device_events
      WHERE acknowledged_at IS NOT NULL
        AND created_at < now() - interval '180 days'`
  );
}

import { query } from '../db/client';

/** Append an entry to the audit log. Failures are non-fatal. */
export async function audit(params: {
  actorType: 'user' | 'device' | 'system';
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (actor_type, actor_id, action, entity, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        params.actorType,
        params.actorId ?? null,
        params.action,
        params.entity ?? null,
        params.entityId ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (error) {
    // Auditing must never break the request path.
    console.error('Failed to write audit log', error);
  }
}

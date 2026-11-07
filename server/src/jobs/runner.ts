import type { Logger } from 'pino';
import { query } from '../db/client';
import { alertEvaluateHandler } from './handlers/alert-evaluate';
import { cleanupHandler } from './handlers/cleanup';
import { deviceSilenceHandler } from './handlers/device-silence';

type JobHandler = () => Promise<void>;

const HANDLERS: Record<string, JobHandler> = {
  'device-silence': deviceSilenceHandler,
  'alert-evaluate': alertEvaluateHandler,
  cleanup: cleanupHandler,
};

const MAX_ATTEMPTS = 5;
const TICK_MS = 5000;

interface JobRow {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

let timer: NodeJS.Timeout | null = null;
let ticking = false;
let stopped = false;

async function recoverStaleJobs(logger: Logger): Promise<void> {
  const result = await query(
    `UPDATE jobs
        SET status = 'pending', locked_at = NULL
      WHERE status = 'processing'
        AND locked_at < now() - interval '5 minutes'
      RETURNING id`
  );
  if (result.length > 0) {
    logger.warn({ count: result.length }, 'Recovered stale background jobs');
  }
}

async function enqueueDueSchedules(logger: Logger): Promise<void> {
  const due = await query<{ name: string; interval_seconds: number }>(
    `SELECT name, interval_seconds
       FROM job_schedules
      WHERE last_enqueued_at IS NULL
         OR last_enqueued_at <= now() - (interval_seconds * interval '1 second')`
  );

  for (const schedule of due) {
    if (!HANDLERS[schedule.name]) continue;
    await query(`INSERT INTO jobs (type, payload) VALUES ($1, '{}'::jsonb)`, [schedule.name]);
    await query(`UPDATE job_schedules SET last_enqueued_at = now() WHERE name = $1`, [
      schedule.name,
    ]);
    logger.debug({ job: schedule.name }, 'Enqueued scheduled job');
  }
}

async function processJobs(logger: Logger): Promise<void> {
  const claimed = await query<JobRow>(
    `WITH next AS (
       SELECT id
         FROM jobs
        WHERE status = 'pending' AND run_at <= now()
        ORDER BY id
        FOR UPDATE SKIP LOCKED
        LIMIT 5
     )
     UPDATE jobs j
        SET status = 'processing', locked_at = now(), attempts = attempts + 1
       FROM next
      WHERE j.id = next.id
      RETURNING j.id, j.type, j.payload, j.attempts`,
  );

  for (const job of claimed) {
    const handler = HANDLERS[job.type];
    if (!handler) {
      await query(
        `UPDATE jobs
            SET status = 'failed', last_error = $2, finished_at = now()
          WHERE id = $1`,
        [job.id, `No handler registered for job type ${job.type}`]
      );
      continue;
    }

    try {
      await handler();
      await query(`UPDATE jobs SET status = 'done', finished_at = now() WHERE id = $1`, [job.id]);
      await query(
        `UPDATE job_schedules SET last_run_at = now() WHERE name = $1`,
        [job.type]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ jobId: job.id, jobType: job.type, err: error }, 'Background job failed');

      const failed = job.attempts >= MAX_ATTEMPTS;
      await query(
        `UPDATE jobs
            SET status = $2,
                last_error = $3,
                locked_at = NULL,
                run_at = CASE WHEN $2 = 'pending'
                              THEN now() + ($4 * interval '1 second')
                              ELSE run_at END,
                finished_at = CASE WHEN $2 = 'failed' THEN now() ELSE NULL END
          WHERE id = $1`,
        [job.id, failed ? 'failed' : 'pending', message, job.attempts * 30]
      );
    }
  }
}

async function tick(logger: Logger): Promise<void> {
  if (ticking || stopped) return;
  ticking = true;
  try {
    await enqueueDueSchedules(logger);
    await processJobs(logger);
  } catch (error) {
    logger.error({ err: error }, 'Job runner tick failed');
  } finally {
    ticking = false;
  }
}

export async function startJobRunner(logger: Logger): Promise<void> {
  await recoverStaleJobs(logger);
  timer = setInterval(() => {
    void tick(logger);
  }, TICK_MS);
  if (typeof timer.unref === 'function') timer.unref();
  void tick(logger);
  logger.info('Background job runner started');
}

export function stopJobRunner(): void {
  stopped = true;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

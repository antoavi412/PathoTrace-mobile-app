/**
 * Device simulator for PathoTrace backend testing.
 *
 * Usage:
 *   npx tsx scripts/simulate-devices.ts --count 10 --interval 15 --duration 60
 *
 * Requires DATABASE_URL and a running API + Postgres. It calls the real
 * /v1/ingest/readings endpoint using synthetic device tokens created by the
 * seed script (or you can pre-create devices with known tokens).
 */
import { randomInt } from 'node:crypto';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://pathotrace:pathotrace_dev@localhost:5432/pathotrace';
const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const COUNT = Number(process.env.SIMULATE_COUNT ?? '10');
const INTERVAL_SECONDS = Number(process.env.SIMULATE_INTERVAL ?? '900');
const DURATION_SECONDS = Number(process.env.SIMULATE_DURATION ?? '3600');
const BACKFILL = process.env.SIMULATE_BACKFILL === '1';
const DUPLICATE = process.env.SIMULATE_DUPLICATE === '1';
const OFFLINE_DEVICE_INDEX = Number(process.env.SIMULATE_OFFLINE ?? '-1');

const TEMPERATURE_BASE = 38.6;
const ACTIVITY_BASE = 60;

const METRICS = [
  { metric: 'temperature', value: TEMPERATURE_BASE, unit: 'C' },
  { metric: 'activity', value: ACTIVITY_BASE, unit: 'index' },
];

function iso(d: Date): string {
  return d.toISOString();
}

function randomReading(baseValue: number): { metric: string; value: number; unit: string } {
  const jitter = (Math.random() - 0.5) * 2;
  return {
    metric: 'temperature',
    value: Number((baseValue + jitter).toFixed(1)),
    unit: 'C',
  };
}

async function main(): Promise<void> {
  console.log(`Simulating ${COUNT} devices every ${INTERVAL_SECONDS}s for ${DURATION_SECONDS}s`);
  console.log(`API: ${API_URL}`);

  const endTime = Date.now() + DURATION_SECONDS * 1000;
  let tick = 0;

  while (Date.now() < endTime) {
    tick += 1;
    const now = new Date();

    const promises: Promise<void>[] = [];

    for (let i = 0; i < COUNT; i++) {
      if (i === OFFLINE_DEVICE_INDEX) continue;

      const deviceToken = `sim-token-${String(i).padStart(4, '0')}`;
      const readings = [
        { metric: 'temperature', value: Number((TEMPERATURE_BASE + (Math.random() - 0.5) * 2).toFixed(1)), unit: 'C' },
        { metric: 'activity', value: Math.floor(ACTIVITY_BASE + randomInt(-10, 10)), unit: 'index' },
      ];

      const body = {
        source: 'cellular',
        bootId: `boot-${tick}`,
        sequence: tick * COUNT + i,
        recordedAt: iso(now),
        readings,
      };

      promises.push(
        fetch(`${API_URL}/v1/ingest/readings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Device ${deviceToken}`,
          },
          body: JSON.stringify(body),
        }).then(async (res) => {
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.warn(`Device ${i} tick ${tick}: ${res.status} ${text}`);
          }
        })
      );

      if (DUPLICATE) {
        // Resend the same batch to test idempotency.
        promises.push(
          fetch(`${API_URL}/v1/ingest/readings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Device ${deviceToken}`,
            },
            body: JSON.stringify(body),
          }).then(async (res) => {
            if (!res.ok) {
              const text = await res.text().catch(() => '');
              console.warn(`Device ${i} duplicate tick ${tick}: ${res.status} ${text}`);
            }
          })
        );
      }
    }

    await Promise.all(promises);
    console.log(`Tick ${tick} complete at ${iso(now)}`);

    // Wait for the next interval.
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_SECONDS * 1000));
  }

  console.log('Simulation complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

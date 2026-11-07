import { buildApp } from './app';
import { env } from './config/env';
import { closePool } from './db/client';
import { startJobRunner, stopJobRunner } from './jobs/runner';

async function main(): Promise<void> {
  const app = await buildApp();

  await startJobRunner(app.log);

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info({ port: env.PORT }, 'PathoTrace API listening');

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down');
    stopJobRunner();
    try {
      await app.close();
      await closePool();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  console.error('Failed to start PathoTrace API', error);
  process.exit(1);
});

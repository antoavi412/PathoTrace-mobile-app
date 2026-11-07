/** Vitest configuration for PathoTrace server tests. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    dedupe: ['fastify'],
  },
});

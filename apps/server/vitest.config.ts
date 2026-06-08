import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.smoke.test.ts'],
    testTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts'],
  },
});

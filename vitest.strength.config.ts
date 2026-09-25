import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/strength/**/*.test.ts'],
    testTimeout: 900_000,
    hookTimeout: 60_000,
  },
});

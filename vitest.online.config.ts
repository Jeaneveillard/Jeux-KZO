import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    include: ['tests/online/**/*.test.ts'],
    testTimeout: 30_000,
    env: loadEnv(mode, process.cwd(), 'VITE_'),
  },
}));

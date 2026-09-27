import { defineConfig, devices } from '@playwright/test';

/** Deux téléphones contre le vrai projet Supabase (clés lues dans `.env.local` au build) : à lancer à la demande. */
export default defineConfig({
  testDir: 'tests/e2e-online',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: 'list',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});

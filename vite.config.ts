import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

/** `/Jeux-KZO/` pour GitHub Pages (variable BASE_PATH), `/` en local et pour les tests. */
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    preact({ prefreshEnabled: !process.env.VITEST }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Échecs & Dames',
        short_name: 'Échecs & Dames',
        description: "Apprends et joue aux échecs et aux dames contre l'ordinateur.",
        lang: 'fr',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4f1ea',
        theme_color: '#1f4e3d',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/unit/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/app/App.tsx',
        'src/app/navigation.ts',
        'src/app/sound.ts',
        'src/app/screens/**',
        'src/app/components/**',
        'src/app/game/useGame.ts',
        'src/app/online/useOnlineApi.ts',
        'src/app/online/useOnlineGame.ts',
        'src/app/online/*.tsx',
        'src/chess/engine/transport.ts',
        'src/chess/engine/index.ts',
        'src/draughts/engine/worker.ts',
        'src/draughts/engine/index.ts',
        'src/online/client.ts',
        'src/online/index.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});

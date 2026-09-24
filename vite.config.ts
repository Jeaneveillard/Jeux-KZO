import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact({ prefreshEnabled: !process.env.VITEST })],
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
        'src/app/game/useChessGame.ts',
        'src/chess/engine/transport.ts',
        'src/chess/engine/index.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});

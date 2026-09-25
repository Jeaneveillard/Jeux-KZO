import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Marge de l'icône Android au vert du fond, pour éviter un anneau blanc une fois l'icône découpée.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#1f4e3d' } },
  },
  images: ['public/icon.svg'],
});

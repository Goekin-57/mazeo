import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
  },
  server: { host: true, port: 5173 },
  test: { include: ['tests/unit/**/*.test.ts'] },
}));

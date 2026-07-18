import { defineConfig } from 'vite';

/** Production bundling keeps the engine cacheable apart from game code. */
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
});

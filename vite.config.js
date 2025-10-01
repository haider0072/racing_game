import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000, // Increase from default 500kb to 3000kb (3MB)
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'cannon': ['cannon-es'],
        }
      }
    }
  }
});

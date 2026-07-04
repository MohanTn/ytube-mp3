import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        // Required for /api/events (SSE) to stream without buffering.
        ws: false
      }
    }
  }
});

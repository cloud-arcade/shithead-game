import { defineConfig } from 'vite';
import { resolve } from 'path';

// Configuration for running the test harness
export default defineConfig({
  root: 'test-harness',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  server: {
    port: 3001,
    open: true,
  },
});

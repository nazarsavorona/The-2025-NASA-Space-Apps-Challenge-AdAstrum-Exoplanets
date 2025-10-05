import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './',
  publicDir: 'templates',
  server: {
    port: 5173,
    open: 'example-simple.html'
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        example: path.resolve(__dirname, 'example-simple.html')
      }
    }
  }
});

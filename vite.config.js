import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — сборка живёт в подпапке GitHub Pages (/WebGL-playground/r3f/), абсолютные пути сломались бы
export default defineConfig({
  base: './',
  plugins: [react()],
});

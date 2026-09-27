import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — сборка живёт в корне сайта (/WebGL-playground/), но относительные пути не привязывают её
// к глубине: она работает и в корне, и в любой подпапке (например, локальный preview под подпутём)
export default defineConfig({
  base: './',
  plugins: [react()],
});

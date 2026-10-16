import { defineConfig } from 'vite';

// Publicado em https://guiisobral.github.io/gestao-da-performance/
export default defineConfig({
  base: '/gestao-da-performance/',
  build: { target: 'es2020', sourcemap: false }
});

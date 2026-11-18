import { defineConfig } from 'vite';

// Assets relativos: funciona em subdiretórios (como um site de projeto no GitHub Pages).
// A publicação automática do aplicativo real permanece desativada até homologação.
export default defineConfig({
  base: './',
  build: { outDir: 'dist' }
});

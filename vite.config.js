import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config — builds a static site to dist/, which .github/workflows/pages.yml
// uploads to GitHub Pages (dist/ is not committed).
// `base: './'` makes all asset URLs relative, which works under any repo path
// (<user>.github.io/<repo>/) without editing this file per-project.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // Keep everything inline-friendly for GH Pages; no code-splitting magic needed
    // for a ~150KB app. This inlines small assets and produces a single JS chunk.
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});

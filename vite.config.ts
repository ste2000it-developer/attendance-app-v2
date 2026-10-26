import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this project beneath /attendance-app-v2/.
  // Keep the root base for normal local development.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/attendance-app-v2/' : '/',
  plugins: [react()],
});

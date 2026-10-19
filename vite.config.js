import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// github.io/<repository> requires the repository name as its base path.
// Set VITE_BASE_PATH as a GitHub Actions variable (example: /orbit-task-studio/).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
});

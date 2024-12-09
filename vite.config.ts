import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // @ts-expect-error
  base: process.env.BASE_URL || '/',
  plugins: [react()],
});

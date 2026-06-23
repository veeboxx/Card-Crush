import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Desktop-only (Tauri) build — no proxy, no PWA. All data is local.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
});

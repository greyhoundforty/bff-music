import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Sesh gives each worktree session its own port. Hold to it strictly so two
// sessions never drift onto each other; outside Sesh, keep the 5173 default.
const seshPort = Number(process.env.SESH_SESSION_PORT) || undefined;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: seshPort ?? 5173,
    strictPort: seshPort !== undefined,
  },
});

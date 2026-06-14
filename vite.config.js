import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Replit requires 0.0.0.0:5000 and open allowedHosts — no-op everywhere else.
  ...(process.env.REPL_ID && {
    server: { host: '0.0.0.0', port: 5000, allowedHosts: true },
  }),
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cloud preview hosts (v0 / `vercel dev`, Replit, Codespaces, etc.) hand the dev server a
// port via PORT and proxy to it. Vite ignores PORT by default, so we wire it in explicitly
// and bind 0.0.0.0 with open allowedHosts so the host's proxy/preview domain can connect.
// Resolves to a falsy 0 when neither marker is present, so LOCAL `npm run dev` is untouched
// (default localhost:5173, no host/allowedHosts changes).
const cloudPort = Number(process.env.PORT) || (process.env.REPL_ID ? 5000 : 0)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  ...(cloudPort && {
    server: { host: '0.0.0.0', port: cloudPort, allowedHosts: true },
  }),
})

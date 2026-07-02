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
  build: {
    rollupOptions: {
      output: {
        // Split the animation/scroll runtime libs into a stable vendor chunk
        // separate from app code. They change far less often than app source,
        // so this improves browser cache reuse across deploys and lets the
        // browser parse/fetch them independently of the app bundle. Spline
        // (@splinetool/react-spline + runtime) is already its own chunk via
        // the React.lazy() boundary in SplineScene.jsx — left untouched here.
        // Vite 8's Rolldown bundler requires the function form (the classic
        // object-map form throws "manualChunks is not a function" at build).
        manualChunks(id) {
          if (
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/gsap') ||
            id.includes('node_modules/lenis')
          ) {
            return 'vendor'
          }
        },
      },
    },
  },
  ...(cloudPort && {
    server: { host: '0.0.0.0', port: cloudPort, allowedHosts: true },
  }),
})

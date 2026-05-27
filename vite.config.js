import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Prototype-only configuration. No backend proxies. No env secrets.
// GitHub Pages deploy uses a sub-path base — set DEPLOY_BASE env at build time, e.g.
//   DEPLOY_BASE=/portal-ux-prototype-demo/ npm run build:pages
export default defineConfig({
  plugins: [react()],
  base: process.env.DEPLOY_BASE || '/',
  server: { port: 5173, strictPort: false, open: false },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 800 },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { microfrontends } from '@vercel/microfrontends/experimental/vite'
import path from 'path'

const useMicrofrontends = Boolean(process.env.VC_MICROFRONTENDS_CONFIG)

// https://vitejs.dev/config/
export default defineConfig({
  base: useMicrofrontends ? '/dashboard/' : '/',
  plugins: [react(), microfrontends()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

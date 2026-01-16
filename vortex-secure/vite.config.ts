import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { microfrontends } from '@vercel/microfrontends/experimental/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/dashboard/',
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

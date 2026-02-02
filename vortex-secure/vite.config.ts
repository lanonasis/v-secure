import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
// Deployed to secureme.lanonasis.com (subdomain, not path-based)
export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { microfrontends } from '@vercel/microfrontends/experimental/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), microfrontends()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    // Make environment variables available
    'process.env': process.env
  }
})

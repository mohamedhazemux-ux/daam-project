import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: process.env.VITE_API_PROXY_TARGET
      ? { '/api': { target: process.env.VITE_API_PROXY_TARGET, changeOrigin: true } }
      : undefined,
  },
})

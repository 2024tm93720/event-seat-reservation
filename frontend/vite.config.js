import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/users': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/users/, ''),
      },
      '/api/catalog': {
        target: 'http://localhost:8002',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/catalog/, ''),
      },
      '/api/seating': {
        target: 'http://localhost:8003',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/seating/, ''),
      },
      '/api/orders': {
        target: 'http://localhost:8965',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/orders/, ''),
      },
      '/api/payments': {
        target: 'http://localhost:9865',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/payments/, ''),
      },
      '/api/notifications': {
        target: 'http://localhost:8006',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/notifications/, ''),
      },
    },
  },
})

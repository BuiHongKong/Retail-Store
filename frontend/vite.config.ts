import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Cart (3001), Checkout (3002), Auth (3003) — khai báo trước /api
      "/api/cart": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/checkout": {
        target: "http://localhost:3002",
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://localhost:3003",
        changeOrigin: true,
      },
      "/api/orders": {
        target: "http://localhost:3003",
        changeOrigin: true,
      },
      "/api/admin": {
        target: "http://localhost:3004",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/assets": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
})

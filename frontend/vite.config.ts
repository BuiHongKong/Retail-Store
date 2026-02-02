import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Cart API chạy riêng (port 3001), Checkout API (port 3002) — khai báo trước /api
      "/api/cart": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/checkout": {
        target: "http://localhost:3002",
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
    },
  },
})

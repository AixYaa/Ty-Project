import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 6631,
    proxy: {
      '/api': {
        target: 'http://localhost:6632',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      '/uploads': {
        target: 'http://localhost:6632',
        changeOrigin: true
      }
    }
  }
})

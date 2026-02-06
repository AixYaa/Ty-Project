import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: './', // Use relative path for assets to support deployment in any subdirectory
    plugins: [
      vue(),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // 10kb
        algorithm: 'gzip',
        ext: '.gz'
      })
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('element-plus') || id.includes('@element-plus')) {
                return 'element-plus';
              }
              if (id.includes('vue') || id.includes('pinia')) {
                return 'vue-vendor';
              }
              if (id.includes('@guolao/vue-monaco-editor')) {
                return 'editor';
              }
              return 'vendor'; // default vendor chunk for other node_modules
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 6631,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:6632',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        },
        '/uploads': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:6632',
          changeOrigin: true
        }
      }
    }
  };
});

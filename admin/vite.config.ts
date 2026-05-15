import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import viteCompression from 'vite-plugin-compression';
import { viteMockServe } from 'vite-plugin-mock';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: './', // Use relative path for assets to support deployment in any subdirectory
    plugins: [
      vue(),
      viteMockServe({
        mockPath: 'mock',
        enable: true
      }),
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // 10kb
        algorithm: 'gzip',
        ext: '.gz'
      })
    ],
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : []
    },
    build: {
      target: 'es2015',
      minify: 'esbuild',
      chunkSizeWarningLimit: 2000, // 提高警告阈值到 2000KB
      rollupOptions: {
        // 抑制来自特定库（如 mockjs）的 eval 等警告
        onwarn(warning, warn) {
          if (warning.code === 'EVAL' && warning.loc?.file?.includes('mockjs')) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('element-plus') || id.includes('@element-plus'))
                return 'element-plus';
              if (id.includes('ant-design')) return 'ant-design';
              if (
                id.includes('bpmn-js') ||
                id.includes('diagram-js') ||
                id.includes('min-dash') ||
                id.includes('min-dom') ||
                id.includes('moddle') ||
                id.includes('moddle-xml') ||
                id.includes('camunda-bpmn-moddle')
              )
                return 'bpmn';
              if (id.includes('echarts') || id.includes('zrender')) return 'echarts';
              if (id.includes('vue3-sfc-loader')) return 'sfc-loader';
              if (id.includes('xlsx')) return 'xlsx';
              if (
                id.includes('vue') ||
                id.includes('@vue') ||
                id.includes('pinia') ||
                id.includes('vue-router') ||
                id.includes('vue-i18n')
              )
                return 'vue-core';
              if (id.includes('axios') || id.includes('mockjs')) return 'network';
              if (id.includes('monaco-editor') || id.includes('@guolao')) return 'monaco-editor';
              if (id.includes('@wangeditor')) return 'wangeditor';

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
          rewrite: (path: string) => path.replace(/^\/api/, '/api')
        },
        '/uploads': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:6632',
          changeOrigin: true
        }
      }
    }
  };
});

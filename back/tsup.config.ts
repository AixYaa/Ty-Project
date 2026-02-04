import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['cjs'],
  target: 'node18',
  minify: false, // 不压缩代码
  keepNames: true, // 保留类名，方便调试
  shims: true, // 注入 __dirname 和 __filename  Shim
});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 開発時は /api へのリクエストをNodeバックエンドへ転送する
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 画像置き場(DATA)の一時ファイルを監視してクラッシュするのを防ぐ
    watch: {
      ignored: ['**/DATA/**', '**/node_modules/**', '**/.git/**'],
    },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// プロジェクト直下の画像置き場(DATA)のパス
// ※ '**/DATA/**' のような指定は、プロジェクトの親フォルダ名(C:\DATA)にもマッチして
//    全ファイルの変更検知が無効になるため、絶対パスで指定する
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'DATA');

// 開発時は /api へのリクエストをNodeバックエンドへ転送する
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 画像置き場(DATA)の一時ファイルを監視してクラッシュするのを防ぐ
    watch: {
      ignored: [(p) => path.resolve(p).startsWith(dataDir)],
    },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 개발 서버(:5173)에서 /api 요청을 백엔드(:3000)로 프록시
// Pages 배포 시엔 PAGES_BASE='/<repo>/' 를 주입 (CI 워크플로에서 설정)
export default defineConfig({
  base: process.env.PAGES_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});

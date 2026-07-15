import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 폰 브라우저에서 로컬 개발 서버 접속 허용
    port: 5173,
  },
});

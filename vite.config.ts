import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 兩個頁面：遊戲（index.html）和老師細節頁（teacher.html）
  build: { rollupOptions: { input: { main: 'index.html', teacher: 'teacher.html' } } },
  test: { include: ['src/**/*.test.ts'] },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, statSync } from 'node:fs';

// 背景預熱用的圖片清單（src/ui/warm.ts）：建置時列出 public/img 底下所有圖
function imgList() {
  const id = 'virtual:img-list';
  return {
    name: 'img-list',
    resolveId: (s: string) => (s === id ? '\0' + id : null),
    load(s: string) {
      if (s !== '\0' + id) return null;
      const out: string[] = [];
      const walk = (d: string) => {
        for (const n of readdirSync(`public/${d}`).sort()) {
          const p = `${d}/${n}`;
          if (statSync(`public/${p}`).isDirectory()) walk(p);
          else if (/\.(webp|png|jpe?g)$/.test(n)) out.push(p);
        }
      };
      walk('img');
      return `export default ${JSON.stringify(out)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), imgList()],
  // 兩個頁面：遊戲（index.html）和老師細節頁（teacher.html）
  build: { rollupOptions: { input: { main: 'index.html', teacher: 'teacher.html' } } },
  test: { include: ['src/**/*.test.ts'] },
});

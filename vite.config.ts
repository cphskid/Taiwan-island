import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

// 大地圖各章的圖集（tools/atlas.mjs 產生）：建置時比對每張小圖跟原圖的 md5，
// 原圖換過、或圖集裡沒有的，就不從圖集拿（大地圖會照舊單獨讀那張），所以忘了重跑圖集也不會出錯圖
function atlas() {
  const id = 'virtual:atlas';
  const dir = 'public/img/island/atlas';
  return {
    name: 'atlas',
    resolveId: (s: string) => (s === id ? '\0' + id : null),
    load(this: { warn: (m: string) => void }, s: string) {
      if (s !== '\0' + id) return null;
      if (!existsSync(`${dir}/atlas.json`)) return 'export default {};';
      type Page = { file: string; frames: Record<string, [number, number, number, number, string]> };
      const all: Record<string, Page[]> = JSON.parse(readFileSync(`${dir}/atlas.json`, 'utf8'));
      const md5 = (n: string) => {
        const p = n.includes('/') ? `public/img/${n}.webp` : `public/img/island/${n}.webp`;
        return existsSync(p) ? createHash('md5').update(readFileSync(p)).digest('hex').slice(0, 12) : '';
      };
      let stale = 0;
      for (const pages of Object.values(all))
        for (const pg of pages)
          for (const [n, f] of Object.entries(pg.frames)) if (md5(n) !== f[4]) { delete pg.frames[n]; stale++; }
      if (stale) this.warn(`大地圖圖集有 ${stale} 張跟原圖不一樣，會改成單獨讀；請跑 npm run atlas`);
      return `export default ${JSON.stringify(all)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), imgList(), atlas()],
  // 兩個頁面：遊戲（index.html）和老師細節頁（teacher.html）
  build: { rollupOptions: { input: { main: 'index.html', teacher: 'teacher.html' } } },
  test: { include: ['src/**/*.test.ts'] },
});

// 圖片背景預熱：進到一個畫面後，趁小朋友在看劇情、還沒點下去的空檔，
// 把這一章（和接下來）會用到的圖先抓進瀏覽器快取，換場景時就不會「掉圖慢半拍」。
// 一次只抓幾張、瀏覽器閒下來才抓，不跟眼前的畫面搶頻寬。
// 圖的清單在建置時自動列出 public/img（vite.config.ts 的 img-list），新增圖不用手動維護。
import list from 'virtual:img-list';

const BASE = import.meta.env.BASE_URL;
const queued = new Set<string>();
const queue: string[] = [];
let running = 0;
const MAX = 3;
const later = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 120);

function pump() {
  while (running < MAX && queue.length) {
    const src = queue.shift()!;
    running++;
    later(() => {
      // 只抓進快取、不解碼，平板記憶體才夠
      const done = () => { running--; pump(); };
      fetch(src).then((r) => r.blob()).then(done, done);
    });
  }
}

// dirs：public/img 底下的資料夾開頭，例如 'story/'、'ch1/'；排前面的先抓
export function warm(...dirs: string[]) {
  for (const d of dirs) {
    for (const p of list) {
      if (!p.startsWith('img/' + d) || queued.has(p)) continue;
      queued.add(p);
      queue.push(BASE + p);
    }
  }
  pump();
}

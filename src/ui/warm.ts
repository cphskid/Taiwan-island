// 圖片背景預熱：進到一個畫面後，趁小朋友在看劇情、還沒點下去的空檔，
// 把這一章（和接下來）會用到的圖先抓進瀏覽器快取，換場景時就不會「掉圖慢半拍」。
// 一次只抓幾張、瀏覽器閒下來才抓，不跟眼前的畫面搶頻寬。
// 圖的清單在建置時自動列出 public/img（vite.config.ts 的 img-list），新增圖不用手動維護。
import list from 'virtual:img-list';
import ATLAS from 'virtual:atlas';

const BASE = import.meta.env.BASE_URL;
const queued = new Set<string>();
// 大地圖各章的人和房子已經打包進圖集（img/island/atlas/），單張的就不用再抓
for (const pages of Object.values(ATLAS))
  for (const pg of pages) for (const n of Object.keys(pg.frames)) queued.add(n.includes('/') ? `img/${n}.webp` : `img/island/${n}.webp`);
const queue: string[] = [];
let running = 0;
const MAX = 3;
const later = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 120);

let held = 0;
function pump() {
  while (!held && running < MAX && queue.length) {
    const src = queue.shift()!;
    running++;
    later(() => {
      // 只抓進快取、不解碼，平板記憶體才夠
      const done = () => { running--; pump(); };
      fetch(src).then((r) => r.blob()).then(done, done);
    });
  }
}

// dirs：public/img 底下的資料夾開頭，例如 'story/'、'ch1/'；排前面的先抓。
// 後叫的插到最前面：換到新畫面時，新畫面的圖不用排在上一個畫面幾百張圖的後面。
export function warm(...dirs: string[]) {
  const add: string[] = [];
  for (const d of dirs) {
    for (const p of list) {
      if (!p.startsWith('img/' + d) || queued.has(p)) continue;
      queued.add(p);
      add.push(BASE + p);
    }
  }
  queue.unshift(...add);
  pump();
}

// 眼前的畫面正在等圖：背景預熱先停下來，不跟它搶網路；回傳的函式叫了就繼續
export function holdWarm(): () => void {
  held++;
  let done = false;
  return () => { if (done) return; done = true; held--; pump(); };
}

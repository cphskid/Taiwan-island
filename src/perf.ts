// 讀取計時：網址加 ?perf=1 打開（記在這台裝置上，之後從樂園點進來也會顯示；?perf=0 關掉）。
// 畫面右下角列出「從開網頁到每個階段」幾秒，和圖片從哪裡來（網路／存在裝置裡），在 iPad 上拍下來就知道慢在哪。
// 樂園那邊是 js/perf.js，用同一個開關。ui 和 render 都可以呼叫 mark()。
const KEY = 'timepark-perf';

export const PERF = (() => {
  try {
    const q = new URLSearchParams(location.search).get('perf');
    if (q === '0') localStorage.removeItem(KEY);
    else if (q !== null) localStorage.setItem(KEY, '1');
    return localStorage.getItem(KEY) === '1';
  } catch { return false; }
})();

const marks: [string, number][] = [];
let box: HTMLElement | null = null;
let ticks = 0;

// 記一個階段（同一個名字只記第一次）
export function mark(label: string) {
  if (!PERF || marks.some(([l]) => l === label)) return;
  marks.push([label, performance.now()]);
  draw();
}

function draw() {
  if (!PERF || typeof document === 'undefined') return;
  if (!box) {
    box = document.createElement('div');
    box.className = 'perf-box';
    document.body.appendChild(box);
    const t = setInterval(() => { draw(); if (++ticks > 90) clearInterval(t); }, 1000);
  }
  const imgs = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    .filter((e) => /\.(webp|png|jpe?g)(\?|$)/.test(e.name));
  let net = 0, netKB = 0, sw = 0, http = 0;
  for (const e of imgs) {
    if (e.transferSize > 0) { net++; netKB += e.transferSize / 1024; }
    else if (e.workerStart > 0) sw++;
    else http++;
  }
  const s = (ms: number) => (ms / 1000).toFixed(1) + ' 秒';
  box.textContent = [
    ...marks.map(([l, t]) => `${s(t)}  ${l}`),
    `圖 ${imgs.length} 張：網路 ${net} 張 ${Math.round(netKB)}KB、裝置裡 ${sw} 張、瀏覽器暫存 ${http} 張`,
    `存進裝置：${'serviceWorker' in navigator && navigator.serviceWorker.controller ? '有' : '還沒'}`,
  ].join('\n');
}

// 島嶼開拓者的 Service Worker：把圖、聲音、程式存進裝置，之後進來直接從裝置拿，不用等網路。
// 每次打開網頁時順便抓一次 sw-manifest.json（建置時 vite.config.ts 的 sw 外掛產生）：
// 裡面是 public 每個檔案的指紋（md5 前 12 碼）和這一版的程式檔清單。
// 圖換了指紋就變，這次進來就重新下載；沒換的從裝置拿。assets/ 裡的程式檔名本來就帶指紋。
// 網頁本身（index.html）每次先問網路，斷線才用存的，所以推新版一定看得到。
const CACHE = 'island-v1';
const BASE = new URL('./', self.location).pathname;
const MANIFEST_URL = `${BASE}sw-manifest.json`;

const rel = (url) => decodeURIComponent(new URL(url).pathname.slice(BASE.length));
// 存的時候的鑰匙：public 的檔案帶指紋（?h=），assets/ 直接用路徑；清單裡沒有的不存
const keyOf = (m, r) => (m.files[r] ? `${BASE}${r}?h=${m.files[r]}` : r.startsWith('assets/') && m.assets.includes(r) ? BASE + r : null);

let manifest = null; // 這一次用的清單（Promise）

// 抓最新的清單（網路），抓不到就用上次存的；換了版本就把舊指紋的檔清掉
function fetchManifest() {
  manifest = (async () => {
    const c = await caches.open(CACHE);
    const old = await c.match(MANIFEST_URL).then((r) => r?.json()).catch(() => null);
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(String(res.status));
      const m = await res.clone().json();
      if (!old || old.v !== m.v) {
        await c.put(MANIFEST_URL, res);
        void prune(c, m);
      }
      return m;
    } catch {
      return old ?? { v: '', files: {}, assets: [] };
    }
  })();
  return manifest;
}

async function prune(c, m) {
  for (const req of await c.keys()) {
    if (req.url.endsWith('sw-manifest.json')) continue;
    const u = new URL(req.url);
    const k = keyOf(m, rel(req.url));
    if (u.search ? k !== u.pathname + u.search : rel(req.url).startsWith('assets/') && !k) await c.delete(req);
  }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('island-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

async function fromCacheOrNet(req) {
  const m = await (manifest ?? fetchManifest());
  const key = keyOf(m, rel(req.url));
  if (!key) return fetch(req);
  const c = await caches.open(CACHE);
  const hit = await c.match(key);
  if (hit) return hit;
  const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  if (res.ok && res.status === 200) c.put(key, res.clone()).catch(() => {});
  return res;
}

async function page(req) {
  void fetchManifest(); // 跟網頁一起抓，等一下要讀圖時就是最新的
  const c = await caches.open(CACHE);
  const key = new URL(req.url).pathname;
  try {
    const res = await fetch(req);
    if (res.ok) c.put(key, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    return (await c.match(key)) ?? (await c.match(BASE)) ?? Promise.reject(err);
  }
}

const OURS = /^(img|audio|assets)\//;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const u = new URL(req.url);
  if (u.origin !== self.location.origin || !u.pathname.startsWith(BASE)) return;
  if (req.mode === 'navigate') return e.respondWith(page(req));
  if (OURS.test(rel(req.url))) e.respondWith(fromCacheOrNet(req));
});

// 網頁交來的清單：Service Worker 裝好之前已經抓過的檔案，補存進來（多半從瀏覽器暫存拿）
self.addEventListener('message', (e) => {
  const urls = e.data?.keep;
  if (!Array.isArray(urls)) return;
  e.waitUntil((async () => {
    const m = await (manifest ?? fetchManifest());
    const c = await caches.open(CACHE);
    for (const url of urls) {
      const key = keyOf(m, rel(url));
      if (!key || (await c.match(key))) continue;
      try {
        const res = await fetch(new URL(url).pathname);
        if (res.ok && res.status === 200) await c.put(key, res);
      } catch { /* 下次再存 */ }
    }
  })());
});

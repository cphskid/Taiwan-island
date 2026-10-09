// 把圖存進裝置（Service Worker，程式在 sw/sw.js，建置時 vite.config.ts 填入每個檔案的指紋）。
// 只在建置好的網站開；網址加 ?nosw=1 會把它拆掉（萬一出問題可以用）。
export function registerSW() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  if (new URLSearchParams(location.search).has('nosw')) {
    void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => { if (r.scope.endsWith(base)) void r.unregister(); }));
    void caches.keys().then((ks) => ks.filter((k) => k.startsWith('island-')).forEach((k) => void caches.delete(k)));
    return;
  }
  void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).then(() => navigator.serviceWorker.ready).then((reg) => {
    // 第一次來的時候，這一頁在 Service Worker 裝好之前抓的圖還沒存進去：把已經抓過的清單交給它補存（從瀏覽器暫存拿，不會再下載一次）
    const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin + base));
    reg.active?.postMessage({ keep: urls });
  }).catch(() => {});
}

import { useEffect, useState } from 'react';
import { db, PARK_URL, FACILITY } from '../net/park';

// 「💬 回報」按鈕：用樂園共用的問題回報（樂園 repo 的 js/feedback.js），
// 回報進樂園老師後台的同一個收件匣。本機模式（沒有 Supabase）不顯示。

type ParkFeedback = {
  mount: (o: Record<string, unknown>) => void;
  open: (tab?: string) => void;
};
declare global { interface Window { ParkFeedback?: ParkFeedback } }

// 目前在哪個畫面（各章把「第幾章第幾步」記在這裡，送出時一起附上）
let where = 'map';
let dot = 0;
const dotSubs = new Set<(n: number) => void>();
let loading: Promise<ParkFeedback | null> | null = null;

function load(): Promise<ParkFeedback | null> {
  if (!db || !PARK_URL) return Promise.resolve(null);
  if (window.ParkFeedback) return Promise.resolve(window.ParkFeedback);
  loading ??= new Promise((done) => {
    const s = document.createElement('script');
    s.src = `${PARK_URL}js/feedback.js`;
    s.onload = () => {
      const pf = window.ParkFeedback ?? null;
      pf?.mount({
        game: FACILITY,
        fab: false,
        getToken: async () => (await db!.auth.getSession()).data.session?.access_token,
        context: () => ({ screen: where }),
        onDot: (n: number) => { dot = n; dotSubs.forEach((f) => f(n)); },
      });
      done(pf);
    };
    s.onerror = () => done(null);   // 樂園那邊還沒有這支（例如正式站還沒發布）就不顯示按鈕
    document.head.appendChild(s);
  });
  return loading;
}

export function ReportButton({ className = 'back-map', screen }: { className?: string; screen: string }) {
  const [ready, setReady] = useState(!!window.ParkFeedback);
  const [n, setN] = useState(dot);
  useEffect(() => { where = screen; }, [screen]);
  useEffect(() => {
    let alive = true;
    void load().then((pf) => { if (alive) setReady(!!pf); });
    dotSubs.add(setN);
    return () => { alive = false; dotSubs.delete(setN); };
  }, []);
  if (!ready) return null;
  return (
    <button className={`${className} report-btn`} data-pfb onClick={() => window.ParkFeedback?.open()} aria-label="問題回報" title="問題回報">
      <span className="tool-icon">💬</span>問題回報{n > 0 && <i className="report-dot" />}
    </button>
  );
}

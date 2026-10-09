import { useEffect, useState } from 'react';

/**
 * 版號與更新說明（2026-10-09，照守護異世界 0.18.0 那套）。點右上角的版號打開。
 *
 * 內容在 public/changelog.json，改 package.json 版號時在那裡加一筆。放 public 而不是包進程式，
 * 是因為**測試站要讀正式站那一份**：兩邊一比，測試站多出來的版本就是「待發布」，
 * 不用有人記得另外維護一張清單。
 */
interface Entry { version: string; date: string; title: string; items: string[] }

const STAGING = import.meta.env.MODE === 'staging';
const BASE = import.meta.env.BASE_URL;
/** 正式站還沒有 changelog.json（現在是「即將開幕」頁）時當作 0：測試站做過的全部待發布 */
const PROD_BEFORE_CHANGELOG = '0.0.0';
const short = (v: string) => v.replace(/\.0$/, '');

function cmp(a: string, b: string): number {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

async function load(url: string): Promise<Entry[] | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { versions?: Entry[] };
    return j.versions ?? null;
  } catch {
    return null;
  }
}

/** 標題列右上角的版號：測試站標「測試站 v0.9」，點了打開更新說明 */
export function VersionButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={'ver-btn' + (STAGING ? ' staging' : '')} onClick={() => setOpen(true)} aria-label="版號與更新說明">
        {STAGING ? '測試站 ' : ''}v{short(__APP_VERSION__)}
      </button>
      {open && <Changelog onClose={() => setOpen(false)} />}
    </>
  );
}

function Changelog({ onClose }: { onClose: () => void }) {
  const [mine, setMine] = useState<Entry[] | null>(null);
  const [prodTop, setProdTop] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void load(`${BASE}changelog.json`).then((v) => {
      if (!alive) return;
      if (v) setMine(v);
      else setError(true);
    });
    if (STAGING) {
      // 測試站在 /Taiwan-island/dev/，正式站在上一層
      void load(`${BASE}../changelog.json`).then((v) => {
        if (alive) setProdTop(v?.[0]?.version ?? PROD_BEFORE_CHANGELOG);
      });
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', onKey);
    return () => { alive = false; removeEventListener('keydown', onKey); };
  }, [onClose]);

  const pending = STAGING && mine && prodTop ? mine.filter((e) => cmp(e.version, prodTop) > 0) : [];
  const released = mine ? mine.filter((e) => !pending.includes(e)) : [];

  return (
    <div className="cl-veil" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cl-box" onClick={(e) => e.stopPropagation()}>
        <h2>更新說明</h2>
        <div className="cl-list">
          {error && <p>讀不到更新說明，等一下再試試看。</p>}
          {!mine && !error && <p>讀取中…</p>}
          {STAGING && mine && prodTop && (
            <section className="cl-pending">
              <h3>待發布<small>{prodTop === PROD_BEFORE_CHANGELOG ? '正式站還沒有版號' : `正式站目前是 v${short(prodTop)}`}</small></h3>
              {pending.length === 0
                ? <p>測試站跟正式站一樣，沒有待發布的東西。</p>
                : pending.map((e) => <Version key={e.version} e={e} />)}
            </section>
          )}
          {released.length > 0 && STAGING && <h3>已經在正式站</h3>}
          {released.map((e) => <Version key={e.version} e={e} />)}
        </div>
        <button className="cl-close" onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}

function Version({ e }: { e: Entry }) {
  return (
    <div className="cl-ver">
      <div className="cl-head"><b>v{short(e.version)}</b> {e.title}<small>{e.date}</small></div>
      <ul>{e.items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

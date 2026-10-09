import { useEffect, useState } from 'react';
import { holdWarm } from './warm';

// 地點一進來先把大張的底圖讀好再掀開（手機、平板網路慢時，不會只看到人物在空白上走）。
// 回傳讀圖進度 0～1，1＝讀好了；最多等 cap 毫秒，沒讀完也先掀開。讀的時候背景預熱先停，不跟它搶網路。
export function useImagesReady(urls: () => string[], cap = 8000): number {
  const [ready, setReady] = useState(0);
  useEffect(() => {
    const list = [...new Set(urls())];
    const release = holdWarm();
    let done = 0, alive = true;
    const one = (u: string) => new Promise<void>((ok) => {
      const im = new Image();
      im.src = u;
      im.decode().catch(() => undefined).then(() => {
        done++;
        if (alive) setReady((r) => (r >= 1 ? r : Math.min(0.99, done / list.length)));
        ok();
      });
    });
    void Promise.race([Promise.all(list.map(one)), new Promise((ok) => setTimeout(ok, cap))])
      .then(() => { if (alive) setReady(1); release(); });
    return () => { alive = false; release(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return ready;
}

// 讀圖時蓋在地點上面的「準備中」
export function PlaceLoading({ pct, label }: { pct: number; label: string }) {
  if (pct >= 1) return null;
  const n = Math.round(pct * 100);
  return (
    <div className="boot place-loading">
      <img src={`${import.meta.env.BASE_URL}img/tick/wave.webp`} alt="" />
      <p>{label}… {n}%</p>
      <div className="boot-bar"><i style={{ width: `${n}%` }} /></div>
    </div>
  );
}

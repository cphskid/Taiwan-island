import { useEffect, useState } from 'react';
import { canEnter, PARK_MAP, PARK_URL, whoAmI, type Who } from '../net/park';
import { Island, firstScreenImages } from './Island';
import { setSaveOwner } from '../core/owner';
import { load, save } from '../core/save';
import { loadWorld, saveWorld } from '../core/world';
import { mergeWorld, pickProgress } from '../core/sync';
import { load1, pickProgress1, save1 } from '../core/save1';
import { load2, pickProgress2, save2 } from '../core/save2';
import { load4, pickProgress4, save4 } from '../core/save4';
import { load6, pickProgress6, save6 } from '../core/save6';
import { load7, pickProgress7, save7 } from '../core/save7';
import { load3, pickProgress3, save3 } from '../core/save3';
import { loadEnd, pickProgressEnd, saveEnd } from '../core/saveEnd';
import { loadCloud } from '../net/cloud';
import { loadMedals, mergeMedals, saveMedals } from '../core/medals';
import { loadVillage, pickVillage, saveVillage } from '../core/village';
import { Gate } from './Gate';

const BASE = import.meta.env.BASE_URL;

type State =
  | { step: 'checking' }
  | { step: 'loading'; pct: number; label: string }
  | { step: 'blocked'; reason: string; needLogin: boolean }
  | { step: 'play'; who: Who; opening: boolean };

export function App() {
  const [state, setState] = useState<State>({ step: 'checking' });

  const check = async () => {
    setState({ step: 'checking' });
    // 確認帳號（要跟資料庫來回好幾趟）的同時就先開始抓圖，不用等確認完才開始
    const first = firstScreenImages();
    const early = preload(first.urls, (f) => setState((s) => (s.step === 'checking' || s.step === 'loading' ? { step: 'loading', pct: 0.1 + f * 0.75, label: '準備島嶼' } : s)));
    const who = await whoAmI();
    if (who.kind === 'guest') {
      setState({ step: 'blocked', reason: '請先回樂園登入，再從島嶼開拓者的設施進來。', needLogin: true });
      return;
    }
    const gate = await canEnter();
    if (!gate.ok) setState({ step: 'blocked', reason: gate.reason ?? '現在還不能進來', needLogin: false });
    else {
      await syncSaves(who);
      // 登島前先把第一個畫面的圖讀完（進度條 10%～85%），最多等 8 秒，沒讀完的進去後再補
      await Promise.race([early, new Promise((ok) => setTimeout(ok, 8000))]);
      // 大地圖還要把圖做成貼圖（85%～100%），地圖說好了才收起穿越畫面
      setState({ step: 'play', who, opening: first.map });
    }
  };

  useEffect(() => { void check(); }, []);

  return (
    <div className="app">
      <header className="top">
        {PARK_URL && (
          <a className="park-btn" href={PARK_MAP ?? undefined} title="回樂園">
            <img src={`${BASE}img/park.webp`} alt="" />
            <span>回樂園</span>
          </a>
        )}
        <h1>穿越吧！島嶼開拓者</h1>
        {state.step === 'play' && <WhoBadge who={state.who} />}
      </header>
      {state.step === 'checking' && <Boot pct={0.05} label="確認通行證" />}
      {state.step === 'loading' && <Boot pct={state.pct} label={state.label} />}
      {state.step === 'play' && state.opening && <Opening onDone={() => setState({ ...state, opening: false })} />}
      {state.step === 'blocked' && <Gate reason={state.reason} needLogin={state.needLogin} onRetry={check} />}
      {state.step === 'play' && <Island />}
      <div className="rotate-hint">
        <img src={`${BASE}img/tick/wave.webp`} alt="" />
        <b>把手機轉成橫的</b>
        <p>這一關要看整張圖，橫過來畫面比較大喔！</p>
      </div>
    </div>
  );
}

// 穿越中的進度條：滴答、目前在做什麼、百分比
function Boot({ pct, label }: { pct: number; label: string }) {
  const n = Math.min(100, Math.round(pct * 100));
  return (
    <div className="boot">
      <img src={`${BASE}img/tick/wave.webp`} alt="" />
      <p>穿越時空中… {n}%</p>
      <div className="boot-bar"><i style={{ width: `${n}%` }} /></div>
      <small>{label}</small>
    </div>
  );
}

// 大地圖在做貼圖：進度從 85% 慢慢走到 99%，地圖好了（或最多 6 秒）就收起來
function Opening({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0.85);
  useEffect(() => {
    const t0 = performance.now();
    const tick = setInterval(() => setPct(0.85 + 0.14 * Math.min(1, (performance.now() - t0) / 4000)), 150);
    const cap = setTimeout(onDone, 6000);
    addEventListener('island:map-ready', onDone);
    return () => { clearInterval(tick); clearTimeout(cap); removeEventListener('island:map-ready', onDone); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Boot pct={pct} label="展開地圖" />;
}

// 只把圖抓進瀏覽器快取（不解碼，平板記憶體才不會爆），一次抓很多張，回報 0～1 的進度
function preload(urls: string[], onProgress: (f: number) => void): Promise<void> {
  const list = [...new Set(urls)];
  if (!list.length) return Promise.resolve();
  let done = 0, next = 0;
  return new Promise((finish) => {
    const one = () => {
      if (next >= list.length) return;
      const url = list[next++];
      const after = () => {
        onProgress(++done / list.length);
        if (done === list.length) finish(); else one();
      };
      fetch(url).then((r) => r.blob()).then(after, after);
    };
    for (let i = 0; i < 16; i++) one();
  });
}

// 進遊戲前：本機存檔換成這個人的那一格，再跟雲端那份比一比、用比較完整的
async function syncSaves(who: Who) {
  setSaveOwner(who.kind === 'student' ? who.id : who.kind === 'staff' ? 'staff' : null);
  if (who.kind !== 'student') return;
  const cloud = await loadCloud();
  if (!cloud) return;
  save(pickProgress(load(), cloud.ch5 as never));
  save1(pickProgress1(load1(), cloud.ch1 as never));
  save2(pickProgress2(load2(), cloud.ch2 as never));
  save4(pickProgress4(load4(), cloud.ch4 as never));
  save6(pickProgress6(load6(), cloud.ch6 as never));
  save7(pickProgress7(load7(), cloud.ch7 as never));
  save3(pickProgress3(load3(), cloud.ch3 as never));
  saveEnd(pickProgressEnd(loadEnd(), cloud.end as never));
  saveWorld(mergeWorld(loadWorld(), cloud.world as never));
  saveVillage(pickVillage(loadVillage(), cloud.village as never));
  saveMedals(mergeMedals(loadMedals(), cloud.medals as never));
}

function WhoBadge({ who }: { who: Who }) {
  const name = who.kind === 'student' ? who.nickname
    : who.kind === 'staff' ? `${who.display_name}（老師）`
    : who.kind === 'local' ? '本機模式' : '';
  return <div className="who">{name}</div>;
}

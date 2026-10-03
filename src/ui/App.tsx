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
import { loadCloud } from '../net/cloud';
import { Gate } from './Gate';

const BASE = import.meta.env.BASE_URL;

type State =
  | { step: 'checking' }
  | { step: 'loading'; done: number; total: number }
  | { step: 'blocked'; reason: string; needLogin: boolean }
  | { step: 'play'; who: Who };

export function App() {
  const [state, setState] = useState<State>({ step: 'checking' });

  const check = async () => {
    setState({ step: 'checking' });
    // 確認帳號（要跟資料庫來回好幾趟）的同時就先開始抓圖，不用等確認完才開始
    void preload(firstScreenImages(), () => {});
    const who = await whoAmI();
    if (who.kind === 'guest') {
      setState({ step: 'blocked', reason: '請先回樂園登入，再從島嶼開拓者的設施進來。', needLogin: true });
      return;
    }
    const gate = await canEnter();
    if (!gate.ok) setState({ step: 'blocked', reason: gate.reason ?? '現在還不能進來', needLogin: false });
    else {
      await syncSaves(who);
      // 登島前先把第一個畫面的圖讀完（有進度條），進去就是完整的畫面
      await preload(firstScreenImages(), (done, total) => setState({ step: 'loading', done, total }));
      setState({ step: 'play', who });
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
      {state.step === 'checking' && <Boot pct={0} />}
      {state.step === 'loading' && <Boot pct={state.done / Math.max(1, state.total)} />}
      {state.step === 'blocked' && <Gate reason={state.reason} needLogin={state.needLogin} onRetry={check} />}
      {state.step === 'play' && <Island />}
      <div className="rotate-hint">請把平板轉成橫的</div>
    </div>
  );
}

// 穿越中的進度條：時光齒輪轉著，下面一條進度
function Boot({ pct }: { pct: number }) {
  return (
    <div className="boot">
      <img src={`${BASE}img/tick/wave.webp`} alt="" />
      <p>穿越時空中…</p>
      <div className="boot-bar"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>
    </div>
  );
}

// 一次讀幾張圖並回報進度；最多等 20 秒，網路很慢也不會卡在門口（沒讀完的進去再補）
function preload(urls: string[], onProgress: (done: number, total: number) => void): Promise<void> {
  const list = [...new Set(urls)];
  if (!list.length) return Promise.resolve();
  let done = 0, next = 0;
  onProgress(0, list.length);
  return new Promise((finish) => {
    const timer = setTimeout(finish, 20000);
    const one = () => {
      if (next >= list.length) return;
      const im = new Image();
      im.src = list[next++];
      const after = () => {
        onProgress(++done, list.length);
        if (done === list.length) { clearTimeout(timer); finish(); } else one();
      };
      im.decode().then(after, after);
    };
    for (let i = 0; i < 8; i++) one();
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
  saveWorld(mergeWorld(loadWorld(), cloud.world as never));
}

function WhoBadge({ who }: { who: Who }) {
  const name = who.kind === 'student' ? who.nickname
    : who.kind === 'staff' ? `${who.display_name}（老師）`
    : who.kind === 'local' ? '本機模式' : '';
  return <div className="who">{name}</div>;
}

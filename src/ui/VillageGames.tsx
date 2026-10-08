import { useEffect, useMemo, useRef, useState } from 'react';
import { vimg } from '../data/village';
import { festivalCoins, type Haul } from '../core/village';
import { sfx } from '../audio';

// 漁村的兩個小遊戲：海女趕海（看潮汐）、媽祖廟會打鼓（跟節奏）。規則和獎勵在 core/village.ts。

// 共用：開始後每一幀更新的秒數
function useClock(on: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0; const t0 = performance.now();
    const loop = (now: number) => { setT((now - t0) / 1000); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return t;
}

// ── 海女趕海 ──
// 退潮時礁岩一塊塊露出來，點露出來的東西撿；越靠海的越晚露出來、也越值錢。
// 潮水退到最低就會開始漲，一定要在漲上來之前按「上岸」，不然東西掉一半。
const TIDE = 24; // 一次退潮＋漲潮幾秒
const HIGH = 0.3, LOW = 0.94; // 水面在畫面的哪裡（0 最上、1 最下）
const CAUGHT = 0.86; // 超過這個時間點還沒上岸＝被潮水追上
const waterAt = (t: number) => HIGH + (LOW - HIGH) * Math.sin(Math.PI * Math.min(1, Math.max(0, t / TIDE)));
type DiveKind = 'weed' | 'crab' | 'abalone' | 'star';
const DIVE_ITEM: Record<DiveKind, { icon: string; name: string; got?: string }> = {
  weed: { icon: '🌿', name: '石花菜', got: '+2🌿' },
  crab: { icon: '🦀', name: '螃蟹', got: '+2🐟' },
  abalone: { icon: '🐚', name: '九孔', got: '+6💰' },
  star: { icon: '⭐', name: '海星' },
};
interface DiveItem { id: number; kind: DiveKind; x: number; y: number }
function diveItems(): DiveItem[] {
  const out: DiveItem[] = [];
  let id = 0;
  const put = (kind: DiveKind, n: number, y0: number, y1: number) => {
    for (let i = 0; i < n; i++) out.push({ id: id++, kind, x: 0.08 + Math.random() * 0.84, y: y0 + Math.random() * (y1 - y0) });
  };
  put('weed', 6, 0.36, 0.7);
  put('crab', 3, 0.5, 0.8);
  put('abalone', 3, 0.74, 0.9);
  put('star', 2, 0.45, 0.85);
  return out;
}

export function Dive({ onDone }: { onDone: (h: Haul | null, safe: boolean) => void }) {
  const [step, setStep] = useState<'intro' | 'play' | 'end'>('intro');
  const [items, setItems] = useState(diveItems);
  const [haul, setHaul] = useState<Haul>({ weed: 0, fish: 0, coins: 0 });
  const [safe, setSafe] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const t = useClock(step === 'play');
  const w = step === 'intro' ? HIGH : waterAt(t);
  const rising = t > TIDE / 2;
  const danger = rising && t > TIDE * 0.62;

  useEffect(() => {
    if (step === 'play' && t >= TIDE * CAUGHT) { sfx('SE-04'); setSafe(false); setStep('end'); }
  }, [t, step]);

  const tap = (it: DiveItem) => {
    if (step !== 'play' || it.y > w - 0.02) return;
    if (it.kind === 'star') { sfx('SE-09'); setNote('海星是礁岩的居民，看看就好，不能帶走喔。'); setTimeout(() => setNote(null), 2200); return; }
    sfx('SE-05');
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    setHaul((h) => it.kind === 'weed' ? { ...h, weed: h.weed + 2 } : it.kind === 'crab' ? { ...h, fish: h.fish + 2 } : { ...h, coins: h.coins + 6 });
    const p = { id: it.id, x: it.x, y: it.y, text: DIVE_ITEM[it.kind].got! };
    setPops((ps) => [...ps, p]);
    setTimeout(() => setPops((ps) => ps.filter((x) => x !== p)), 900);
  };
  const out = haul.weed + haul.fish + haul.coins > 0;
  const got = safe ? haul : { weed: Math.floor(haul.weed / 2), fish: Math.floor(haul.fish / 2), coins: Math.floor(haul.coins / 2) };
  const sum = (h: Haul) => [h.weed && `${h.weed}🌿`, h.fish && `${h.fish}🐟`, h.coins && `${h.coins}💰`].filter(Boolean).join('、') || '什麼都沒有';

  return (
    <div className="talk-cover">
      <div className="v-seine v-dive panel">
        <h2>🌊 跟海女去趕海</h2>
        {step === 'intro' && (
          <>
            <p>東北角的海女，會趁<b>退潮</b>時下到礁岩上採石花菜、撿九孔。海水一天會退兩次、漲兩次，這就是<b>潮汐</b>。</p>
            <p>潮水退了，礁岩一塊塊露出來，點露出來的東西撿起來。越靠海的越晚露出來、也越值錢。</p>
            <p className="v-hint">⚠️ 潮水退到最低就會開始漲回來，一定要在漲上來之前按「上岸」！海女都是看潮汐表、結伴下海的。</p>
            <div><button className="btn" onClick={() => onDone(null, true)}>下次再說</button><button className="btn green" onClick={() => { sfx('SE-03'); setStep('play'); }}>下去礁岩</button></div>
          </>
        )}
        {step !== 'intro' && (
          <>
            <div className="v-reef" style={{ backgroundImage: `url(${vimg('v1-bg')})` }}>
              {items.map((it) => {
                const dry = it.y < w - 0.02;
                return (
                  <button key={it.id} className={`v-shell ${dry ? 'dry' : 'wet'}`} style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%` }}
                    disabled={!dry || step !== 'play'} onPointerDown={() => tap(it)} aria-label={DIVE_ITEM[it.kind].name}>{DIVE_ITEM[it.kind].icon}</button>
                );
              })}
              <i className="v-water" style={{ top: `${w * 100}%` }} />
              {pops.map((p) => <b key={p.id} className="v-pop" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{p.text}</b>)}
              <span className={`v-tide ${rising ? 'up' : 'down'}`}>{rising ? '⬆ 漲潮中' : '⬇ 退潮中'}</span>
              {note && <span className="v-note">{note}</span>}
            </div>
            {step === 'play' && (
              <>
                <p className={danger ? 'bad' : 'v-hint'}>{danger ? '潮水漲回來了，快上岸！' : rising ? '潮水開始漲了，注意時間' : '潮水退下去了，點露出來的東西'}　籃子：{sum(haul)}</p>
                <button className={`btn big ${danger ? 'red' : 'green'}`} onClick={() => { sfx('SE-36'); setSafe(true); setStep('end'); }}>上岸</button>
              </>
            )}
            {step === 'end' && (
              <>
                {safe ? <p>平安上岸了！籃子裡有 <b>{sum(got)}</b>。</p>
                  : <p className="bad">潮水追上來了！海女趕快把你拉上岸，籃子打翻了一半，剩下 <b>{sum(got)}</b>。</p>}
                <p className="v-hint">{safe ? '看潮汐、算好時間、結伴下海，這就是海女保護自己的方法。' : '下次潮水一開始漲，就要準備上岸。'}</p>
                <div><button className="btn green" onClick={() => { sfx('SE-36'); onDone(out ? haul : { weed: 0, fish: 0, coins: 0 }, safe); }}>好</button></div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 媽祖廟會：跟著鼓點打鼓 ──
// 鼓點從右邊滑過來，滑到圓圈的時候按「咚！」。打中的越多，來看熱鬧的人越多、賺越多。
const BEATS = [1.6, 2.2, 2.8, 3.4, 4.3, 4.6, 4.9, 5.8, 6.4, 7.0, 7.6, 7.9, 8.2, 9.1];
const SPEED = 0.32; // 一秒滑過幾分之一的軌道
const HIT_X = 0.14; // 圓圈在軌道的哪裡
const WINDOW = 0.2; // 差幾秒內算打中

export function Drum({ onDone }: { onDone: (hits: number) => void }) {
  const [step, setStep] = useState<'intro' | 'play' | 'end'>('intro');
  const [done, setDone] = useState<Record<number, 'hit' | 'miss'>>({});
  const [flash, setFlash] = useState<'ok' | 'miss' | null>(null);
  const t = useClock(step === 'play');
  const tRef = useRef(0);
  tRef.current = t;
  const hits = Object.values(done).filter((x) => x === 'hit').length;
  const end = BEATS[BEATS.length - 1] + 1.2;

  // 滑過去沒打到的算漏掉
  useEffect(() => {
    if (step !== 'play') return;
    const missed = BEATS.map((b, i) => [b, i] as const).filter(([b, i]) => !done[i] && t - b > WINDOW);
    if (missed.length) setDone((d) => ({ ...d, ...Object.fromEntries(missed.map(([, i]) => [i, 'miss'])) }));
    if (t >= end) { sfx('SE-36'); setStep('end'); }
  }, [t, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const hit = () => {
    if (step !== 'play') return;
    const now = tRef.current;
    const i = BEATS.findIndex((b, k) => !done[k] && Math.abs(b - now) <= WINDOW);
    sfx(i >= 0 ? 'SE-05' : 'SE-04');
    setFlash(i >= 0 ? 'ok' : 'miss'); setTimeout(() => setFlash(null), 250);
    if (i >= 0) setDone((d) => ({ ...d, [i]: 'hit' }));
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); hit(); } };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });
  const crowd = useMemo(() => ['v4-1', 'v4-4', 'v4-8', 'v4-2', 'v4-5', 'v4-1', 'v4-4'], []);

  return (
    <div className="talk-cover">
      <div className="v-seine v-drum panel">
        <h2>🥁 三月瘋媽祖</h2>
        {step === 'intro' && (
          <>
            <p>農曆三月是媽祖生日，海邊的人最拜媽祖，求出海平安。這時候各地會辦<b>遶境</b>：信眾抬著神轎走過大街小巷，陣頭敲鑼打鼓、放鞭炮，好不熱鬧。</p>
            <p>廟裡的鼓手就是你！鼓點滑到圓圈的時候，按「咚！」（電腦也可以按空白鍵）。</p>
            <p className="v-hint">打得越準，來看熱鬧的人越多：最少 💰{festivalCoins(0)}，全部打中 💰{festivalCoins(BEATS.length)}。</p>
            <div><button className="btn" onClick={() => onDone(-1)}>下次再說</button><button className="btn green" onClick={() => { sfx('SE-03'); setStep('play'); }}>開始打鼓</button></div>
          </>
        )}
        {step !== 'intro' && (
          <>
            <div className={`v-parade ${flash ?? ''}`}>
              <img className="tp" src={vimg('v2-6')} alt="" />
              {crowd.slice(0, 2 + Math.min(5, Math.floor(hits / 2))).map((a, i) => <img key={i} src={vimg(a)} alt="" style={{ animationDelay: `${i * 0.13}s` }} />)}
              {flash === 'ok' && <span className="boom">🎆</span>}
            </div>
            <div className="v-track" onPointerDown={hit}>
              <i className="ring" style={{ left: `${HIT_X * 100}%` }} />
              {BEATS.map((b, i) => {
                const x = HIT_X + (b - t) * SPEED;
                if (done[i] === 'hit' || x > 1.05 || x < -0.05) return null;
                return <i key={i} className={`beat ${done[i] ?? ''}`} style={{ left: `${x * 100}%` }}>🥁</i>;
              })}
            </div>
            {step === 'play' && <><p className="v-hint">打中 {hits} / {BEATS.length}</p><button className="btn green big" onPointerDown={hit}>咚！</button></>}
            {step === 'end' && (
              <>
                <p>廟會結束了！打中 <b>{hits}</b> 下，遊客買香、吃小吃，村子賺了 <b>💰{festivalCoins(hits)}</b>。</p>
                <p className="v-hint">廟會不只是拜拜，也是全村一起出力、親戚朋友回來團聚的日子。</p>
                <div><button className="btn green" onClick={() => onDone(hits)}>好</button></div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

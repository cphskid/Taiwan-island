import React, { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Board } from '../render/board';
import type { Cell } from '../core/iso';

// 任務引導共用元件（每一章都用同一套，小朋友一看就知道「要做什麼、要去哪裡」）：
//
//   <Goal text="把水導到分水閘" />                常駐的一句話目標條（inline 放進上方的資訊列；floating 先在中間放大，再住到左下角說話的人旁邊）
//   <Beacon style={{ left: '40%', top: '30%' }} label="港口" spot={!intro} />
//                                                  HTML 場景（海圖、圖片）上的目標標記：脈動圈＋上下跳的箭頭＋旗子文字
//   <BoardBeacon board={board} cell={gate} label="分水閘" spot={!intro} />
//                                                  等角遊戲盤上的目標標記，跟著地圖平移縮放；目標在畫面外就貼在邊緣、箭頭指過去
//   spot：第一次變成 true 的時候畫面暗下來、光圈縮到目標上（約 2.5 秒），等於「鏡頭帶到目標」
//   towards(dx, dy) / compass(dx, dy)：做錯時夥伴指方向用的「左下方」「東北邊」
//
// 標記放在 position:relative 的容器裡（.board-wrap、.art-frame），不擋點擊。

// 目標條只放一行短句：第一個「。」前面那句。後面的規則說明點一下才展開。
const shortOf = (text: string) => {
  const cut = text.indexOf('。');
  const short = cut > 0 && cut < text.length - 1 ? text.slice(0, cut) : text.replace(/。$/, '');
  return { short, more: short.length < text.replace(/。$/, '').length };
};

// floating 的目標條住在左下角、說話的人旁邊（2026-10-24 Chuck 選「先放大再飛入」）：
//   - 新目標先在畫面中間放大一下（約 1.5 秒，不用點），再飛進左下角
//   - 有人在說話（<Say>）就放在說話框最上面一行；沒人說話就自己帶著滴答的頭像待在左下角
//   - 一直留著文字，不再縮成沒字的 🎯
//   - 只有數字變（還有 3 件 → 還有 2 件）不飛，左下角閃一下就好
// 目前的目標放在這裡，<Say> 讀得到；同一時間只會有一個 floating 目標
const goalHub = { text: null as string | null, flash: 0, says: 0, subs: new Set<() => void>() };
const emit = () => goalHub.subs.forEach((f) => f());
function useHub() {
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    goalHub.subs.add(f);
    return () => { goalHub.subs.delete(f); };
  }, []);
  return goalHub;
}
// <Say> 有在說話時登記一下，目標就改放在說話框裡
export function useSayGoal(showing: boolean) {
  const hub = useHub();
  useEffect(() => {
    if (!showing) return;
    hub.says++; emit();
    return () => { hub.says--; emit(); };
  }, [showing]); // eslint-disable-line react-hooks/exhaustive-deps
  return showing ? hub.text : null;
}

// 左下角那條綠色目標（說話框裡、或自己帶著滴答）
export function GoalStrip({ text }: { text: string }) {
  const hub = useHub();
  const { short, more } = shortOf(text);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState(false);
  useEffect(() => { setOpen(false); }, [text]);
  useEffect(() => {
    if (!hub.flash) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1300);
    return () => clearTimeout(t);
  }, [hub.flash]);
  const tap = (e: React.MouseEvent) => { e.stopPropagation(); if (more) setOpen(!open); };
  return (
    <div className={`quest strip ${open ? 'open' : ''} ${flash ? 'flash' : ''}`} onClick={tap} data-goal-strip role="button" aria-label="目標">
      <i>🎯</i>
      <span key={text}>{open ? text : short}</span>
      {more && <em>{open ? '▴' : '說明▾'}</em>}
    </div>
  );
}

// 這些畫面蓋著的時候先不要飛（開場對話、任務卡、過關、圖鑑卡、聚光）
const BUSY = '.talk-cover, .mission, .result, .chapter-card, .card-pop, .beacon.spotting';
const FLY_MS = 1500;
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function useFlyIn(text: string, on: boolean) {
  const [fly, setFly] = useState<string | null>(null);
  const shape = shortOf(text).short.replace(/\d+/g, '#');
  const last = useRef<string | null>(null);
  const flyEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    if (last.current === shape) return;
    last.current = shape;
    if (calm()) { goalHub.flash++; emit(); return; }
    // 等蓋著的畫面收掉才飛
    let t = 0;
    const wait = () => {
      if (document.querySelector(BUSY)) { t = window.setTimeout(wait, 300); return; }
      setFly(shortOf(text).short);
    };
    wait();
    return () => clearTimeout(t);
  }, [shape, on]); // eslint-disable-line react-hooks/exhaustive-deps
  // 放大停一下，再飛到左下角那條綠色目標的位置
  useEffect(() => {
    if (!fly) return;
    let anim: Animation | null = null;
    const t = setTimeout(() => {
      const el = flyEl.current;
      const to = document.querySelector('[data-goal-strip]')?.getBoundingClientRect();
      if (!el || !to || !el.animate) { setFly(null); goalHub.flash++; emit(); return; }
      const from = el.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const k = Math.min(1, to.height / from.height);
      anim = el.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${k})`, opacity: 0.4 }],
        { duration: 450, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
      anim.onfinish = () => { setFly(null); goalHub.flash++; emit(); };
    }, FLY_MS - 450);
    return () => { clearTimeout(t); anim?.cancel(); };
  }, [fly]);
  // 小朋友等不及先點了畫面：直接收進去
  useEffect(() => {
    if (!fly) return;
    const skip = () => { setFly(null); goalHub.flash++; emit(); };
    document.addEventListener('pointerdown', skip);
    return () => document.removeEventListener('pointerdown', skip);
  }, [fly]);
  if (!fly) return null;
  return (
    <>
      <div className="quest-dim" />
      <div ref={flyEl} className="quest quest-fly"><i>🎯</i><span>{fly}</span></div>
    </>
  );
}

export function Goal({ text, floating }: { text: string; floating?: boolean }) {
  const hub = useHub();
  useEffect(() => {
    if (!floating) return;
    goalHub.text = text; emit();
  }, [text, floating]);
  useEffect(() => {
    if (!floating) return;
    return () => { if (goalHub.text !== null) { goalHub.text = null; emit(); } };
  }, [floating]);
  const fly = useFlyIn(text, !!floating);
  // 只有數字變（還有 3 件 → 還有 2 件）：不飛，左下角閃一下
  const seen = useRef(text);
  useEffect(() => {
    if (!floating || seen.current === text) return;
    const same = seen.current.replace(/\d+/g, '#') === text.replace(/\d+/g, '#');
    seen.current = text;
    if (same) { goalHub.flash++; emit(); }
  }, [text, floating]);
  if (floating) {
    return (
      <>
        {fly}
        {/* 沒人說話的時候，目標自己帶著滴答待在左下角（位置跟說話框一樣） */}
        {hub.says === 0 && (
          <div className="say goal-dock">
            <div className="face small tick" style={{ borderColor: '#c99a3a' }}><img src={`${import.meta.env.BASE_URL}img/tick/happy.webp`} alt="" /></div>
            <GoalStrip text={text} />
          </div>
        )}
      </>
    );
  }
  return <InlineGoal text={text} />;
}

// 放進上方資訊列的目標（不是 floating 的那幾關）：一行短句，點一下展開說明
function InlineGoal({ text }: { text: string }) {
  const { short, more } = shortOf(text);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [text]);
  const tap = (e: React.MouseEvent) => { e.stopPropagation(); if (more) setOpen(!open); };
  return (
    <div className={`quest ${open ? 'open' : ''}`} onClick={tap} role="button" aria-label="目標">
      <i>🎯</i>
      <span key={text}>{open ? text : short}</span>
      {more && <em>{open ? '▴' : '說明▾'}</em>}
    </div>
  );
}

const SPOT_MS = 2600;

// spot 從 false 變 true 時播一次聚光
function useSpot(spot: boolean | undefined, onStart?: () => void) {
  const [on, setOn] = useState(false);
  const played = useRef(false);
  useEffect(() => {
    if (!spot || played.current) return;
    played.current = true;
    setOn(true);
    onStart?.();
    const t = setTimeout(() => setOn(false), SPOT_MS);
    return () => clearTimeout(t);
  }, [spot]); // eslint-disable-line react-hooks/exhaustive-deps
  return on;
}

function Marker({ label, small, spotting }: { label?: string; small?: boolean; spotting: boolean }) {
  return (
    <>
      {spotting && <div className="beacon-spot" />}
      {!small && <><i className="beacon-ring" /><i className="beacon-ring late" /></>}
      <div className="beacon-flag">
        {label && <span>{spotting ? `🎯 ${label}` : label}</span>}
        <b>▼</b>
      </div>
    </>
  );
}

export function Beacon({ style, label, spot, small }: { style: CSSProperties; label?: string; spot?: boolean; small?: boolean }) {
  const spotting = useSpot(spot);
  // 目標靠近左右邊緣時，旗子往內側偏，才不會被容器切掉
  const x = parseFloat(String(style.left ?? '50'));
  const edge = String(style.left ?? '').endsWith('%') ? (x > 70 ? 'to-left' : x < 30 ? 'to-right' : '') : '';
  return (
    <div className={`beacon ${small ? 'small' : ''} ${spotting ? 'spotting' : ''} ${edge}`} style={style}>
      <Marker label={label} small={small} spotting={spotting} />
    </div>
  );
}

const EDGE = 44; // 目標離畫面邊多近就算「在外面」

export function BoardBeacon({ board, cell, label, spot, small }: {
  board: RefObject<Board | null>; cell: Cell; label?: string; spot?: boolean; small?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLElement>(null);
  const [out, setOut] = useState(false);
  const spotting = useSpot(spot, () => board.current?.focus(cell));

  useEffect(() => {
    let id = 0;
    let wasOut = false;
    const loop = () => {
      id = requestAnimationFrame(loop);
      const b = board.current, d = el.current, host = d?.offsetParent as HTMLElement | null;
      if (!b || !d || !host) return;
      const r = host.getBoundingClientRect();
      const p = b.clientOf(cell);
      let x = p.x - r.left, y = p.y - r.top;
      const isOut = x < EDGE || y < EDGE || x > r.width - EDGE || y > r.height - EDGE;
      if (isOut) {
        const deg = (Math.atan2(y - r.height / 2, x - r.width / 2) * 180) / Math.PI;
        x = Math.max(EDGE, Math.min(r.width - EDGE, x));
        y = Math.max(EDGE, Math.min(r.height - EDGE, y));
        if (arrow.current) arrow.current.style.rotate = `${deg}deg`;
      }
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.style.visibility = 'visible';
      if (isOut !== wasOut) { wasOut = isOut; setOut(isOut); }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [board, cell.col, cell.row]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={el} className={`beacon ${small ? 'small' : ''} ${spotting ? 'spotting' : ''} ${out ? 'edge' : ''}`} style={{ visibility: 'hidden' }}>
      {out ? (
        <div className="beacon-edge"><i ref={arrow}>➜</i>{label && <span>{label}</span>}</div>
      ) : <Marker label={label} small={small} spotting={spotting} />}
    </div>
  );
}

// 畫面上的方向（等角遊戲盤用）：dx 往右、dy 往下為正
const SCREEN = ['右邊', '右下方', '下面', '左下方', '左邊', '左上方', '上面', '右上方'];
// 上北下南的地圖（海圖、臺灣地圖）用
const COMPASS = ['東邊（右）', '東南邊（右下）', '南邊（下）', '西南邊（左下）', '西邊（左）', '西北邊（左上）', '北邊（上）', '東北邊（右上）'];
const sector = (dx: number, dy: number) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
export const towards = (dx: number, dy: number) => SCREEN[sector(dx, dy)];
export const compass = (dx: number, dy: number) => COMPASS[sector(dx, dy)];

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { grind, grindDone, grindSolve, tooThin } from '../../core/stone-age';
import { CARDS1, GRIND_DONE, GRIND_FAIL, GRIND_HINT, GRIND_INTRO, GRIND_LEAVE, GRINDS, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal, Hand } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';
import { Decide, EraJump } from './Story';

type Phase = 'jump' | 'intro' | 'grind' | 'done' | 'pick' | 'cards' | 'leave' | 'warp';

// 步驟 3 磨製石器（卑南文化）：在磨石上磨石錛、石刀，最後磨玉耳飾
export function Grind({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [lv, setLv] = useState(0);
  const [card, setCard] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== 'warp') return;
    sfx('SE-31');
    const t = setTimeout(next, 1300);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const CARDS = ['beinan', 'pillar', 'adze', 'jade'];
  return (
    <div className="scene ch1-grind">
      <img className="scene-bg" src={art(phase === 'grind' ? 'w-02' : 's-07')} alt="" />
      {phase === 'jump' && <EraJump to={2} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={GRIND_INTRO} onDone={() => setPhase('grind')} />}
      {phase === 'grind' && <GrindBoard key={lv} n={lv} oops={oops} onDone={() => {
        jingle('MU-13');
        if (lv + 1 < GRINDS.length) setLv(lv + 1); else setPhase('done');
      }} />}
      {phase === 'done' && <Talk lines={GRIND_DONE} onDone={() => setPhase('pick')} />}
      {phase === 'pick' && <Decide id="jade" set={set} onDone={() => {
        const more = CARDS.filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, ...CARDS));
        if (more.length) { setCard(more); setPhase('cards'); } else setPhase('leave');
      }} />}
      {phase === 'leave' && <Talk lines={GRIND_LEAVE} onDone={() => setPhase('warp')} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) setPhase('leave'); }} />
      )}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

const CW = 60, UH = 26, B = 9; // 一欄寬、一層高、欄跟欄之間斜角

// 石頭側面的輪廓：每一欄頂端平平的，欄跟欄之間斜斜接起來
function topLine(h: readonly number[]): string {
  const n = h.length;
  return h.map((v, i) => `${i ? 'L' : 'M'}${i * CW + (i ? B : 0)} ${-v * UH}L${(i + 1) * CW - (i < n - 1 ? B : 0)} ${-v * UH}`).join('');
}
const profile = (h: readonly number[]) => `${topLine(h)}L${h.length * CW} 0L0 0Z`;

// 側面看的石頭放在磨石台上，虛線是要磨到的形狀。
// 點一個地方看預告（那裡少 2 層、旁邊各少 1 層），再點一次就在磨石上磨下去
function GrindBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const def = GRINDS[n];
  const lv = def.level;
  const uid = useId().replace(/:/g, '');
  const [h, setH] = useState<number[]>(lv.from);
  const [aim, setAim] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [done, setDone] = useState(false);
  const [snap, setSnap] = useState<number | null>(null);
  const [rub, setRub] = useState<{ i: number; k: number } | null>(null);
  const demo = useRef<number[]>([]);
  useEffect(() => () => demo.current.forEach(clearTimeout), []);
  const top = Math.max(...lv.from);
  const cols = lv.from.length;
  // 下一下該磨哪一格：手指示範用；錯 2 次整個解法亮出來
  const next = useMemo(() => (done || snap !== null ? null : grindSolve({ from: h, to: lv.to })), [h, done, snap, lv]);
  const plan = fails >= 2 ? next : null;
  const col = next ? next.findIndex((k) => k > 0) : -1;
  const total = lv.from.reduce((a, v, j) => a + v - lv.to[j], 0);
  const left = h.reduce((a, v, j) => a + v - lv.to[j], 0);
  const shine = done ? 1 : 1 - left / total;

  const rubAt = (i: number) => setRub((r) => ({ i, k: (r?.k ?? 0) + 1 }));
  const grindAt = (i: number) => {
    const g = grind(h, i);
    setAim(null);
    rubAt(i);
    if (tooThin(g, lv)) {
      sfx('SE-71'); oops();
      setH(g); setSnap(i);
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? GRIND_HINT : GRIND_FAIL);
      window.setTimeout(() => { setSnap(null); setH(lv.from); setStrokes(0); }, 800);
      return;
    }
    sfx('SE-45');
    setH(g); setStrokes(strokes + 1);
    if (grindDone(g, lv)) { setDone(true); setSay(null); window.setTimeout(onDone, 2000); }
  };
  const tap = (i: number) => {
    if (done || snap !== null) return;
    if (aim === i) grindAt(i); else { sfx('SE-09'); setAim(i); }
  };
  const play = () => {
    const x = grindSolve({ from: h, to: lv.to });
    if (!x) return;
    const seq = x.flatMap((k, i) => Array<number>(k).fill(i));
    let cur = h;
    seq.forEach((i, j) => {
      demo.current.push(window.setTimeout(() => {
        cur = grind(cur, i); sfx('SE-45'); setH(cur); rubAt(i);
        if (j === seq.length - 1) { setDone(true); window.setTimeout(onDone, 2000); }
      }, 650 * (j + 1)));
    });
  };
  const bad = aim !== null && h.some((v, i) => { const L = i === aim ? 2 : Math.abs(i - aim) === 1 ? 1 : 0; return L > 0 && v - L < lv.to[i]; });
  const about = `要磨出「${def.name}」（${n + 1} / ${GRINDS.length}），${def.use}。`;
  const goal = done ? `磨好了！又光滑又鋒利。${about}`
    : aim !== null ? (bad ? `紅色會磨過頭，換一格。${about}` : `再點同一格，磨下去。${about}`)
    : `點石頭上面一格，看會磨掉哪些。${about}`;
  const loss = (i: number) => (aim === null ? 0 : i === aim ? 2 : Math.abs(i - aim) === 1 ? 1 : 0);
  const W = cols * CW, H = (top + 1) * UH;
  const img = { href: def.raw, x: -10, y: -top * UH - 14, width: W + 20, height: top * UH + 24, preserveAspectRatio: 'none' };
  return (
    <div className="grind-wrap">
      <Goal floating id={`grind${n}`} text={goal} />
      <Hand at={col >= 0 ? `.grind-svg [data-col="${col}"]` : null} first={n === 0 && strokes === 0 && !fails} />
      <div className={`grind-board ${done ? 'done' : ''} ${snap !== null ? 'snap' : ''}`}>
        <svg viewBox={`${-CW * 0.6} ${-H - 10} ${W + CW * 1.2} ${H + 30}`} className="grind-svg" style={{ width: `min(${cols * 13}vh, ${cols * 100}px)` }}>
          <defs>
            <filter id={`${uid}-sf`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9" />
            </filter>
            <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-20} y={-H - 20} width={W + 40} height={H + 40}>
              <path d={profile(h)} fill="#fff" filter={`url(#${uid}-sf)`} />
            </mask>
            <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".35" stopColor="#fff" stopOpacity=".15" /><stop offset="1" stopColor="#000" stopOpacity=".3" /></linearGradient>
            <linearGradient id={`${uid}-sd`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#000" stopOpacity=".35" /><stop offset=".15" stopColor="#000" stopOpacity="0" /><stop offset=".85" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".35" /></linearGradient>
          </defs>
          <ellipse cx={W / 2} cy={4} rx={W * 0.56} ry={12} className="grind-shadow" />
          {aim !== null && <rect x={aim * CW} y={-H} width={CW} height={H + 8} rx={10} className="col-glow" />}
          {plan && plan.map((k, i) => k > 0 && <rect key={i} x={i * CW + 3} y={-H} width={CW - 6} height={H + 8} rx={10} className="col-hint" />)}
          <g key={rub?.k} className={rub ? 'rubbing' : ''}>
            <g mask={`url(#${uid}-m)`}>
              <image {...img} />
              {Array.from({ length: top }, (_, k) => <line key={k} x1={0} x2={W} y1={-(k + 1) * UH} y2={-(k + 1) * UH} className="strata" />)}
              {Array.from({ length: cols - 1 }, (_, k) => <line key={k} x1={(k + 1) * CW} x2={(k + 1) * CW} y1={-H} y2={0} className="colline" />)}
              <rect x={0} y={-H - 20} width={W} height={H + 40} fill={`url(#${uid}-sd)`} />
              <rect x={-20} y={-H - 20} width={W + 40} height={H + 40} fill={`url(#${uid}-gl)`} style={{ opacity: 0.3 + shine * 0.6 }} />
              {h.map((v, i) => {
                const L = loss(i);
                if (!L) return null;
                return <rect key={i} x={i * CW} y={-v * UH} width={CW} height={L * UH} className={v - L < lv.to[i] ? 'bad' : 'aim'} />;
              })}
              {snap !== null && <rect x={-20} y={-H} width={W + 40} height={H} className="bad" />}
            </g>
            <path d={topLine(h)} className="rim" />
          </g>
          {!done && <path d={topLine(lv.to)} className="target" />}
          {rub && <image key={`d${rub.k}`} className="grind-dust" href={art('g-04-dust')} x={rub.i * CW - CW * 0.4} y={-h[rub.i] * UH - CW * 1.3} width={CW * 1.8} height={CW * 1.5} />}
          {h.map((_, i) => <rect key={i} x={i * CW} y={-H - 10} width={CW} height={H + 20} className="hit" data-col={i} onClick={() => tap(i)} />)}
        </svg>
        {done && <img className="grind-done" src={def.img} alt={def.name} />}
        <p className="grind-tip">已經磨了 {strokes} 下</p>
      </div>
      {fails >= 3 && !done && <button className="btn demo corner-btn" onClick={play}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

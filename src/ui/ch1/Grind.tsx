import { useEffect, useRef, useState } from 'react';
import { grind, grindDone, grindSolve, tooThin } from '../../core/stone-age';
import { CARDS1, GRIND_DONE, GRIND_FAIL, GRIND_HINT, GRIND_INTRO, GRINDS, art } from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'grind' | 'done' | 'cards' | 'warp';

// 步驟 3 磨製石器（卑南文化）：在磨石上磨石錛、石刀，最後磨玉耳飾
export function Grind({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('intro');
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
      <img className="scene-bg" src={art('s-07')} alt="" />
      {phase === 'intro' && <Talk lines={GRIND_INTRO} onDone={() => setPhase('grind')} />}
      {phase === 'grind' && <GrindBoard key={lv} n={lv} oops={oops} onDone={() => {
        jingle('MU-13');
        if (lv + 1 < GRINDS.length) setLv(lv + 1); else setPhase('done');
      }} />}
      {phase === 'done' && <Talk lines={GRIND_DONE} onDone={() => {
        const more = CARDS.filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, ...CARDS));
        if (more.length) { setCard(more); setPhase('cards'); } else setPhase('warp');
      }} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) setPhase('warp'); }} />
      )}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

// 側面看的石頭：一欄一欄疊起來的石層，虛線是要磨到的高度。
// 點一欄看預告（那欄少 2 層、旁邊各少 1 層），再點一次磨下去
function GrindBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const def = GRINDS[n];
  const lv = def.level;
  const [h, setH] = useState<number[]>(lv.from);
  const [aim, setAim] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [strokes, setStrokes] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [done, setDone] = useState(false);
  const [snap, setSnap] = useState<number | null>(null);
  const demo = useRef(0);
  useEffect(() => () => clearTimeout(demo.current), []);
  const top = Math.max(...lv.from);
  const plan = fails >= 3 && !done ? grindSolve({ from: h, to: lv.to }) : null;

  const rub = (i: number) => {
    const g = grind(h, i);
    setAim(null);
    if (tooThin(g, lv)) {
      sfx('SE-71'); oops();
      setSnap(i); setTimeout(() => setSnap(null), 600);
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? GRIND_HINT : GRIND_FAIL);
      setH(lv.from); setStrokes(0);
      return;
    }
    sfx('SE-45');
    setH(g); setStrokes(strokes + 1);
    if (grindDone(g, lv)) { setDone(true); setSay(null); setTimeout(onDone, 1500); }
  };
  const tap = (i: number) => {
    if (done) return;
    if (aim === i) rub(i); else { sfx('SE-09'); setAim(i); }
  };
  const play = () => {
    const x = grindSolve({ from: h, to: lv.to });
    if (!x) return;
    const seq = x.flatMap((k, i) => Array<number>(k).fill(i));
    let cur = h;
    seq.forEach((i, j) => {
      demo.current = window.setTimeout(() => {
        cur = grind(cur, i); sfx('SE-45'); setH(cur);
        if (j === seq.length - 1) { setDone(true); setTimeout(onDone, 1500); }
      }, 600 * (j + 1));
    });
  };
  const loss = (i: number) => (aim === null ? 0 : i === aim ? 2 : Math.abs(i - aim) === 1 ? 1 : 0);
  return (
    <div className="grind-wrap">
      <Goal floating text={`磨「${def.name}」（${n + 1} / ${GRINDS.length}）：${def.use}`} />
      <div className={`grind-board panel ${done ? 'done' : ''}`}>
        <img className="grind-goal" src={def.img} alt="" />
        <div className="grind-cols" style={{ ['--top' as string]: top }}>
          {h.map((v, i) => {
            const L = loss(i);
            return (
              <button key={i} className={`grind-col ${aim === i ? 'on' : ''} ${snap === i ? 'snap' : ''} ${plan && plan[i] > 0 ? 'hint' : ''}`} onClick={() => tap(i)}>
                {Array.from({ length: v }, (_, k) => {
                  const fromTop = v - 1 - k;
                  return <i key={k} className={`layer ${fromTop < L ? (v - L < lv.to[i] ? 'bad' : 'aim') : ''}`} />;
                })}
                <span className="grind-line" style={{ bottom: `calc(${lv.to[i]} * var(--u))` }} />
              </button>
            );
          })}
        </div>
        <img className="whetstone" src={art('g-03-whetstone')} alt="磨石" />
        <p className="knap-tip">{done ? '磨好了！又光滑又鋒利。' : aim !== null ? '再點一次這一欄，磨下去！' : '點一欄看看磨下去會少哪些'}　已經磨了 {strokes} 下</p>
      </div>
      {fails >= 5 && !done && <button className="btn demo corner-btn" onClick={play}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

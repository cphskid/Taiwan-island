import { useEffect, useRef, useState } from 'react';
import { herdRun } from '../../core/tayouan';
import { DEER_INTRO, DEER_SAY, HERD, HERD_DEMO, art3 } from '../../data/ch3';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards3, type Step3Props } from '../Ch3';
import { Decide3 } from './Story3';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'plan' | 'good' | 'choice' | 'cards';
const DEER_IMG = `${import.meta.env.BASE_URL}img/ch2/deer.webp`;

// 步驟 3 鹿皮的代價：四年裡收夠鹿皮，四年後鹿群不能比現在少（接第二章的鹿群）
export function Deer({ p, set, next, oops }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch3-plain">
      <img className="scene-bg" src={art3('s-14')} alt="" />
      {phase === 'intro' && <Talk lines={DEER_INTRO} onDone={() => setPhase('plan')} />}
      {(phase === 'plan' || phase === 'good') && <HerdPlan oops={oops} onDone={() => setPhase('good')} />}
      {phase === 'good' && <Talk lines={[DEER_SAY.good]} onDone={() => setPhase('choice')} />}
      {phase === 'choice' && <Decide3 id="deer" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards3 ids={['deerskin', 'siraya']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function HerdPlan({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [takes, setTakes] = useState<number[]>(() => Array(HERD.years).fill(0));
  const [shown, setShown] = useState(0); // 演到第幾年（0 = 還沒開始）
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [won, setWon] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const run = herdRun(HERD, takes);
  const going = shown > 0 && shown <= HERD.years;

  const bump = (y: number, d: number) => {
    if (going || won) return;
    const v = Math.max(0, Math.min(HERD.maxTake, takes[y] + d));
    if (v === takes[y]) return;
    sfx(d > 0 ? 'SE-07' : 'SE-02');
    setShown(0);
    setTakes(takes.map((t, k) => (k === y ? v : t)));
  };
  const go = (plan = takes) => {
    sfx('SE-09');
    const r = herdRun(HERD, plan);
    let k = 0;
    const tick = () => {
      if (!alive.current) return;
      k += 1;
      setShown(k);
      if (k < HERD.years) { setTimeout(tick, 1000); return; }
      setTimeout(() => {
        if (!alive.current) return;
        if (r.ok) { jingle('MU-13'); setWon(true); setTimeout(() => alive.current && onDone(), 1500); return; }
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        setSay(f >= 3 ? DEER_SAY.hint : !r.enough ? DEER_SAY.short : DEER_SAY.fewer);
        setShown(HERD.years + 1);
      }, 800);
    };
    tick();
  };
  const demo = () => { setTakes([...HERD_DEMO]); setShown(0); setTimeout(() => go(HERD_DEMO), 300); };
  const startOf = (y: number) => (y === 0 ? HERD.start : run.years[y - 1].after);
  const done = shown > HERD.years - 1;
  return (
    <div className="ch3-herd-wrap">
      <Goal floating text={`四年收到 ${HERD.need} 群的鹿皮，四年後鹿群不能比 ${HERD.start} 群少。收完剩下的鹿會生小鹿，草原最多養 ${HERD.cap} 群。`} />
      <div className="ch3-herd panel">
        <div className="ch3-years">
          {takes.map((t, y) => (
            <div key={y} className={`ch3-year ${shown > y ? 'shown' : ''} ${fails >= 3 && y === 0 ? 'hint' : ''}`}>
              <b>第 {y + 1} 年</b>
              <span className="herd-n"><img src={DEER_IMG} alt="" />年初 {shown > y || y === 0 ? startOf(y) : '?'} 群</span>
              <div className="stepper">
                <button onClick={() => bump(y, -1)} disabled={!t || going || won}>－</button>
                <span className="take"><img src={art3('g-05-hides')} alt="" />收 {t} 群</span>
                <button onClick={() => bump(y, 1)} disabled={t >= HERD.maxTake || going || won}>＋</button>
              </div>
              {shown > y && (
                <span className="herd-calc">剩 {run.years[y].left} 群 <em>＋{run.years[y].born} 小鹿</em> → {run.years[y].after} 群{run.years[y].left + run.years[y].born > HERD.cap ? '（草原滿了）' : ''}</span>
              )}
            </div>
          ))}
        </div>
        <div className="ch3-herd-foot">
          <span className={`hides ${run.total >= HERD.need ? 'ok' : ''}`}><img src={art3('g-05-hides')} alt="" />鹿皮 {run.total} / {HERD.need} 群</span>
          {done && <span className={`herd-end ${run.fewer ? 'no' : 'yes'}`}><img src={DEER_IMG} alt="" />四年後 {run.end} 群</span>}
          <button className="btn green" disabled={going || won} onClick={() => go()}>照這樣過四年</button>
        </div>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" disabled={going} onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

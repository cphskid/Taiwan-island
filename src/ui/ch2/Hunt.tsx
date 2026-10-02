import { useState } from 'react';
import { deerRun, SEASONS } from '../../core/mountain';
import { DEER, HUNT_INTRO, HUNT_SAY, art2 } from '../../data/ch2';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'plan' | 'cards';
const DEMO = [[0, 0, 3, 2], [0, 0, 3, 2]];
const empty = () => Array.from({ length: DEER.years }, () => [0, 0, 0, 0]);

// 步驟 3 狩獵：兩年、每年四季，決定每一季打幾隻鹿；每年要有 5 隻，兩年後鹿群不能變少
export function Hunt({ p, set, next, oops }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch2-hunt">
      <img className="scene-bg" src={art2('s-12')} alt="" />
      {phase === 'intro' && <Talk lines={HUNT_INTRO} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <HuntPlan oops={oops} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['deer']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function HuntPlan({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [plan, setPlan] = useState<number[][]>(empty);
  const [shown, setShown] = useState(0); // 已經演到第幾年（0 = 還沒出發）
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const run = deerRun(DEER, plan);
  const going = shown > 0 && shown <= DEER.years;

  const bump = (y: number, s: number, d: number) => {
    if (going) return;
    const v = Math.max(0, Math.min(DEER.maxHunt, plan[y][s] + d));
    if (v === plan[y][s]) return;
    sfx(d > 0 ? 'SE-07' : 'SE-02');
    setShown(0);
    setPlan(plan.map((row, k) => k === y ? row.map((x, j) => j === s ? v : x) : row));
  };
  const go = () => {
    sfx('SE-09');
    let k = 0;
    const tick = () => {
      k += 1;
      setShown(k);
      if (k < DEER.years) { setTimeout(tick, 1200); return; }
      setTimeout(() => {
        if (run.ok) { jingle('MU-13'); setSay(HUNT_SAY.good); setTimeout(onDone, 1800); return; }
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        const spring = plan.some((r) => r[0] > 0);
        setSay(f >= 3 ? HUNT_SAY.hint : run.hungry ? HUNT_SAY.hungry : spring ? HUNT_SAY.spring : HUNT_SAY.fewer);
        setShown(DEER.years + 1);
      }, 900);
    };
    tick();
  };
  const deerAt = (y: number) => y === 0 ? DEER.start : run.years[y - 1].deerAfter;
  return (
    <div className="hunt-wrap">
      <Goal floating text={`每年打到 ${DEER.need} 隻，${DEER.years} 年後鹿群至少還有 ${DEER.start} 隻`} />
      <div className="hunt-board panel">
        {plan.map((row, y) => (
          <div key={y} className={`hunt-year ${shown > y ? 'shown' : ''}`}>
            <div className="hunt-head">
              <b>第 {y + 1} 年</b>
              <span className="deer-n"><img src={art2('deer')} alt="" />年初 {shown > y || y === 0 ? deerAt(y) : '?'} 隻</span>
              <span className={`meat ${run.years[y].meat >= DEER.need ? 'ok' : ''}`}><img src={art2('g-04-meat')} alt="" />{run.years[y].meat} / {DEER.need}</span>
            </div>
            <div className="hunt-seasons">
              {row.map((h, s) => (
                <div key={s} className={`hunt-season s${s} ${fails >= 3 && s === 0 ? 'hint' : ''}`}>
                  <b>{SEASONS[s]}{s === 0 && <small>生小鹿</small>}</b>
                  <div className="stepper">
                    <button onClick={() => bump(y, s, -1)} disabled={!h}>－</button>
                    <span>{Array.from({ length: h }, (_, k) => <img key={k} src={art2('deer-run')} alt="" />)}{!h && '不打'}</span>
                    <button onClick={() => bump(y, s, 1)} disabled={h >= DEER.maxHunt}>＋</button>
                  </div>
                  {shown > y && s === 0 && <em className="births">＋{run.years[y].births} 隻小鹿</em>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="hunt-foot">
          {shown > DEER.years - 1 && <span className={`deer-end ${run.fewer ? 'no' : 'yes'}`}><img src={art2('deer')} alt="" />{DEER.years} 年後：{run.years[DEER.years - 1].deerAfter} 隻</span>}
          <button className="btn green" disabled={going} onClick={go}>照這樣過 {DEER.years} 年</button>
        </div>
      </div>
      {fails >= 5 && !run.ok && <button className="btn demo corner-btn" onClick={() => { setShown(0); setPlan(DEMO.map((r) => [...r])); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

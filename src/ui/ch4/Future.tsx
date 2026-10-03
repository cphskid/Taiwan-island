import { useEffect, useState } from 'react';
import { grainSolutions, runGrain } from '../../core/tuntian';
import { GRAIN, GRAIN_INTRO, GRAIN_SAY, HISTORY4, SHILANG4, art4 } from '../../data/ch4';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards, type Step4Props } from '../Ch4';
import { Decide4, Jump4 } from './Story4';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'plan' | 'run' | 'choice' | 'history' | 'jump' | 'shilang' | 'cards';

// 步驟 5 東寧的明天：五年的糧倉規劃。新田要先花種子、下一年才多收；颱風年收成減半；糧倉不能空、最後要存夠
export function Future({ p, set, next, oops }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [plan, setPlan] = useState<number[]>(() => Array(GRAIN.years).fill(0));
  const [shown, setShown] = useState(0);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const res = runGrain(GRAIN, plan);
  const sol = fails >= 3 ? grainSolutions(GRAIN)[0] : null;

  const bump = (y: number, d: number) => {
    const k = plan[y] + d;
    if (k < 0 || k > GRAIN.maxNew) return;
    sfx(d > 0 ? 'SE-50' : 'SE-02');
    setPlan(plan.map((v, i) => (i === y ? k : v)));
    setShown(0);
  };
  const go = () => { setShown(0); setSay(null); setPhase('run'); };
  useEffect(() => {
    if (phase !== 'run') return;
    const stop = res.brokeAt >= 0 ? res.brokeAt + 1 : GRAIN.years;
    if (shown < stop) { const t = setTimeout(() => { sfx(res.years[shown].broke ? 'SE-71' : 'SE-36'); setShown(shown + 1); }, 700); return () => clearTimeout(t); }
    if (res.ok) { jingle('MU-13'); setSay(GRAIN_SAY.good); const t = setTimeout(() => { setSay(null); setPhase('choice'); }, 2200); return () => clearTimeout(t); }
    oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? GRAIN_SAY.spot : f >= 2 ? GRAIN_SAY.hint : res.brokeAt >= 0 ? GRAIN_SAY.broke(res.brokeAt + 1) : GRAIN_SAY.short(res.end));
    setPhase('plan');
  }, [phase, shown]); // eslint-disable-line react-hooks/exhaustive-deps
  const demo = () => { setPlan(grainSolutions(GRAIN)[0]); setShown(0); };

  return (
    <div className="scene ch4-future">
      <img className="scene-bg" src={art4('s-16')} alt="" />
      {phase === 'intro' && <Talk lines={GRAIN_INTRO} onDone={() => setPhase('plan')} />}
      {phase === 'plan' && <Goal floating text={`排好五年要開幾塊新田：糧倉不能空，最後存到 ${GRAIN.target} 份`} />}
      {(phase === 'plan' || phase === 'run') && (
        <div className="ch4-grain-wrap">
          <div className="ch4-grain panel">
            <div className="ch4-grain-head">
              <span>一開始糧倉有 <b>{GRAIN.start}</b> 份</span>
              <span>原本的田一年收 <b>{GRAIN.base}</b> 份</span>
              <span>全軍一年吃 <b>{GRAIN.eat}</b> 份</span>
              <span>開一塊新田先花 <b>{GRAIN.seed}</b> 份</span>
            </div>
            <div className="ch4-years">
              {plan.map((k, y) => {
                const r = y < shown ? res.years[y] : null;
                const storm = GRAIN.typhoon.includes(y);
                return (
                  <div key={y} className={`ch4-yr ${storm ? 'storm' : ''} ${r ? (r.broke ? 'broke' : 'shown') : ''} ${sol && sol[y] !== k ? 'hint' : ''}`}>
                    <b>第 {y + 1} 年{storm ? ' 🌀颱風' : ''}</b>
                    <span className="ch4-newfields">{Array.from({ length: GRAIN.maxNew }, (_, i) => <img key={i} className={i < k ? 'on' : ''} src={art4('o-08-paddy')} alt="" />)}</span>
                    <div className="stepper">
                      <button disabled={phase !== 'plan' || k <= 0} onClick={() => bump(y, -1)} aria-label="少開一塊">－</button>
                      <span>開 {k} 塊</span>
                      <button disabled={phase !== 'plan' || k >= GRAIN.maxNew} onClick={() => bump(y, 1)} aria-label="多開一塊">＋</button>
                    </div>
                    {sol && <small className="ch4-suggest">建議：{sol[y]} 塊</small>}
                    <ul className="ch4-ledger">
                      <li>種子 {r ? `−${r.opened * GRAIN.seed}` : '?'}</li>
                      <li>收成 {r ? `+${r.harvest}` : '?'}</li>
                      <li>吃掉 {r ? `−${GRAIN.eat}` : '?'}</li>
                    </ul>
                    <span className="ch4-barn"><img src={art4('g-06-sack')} alt="" />{r ? (r.broke ? '空了！' : `剩 ${r.end}`) : '…'}</span>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <small className="ch4-tip">新田從下一年起，每塊每年多收 1 份</small>
              <button className="btn green" disabled={phase !== 'plan'} onClick={go}>試著過五年 ▶</button>
            </div>
          </div>
        </div>
      )}
      {fails >= 5 && phase === 'plan' && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      {phase === 'choice' && <Decide4 id="grain" set={set} onDone={() => setPhase('history')} />}
      {phase === 'history' && <Talk lines={HISTORY4} onDone={() => setPhase('jump')} />}
      {phase === 'jump' && <Jump4 to={3} onDone={() => setPhase('shilang')} />}
      {phase === 'shilang' && <Talk lines={SHILANG4} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['c4-shilang', 'c4-migrants']} p={p} set={set} onDone={next} />}
      <Say line={phase === 'plan' || phase === 'run' ? say : null} />
    </div>
  );
}

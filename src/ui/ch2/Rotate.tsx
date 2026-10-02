import { useState } from 'react';
import { farmYear, rotSolve } from '../../core/mountain';
import { ROT, ROT_INTRO, ROT_SAY, art2 } from '../../data/ch2';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'farm' | 'cards';
// 肥力看起來的樣子：3 綠油油、2 剛發芽、1 草地、0 光禿禿
const LOOK = ['burnt', 'fallow', 'sprout', 'green'];

// 步驟 2 輪耕：六塊山田、四年，每年挑三塊種，每年都要收到 7 份小米
export function Rotate({ p, set, next, oops }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch2-farm">
      <img className="scene-bg" src={art2('s-11')} alt="" />
      {phase === 'intro' && <Talk lines={ROT_INTRO} onDone={() => setPhase('farm')} />}
      {phase === 'farm' && <Fields oops={oops} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards ids={['fallow']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function Fields({ onDone, oops }: { onDone: () => void; oops: () => void }) {
  const [fert, setFert] = useState<number[]>(ROT.start);
  const [year, setYear] = useState(0);
  const [pick, setPick] = useState<number[]>([]);
  const [log, setLog] = useState<number[]>([]); // 每年收了多少
  const [reaping, setReaping] = useState(false);
  const [fails, setFails] = useState(0);
  const [demo, setDemo] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const plan = fails >= 3 || demo ? rotSolve({ ...ROT, start: fert, years: ROT.years - year }) : null;
  const sum = pick.reduce((a, i) => a + fert[i], 0);

  const tap = (i: number) => {
    if (reaping) return;
    if (pick.includes(i)) { sfx('SE-02'); setPick(pick.filter((x) => x !== i)); return; }
    if (pick.length >= ROT.plotsPerYear) { sfx('SE-04'); return; }
    sfx('SE-07');
    setPick([...pick, i]);
  };
  const restart = () => { setFert(ROT.start); setYear(0); setPick([]); setLog([]); };
  const reap = () => {
    const r = farmYear(ROT, fert, pick);
    setReaping(true);
    sfx('SE-36');
    setTimeout(() => {
      setReaping(false);
      if (r.harvest < ROT.need) {
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        setSay(f >= 2 ? ROT_SAY.hint : ROT_SAY.short);
        restart();
        return;
      }
      setFert(r.next); setPick([]); setLog([...log, r.harvest]);
      if (year + 1 >= ROT.years) { jingle('MU-13'); setSay(ROT_SAY.good); setTimeout(onDone, 1600); return; }
      setYear(year + 1);
      // 這樣種下去，後面幾年一定不夠：先提醒
      if (!rotSolve({ ...ROT, start: r.next, years: ROT.years - year - 1 })) setSay({ who: 'ani', mood: 'worried', text: '田好像都累了……照這樣下去，之後會不夠吃。要不要重新來一次？' });
      else setSay(null);
    }, 1100);
  };
  return (
    <div className="rot-wrap">
      <div className="task-chip">第 {year + 1} / {ROT.years} 年：挑 {ROT.plotsPerYear} 塊田種小米，收成要有 {ROT.need} 份</div>
      <div className="rot-board panel">
        <div className="plots">
          {fert.map((f, i) => {
            const on = pick.includes(i);
            return (
              <button key={i} className={`plot ${on ? 'on' : ''} ${plan?.[0]?.includes(i) ? 'hint' : ''} ${ROT.steep.includes(i) ? 'steep' : ''}`} onClick={() => tap(i)}>
                <img src={art2(`o-06-${on && reaping ? 'golden' : LOOK[f]}`)} alt="" />
                <span className="fert">{Array.from({ length: ROT.max }, (_, k) => <i key={k} className={k < f ? 'on' : ''} />)}</span>
                <b>{f}</b>
                {ROT.steep.includes(i) && <small className="steep-tag">陡坡</small>}
                {on && !reaping && <img className="seed" src={art2('g-04-seeds')} alt="" />}
              </button>
            );
          })}
        </div>
        <div className="rot-foot">
          <span className={`rot-sum ${sum >= ROT.need ? 'ok' : ''}`}><img src={art2('g-04-millet')} alt="" /> 今年會收 <b>{sum}</b> / {ROT.need}</span>
          <span className="rot-log">{log.map((h, k) => <em key={k}>第{k + 1}年 {h}</em>)}</span>
          <button className="btn orange" disabled={reaping || (!year && !pick.length)} onClick={() => { sfx('SE-02'); restart(); setSay(null); }}>重來</button>
          <button className="btn green" disabled={pick.length !== ROT.plotsPerYear || reaping} onClick={reap}>種下去，等收成</button>
        </div>
        <p className="rot-rule">種的田：收成＝數字，種完少 1（陡坡少 2）。休息的田：多 1，最多 {ROT.max}。</p>
      </div>
      {fails >= 5 && !demo && <button className="btn demo corner-btn" onClick={() => { restart(); setDemo(true); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

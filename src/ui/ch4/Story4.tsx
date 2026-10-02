import { useState } from 'react';
import { CHOICES4, JUMPS4, STOPS4, type Pick4 } from '../../data/ch4';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { Step4Props } from '../Ch4';
import { sfx } from '../../audio';

// 第四章的劇情小元件：選擇、時間尺轉場（樣式跟第一章的 Decide / EraJump 一樣）

// 選擇：問一句、兩個選項，選完說那個選項的後續；存進進度，結局會用到
export function Decide4({ id, set, onDone }: { id: Pick4; set: Step4Props['set']; onDone: () => void }) {
  const c = CHOICES4[id];
  const [got, setGot] = useState<number | null>(null);
  if (got !== null) return <Talk lines={c.after[got]} onDone={onDone} />;
  const pick = (i: number) => {
    sfx('SE-36');
    set((o) => ({ ...o, picks: { ...o.picks, [id]: i } }));
    setGot(i);
  };
  return (
    <div className="talk-cover">
      <div className="panel quiz choice">
        <small>你決定</small>
        <div className="quiz-ask"><Face who={c.who} mood={c.mood} small /><h3><b style={{ color: PEOPLE[c.who].color }}>{PEOPLE[c.who].name}：</b>{c.q}</h3></div>
        {c.options.map((o, i) => <button key={o} className="opt" onClick={() => pick(i)}>{o}</button>)}
        <p className="choice-tip">選哪一個都可以，小蓮會記得。</p>
      </div>
    </div>
  );
}

// 時間尺轉場：光點從上一站滑到這一站，再聽一句第一印象
export function Jump4({ to, onDone }: { to: number; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS4[to];
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: to - 1, ['--to' as string]: to, ['--n' as string]: STOPS4.length - 1 }}>
          {STOPS4.map((s, i) => <span key={s} className={i < to ? 'past' : i === to ? 'on' : ''}><i />{s}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{j.title}</h2>
        <p>{j.place}</p>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { CHOICES3, JUMPS3, YEARS3, type Pick3 } from '../../data/ch3';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { Step3Props } from '../Ch3';
import { sfx } from '../../audio';

// 第三章的劇情小元件：選擇、時間轉場（樣子跟第一章一樣，用同一套 class）

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function Decide3({ id, set, onDone }: { id: Pick3; set: Step3Props['set']; onDone: () => void }) {
  const c = CHOICES3[id];
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
        <p className="choice-tip">選哪一個都可以，阿福會記得。</p>
      </div>
    </div>
  );
}

// 時間轉場：時間尺上的光點從上一個年代滑到這一個，再聽一句第一印象
export function EraJump3({ to, onDone }: { to: number; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS3[to];
  const at = to; // YEARS3[0] 是「荷蘭人到大員」，轉場 1 停在第 1 格「大員・新港社」
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: Math.max(0, at - 1), ['--to' as string]: at, ['--n' as string]: YEARS3.length - 1 }}>
          {YEARS3.map((s, i) => <span key={s.year} className={i < at ? 'past' : i === at ? 'on' : ''}><i />{s.year}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{j.place}</h2>
        <p>{YEARS3[at].year}・{YEARS3[at].name}</p>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

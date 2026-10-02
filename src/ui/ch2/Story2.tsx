import { useState } from 'react';
import { CHOICES2, PASSAGES, type Pick2 } from '../../data/ch2';
import { PEOPLE } from '../../data/babao-chapter';
import { SEASONS } from '../../core/mountain';
import { Face, Talk } from '../Talk';
import type { Step2Props } from '../Ch2';
import { sfx } from '../../audio';

// 第二章的劇情小元件：選擇、季節轉場

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function Decide2({ id, set, onDone }: { id: Pick2; set: Step2Props['set']; onDone: () => void }) {
  const c = CHOICES2[id];
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
        {c.options.map((o) => <button key={o} className="opt" onClick={() => pick(c.options.indexOf(o))}>{o}</button>)}
        <p className="choice-tip">選哪一個都可以，阿妮會記得。</p>
      </div>
    </div>
  );
}

// 季節轉場：四季的線上，光點滑到這一季，再聽一句話
export function Passage({ id, onDone }: { id: keyof typeof PASSAGES; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const g = PASSAGES[id];
  if (heard) return <Talk lines={[g.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{g.far}</small>
        <div className="era-line" style={{ ['--from' as string]: Math.max(0, g.season - 1), ['--to' as string]: g.season, ['--n' as string]: SEASONS.length - 1 }}>
          {SEASONS.map((s, i) => <span key={s} className={i < g.season ? 'past' : i === g.season ? 'on' : ''}><i />{s}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{g.title}</h2>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

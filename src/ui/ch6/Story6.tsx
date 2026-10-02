import { useState } from 'react';
import { CHOICES6, JUMPS6, YEARS6, type Pick6 } from '../../data/ch6';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { Step6Props } from '../Ch6';
import { sfx } from '../../audio';

// 第六章的劇情小元件：選擇、時間跳躍（樣式和第一章一樣）

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function Decide6({ id, set, onDone }: { id: Pick6; set: Step6Props['set']; onDone: (pick: number) => void }) {
  const c = CHOICES6[id];
  const [got, setGot] = useState<number | null>(null);
  if (got !== null) return <Talk lines={c.after[got]} onDone={() => onDone(got)} />;
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
        <p className="choice-tip">選哪一個都可以，阿春會記得。</p>
      </div>
    </div>
  );
}

// 時間跳躍：時間尺上的光點從上一個年代滑到這一個，再聽阿春說她看到什麼。
// to 是 YEARS6 的第幾個（0：1860 年代開港；2：1887 年鋪鐵路；3：1890 年代通車）
export function Jump6({ to, from, onDone }: { to: number; from: number; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS6[to];
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: from, ['--to' as string]: to, ['--n' as string]: YEARS6.length - 1 }}>
          {YEARS6.map((s, i) => <span key={s} className={i === to ? 'on' : i < to ? 'past' : ''}><i />{s}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{j.title}</h2>
        <p>{YEARS6[to]}・{j.place}</p>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

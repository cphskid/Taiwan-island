import { useState } from 'react';
import { CHOICES7, JUMPS7, YEARS7, type Pick7 } from '../../data/ch7';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { Step7Props } from '../Ch7';
import { sfx } from '../../audio';

// 第七章的劇情小元件：選擇、年份轉場

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function Decide7({ id, set, onDone }: { id: Pick7; set: Step7Props['set']; onDone: () => void }) {
  const c = CHOICES7[id];
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
        <p className="choice-tip">選哪一個都可以，阿雄會記得。</p>
      </div>
    </div>
  );
}

// 年份轉場：時間尺上的光點從上一個年份滑到這一個，再聽一句第一印象。to = 9 表示跳回 1930 年那一天
export function EraJump7({ from, to, onDone }: { from: number; to: number; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS7[to];
  const at = to === 9 ? 2 : to;
  const y = YEARS7[at];
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: from, ['--to' as string]: at, ['--n' as string]: YEARS7.length - 1 }}>
          {YEARS7.map((s, i) => <span key={s.year} className={i === at ? 'on' : i === from ? 'past' : ''}><i />{s.year}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{y.year} 年・{y.name}</h2>
        <p>{y.place}</p>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

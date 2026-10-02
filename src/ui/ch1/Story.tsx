import { useState } from 'react';
import { CHOICES1, ERAS, FIRE_CHAIN, JUMPS, type Pick1 } from '../../data/ch1';
import { PEOPLE } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { Step1Props } from '../Ch1';
import { sfx } from '../../audio';

// 第一章的劇情小元件：選擇、時代轉場、點火步驟鏈

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function Decide({ id, set, onDone }: { id: Pick1; set: Step1Props['set']; onDone: () => void }) {
  const c = CHOICES1[id];
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
        <p className="choice-tip">選哪一個都可以，阿岩會記得。</p>
      </div>
    </div>
  );
}

// 時代轉場：時間尺上的光點從上一個時代滑到這一個，再聽一句這個時代給人的第一印象
export function EraJump({ to, onDone }: { to: number; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS[to];
  const era = ERAS[to];
  const stops = [...ERAS.map((e) => e.name), '今天'];
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: to - 1, ['--to' as string]: to, ['--n' as string]: stops.length - 1 }}>
          {stops.map((s, i) => <span key={s} className={i < to ? 'past' : i === to ? 'on' : ''}><i />{s}</span>)}
          <b className="era-dot" />
        </div>
        {era ? (
          <>
            <h2>{era.name}</h2>
            <p>{era.when}・{era.place}</p>
          </>
        ) : (
          <>
            <h2>今天</h2>
            <p>考古工地</p>
          </>
        )}
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

// 點火要一步一步來：好石頭 → 石刀 → 鑽火棒 → 火；at 是正在做的那一步
export function FireChain({ at, big }: { at: number; big?: boolean }) {
  return (
    <ol className={`fire-chain ${big ? 'big' : ''}`}>
      {FIRE_CHAIN.map((c, i) => (
        <li key={c.name} className={i < at ? 'done' : i === at ? 'on' : ''}>
          <img src={c.img} alt="" />
          <small>{c.name}</small>
        </li>
      ))}
    </ol>
  );
}

import { useState } from 'react';
import { CHOICES_END, JUMP_STOPS, JUMPS_END, type FriendE, type PickE } from '../../data/chEnd';
import { PEOPLE, type Who } from '../../data/babao-chapter';
import { Face, Talk } from '../Talk';
import type { StepEndProps } from '../ChEnd';
import { sfx } from '../../audio';

// 終章的劇情小元件：選擇、時代轉場、時光朋友的頭像

// 選擇：問一句、兩個選項，選完說那個選項的後續；選了什麼存進進度，結局會用到
export function DecideEnd({ id, set, onDone }: { id: PickE; set: StepEndProps['set']; onDone: () => void }) {
  const c = CHOICES_END[id];
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
        <p className="choice-tip">選哪一個都可以，小安會記得。</p>
      </div>
    </div>
  );
}

// 時代轉場：時間尺上的光點從上一站滑到這一站，再聽一句這個時代給人的第一印象
export function EraJumpEnd({ to, onDone }: { to: 1 | 2 | 3; onDone: () => void }) {
  const [heard, setHeard] = useState(false);
  const j = JUMPS_END[to];
  if (heard) return <Talk lines={[j.react]} onDone={onDone} />;
  const from = to === 1 ? 3 : to - 1; // 第一次是從今天往回跳
  return (
    <div className="talk-cover era-cover" onClick={() => { sfx('SE-09'); setHeard(true); }}>
      <div className="panel era-jump">
        <small>{j.far}</small>
        <div className="era-line" style={{ ['--from' as string]: from, ['--to' as string]: j.stop, ['--n' as string]: JUMP_STOPS.length - 1 }}>
          {JUMP_STOPS.map((s, i) => <span key={s} className={i < j.stop ? 'past' : i === j.stop ? 'on' : ''}><i />{s}</span>)}
          <b className="era-dot" />
        </div>
        <h2>{j.title}</h2>
        <p>{j.sub}</p>
        <span className="talk-next">點一下繼續 ▶</span>
      </div>
    </div>
  );
}

// 時光朋友的頭像：那一章的角色已經在 PEOPLE 裡就用他的圖，還沒有（別章還在做）就用名字卡
export const friendWho = (f: FriendE): Who | null => (f.ids.find((id) => id in PEOPLE) as Who | undefined) ?? null;
export function FriendFace({ f, met }: { f: FriendE; met: boolean }) {
  const who = friendWho(f);
  return (
    <div className={`end-friend ${met ? 'met' : ''}`}>
      {who ? <Face who={who} mood="happy" small /> : <div className="face small end-friend-word"><span>{f.name.slice(-1)}</span></div>}
      <b>{f.name}</b>
      <small>{f.era}</small>
    </div>
  );
}

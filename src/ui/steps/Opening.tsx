import { useState } from 'react';
import { CARDS, FRIENDS, GOAL, LOOP_DAY, OPENING, PEOPLE, img } from '../../data/babao-chapter';
import { CardPop, Face, Talk } from '../Talk';
import type { StepProps } from '../Chapter';
import { sfx } from '../../audio';

type Phase = 'loop' | 'talk' | 'friends';

// 步驟 0 開場：同一個早上重來第 37 次（時間卡住）→ 認識施世榜和兩位夥伴 → 時光朋友卡
export function Opening({ p, set, next }: StepProps) {
  const [phase, setPhase] = useState<Phase>('loop');
  const [card, setCard] = useState(false);
  const talked = () => {
    setPhase('friends');
    if (!p.cards.includes('shi')) { set((o) => ({ ...o, cards: [...o.cards, 'shi'] })); setCard(true); }
  };
  return (
    <div className="scene opening">
      <img className="scene-bg" src={img('S-01')} alt="" />
      {phase === 'loop' && (
        <button className="loop-day" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">喔喔喔——</span>
          <b>同一個早上</b>
          <strong>第 {LOOP_DAY} 次</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING} onDone={talked} />}
      {card && <CardPop title={CARDS.shi.title} text={CARDS.shi.text} onClose={() => setCard(false)} />}
      {phase === 'friends' && !card && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              {FRIENDS.map((f) => (
                <div key={f.who} className="friend">
                  <Face who={f.who} />
                  <b style={{ color: PEOPLE[f.who].color }}>{PEOPLE[f.who].name}</b>
                  <small>{f.from}</small>
                  <span>💛 {f.wish}</span>
                  <span>💦 {f.fear}</span>
                </div>
              ))}
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL}</p>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}

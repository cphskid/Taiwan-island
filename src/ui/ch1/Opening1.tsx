import { useState } from 'react';
import { CARDS1, GOAL1, OPENING1, YAN_CARD, art } from '../../data/ch1';
import { PEOPLE, img } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Talk } from '../Talk';
import type { Step1Props } from '../Ch1';
import { sfx } from '../../audio';

type Phase = 'night' | 'talk' | 'friend';

// 步驟 0 開場：八仙洞的夜晚一直不結束（火熄了）→ 認識阿岩 → 時光朋友卡
export function Opening1({ p, set, next }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('night');
  const [card, setCard] = useState(false);
  const talked = () => {
    setPhase('friend');
    if (!p.cards.includes('baxian')) { set((o) => addCard1(o, 'baxian')); setCard(true); }
  };
  return (
    <div className="scene opening ch1-night">
      <img className="scene-bg" src={art('s-05')} alt="" />
      {phase === 'night' && (
        <button className="loop-day night" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">呼——好冷</span>
          <b>八仙洞的夜晚</b>
          <strong>一直沒有結束</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING1} onDone={talked} />}
      {card && <CardPop title={CARDS1.baxian.title} text={CARDS1.baxian.text} onClose={() => setCard(false)} />}
      {phase === 'friend' && !card && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={YAN_CARD.body} alt="" />
                <b style={{ color: PEOPLE.yan.color }}>{PEOPLE.yan.name}</b>
                <small>{YAN_CARD.from}</small>
                <span>💛 {YAN_CARD.wish}</span>
                <span>💦 {YAN_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL1}</p>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}

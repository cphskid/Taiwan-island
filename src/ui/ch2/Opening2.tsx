import { useState } from 'react';
import { ANI_CARD, GOAL2, OPENING2, art2 } from '../../data/ch2';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCards, type Step2Props } from '../Ch2';
import { sfx } from '../../audio';

type Phase = 'winter' | 'talk' | 'card' | 'friend';

// 步驟 0 開場：山上的冬天一直不結束 → 認識阿妮和長老 → 時光朋友卡
export function Opening2({ p, set, next }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('winter');
  return (
    <div className="scene opening ch2-winter">
      <img className="scene-bg" src={art2('s-10')} alt="" />
      <div className="snowfall" />
      {phase === 'winter' && (
        <button className="loop-day night" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">呼——好冷</span>
          <b>山上的冬天</b>
          <strong>一直沒有結束</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING2} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCards ids={['elder']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={ANI_CARD.body} alt="" />
                <b style={{ color: PEOPLE.ani.color }}>{PEOPLE.ani.name}</b>
                <small>{ANI_CARD.from}</small>
                <span>💛 {ANI_CARD.wish}</span>
                <span>💦 {ANI_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL2}</p>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}

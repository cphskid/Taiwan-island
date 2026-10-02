import { useState } from 'react';
import { GOAL4, OPENING4, XL_CARD, art4 } from '../../data/ch4';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCards, type Step4Props } from '../Ch4';
import { Jump4 } from './Story4';
import { sfx } from '../../audio';

type Phase = 'loop' | 'talk' | 'card' | 'friend' | 'jump';

// 步驟 0 開場：東寧的官田一直是乾裂的同一天 → 認識小蓮和老兵 → 時光朋友卡 → 時間尺轉場
export function Opening4({ p, set, next }: Step4Props) {
  const [phase, setPhase] = useState<Phase>('loop');
  return (
    <div className="scene opening ch4-dry">
      <img className="scene-bg" src={art4('s-16')} alt="" />
      <div className="ch4-heat" />
      {phase === 'loop' && (
        <button className="loop-day" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">咚、咚——營裡又打起早上的鼓</span>
          <b>東寧的官田</b>
          <strong>又是乾裂的同一天</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING4} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCards ids={['koxinga', 'tungning']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={XL_CARD.body} alt="" />
                <b style={{ color: PEOPLE.xlian.color }}>{PEOPLE.xlian.name}</b>
                <small>{XL_CARD.from}</small>
                <span>💛 {XL_CARD.wish}</span>
                <span>💦 {XL_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL4}</p>
            <button className="btn green" onClick={() => setPhase('jump')}>出發！</button>
          </div>
        </div>
      )}
      {phase === 'jump' && <Jump4 to={1} onDone={next} />}
    </div>
  );
}

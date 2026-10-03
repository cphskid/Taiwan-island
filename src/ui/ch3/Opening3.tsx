import { useState } from 'react';
import { AFU_CARD, GOAL3, LOOP_TIDE, OPENING3, art3 } from '../../data/ch3';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCards3, type Step3Props } from '../Ch3';
import { sfx } from '../../audio';

type Phase = 'fog' | 'talk' | 'card' | 'friend';

// 步驟 0 開場：大員港外一直起霧、同一天的潮水一直重複 → 認識阿福和商館員 → 時光朋友卡
export function Opening3({ p, set, next }: Step3Props) {
  const [phase, setPhase] = useState<Phase>('fog');
  return (
    <div className="scene opening ch3-fog">
      <img className="scene-bg" src={art3('s-13')} alt="" />
      <div className="ch3-fogbank" />
      {phase === 'fog' && (
        <button className="loop-day night ch3-loop" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">嘩——潮水又漲上來了</span>
          <b>同一天的潮水</b>
          <strong>第 {LOOP_TIDE} 次</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING3} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCards3 ids={['tayouan', 'zeelandia']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={AFU_CARD.body} alt="" />
                <b style={{ color: PEOPLE.afu.color }}>{PEOPLE.afu.name}</b>
                <small>{AFU_CARD.from}</small>
                <span>💛 {AFU_CARD.wish}</span>
                <span>💦 {AFU_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL3}</p>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { CHUN_CARD, GOAL6, OPENING6, art6 } from '../../data/ch6';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCards6, type Step6Props } from '../Ch6';
import { sfx } from '../../audio';

type Phase = 'rain' | 'talk' | 'card' | 'friend';

// 步驟 0 開場：大稻埕碼頭一直下同一場雨、茶箱運不出去 → 認識阿春和茶行老闆 → 時光朋友卡
export function Opening6({ p, set, next }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('rain');
  return (
    <div className="scene opening ch6-rain">
      <img className="scene-bg" src={art6('s-19')} alt="" />
      <div className="ch6-rainfall" />
      {phase !== 'rain' && <img className="ch6-chun-stand" src={art6('f-08a-carry')} alt="" />}
      {phase === 'rain' && (
        <button className="loop-day night" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">嘩啦啦——又是這場雨</span>
          <b>大稻埕的碼頭</b>
          <strong>貨一直運不出去</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING6} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCards6 ids={['c6-dadaocheng']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={CHUN_CARD.body} alt="" />
                <b style={{ color: PEOPLE.chun.color }}>{PEOPLE.chun.name}</b>
                <small>{CHUN_CARD.from}</small>
                <span>💛 {CHUN_CARD.wish}</span>
                <span>💦 {CHUN_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL6}</p>
            <button className="btn green" onClick={next}>出發！</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { GOAL7, HSIUNG_CARD, OPENING7, art7 } from '../../data/ch7';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCards7, type Step7Props } from '../Ch7';
import { EraJump7 } from './Story7';
import { sfx } from '../../audio';

type Phase = 'drought' | 'talk' | 'card' | 'friend' | 'jump';

// 步驟 0 開場：嘉南平原卡在同一個乾旱的日子 → 認識阿雄 → 時光朋友卡 → 跳回 1908 年
export function Opening7({ p, set, next }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('drought');
  return (
    <div className="scene opening ch7-dry">
      <img className="scene-bg" src={art7('s-22')} alt="" />
      <div className="ch7-heat" />
      {phase !== 'drought' && phase !== 'jump' && <img className="ch7-kid" src={art7('f-09a-crouch')} alt="阿雄" />}
      {phase === 'drought' && (
        <button className="loop-day" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">太陽好大，一滴雨也沒有……</span>
          <b>嘉南平原</b>
          <strong>一直是同一個乾旱的日子</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING7} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCards7 ids={['rainfed', 'school']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={HSIUNG_CARD.body} alt="" />
                <b style={{ color: PEOPLE.hsiung.color }}>{PEOPLE.hsiung.name}</b>
                <small>{HSIUNG_CARD.from}</small>
                <span>💛 {HSIUNG_CARD.wish}</span>
                <span>💦 {HSIUNG_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL7}</p>
            <button className="btn green" onClick={() => { sfx('SE-31'); setPhase('jump'); }}>出發！</button>
          </div>
        </div>
      )}
      {phase === 'jump' && <EraJump7 from={2} to={0} onDone={next} />}
    </div>
  );
}

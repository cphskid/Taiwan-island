import { useState } from 'react';
import { AN_CARD, GOAL_END, NOTE_END, NOTE_END_AFTER, OPENING_END, artE } from '../../data/chEnd';
import { PEOPLE, img } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { EraJumpEnd } from './StoryEnd';
import { sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
type Phase = 'stuck' | 'talk' | 'note' | 'noteTalk' | 'card' | 'friend' | 'jump';

// 步驟 0 開場：今天的時光鐘塔不轉 → 認識小安 → 門上的紙條 → 時光朋友卡 → 往回跳到 1970 年代
export function OpeningEnd({ p, set, next }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('stuck');
  return (
    <div className="scene opening end-plaza">
      <img className="scene-bg" src={artE('s-25')} alt="" />
      {phase !== 'stuck' && <img className="end-an-stand" src={artE('f-10a-idle')} alt="小安" />}
      {phase === 'stuck' && (
        <button className="loop-day end-stuck" onClick={() => { sfx('SE-09'); setPhase('talk'); }}>
          <span className="loop-rooster">滴答……滴……</span>
          <b>時光鐘塔</b>
          <strong>停在下午三點</strong>
          <span className="talk-next">點一下 ▶</span>
        </button>
      )}
      {phase === 'talk' && <Talk lines={OPENING_END} onDone={() => { sfx('SE-36'); set((o) => ({ ...o, note: true })); setPhase('note'); }} />}
      {phase === 'note' && (
        <div className="talk-cover" onClick={() => setPhase('noteTalk')}>
          <div className="note-paper">
            <img className="traveler" src={`${BASE}img/story/F-03_5.webp`} alt="" />
            <p>{NOTE_END.text}</p>
            <small>—— {NOTE_END.sign}</small>
            <span className="talk-next">點一下繼續 ▶</span>
          </div>
        </div>
      )}
      {phase === 'noteTalk' && <Talk lines={NOTE_END_AFTER} onDone={() => setPhase('card')} />}
      {phase === 'card' && <NewCardsEnd ids={['tower']} p={p} set={set} onDone={() => setPhase('friend')} />}
      {phase === 'friend' && (
        <div className="talk-cover">
          <div className="mission panel friends">
            <h2>時光朋友</h2>
            <div className="friend-row">
              <div className="friend">
                <img className="friend-body" src={AN_CARD.body} alt="" />
                <b style={{ color: PEOPLE.an.color }}>{PEOPLE.an.name}</b>
                <small>{AN_CARD.from}</small>
                <span>💛 {AN_CARD.wish}</span>
                <span>💦 {AN_CARD.fear}</span>
              </div>
            </div>
            <p className="goal"><img src={img('gear')} alt="" />{GOAL_END}</p>
            <button className="btn green" onClick={() => setPhase('jump')}>出發！</button>
          </div>
        </div>
      )}
      {phase === 'jump' && <EraJumpEnd to={1} onDone={next} />}
    </div>
  );
}

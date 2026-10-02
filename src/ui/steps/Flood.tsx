import { useState } from 'react';
import { FLOOD } from '../../data/babao-levels';
import { FLOOD_INTRO, FLOOD_PASS, NOTE, NOTE_AFTER } from '../../data/babao-chapter';
import { Talk } from '../Talk';
import { FlowLevel } from './Puzzle';
import type { StepProps } from '../Chapter';
import { sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
type Phase = 'play' | 'note' | 'noteTalk' | 'pass' | 'done';

// 步驟 5 洪水大謎題：颱風來了，三道水全搶進圳道會滿出來。
// 卡住的時候（失敗一次，或一開始就沒撿過）神秘旅人的紙條會出現在竹蛇籠上。
export function Flood({ p, set, next }: StepProps) {
  const [phase, setPhase] = useState<Phase>(p.flood ? 'done' : 'play');
  const [noteOpen, setNoteOpen] = useState(false);
  const takeNote = () => {
    sfx('SE-36');
    setNoteOpen(false);
    if (!p.note) { set((o) => ({ ...o, note: true })); setPhase('noteTalk'); }
  };
  if (phase === 'done' || phase === 'pass') {
    return (
      <div className="scene center flood-done">
        {phase === 'pass' && <Talk lines={FLOOD_PASS} onDone={() => setPhase('done')} />}
        <div className="panel mission">
          <h2>大水過去了！</h2>
          <p>圳道沒有撐破，溪裡也留了水。</p>
          <div className="row">
            <button className="btn orange" onClick={() => setPhase('play')}>再玩一次</button>
            <button className="btn green" onClick={next}>下一步：豐收</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <FlowLevel
      p={p} set={set} level={FLOOD} levels={[FLOOD]} helper="mu"
      intro={FLOOD_INTRO}
      passLabel="大水過去了"
      goal="把水導到分水閘，但圳道只裝得下 4 份，別全部搶進來"
      onPass={(used) => {
        set((o) => ({ ...o, flood: true, cages: Math.max(0, o.cages - used) }));
        setPhase('pass');
      }}
      extra={
        <>
          <div className="rainfall" />
          {!p.note && phase === 'play' && (
            <button className="note-pin" onClick={() => { sfx('SE-03'); setNoteOpen(true); }} aria-label="竹蛇籠上夾著一張紙條">
              <span>📜</span>竹蛇籠上夾著紙條
            </button>
          )}
          {p.note && phase === 'play' && (
            <button className="note-pin small" onClick={() => setNoteOpen(true)} aria-label="再看一次紙條"><span>📜</span></button>
          )}
          {noteOpen && (
            <div className="talk-cover" onClick={takeNote}>
              <div className="note-paper">
                <img className="traveler" src={`${BASE}img/${NOTE.traveler}`} alt="" />
                <p>{NOTE.text}</p>
                <small>—— {NOTE.sign}</small>
                <img className="map-bit" src={`${BASE}img/${NOTE.map}`} alt="" />
                <span className="talk-next">點一下收好 ▶</span>
              </div>
            </div>
          )}
          {phase === 'noteTalk' && <Talk lines={NOTE_AFTER} onDone={() => setPhase('play')} />}
        </>
      }
    />
  );
}

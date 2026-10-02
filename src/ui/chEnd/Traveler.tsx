import { useMemo, useState } from 'react';
import { glanceChapter } from '../../core/saveEnd';
import { FRIENDS_END, NOTES_ALL, REVEAL_BEFORE, TOWER_TURN, TRAVELER_MEET, artE, endLines, revealLines } from '../../data/chEnd';
import { Talk } from '../Talk';
import { Goal } from '../Guide';
import type { StepEndProps } from '../ChEnd';
import { DecideEnd, FriendFace } from './StoryEnd';
import { jingle, sfx } from '../../audio';

const BASE = import.meta.env.BASE_URL;
type Phase = 'meet' | 'notes' | 'word' | 'before' | 'hat' | 'reveal' | 'key' | 'turn' | 'turnTalk' | 'friends';

// 這位時光朋友你真的見過嗎（那一章玩過、有交到朋友）
const met = (ch: string) => {
  if (ch === 'end') return true;
  const g = glanceChapter(ch);
  return !!g && (g.done || g.friends.length > 0);
};

// 步驟 5 旅人的真面目：旅人出現 → 一路的紙條 → 給旅人一句話 → 摘下斗笠（長大的你）→ 鑰匙插進鐘塔 → 鐘塔轉起來，時光朋友都來了
export function Traveler({ p, set, next, name }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('meet');
  const friends = useMemo(() => FRIENDS_END.map((f) => ({ f, met: met(f.ch) })), []);
  const unmasked = ['reveal', 'key', 'turn', 'turnTalk', 'friends'].includes(phase);
  const turning = ['turn', 'turnTalk', 'friends'].includes(phase);
  return (
    <div className={`scene end-tower ${turning ? 'turning' : ''}`}>
      <img className="scene-bg" src={artE('s-25')} alt="" />
      {turning && <div className="tower-glow" aria-hidden><img src={`${BASE}img/island/gear.webp`} alt="" /><img src={`${BASE}img/island/gear.webp`} alt="" /></div>}
      {phase !== 'friends' && (
        <div className={`traveler-stage ${unmasked ? 'unmasked' : ''}`}>
          <img className="traveler-body" src={`${BASE}img/story/${phase === 'before' || phase === 'hat' ? 'F-03_8' : 'F-03_7'}.webp`} alt="旅人" />
          {phase === 'hat' && <img className="traveler-hat" src={`${BASE}img/story/G-02_12.webp`} alt="" />}
          {unmasked && (
            <div className="future-tag">
              <b>長大的你</b>
              {name && <span>{name}</span>}
            </div>
          )}
        </div>
      )}
      {phase === 'meet' && <Talk lines={TRAVELER_MEET} onDone={() => setPhase('notes')} />}
      {phase === 'notes' && (
        <div className="talk-cover" onClick={() => { sfx('SE-09'); setPhase('word'); }}>
          <div className="panel end-notes">
            <h2>一路上的紙條</h2>
            <div className="end-note-row">
              {NOTES_ALL.map((n) => (
                <div key={n.text} className="end-note"><small>{n.era}</small><p>{n.text}</p></div>
              ))}
            </div>
            <p className="end-note-tip">每一張背面都有一小塊地圖。拼起來——正好是這座鐘塔。</p>
            <span className="talk-next">點一下繼續 ▶</span>
          </div>
        </div>
      )}
      {phase === 'word' && <DecideEnd id="word" set={set} onDone={() => setPhase('before')} />}
      {phase === 'before' && <Talk lines={REVEAL_BEFORE} onDone={() => { sfx('SE-31'); setPhase('hat'); setTimeout(() => { set((o) => ({ ...o, revealed: true })); setPhase('reveal'); }, 1800); }} />}
      {phase === 'reveal' && <Talk lines={revealLines(name)} onDone={() => setPhase('key')} />}
      {phase === 'key' && (
        <>
          <Goal floating text="把時光鐘塔鑰匙插進鐘塔的門" />
          <button className="tower-door" onClick={() => { sfx('SE-34'); jingle('MU-17'); setPhase('turn'); setTimeout(() => setPhase('turnTalk'), 2200); }} aria-label="鐘塔的門">
            <img src={artE('g-09-key')} alt="" />
            <span>點一下，插進去！</span>
          </button>
        </>
      )}
      {phase === 'turnTalk' && <Talk lines={TOWER_TURN} onDone={() => setPhase('friends')} />}
      {phase === 'friends' && (
        <>
          <div className="end-gather">
            <div className="end-gather-row">
              {friends.map(({ f, met: m }) => <FriendFace key={f.name} f={f} met={m} />)}
            </div>
            <div className="end-gather-front">
              <img className="end-gather-an" src={artE('f-10a-cheer')} alt="小安" />
              <img className="end-gather-future" src={`${BASE}img/story/F-03_7.webp`} alt="長大的你" />
              {p.picks.park === 1
                ? <div className="end-mural" aria-label="社區故事牆">{['fire', 'blank', 'ship', 'rice', 'canal', 'train', 'dam', 'hsr'].map((b) => <img key={b} src={`${BASE}img/island/badge-${b}.webp`} alt="" />)}</div>
                : <img className="end-tree" src={artE('o-11-park')} alt="一起種的樹" />}
              {p.picks.ride === 0 ? <img className="end-gather-agong" src={artE('p-21-grandpa')} alt="阿公" /> : <img className="end-gather-hsr" src={artE('o-11-hsr')} alt="高鐵" />}
            </div>
          </div>
          <Talk lines={endLines(p.picks)} onDone={next} />
        </>
      )}
    </div>
  );
}

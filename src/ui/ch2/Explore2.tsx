import { useState } from 'react';
import { EXPLORE2_INTRO, SPOTS, art2 } from '../../data/ch2';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { NewCards, type Step2Props } from '../Ch2';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'look' | 'cards';

// 步驟 1 認識山林：在 S-10 上點出部落、小米田、休耕地、獵場、溪流、太陡的坡；地形眼鏡看得出哪裡陡
export function Explore2({ p, set, next }: Step2Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [found, setFound] = useState<string[]>([]);
  const [say, setSay] = useState<Line | null>(null);
  const [glasses, setGlasses] = useState(false);
  const tap = (id: string) => {
    if (phase !== 'look') return;
    const s = SPOTS.find((x) => x.id === id)!;
    setSay(s.say);
    if (found.includes(id)) return;
    sfx('SE-05');
    const got = [...found, id];
    setFound(got);
    if (got.length === SPOTS.length) { jingle('MU-13'); setTimeout(() => setPhase('cards'), 1800); }
  };
  const cards = [...SPOTS.flatMap((s) => s.card ? [s.card] : []), 'mountains'];
  return (
    <div className="scene ch2-look">
      <div className={`art-frame look-frame ${glasses ? 'glasses' : ''}`}>
        <img className="art" src={art2('s-10')} alt="" />
        {SPOTS.map((s) => (
          <button key={s.id} className={`look-spot ${found.includes(s.id) ? 'got' : ''} ${glasses && s.id === 'cliff' ? 'steep' : ''}`}
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.r * 200}%` }} onClick={() => tap(s.id)} aria-label={s.name}>
            {found.includes(s.id) && <span>{s.name}</span>}
          </button>
        ))}
      </div>
      <div className="task-chip">點畫面找地方：{found.length} / {SPOTS.length}　<small>{SPOTS.filter((s) => !found.includes(s.id)).map((s) => s.name).join('、')}</small></div>
      {phase === 'look' && (
        <button className={`btn ${glasses ? 'green' : 'orange'} corner-btn`} onClick={() => { sfx('SE-03'); setGlasses(!glasses); }}>👓 {glasses ? '拿下' : '戴上'}地形眼鏡</button>
      )}
      {phase === 'intro' && <Talk lines={EXPLORE2_INTRO} onDone={() => setPhase('look')} />}
      {phase === 'cards' && <NewCards ids={cards} p={p} set={set} onDone={next} />}
      <Say line={phase === 'look' ? say : null} />
    </div>
  );
}

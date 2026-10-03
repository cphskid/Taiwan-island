import { useState } from 'react';
import { flow, heightOf, openings, rotate, type PipeLevel, type Tile } from '../../core/jianan';
import { CITIES, PIPE_DEMO, PIPE_SAY, PIPES, SHAO_STORY, SUN_INTRO, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards7, type Step7Props } from '../Ch7';
import { Decide7, EraJump7 } from './Story7';
import { jingle, sfx } from '../../audio';

type Phase = 'intro' | 'pipes' | 'story' | 'shao' | 'cards' | 'jump';

// 步驟 4 日月潭發電（1934）：轉水管把湖水接到最低的發電所；電燈亮了，邵族長者說湖邊的家被淹了（選擇）
export function SunMoon({ p, set, next, oops }: Step7Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  return (
    <div className="scene ch7-sun">
      <img className="scene-bg" src={art7('s-24')} alt="" />
      {phase === 'intro' && <Talk lines={SUN_INTRO} onDone={() => setPhase('pipes')} />}
      {phase === 'pipes' && <Pipes oops={oops} onDone={() => setPhase('story')} />}
      {phase === 'story' && <><img className="ch7-elder" src={art7('p-20-elder')} alt="邵族的長者" /><Talk lines={SHAO_STORY} onDone={() => setPhase('shao')} /></>}
      {phase === 'shao' && <Decide7 id="shao" set={set} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards7 ids={['sunmoon', 'shao']} p={p} set={set} onDone={() => setPhase('jump')} />}
      {phase === 'jump' && <EraJump7 from={3} to={9} onDone={next} />}
    </div>
  );
}

// 一格水管的樣子：從中間往有開口的方向畫粗線
function PipeArt({ tile, wet }: { tile: Tile; wet: boolean }) {
  const o = openings(tile);
  const ends = [[50, 0], [100, 50], [50, 100], [0, 50]];
  if (tile.k === 'rock') return <svg viewBox="0 0 100 100"><path d="M18 78 L30 40 L52 26 L74 36 L84 74 Z" fill="#8f8a7e" stroke="#5f5a50" strokeWidth="4" /></svg>;
  return (
    <svg viewBox="0 0 100 100">
      {ends.map(([x, y], d) => (o & (1 << d) ? <line key={d} x1="50" y1="50" x2={x} y2={y} className={`pipe ${wet ? 'wet' : ''}`} /> : null))}
      {tile.k === 'pipe' && <circle cx="50" cy="50" r="13" className={`pipe-joint ${wet ? 'wet' : ''}`} />}
      {tile.k === 'lake' && <><circle cx="44" cy="50" r="36" fill="#3d9be0" stroke="#1f6aa8" strokeWidth="5" /><text x="44" y="60" textAnchor="middle" fontSize="26" fill="#fff" fontWeight="900">湖</text></>}
      {tile.k === 'plant' && <><rect x="18" y="30" width="64" height="50" rx="6" fill={wet ? '#ffd45c' : '#b9a27e'} stroke="#6b3f1f" strokeWidth="5" /><path d="M18 30 L50 12 L82 30 Z" fill="#a0522d" stroke="#6b3f1f" strokeWidth="5" /><text x="50" y="66" textAnchor="middle" fontSize="24" fontWeight="900" fill="#3a2412">⚡</text></>}
    </svg>
  );
}

function Pipes({ oops, onDone }: { oops: () => void; onDone: () => void }) {
  const [lv, setLv] = useState<PipeLevel>(PIPES);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [lit, setLit] = useState<number | null>(null); // 試放水之後亮了幾座城市
  const [won, setWon] = useState(false);
  const f = flow(lv);
  // 示範的方向（開口一樣就算對：直管轉兩次跟原本一樣）
  const want = (i: number) => {
    const t = lv.tiles[i];
    if (t.k !== 'pipe' || PIPE_DEMO[i] === undefined) return true;
    return openings(t) === openings({ ...t, rot: PIPE_DEMO[i] });
  };

  const spin = (i: number) => {
    if (won || lv.tiles[i].k !== 'pipe') return;
    sfx('SE-07');
    setLv(rotate(lv, i));
    setLit(null);
  };
  const release = () => {
    const power = Math.min(CITIES.length, Math.floor(f.power));
    setLit(power);
    if (f.ok) {
      setWon(true);
      jingle('MU-13');
      setSay(PIPE_SAY.good);
      setTimeout(onDone, 2600);
      return;
    }
    sfx('SE-71'); oops();
    const n = fails + 1;
    setFails(n);
    setSay(n >= 2 ? PIPE_SAY.hint : !f.plants.length ? (f.uphill ? PIPE_SAY.uphill : PIPE_SAY.none) : f.leaks.length ? PIPE_SAY.leak : PIPE_SAY.weak);
  };

  return (
    <div className="ch7-pipe-wrap">
      <Goal floating text={`轉水管，把日月潭的水接到發電所，要點亮 ${CITIES.length} 座城市。水只會往一樣高或更低的地方流，不能漏水`} />
      <div className="ch7-pipe-board panel">
        <div className="ch7-pipes" style={{ gridTemplateColumns: `auto repeat(${lv.cols}, auto)` }}>
          {Array.from({ length: lv.rows }, (_, r) => (
            <div key={r} className="ch7-prow" style={{ display: 'contents' }}>
              <span className="ch7-height">{['山頂', '高', '低', '山下'][r] ?? ''}<small>高度 {heightOf(lv, r)}</small></span>
              {Array.from({ length: lv.cols }, (_, c) => {
                const i = r * lv.cols + c;
                const t = lv.tiles[i];
                return (
                  <button key={i} className={`ch7-tile ${t.k} ${f.wet[i] ? 'wet' : ''} ${f.leaks.includes(i) && lit !== null ? 'leak' : ''} ${fails >= 3 && !want(i) ? 'ch7-hint' : ''}`}
                    onClick={() => spin(i)} disabled={t.k !== 'pipe'} aria-label={t.k === 'plant' ? t.name : t.k}>
                    <PipeArt tile={t} wet={f.wet[i]} />
                    {t.k === 'plant' && <small>{t.name}</small>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="ch7-power">
          <b>城市</b>
          {CITIES.map((c, k) => (
            <span key={c} className={`ch7-city ${lit !== null && k < lit ? 'on' : ''}`}><img src={art7('g-08-bulb')} alt="" />{c}</span>
          ))}
          <small>電＝落差×水量<br />漏水：水剩一半<br />分給兩座：各一半</small>
          <button className="btn green" disabled={won} onClick={release}>開閘放水</button>
        </div>
      </div>
      {fails >= 5 && !won && <button className="btn demo corner-btn" onClick={() => {
        setLv({ ...PIPES, tiles: PIPES.tiles.map((t, i) => (t.k === 'pipe' && PIPE_DEMO[i] !== undefined ? { ...t, rot: PIPE_DEMO[i] } : t)) });
        setLit(null);
      }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

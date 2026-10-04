import { useState } from 'react';
import { flow, heightOf, openings, rotate, type PipeLevel, type Tile } from '../../core/jianan';
import { CITIES, PIPE_DEMO, PIPE_SAY, PIPES, SHAO_STORY, SUN_INTRO, art7 } from '../../data/ch7';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { jitter } from '../Terrain';
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

// 擋路的格子（原本一格一顆石頭）：換成山坡上的大石頭、松樹、竹子、草叢，每格不一樣
const BLOCKS = ['o-14-boulders', 'o-14-pines', 'o-14-mossrock', 'o-14-bamboo', 'o-14-bush', 'o-14-ledge'];

// 一段水管的樣子：從中間往有開口的方向畫鐵水管（陰影、管身、亮面、接環），有水時管裡的水會流
function PipeArt({ tile, wet, i }: { tile: Tile; wet: boolean; i: number }) {
  const o = openings(tile);
  const ends = [[50, -4], [104, 50], [50, 104], [-4, 50]];
  if (tile.k === 'rock') return <img className={`ch7-sprite block ${BLOCKS[Math.floor(jitter(i, 7, 3) * BLOCKS.length)].slice(5)}`} src={art7(BLOCKS[Math.floor(jitter(i, 7, 3) * BLOCKS.length)])} alt="" />;
  if (tile.k === 'lake') return <><PipeLines o={o} ends={ends} wet /><img className="ch7-sprite lake" src={art7('o-13-lake')} alt="" /><b className="ch7-lake-tag">日月潭</b></>;
  if (tile.k === 'plant') return <><PipeLines o={o} ends={ends} wet={wet} /><img className={`ch7-sprite plant ${wet ? 'on' : ''}`} src={art7('o-13-station')} alt="" /></>;
  return <PipeLines o={o} ends={ends} wet={wet} joint />;
}
function PipeLines({ o, ends, wet, joint }: { o: number; ends: number[][]; wet: boolean; joint?: boolean }) {
  const segs = ends.map(([x, y], d) => (o & (1 << d) ? [x, y] : null));
  return (
    <svg viewBox="0 0 100 100" className="ch7-pipe-svg" overflow="visible">
      <g className="pipe-shadow">{segs.map((e, d) => e && <line key={d} x1="50" y1="50" x2={e[0]} y2={e[1]} />)}</g>
      {(['pipe-o', 'pipe', 'pipe-hl'] as const).map((k) => segs.map((e, d) => e && <line key={k + d} x1="50" y1="50" x2={e[0]} y2={e[1]} className={`${k} ${wet ? 'wet' : ''}`} />))}
      {wet && segs.map((e, d) => e && <line key={`f${d}`} x1={d < 2 ? 50 : e[0]} y1={d < 2 ? 50 : e[1]} x2={d < 2 ? e[0] : 50} y2={d < 2 ? e[1] : 50} className="pipe-flow" />)}
      {segs.map((e, d) => e && <line key={`r${d}`} x1={d % 2 ? 76 : 36} y1={d % 2 ? 36 : 76} x2={d % 2 ? 76 : 64} y2={d % 2 ? 64 : 76} className="pipe-ring" transform={d === 0 ? 'translate(0 -52)' : d === 3 ? 'translate(-52 0)' : undefined} />)}
      {joint && <><circle cx="50" cy="50" r="18" className={`pipe-joint ${wet ? 'wet' : ''}`} /><circle cx="50" cy="50" r="7" className="pipe-bolt" /><circle cx="45" cy="44" r="4" fill="#fff" opacity=".55" /></>}
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
      sfx('SE-120'); jingle('MU-13');
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
        {/* 一整片畫好的山坡（山頂松林→草坡→茶園→山下溪谷），水管擺在上面；高度用左邊的木牌標，不畫格子 */}
        <div className="ch7-slope-row">
          <div className="ch7-heights">
            {Array.from({ length: lv.rows }, (_, r) => (
              <span key={r} className="ch7-height">
                <b>{['山頂', '高', '低', '山下'][r] ?? ''}</b><small>高度 {heightOf(lv, r)}</small>
              </span>
            ))}
          </div>
          <div className="ch7-slope" style={{ aspectRatio: `${lv.cols} / ${lv.rows}` }}>
            <img className="ch7-slope-bg" src={art7('s-sunmoon')} alt="" />
            <div className="ch7-pipes" style={{ gridTemplateColumns: `repeat(${lv.cols}, 1fr)`, gridTemplateRows: `repeat(${lv.rows}, 1fr)` }}>
              {lv.tiles.map((t, i) => (
                <button key={i} className={`ch7-tile ${t.k} ${f.wet[i] ? 'wet' : ''} ${f.leaks.includes(i) && lit !== null ? 'leak' : ''} ${fails >= 3 && !want(i) ? 'ch7-hint' : ''}`}
                  onClick={() => spin(i)} disabled={t.k !== 'pipe'} aria-label={t.k === 'plant' ? t.name : t.k}>
                  <PipeArt tile={t} wet={f.wet[i]} i={i} />
                  {t.k === 'plant' && <small>{t.name}</small>}
                </button>
              ))}
            </div>
          </div>
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

import { useState } from 'react';
import { railBegin, railCh, railDone, railGoal, railH, railSolve, railStep, railUsed, type Pt, type RailStep } from '../../core/railway';
import { RAIL_DONE, RAIL_INTRO, RAIL_RULE, RAIL_SAY, RAILS, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Beacon, Goal } from '../Guide';
import { Terrain, jitter } from '../Terrain';
import { NewCards6, type Step6Props } from '../Ch6';
import { Decide6, Jump6 } from './Story6';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'tunnel' | 'lay' | 'done' | 'cards';

// 步驟 3 鋪鐵路：從基隆鋪到臺北。高度差最多 1、過河要搭橋、太陡的山挖隧道；鐵軌、橋、隧道數量有限
export function Rail6({ p, set, next, oops }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  return (
    <div className="scene ch6-rail">
      <img className="scene-bg" src={art6('s-20')} alt="" />
      {phase === 'jump' && <Jump6 from={1} to={2} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={RAIL_INTRO} onDone={() => setPhase('tunnel')} />}
      {phase === 'tunnel' && <Decide6 id="tunnel" set={set} onDone={() => setPhase('lay')} />}
      {phase === 'lay' && <Track way={p.picks.tunnel === 1 ? 1 : 0} oops={oops} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={RAIL_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards6 ids={['c6-liu', 'c6-tunnel']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
const H_NAME = ['', '平地', '小丘', '山坡', '高山'];

function Track({ way, onDone, oops }: { way: 0 | 1; onDone: () => void; oops: () => void }) {
  const lv = RAILS[way];
  const [path, setPath] = useState<RailStep[]>(() => railBegin(lv));
  const [fails, setFails] = useState(0);
  const [bad, setBad] = useState<Pt | null>(null);
  const [train, setTrain] = useState<number | null>(null);
  const [say, setSay] = useState<Line | null>(null);
  const sol = fails >= 3 ? railSolve(lv) : null;
  const W = lv.map[0].length, H = lv.map.length;
  const used = railUsed(path);
  const done = railDone(lv, path);
  const last = path[path.length - 1];

  const fail = (line: Line) => {
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setSay(f >= 3 ? RAIL_SAY.hint : line);
  };
  const tap = (c: Pt) => {
    if (done) return;
    setBad(null);
    const k = path.findIndex((s) => same(s.at, c));
    if (k >= 0) { if (k < path.length - 1) { sfx('SE-02'); setPath(path.slice(0, k + 1)); } return; }
    if (Math.abs(c.x - last.at.x) + Math.abs(c.y - last.at.y) !== 1) { sfx('SE-04'); setSay({ who: 'chun', mood: 'thinking', text: '鐵軌要從最後一格，一格接一格鋪下去喔。' }); return; }
    const s = railStep(lv, path, c);
    if (typeof s === 'string') {
      setBad(c);
      if (s === 'steep' || (s === 'tunnels' && !lv.tunnels)) { sfx('SE-04'); setSay(RAIL_SAY.steep); return; } // 太陡只是提醒，不算失誤
      fail(RAIL_SAY[s === 'far' || s === 'used' || s === 'edge' ? 'steep' : s]);
      return;
    }
    sfx(s.kind === 'land' ? 'SE-114' : 'SE-36');
    const np = [...path, s];
    setPath(np);
    if (railDone(lv, np)) {
      sfx('SE-113'); jingle('MU-13'); setSay(RAIL_SAY.good);
      let i = 0; setTrain(0);
      const run = () => { i += 1; if (i >= np.length) { setTimeout(onDone, 700); return; } setTrain(i); setTimeout(run, 220); };
      setTimeout(run, 400);
      return;
    }
    // 剩下的鐵軌不夠走到臺北：死路
    const g = railGoal(lv), left = lv.rails - railUsed(np).rails;
    if (Math.abs(s.at.x - g.x) + Math.abs(s.at.y - g.y) > left) fail(RAIL_SAY.rails);
  };
  const pos = train === null ? null : path[Math.min(train, path.length - 1)].at;
  return (
    <div className="ch6-rail-wrap">
      <Goal floating text={`把鐵路從基隆鋪到臺北。${RAIL_RULE}`} />
      <div className="ch6-rail-board panel">
        <div className="ch6-rail-bar">
          <span className={used.rails >= lv.rails ? 'out' : ''}><img src={art6('g-07-track')} alt="" />鐵軌 {lv.rails - used.rails} / {lv.rails}</span>
          <span className={used.bridges >= lv.bridges ? 'out' : ''}><img src={art6('g-07-bridge')} alt="" />橋 {lv.bridges - used.bridges}</span>
          <span className={lv.tunnels && used.tunnels >= lv.tunnels ? 'out' : ''}><img src={art6('g-07-tunnel')} alt="" />隧道 {lv.tunnels - used.tunnels}</span>
          <small>{way === 0 ? '挖隧道穿過獅球嶺' : '沿著山邊繞過去'}</small>
        </div>
        <div className="ch6-rail-grid" style={{ gridTemplateColumns: `repeat(${W}, 1fr)`, aspectRatio: `${W} / ${H}`, '--ar': W / H } as React.CSSProperties}>
          <div className="rl-land">
            <img className="rl-bg" src={art6('s-22')} alt="" />
            <Terrain cols={W} rows={H} layers={[
              { test: (x, y) => railH(lv, { x, y }) >= 2, img: art6('t-hill'), tile: 4, soft: 0.3, wobble: 0.2, className: 'rl-lay' },
              { test: (x, y) => railH(lv, { x, y }) >= 3, img: art6('t-slope'), tile: 3.5, soft: 0.28, wobble: 0.2, className: 'rl-lay' },
              { test: (x, y) => railH(lv, { x, y }) >= 4, img: art6('t-rock'), tile: 3.5, soft: 0.26, wobble: 0.2, className: 'rl-lay' },
              { test: (x, y) => railCh(lv, { x, y }) === '~', fill: '#ecd9a0', grow: 0.1, soft: 0.28, wobble: 0.22 },
              { test: (x, y) => railCh(lv, { x, y }) === '~', img: art6('t-river'), tile: 4, soft: 0.28, wobble: 0.22 },
            ]} />
            {lv.map.flatMap((row, y) => [...row].map((ch, x) => {
              const h = railH(lv, { x, y });
              const img = h === 4 && jitter(x, y, 1) < 0.22 ? 'o-13-mountain' : h === 3 && jitter(x, y, 2) < 0.2 ? 'o-13-hill' : h === 2 && jitter(x, y, 3) < 0.3 ? 'o-11-tree' : h === 1 && ch !== 'K' && ch !== 'P' && jitter(x, y, 4) < 0.25 ? 'o-11-teabush' : null;
              return img && <img key={`d${x},${y}`} className={`rl-deco ${img}`} src={art6(img)} alt=""
                style={{ left: `${((x + 0.55 + (jitter(x, y, 5) - 0.5) * 0.2) / W) * 100}%`, top: `${((y + 0.7) / H) * 100}%`, width: `${(0.62 / W) * 100}%` }} />;
            }))}
            <svg className="rl-track" viewBox={`0 0 ${W * 100} ${H * 100}`} preserveAspectRatio="none">
              {path.length > 1 && <polyline points={path.map((s) => `${s.at.x * 100 + 50},${s.at.y * 100 + 50}`).join(' ')} fill="none" stroke="#6b4a2a" strokeWidth="22" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 9" />}
              {path.length > 1 && <polyline points={path.map((s) => `${s.at.x * 100 + 50},${s.at.y * 100 + 50}`).join(' ')} fill="none" stroke="#8e939c" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" />}
              {path.length > 1 && <polyline points={path.map((s) => `${s.at.x * 100 + 50},${s.at.y * 100 + 50}`).join(' ')} fill="none" stroke="#c9ccd2" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />}
            </svg>
          </div>
          {lv.map.flatMap((row, y) => [...row].map((ch, x) => {
            const c = { x, y };
            const k = path.findIndex((s) => same(s.at, c));
            const st = k >= 0 ? path[k] : null;
            const h = railH(lv, c);
            const near = !done && k < 0 && Math.abs(x - last.at.x) + Math.abs(y - last.at.y) === 1;
            const hint = sol?.some((s) => same(s.at, c)) && k < 0;
            const label = ch === 'K' ? '基隆' : ch === 'P' ? '臺北' : ch === '~' ? '河' : H_NAME[h];
            return (
              <button key={`${x},${y}`} className={`rl rl-${ch === '~' ? 'river' : ch === 'K' || ch === 'P' ? 'stn' : `h${h}`} ${st ? `on ${st.kind}` : ''} ${near ? 'near' : ''} ${hint ? 'hint' : ''} ${bad && same(bad, c) ? 'bad' : ''}`}
                onClick={() => tap(c)} aria-label={label}>
                {(near || (k === path.length - 1 && !done)) && ch !== '~' && ch !== 'K' && ch !== 'P' && <i className="rl-h">{H_NAME[h]}<b>{h}</b></i>}
                {near && ch === '~' && <i className="rl-h river">河</i>}
                {(ch === 'K' || ch === 'P') && <><img className="rl-stn-img" src={art6('o-09-station')} alt="" /><b className="rl-tag">{label}</b></>}
                {st?.kind === 'tunnel' && <img className="rl-icon" src={art6('g-07-tunnel')} alt="" />}
                {st?.kind === 'bridge' && <img className="rl-icon" src={art6('g-07-bridge')} alt="" />}
              </button>
            );
          }))}
          {!done && (() => { const g = railGoal(lv); return <Beacon style={{ left: `${((g.x + 0.5) / W) * 100}%`, top: `${((g.y + 0.5) / H) * 100}%` }} label="臺北：鋪到這裡" spot />; })()}
          {pos && <img className="ch6-loco" src={art6('o-09-loco')} alt="" style={{ left: `${((pos.x + 0.5) / W) * 100}%`, top: `${((pos.y + 0.5) / H) * 100}%` }} />}
        </div>
        <div className="ch6-rail-foot">
          <span className="ch6-legend rl-legend">
            {([['s-22', '1 平地'], ['t-hill', '2 小丘'], ['t-slope', '3 山坡'], ['t-rock', '4 高山'], ['t-river', '河']] as const).map(([img, t]) => (
              <span key={img}><i style={{ backgroundImage: `url(${art6(img)})` }} />{t}</span>
            ))}
            <em>點已經鋪好的地方可以退回去</em>
          </span>
          <button className="btn orange" disabled={done || path.length < 2} onClick={() => { sfx('SE-02'); setPath(railBegin(lv)); setBad(null); }}>重鋪</button>
        </div>
      </div>
      {fails >= 5 && !done && <button className="btn demo corner-btn" onClick={() => { setPath(railSolve(lv)!.slice(0, -1)); setBad(null); setSay(RAIL_SAY.hint); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

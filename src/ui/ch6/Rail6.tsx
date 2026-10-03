import { useState } from 'react';
import { railBegin, railCh, railDone, railGoal, railH, railSolve, railStep, railUsed, type Pt, type RailStep } from '../../core/railway';
import { RAIL_DONE, RAIL_INTRO, RAIL_RULE, RAIL_SAY, RAILS, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
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
        <div className="ch6-rail-grid" style={{ gridTemplateColumns: `repeat(${W}, 1fr)`, aspectRatio: `${W} / ${H}` }}>
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
                {ch !== '~' && ch !== 'K' && ch !== 'P' && <i className="rl-h">{h}</i>}
                {(ch === 'K' || ch === 'P') && <b className="rl-tag">{label}</b>}
                {st?.kind === 'tunnel' && <img className="rl-icon" src={art6('g-07-tunnel')} alt="" />}
                {st?.kind === 'bridge' && <img className="rl-icon" src={art6('g-07-bridge')} alt="" />}
                {st && st.kind === 'land' && k > 0 && railCh(lv, c) !== 'P' && <img className="rl-icon track" src={art6('g-07-track')} alt="" />}
              </button>
            );
          }))}
          {pos && <img className="ch6-loco" src={art6('o-09-loco')} alt="" style={{ left: `${((pos.x + 0.5) / W) * 100}%`, top: `${((pos.y + 0.5) / H) * 100}%` }} />}
        </div>
        <div className="ch6-rail-foot">
          <span className="ch6-legend"><i className="lg-h1" />1 平地 <i className="lg-h2" />2 小丘 <i className="lg-h3" />3 山坡 <i className="lg-h4" />4 高山 <i className="lg-rv" />河　點已經鋪好的格子可以退回去</span>
          <button className="btn orange" disabled={done || path.length < 2} onClick={() => { sfx('SE-02'); setPath(railBegin(lv)); setBad(null); }}>重鋪</button>
        </div>
      </div>
      {fails >= 5 && !done && <button className="btn demo corner-btn" onClick={() => { setPath(railSolve(lv)!.slice(0, -1)); setBad(null); setSay(RAIL_SAY.hint); }}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

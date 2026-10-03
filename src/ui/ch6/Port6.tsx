import { useState } from 'react';
import { BOATS, depthAt, rcell, rch, riverSolve, riverStart, sail, type Boat, type Pt, type Tide } from '../../core/railway';
import { BOAT_IMG, BOAT_NAME, PORT_DONE, PORT_INTRO, PORT_SAY, RIVERS, art6 } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCards6, type Step6Props } from '../Ch6';
import { Jump6 } from './Story6';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'stage-intro' | 'sail' | 'done' | 'cards';

// 步驟 1 開港通商：三關河運路線。畫出船走的路，配合船的吃水、河道寬窄和潮水
export function Port6({ p, set, next, oops }: Step6Props) {
  const [phase, setPhase] = useState<Phase>('jump');
  const [stage, setStage] = useState(0);
  return (
    <div className="scene ch6-port">
      <img className="scene-bg" src={art6('s-21')} alt="" />
      {phase === 'jump' && <Jump6 from={1} to={0} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={PORT_INTRO} onDone={() => setPhase('stage-intro')} />}
      {phase === 'stage-intro' && <Talk lines={RIVERS[stage].intro} onDone={() => setPhase('sail')} />}
      {phase === 'sail' && <River key={stage} stage={stage} oops={oops} onDone={() => {
        if (stage + 1 < RIVERS.length) { setStage(stage + 1); setPhase('stage-intro'); } else setPhase('done');
      }} />}
      {phase === 'done' && <Talk lines={PORT_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCards6 ids={['c6-openport', 'c6-tamsui', 'c6-hong']} p={p} set={set} onDone={next} />}
    </div>
  );
}

const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
const CELL_NAME: Record<string, string> = { w: '寬河道', n: '窄河道', r: '石頭灘', s: '沙洲', h: '泥灘', m: '艋舺', A: '', T: '大稻埕', B: '' };

function River({ stage, onDone, oops }: { stage: number; onDone: () => void; oops: () => void }) {
  const st = RIVERS[stage];
  const lv = st.level;
  const start = riverStart(lv);
  const [path, setPath] = useState<Pt[]>([start]);
  const [tide, setTide] = useState<Tide>('low');
  const [boat, setBoat] = useState<Boat['id']>(lv.boat);
  const [boatAt, setBoatAt] = useState<number | null>(null); // 開船動畫：船在路線第幾格
  const [stuck, setStuck] = useState<number | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const going = boatAt !== null && stuck === null;
  const sol = fails >= 3 ? riverSolve(lv) : null;
  const H = lv.map.length, W = lv.map[0].length;
  const last = path[path.length - 1];

  const tap = (c: Pt) => {
    if (going) return;
    setStuck(null); setBoatAt(null);
    const k = path.findIndex((q) => same(q, c));
    // 點路線上的格子：點最後一格退一步，點前面的格子就從那裡重畫
    if (k >= 0) { if (path.length > 1) { sfx('SE-02'); setPath(path.slice(0, Math.max(1, k === path.length - 1 ? k : k + 1))); } return; }
    if (Math.abs(c.x - last.x) + Math.abs(c.y - last.y) !== 1) { sfx('SE-04'); setSay({ who: 'chun', mood: 'thinking', text: '要從路線的最後一格，一格一格接下去喔。' }); return; }
    if (rcell(lv, c).land) { sfx('SE-04'); setSay({ who: 'chun', mood: 'thinking', text: '那裡是陸地，船不能開上去！' }); return; }
    sfx('SE-07');
    setPath([...path, c]);
  };
  const go = () => {
    const v = sail(lv, path, tide, boat);
    sfx('SE-101');
    setStuck(null);
    const stopAt = v.ok ? path.length - 1 : v.why === 'short' ? path.length - 1 : v.at;
    let k = 0;
    setBoatAt(0);
    const tick = () => {
      if (k >= stopAt) {
        if (v.ok) { jingle('MU-13'); setSay(PORT_SAY.good); setTimeout(onDone, 1600); return; }
        sfx('SE-71'); oops();
        const f = fails + 1;
        setFails(f);
        setStuck(stopAt);
        const silt = v.at === 0 && boat === 'junk';
        const tidal = (lv.map.join('').includes('s') || lv.map.join('').includes('h')) && tide === 'low';
        setSay(silt ? PORT_SAY.silt : v.why === 'short' ? PORT_SAY.short : f >= 2 && tidal ? PORT_SAY.tide : v.why === 'narrow' ? PORT_SAY.narrow : PORT_SAY.shallow);
        return;
      }
      k += 1;
      setBoatAt(k);
      setTimeout(tick, 380);
    };
    setTimeout(tick, 380);
  };
  const demo = () => { const s = riverSolve(lv)!; setTide(s.tide); setBoat(s.boat); setPath(s.path); setStuck(null); setBoatAt(null); };
  const shown = boatAt === null ? null : path[Math.min(boatAt, path.length - 1)];
  // 第三關到了大稻埕就換成大帆船
  const tIdx = path.findIndex((q) => rch(lv, q) === 'T');
  const boatNow: Boat['id'] = boatAt !== null && tIdx >= 0 && boatAt >= tIdx ? 'junk' : boat;
  const b = BOATS[boat];
  return (
    <div className="ch6-port-wrap">
      <Goal floating text={`第 ${stage + 1} / ${RIVERS.length} 關：${st.goal}。從出發的碼頭一格一格點，畫出船走的路。`} />
      <div className="ch6-port-board panel">
        <div className="ch6-port-bar">
          <div className="ch6-seg">
            <span>潮水</span>
            <button className={tide === 'low' ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setTide('low'); setStuck(null); }}>🌊 退潮</button>
            <button className={tide === 'high' ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setTide('high'); setStuck(null); }}>🌊🌊 漲潮</button>
          </div>
          {lv.pick ? (
            <div className="ch6-seg">
              <span>出發的船</span>
              {(['sampan', 'junk'] as const).map((id) => (
                <button key={id} className={boat === id ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setBoat(id); setStuck(null); }}>
                  <img src={BOAT_IMG[id]} alt="" />{BOAT_NAME[id]}
                </button>
              ))}
            </div>
          ) : (
            <div className="ch6-boat-info"><img src={BOAT_IMG[boat]} alt="" /><b>{BOAT_NAME[boat]}</b></div>
          )}
          <small className="ch6-boat-rule">{BOAT_NAME[boat]}：水深要 {b.draft} 以上{b.narrow ? '，窄河道也能走' : '，進不了窄河道'}</small>
        </div>
        <div className="ch6-river" style={{ gridTemplateColumns: `repeat(${W}, 1fr)`, aspectRatio: `${W} / ${H}` }}>
          {lv.map.flatMap((row, y) => [...row].map((ch, x) => {
            const c = { x, y };
            const cell = rcell(lv, c);
            const k = path.findIndex((q) => same(q, c));
            const d = depthAt(lv, c, tide);
            const hint = sol?.path.some((q) => same(q, c));
            return (
              <button key={`${x},${y}`} className={`rv rv-${ch === '.' ? 'land' : ch} ${cell.wide ? 'wide' : 'narrow'} ${k >= 0 ? 'on' : ''} ${hint ? 'hint' : ''} ${stuck !== null && k === stuck ? 'bad' : ''}`}
                onClick={() => tap(c)} aria-label={CELL_NAME[ch] ?? '陸地'}>
                {!cell.land && <i className="rv-depth">{d}</i>}
                {ch === 'A' && <b className="rv-tag">{st.from}</b>}
                {ch === 'm' && <b className="rv-tag">{st.from}</b>}
                {ch === 'T' && <b className="rv-tag">大稻埕</b>}
                {ch === 'B' && <b className="rv-tag">{st.to}</b>}
                {k > 0 && <em className="rv-dot">{k}</em>}
              </button>
            );
          }))}
          {shown && (
            <img className={`ch6-boat ${boatNow}`} src={BOAT_IMG[boatNow]} alt=""
              style={{ left: `${((shown.x + 0.5) / W) * 100}%`, top: `${((shown.y + 0.5) / H) * 100}%` }} />
          )}
        </div>
        <div className="ch6-port-foot">
          <span className="ch6-legend"><i className="lg-w" />寬河道 <i className="lg-n" />窄河道 <i className="lg-r" />石頭灘 <i className="lg-s" />沙洲／泥灘（漲潮會變深）　數字＝水深</span>
          <button className="btn orange" disabled={going || path.length < 2} onClick={() => { sfx('SE-02'); setPath([start]); setStuck(null); setBoatAt(null); }}>重畫</button>
          <button className="btn green" disabled={going || path.length < 2} onClick={go}>開船！</button>
        </div>
      </div>
      {fails >= 5 && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

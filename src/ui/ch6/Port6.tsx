import { useMemo, useState } from 'react';
import { BOATS, depthAt, rcell, rch, riverSolve, riverStart, sail, type Boat, type Pt, type Tide } from '../../core/railway';
import { BOAT_IMG, BOAT_NAME, PORT_DONE, PORT_INTRO, PORT_SAY, RIVERS, art6, type RiverStage } from '../../data/ch6';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Beacon, Goal } from '../Guide';
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
  const [going, setGoing] = useState(false); // 船正在開：這時候不能改路線、潮水、船
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const sol = fails >= 3 ? riverSolve(lv) : null;
  const H = lv.map.length, W = lv.map[0].length;
  const last = path[path.length - 1];
  const dest = (() => { for (let y = 0; y < H; y++) { const x = lv.map[y].indexOf('B'); if (x >= 0) return { x, y }; } return null; })();
  const reached = !!dest && same(last, dest);
  // 下一步可以點的格子（接在路線最後一格旁邊、不是陸地）
  const nextOk = (c: Pt) => !reached && !going && Math.abs(c.x - last.x) + Math.abs(c.y - last.y) === 1 && !rcell(lv, c).land && !path.some((q) => same(q, c));

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
    setGoing(true);
    const stopAt = v.ok ? path.length - 1 : v.why === 'short' ? path.length - 1 : v.at;
    let k = 0;
    setBoatAt(0);
    const tick = () => {
      if (k >= stopAt) {
        if (!v.ok) setGoing(false);
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
  // 船頭朝向：往左開就翻過來
  const prevAt = boatAt !== null && boatAt > 0 ? path[Math.min(boatAt - 1, path.length - 1)] : null;
  const boatLeft = !!(shown && prevAt && shown.x < prevAt.x);
  return (
    <div className="ch6-port-wrap">
      <Goal floating text={reached ? '路線接到了！按「開船！」' : `第 ${stage + 1} / ${RIVERS.length} 關：把路線一格一格接到${st.to}。${st.goal}。從出發的碼頭開始點，發亮的格子是下一步可以走的。`} />
      <div className="ch6-port-board panel">
        <div className="ch6-port-bar">
          <div className="ch6-seg">
            <span>潮水</span>
            <button className={tide === 'low' ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setTide('low'); setStuck(null); setBoatAt(null); }}>🌊 退潮</button>
            <button className={tide === 'high' ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setTide('high'); setStuck(null); setBoatAt(null); }}>🌊🌊 漲潮</button>
          </div>
          {lv.pick ? (
            <div className="ch6-seg">
              <span>出發的船</span>
              {(['sampan', 'junk'] as const).map((id) => (
                <button key={id} className={boat === id ? 'on' : ''} disabled={going} onClick={() => { sfx('SE-01'); setBoat(id); setStuck(null); setBoatAt(null); }}>
                  <img src={BOAT_IMG[id]} alt="" />{BOAT_NAME[id]}
                </button>
              ))}
            </div>
          ) : (
            <div className="ch6-boat-info"><img src={BOAT_IMG[boat]} alt="" /><b>{BOAT_NAME[boat]}</b></div>
          )}
          <small className="ch6-boat-rule">{BOAT_NAME[boat]}：水深要 {b.draft} 以上{b.narrow ? '，窄河道也能走' : '，進不了窄河道'}</small>
        </div>
        <RiverMap lv={lv} st={st} tide={tide} path={path} sol={sol?.path ?? null} stuck={stuck} nextOk={nextOk} tap={tap}
          dest={dest && !going ? dest : null} boat={shown ? { at: shown, id: boatNow, left: boatLeft } : null} />
        <div className="ch6-port-foot">
          <span className="ch6-legend">
            <i className="lg-d1" /><i className="lg-d2" /><i className="lg-d3" />水越深顏色越深（數字＝水深）
            <img src={art6('o-11-rocks')} alt="" />石頭灘
            <img src={art6('o-11-sandbar')} alt="" />沙洲
            <img src={art6('o-11-mud')} alt="" />泥灘（漲潮會變深）
          </span>
          <button className="btn orange" disabled={going || path.length < 2} onClick={() => { sfx('SE-02'); setPath([start]); setStuck(null); setBoatAt(null); }}>重畫</button>
          <button className={`btn green ${reached && !going ? 'ready' : ''}`} disabled={going || path.length < 2} onClick={go}>開船！</button>
        </div>
      </div>
      {fails >= 5 && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

// ── 河運地圖：底下還是一格一格算，畫面畫成彎彎的河 ──
// 每格中心稍微錯開一點，河道在轉彎處用曲線接起來；顏色照「現在的水深」畫，所以漲潮時沙洲、泥灘會變藍。
const U = 100; // 一格在 SVG 裡的寬度
const hash = (x: number, y: number, k: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
const seedOf = (map: string[]) => [...map.join('')].reduce((a, ch, i) => a + ch.charCodeAt(0) * (i + 1), 0) % 97;
const DEPTH_COL = ['#a9def6', '#6fbcec', '#3a90d6', '#2366b0'];
const DOCK: Record<string, string> = { '山上的茶園': 'o-10-pier', '大稻埕': 'o-10-dadaocheng', '淡水港': 'o-10-tamsui', '艋舺': 'o-10-bangka' };
const DECOR = ['o-11-tree', 'o-11-teabush', 'o-11-bamboo', 'o-11-house', 'o-11-tree', 'o-11-teabush'];

function RiverMap({ lv, st, tide, path, sol, stuck, nextOk, tap, dest, boat }: {
  lv: RiverStage['level']; st: RiverStage; tide: Tide; path: Pt[]; sol: Pt[] | null; stuck: number | null;
  nextOk: (c: Pt) => boolean; tap: (c: Pt) => void; dest: Pt | null; boat: { at: Pt; id: Boat['id']; left: boolean } | null;
}) {
  const H = lv.map.length, W = lv.map[0].length;
  const sd = seedOf(lv.map); // 每一關的樹、房子擺法不一樣
  const water = (c: Pt) => c.x >= 0 && c.y >= 0 && c.x < W && c.y < H && !rcell(lv, c).land;
  const dock = (ch: string) => ch === 'A' || ch === 'm' || ch === 'T' || ch === 'B';
  // 每格的畫面位置（碼頭不錯開，河道錯開一點點）
  const pos = useMemo(() => {
    const f = (c: Pt) => {
      const j = dock(rch(lv, c)) ? 0 : 0.17;
      return { x: (c.x + 0.5 + (hash(c.x, c.y, 1) - 0.5) * 2 * j) * U, y: (c.y + 0.5 + (hash(c.x, c.y, 2) - 0.5) * 2 * j) * U };
    };
    return f;
  }, [lv]);
  const pct = (c: Pt) => { const q = pos(c); return { left: `${(q.x / (W * U)) * 100}%`, top: `${(q.y / (H * U)) * 100}%` }; };
  const cells: Pt[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push({ x, y });
  const wet = cells.filter(water);
  const width = (c: Pt) => (rcell(lv, c).wide ? 0.62 : 0.34) * U;
  // 一格的河段：連到旁邊每一格的中點；剛好兩個方向就用曲線轉彎
  const seg = (c: Pt) => {
    const p = pos(c);
    const nb = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }].map((d) => ({ x: c.x + d.x, y: c.y + d.y })).filter(water);
    const mid = (n: Pt) => { const q = pos(n); return `${(p.x + q.x) / 2} ${(p.y + q.y) / 2}`; };
    if (nb.length === 2) return `M${mid(nb[0])} Q${p.x} ${p.y} ${mid(nb[1])}`;
    if (nb.length === 0) return `M${p.x} ${p.y} l0.1 0`;
    return nb.map((n) => `M${p.x} ${p.y} L${mid(n)}`).join(' ');
  };
  const route = (() => {
    if (path.length < 2) return '';
    const P = path.map(pos);
    let d = `M${P[0].x} ${P[0].y}`;
    for (let i = 1; i < P.length - 1; i++) d += ` L${(P[i - 1].x + P[i].x) / 2} ${(P[i - 1].y + P[i].y) / 2} Q${P[i].x} ${P[i].y} ${(P[i].x + P[i + 1].x) / 2} ${(P[i].y + P[i + 1].y) / 2}`;
    const e = P[P.length - 1];
    return d + ` L${e.x} ${e.y}`;
  })();
  // 陸地上的樹、茶園、房子：照格子位置固定挑，不會每次重畫都換
  const decor = cells.filter((c) => !water(c) && hash(c.x, c.y, 3 + sd) < 0.62).map((c) => {
    const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => water({ x: c.x + dx, y: c.y + dy }));
    const img = nearWater && hash(c.x, c.y, 4 + sd) < 0.35 ? 'o-11-reeds' : DECOR[Math.floor(hash(c.x, c.y, 5 + sd) * DECOR.length)];
    return { c, img, dx: (hash(c.x, c.y, 6 + sd) - 0.5) * 0.3, dy: (hash(c.x, c.y, 7 + sd) - 0.5) * 0.25, s: 0.55 + hash(c.x, c.y, 8 + sd) * 0.25 };
  });
  const same2 = (a: Pt, b2: Pt) => a.x === b2.x && a.y === b2.y;
  const tagOf = (ch: string) => ch === 'A' || ch === 'm' ? st.from : ch === 'T' ? '大稻埕' : ch === 'B' ? st.to : '';
  return (
    <div className={`ch6-river tide-${tide}`} style={{ aspectRatio: `${W} / ${H}`, ['--ar' as string]: W / H }}>
      <img className="rv-ground" src={art6('s-22')} alt="" />
      <svg className="rv-svg" viewBox={`0 0 ${W * U} ${H * U}`} preserveAspectRatio="none">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {wet.map((c) => <path key={`b${c.x},${c.y}`} d={seg(c)} stroke="#e8d49a" strokeWidth={width(c) + 22} />)}
          {wet.map((c) => <path key={`g${c.x},${c.y}`} d={seg(c)} stroke="#b9dca0" strokeWidth={width(c) + 8} opacity=".7" />)}
          {wet.map((c) => <path key={`w${c.x},${c.y}`} d={seg(c)} stroke={DEPTH_COL[Math.min(3, depthAt(lv, c, tide))]} strokeWidth={width(c)} />)}
          {wet.map((c) => <path key={`s${c.x},${c.y}`} d={seg(c)} stroke="#fff" strokeWidth={width(c) * 0.28} opacity=".18" />)}
        </g>
        {wet.filter((c) => hash(c.x, c.y, 9 + sd) < 0.5).map((c) => { const p = pos(c); return (
          <path key={`r${c.x},${c.y}`} className="rv-ripple" d={`M${p.x - 12} ${p.y + 8} q6 -6 12 0 q6 6 12 0`} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
        ); })}
      </svg>
      {decor.map(({ c, img, dx, dy, s }) => (
        <img key={`d${c.x},${c.y}`} className="rv-decor" src={art6(img)} alt=""
          style={{ left: `${((c.x + 0.5 + dx) / W) * 100}%`, top: `${((c.y + 0.62 + dy) / H) * 100}%`, width: `${(s / W) * 100}%` }} />
      ))}
      {wet.map((c) => {
        const ch = rch(lv, c);
        const pic = ch === 'r' ? 'o-11-rocks' : ch === 's' ? 'o-11-sandbar' : ch === 'h' ? 'o-11-mud' : null;
        return pic && <img key={`o${c.x},${c.y}`} className={`rv-obj rv-obj-${ch}`} src={art6(pic)} alt="" style={{ ...pct(c), width: `${((ch === 's' ? 0.7 : 0.5) / W) * 100}%` }} />;
      })}
      {wet.filter((c) => dock(rch(lv, c))).map((c) => (
        <img key={`k${c.x},${c.y}`} className="rv-dock" src={art6(DOCK[tagOf(rch(lv, c))] ?? 'o-10-dadaocheng')} alt=""
          style={{ ...pct(c), width: `${(1.15 / W) * 100}%` }} />
      ))}
      <svg className="rv-svg rv-route" viewBox={`0 0 ${W * U} ${H * U}`} preserveAspectRatio="none">
        {route && <path d={route} fill="none" stroke="#7a4a1a" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />}
        {route && <path d={route} fill="none" stroke="#ffd34d" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 16" className="rv-route-line" />}
      </svg>
      {wet.map((c) => {
        const k = path.findIndex((q) => same2(q, c));
        const hint = sol?.some((q) => same2(q, c));
        const ch = rch(lv, c);
        return (
          <span key={`m${c.x},${c.y}`} className={`rv-mark ${k >= 0 ? 'on' : ''} ${hint && k < 0 ? 'hint' : ''} ${stuck !== null && k === stuck ? 'bad' : ''} ${nextOk(c) ? 'next' : ''}`} style={pct(c)}>
            {!dock(ch) && k <= 0 && <i className="rv-depth">{depthAt(lv, c, tide)}</i>}
            {k > 0 && <em className="rv-dot">{k}</em>}
          </span>
        );
      })}
      {wet.filter((c) => dock(rch(lv, c))).map((c) => <b key={`t${c.x},${c.y}`} className="rv-tag" style={pct(c)}>{tagOf(rch(lv, c))}</b>)}
      <div className="rv-hit" style={{ gridTemplateColumns: `repeat(${W}, 1fr)`, gridTemplateRows: `repeat(${H}, 1fr)` }}>
        {cells.map((c) => <button key={`${c.x},${c.y}`} onClick={() => tap(c)} aria-label={CELL_NAME[rch(lv, c)] || (water(c) ? tagOf(rch(lv, c)) : '陸地')} />)}
      </div>
      {dest && <Beacon style={pct(dest)} label={`${st.to}：船開到這裡`} spot />}
      {boat && <img className={`ch6-boat ${boat.id} ${boat.left ? 'left' : ''}`} src={BOAT_IMG[boat.id]} alt="" style={pct(boat.at)} />}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { SEASONS, sail, shortest, type Leg, type Outcome, type Pos, type Season } from '../core/drift';
import {
  DRIFTS, FACTS, FIND_INTRO, FIND_WRONG, LANDS, LAND_TASKS, OUTCOME_TEXT, PROLOGUE_END, RAINY, SEASON_INFO, SITES, TOWER, TOWER_OOPS,
  TROPIC_Y, VILLAGE_ASK, landAt, type DriftLevel, type Fact,
} from '../data/prologue';
import { MAP, isl } from '../data/world';
import type { Line } from '../data/babao-chapter';
import { Say, Talk } from './Talk';
import { ambience, jingle, music, sfx } from '../audio';
import { SoundToggle } from './Sound';

type Phase = 'tower' | 'oops' | 'warp' | 'find' | 'drift' | 'land' | 'village' | 'end';
const STEP_MS = 380;
const HINT_AT = 3; // 失敗幾次羅盤上亮出建議
const DEMO_AT = 5;
const CELL = 10;

// 序章《認識臺灣》：時光鐘塔 → 找到臺灣 → 海上漂流三關 → 上岸認識地形氣候 → 選地蓋村 → 大地圖
export function Prologue({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('tower');
  const [fact, setFact] = useState<{ fact: Fact; then: () => void } | null>(null);
  const showFact = (f: Fact, then: () => void) => { sfx('SE-36'); setFact({ fact: f, then }); };
  useEffect(() => { music(null); return () => ambience(null); }, []);
  useEffect(() => { ambience(phase === 'find' || phase === 'drift' ? 'SE-62' : phase === 'land' || phase === 'village' ? 'SE-61' : null); }, [phase]);

  return (
    <div className="prologue">
      <nav className="steps">
        {(['鐘塔', '找到臺灣', '海上漂流', '認識臺灣', '蓋基地'] as const).map((name, i) => {
          const at = ['tower', 'find', 'drift', 'land', 'village'].indexOf(phase === 'oops' || phase === 'warp' ? 'tower' : phase === 'end' ? 'village' : phase);
          return <span key={name} className={`step ${i === at ? 'on' : ''} ${i <= at ? 'open' : ''}`}><i>{i}</i>{name}</span>;
        })}
        <SoundToggle className="back-map" />
        <button className="back-map" onClick={onDone}>跳過序章</button>
      </nav>
      <div className="stage">
        {(phase === 'tower' || phase === 'oops' || phase === 'warp') && <Tower phase={phase} setPhase={setPhase} />}
        {phase === 'find' && <Find onFound={() => showFact(FACTS.where, () => setPhase('drift'))} />}
        {phase === 'drift' && <Drift onDone={() => showFact(FACTS.wind, () => setPhase('land'))} />}
        {phase === 'land' && <Land showFact={showFact} onDone={() => setPhase('village')} />}
        {(phase === 'village' || phase === 'end') && <Village done={phase === 'end'} onChosen={() => showFact(FACTS.village, () => setPhase('end'))} onEnd={onDone} />}
      </div>
      {fact && (
        <div className="talk-cover" onClick={() => { const t = fact.then; setFact(null); t(); }}>
          <div className="card-pop">
            <small>知識小卡</small>
            <h3>{fact.fact.title}</h3>
            <p>{fact.fact.text}</p>
            <p className="source">資料來源：{fact.fact.source}</p>
            <span className="talk-next">點一下繼續 ▶</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 時光鐘塔：滴答叫你別按紅色按鈕 ──
const GEAR_FLY = Array.from({ length: 7 }, (_, i) => {
  const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
  return { dx: Math.cos(a) * 70, dy: Math.sin(a) * 60, r: 360 + i * 90 };
});

function Tower({ phase, setPhase }: { phase: Phase; setPhase: (p: Phase) => void }) {
  const [talk, setTalk] = useState(true);
  const press = () => {
    if (phase !== 'tower' || talk) return;
    sfx('SE-71');
    setPhase('oops');
  };
  useEffect(() => {
    if (phase !== 'warp') return;
    sfx('SE-31');
    const t = setTimeout(() => setPhase('find'), 1300);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`scene tower ${phase}`}>
      <div className="tower-clock">
        <img src={isl('clock')} alt="" />
        {phase !== 'tower' && GEAR_FLY.map((g, i) => (
          <img key={i} className="tower-gear" src={isl('gear')} alt="" style={{ '--dx': `${g.dx}vw`, '--dy': `${g.dy}vh`, '--r': `${g.r}deg`, animationDelay: `${i * 60}ms` } as React.CSSProperties} />
        ))}
      </div>
      {phase === 'tower' && (
        <button className="red-button" onClick={press} aria-label="紅色按鈕"><span /></button>
      )}
      {phase === 'tower' && talk && <Talk lines={TOWER} onDone={() => setTalk(false)} />}
      {phase === 'oops' && <Talk lines={TOWER_OOPS} onDone={() => setPhase('warp')} />}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

// ── 海圖（找到臺灣、漂流共用）──
function SeaChart({ lv, boat, wind, onLand, glow, trail }: {
  lv: DriftLevel; boat: Pos | null; wind: Season | null; onLand?: (p: Pos) => void; glow?: boolean; trail?: Pos[];
}) {
  const W = lv.cols * CELL, H = lv.rows * CELL;
  const labels = useMemo(() => {
    const sum: Record<string, { x: number; y: number; n: number }> = {};
    lv.map.forEach((r, row) => [...r].forEach((ch, col) => {
      if (!(ch in LANDS)) return;
      const s = (sum[ch] ??= { x: 0, y: 0, n: 0 });
      s.x += col; s.y += row; s.n += 1;
    }));
    return Object.entries(sum).map(([k, s]) => ({ k: k as keyof typeof LANDS, x: (s.x / s.n + 0.5) * CELL, y: (s.y / s.n + 0.5) * CELL }));
  }, [lv]);
  const cells: Pos[] = [];
  for (let row = 0; row < lv.rows; row++) for (let col = 0; col < lv.cols; col++) cells.push({ col, row });
  const v = wind ? { winter: [-1, 1], summer: [1, -1], calm: [0, 0] }[wind] : null;
  return (
    <svg className={`sea-chart ${onLand ? 'pick' : ''}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ccbe8" /><stop offset="1" stopColor="#4aa3d1" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sea)" />
      {cells.map((p) => {
        const ch = lv.map[p.row][p.col];
        const k = landAt(lv, p);
        const x = p.col * CELL, y = p.row * CELL;
        if (k) return <rect key={`${p.col},${p.row}`} className={`land ${k} ${glow && k === 'T' ? 'glow' : ''}`} x={x - 0.4} y={y - 0.4} width={CELL + 0.8} height={CELL + 0.8} rx={2.5} fill={LANDS[k].color} onClick={() => onLand?.(p)} />;
        if (ch === 'k') return <g key={`${p.col},${p.row}`} className="kuroshio"><rect x={x} y={y} width={CELL} height={CELL} fill="#1f5fa8" opacity={0.55} /><text x={x + 5} y={y + 7.5} textAnchor="middle">↑</text></g>;
        if (ch === 'x') return <text key={`${p.col},${p.row}`} x={x + 5} y={y + 7.5} textAnchor="middle" className="reef">🪨</text>;
        if (ch === 'H') return <g key={`${p.col},${p.row}`} className="harbor"><circle cx={x + 5} cy={y + 5} r={4.2} /><text x={x + 5} y={y + 7.4} textAnchor="middle">⚓</text></g>;
        return null;
      })}
      {labels.map((l) => <text key={l.k} className="land-name" x={l.x} y={l.y} textAnchor="middle">{onLand && l.k !== 'P' ? '？' : LANDS[l.k].name}</text>)}
      {v && (v[0] || v[1]) ? (
        <g className={`wind ${wind}`}>
          {[[20, 20], [60, 30], [30, 70], [80, 80], [50, 100], [90, 50]].map(([x, y], i) => (
            <text key={i} x={x} y={y} textAnchor="middle" transform={`rotate(${Math.atan2(v[1], v[0]) * 180 / Math.PI} ${x} ${y})`}>➜</text>
          ))}
        </g>
      ) : null}
      {trail && trail.length > 1 && <polyline className="trail" points={trail.map((p) => `${p.col * CELL + 5},${p.row * CELL + 5}`).join(' ')} />}
      {boat && <text className="boat" x={0} y={0} style={{ transform: `translate(${boat.col * CELL + 5}px, ${boat.row * CELL + 7.5}px)` }} textAnchor="middle">⛵</text>}
    </svg>
  );
}

// ── 找到臺灣 ──
function Find({ onFound }: { onFound: () => void }) {
  const lv = DRIFTS[0];
  const [intro, setIntro] = useState(true);
  const [say, setSay] = useState<Line | null>(null);
  const [wrong, setWrong] = useState(0);
  return (
    <div className="scene sea-scene">
      <SeaChart lv={lv} boat={null} wind={null} glow={wrong >= 3} onLand={(p) => {
        const k = landAt(lv, p);
        if (!k) return;
        if (k === 'T') { sfx('SE-05'); jingle('MU-13'); onFound(); return; }
        sfx('SE-04');
        setWrong((n) => n + 1);
        setSay({ who: 'tick', mood: 'thinking', text: FIND_WRONG(LANDS[k].name) });
      }} />
      <Say line={say} />
      {intro && <Talk lines={FIND_INTRO} onDone={() => setIntro(false)} />}
    </div>
  );
}

// ── 海上漂流三關 ──
function Drift({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const lv = DRIFTS[idx];
  return <DriftLevelView key={lv.id} lv={lv} onPass={() => (idx + 1 < DRIFTS.length ? setIdx(idx + 1) : onDone())} />;
}

function DriftLevelView({ lv, onPass }: { lv: DriftLevel; onPass: () => void }) {
  const [intro, setIntro] = useState(true);
  const [season, setSeason] = useState<Season | null>(null);
  const [boat, setBoat] = useState<Pos>(lv.start);
  const [trail, setTrail] = useState<Pos[]>([lv.start]);
  const [legs, setLegs] = useState(0);
  const [anim, setAnim] = useState<{ leg: Leg; i: number } | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const [fails, setFails] = useState(0);
  const demo = useRef<Season[] | null>(null);

  const reset = () => { setBoat(lv.start); setTrail([lv.start]); setLegs(0); setResult(null); setAnim(null); };
  const go = (s: Season | null = season) => {
    if (!s || anim || result) return;
    sfx('SE-54');
    const leg = sail(lv, boat, s);
    setLegs((n) => n + 1);
    setAnim({ leg, i: 0 });
  };

  useEffect(() => {
    if (!anim) return;
    const id = window.setTimeout(() => {
      const { leg, i } = anim;
      if (i < leg.path.length) {
        setBoat(leg.path[i]);
        setTrail((t) => [...t, leg.path[i]]);
        setAnim({ leg, i: i + 1 });
        return;
      }
      setAnim(null);
      let o: Outcome = leg.outcome;
      if (o === 'sailing' && legs >= lv.legs) o = 'hungry';
      if (o === 'sailing') {
        const plan = demo.current;
        if (plan && plan.length) { const s = plan.shift()!; setSeason(s); setLegs((n) => n + 1); setAnim({ leg: sail(lv, leg.end, s), i: 0 }); }
        return;
      }
      setResult(o);
      if (o === 'arrived') { sfx('SE-56'); jingle('MU-13'); demo.current = null; }
      else { sfx(o === 'wreck' || o === 'aground' ? 'SE-71' : 'SE-57'); setFails((n) => n + 1); demo.current = null; }
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [anim]); // eslint-disable-line react-hooks/exhaustive-deps

  // 失敗 3 次：從現在的位置算出下一步該轉哪一季，羅盤上亮起來
  const suggest = useMemo(() => {
    if (fails < HINT_AT || result) return null;
    const plan = shortest({ ...lv, start: boat, legs: lv.legs - legs });
    return plan?.[0] ?? null;
  }, [fails, boat, legs, result, lv]);

  const startDemo = () => {
    reset();
    const plan = shortest(lv);
    if (!plan) return;
    demo.current = plan.slice(1);
    setSeason(plan[0]);
    window.setTimeout(() => { setAnim({ leg: sail(lv, lv.start, plan[0]), i: 0 }); setLegs(1); }, 300);
  };

  const say: Line | null = result ? null
    : fails >= DEMO_AT ? { who: 'tick', mood: 'thinking', text: '我示範一次給你看：按「看示範」。' }
    : fails >= HINT_AT ? { who: 'tick', mood: 'thinking', text: '羅盤上發亮的那一季，試試看？' }
    : fails >= 1 ? { who: 'tick', mood: 'thinking', text: lv.hint }
    : null;
  const busy = anim !== null;

  return (
    <div className="scene sea-scene">
      <div className="levels">
        {DRIFTS.map((d) => <span key={d.id} className={`lv ${d.id === lv.id ? 'on' : d.id < lv.id ? 'past' : ''}`}>{d.id}</span>)}
        <span className="hint plain"><b>{lv.title}</b></span>
      </div>
      <SeaChart lv={lv} boat={boat} wind={season} trail={trail} />
      <div className="food">🍙 糧食 <b>{lv.legs - legs}</b></div>
      <div className="compass panel">
        <b>天氣羅盤</b>
        <div className="compass-dial">
          {SEASONS.map((s) => (
            <button key={s} className={`season-btn ${s} ${season === s ? 'on' : ''} ${suggest === s ? 'suggest' : ''}`} disabled={busy || !!result} onClick={() => { sfx('SE-01'); setSeason(s); }}>
              <span>{SEASON_INFO[s].icon}</span>{SEASON_INFO[s].name}<small>{SEASON_INFO[s].wind}</small>
            </button>
          ))}
        </div>
        <div className="row">
          <button className="btn green" disabled={!season || busy || !!result} onClick={() => go()}>出航</button>
          <button className="btn orange" disabled={busy} onClick={reset}>重來</button>
          {fails >= DEMO_AT && <button className="btn demo" disabled={busy} onClick={startDemo}>看示範</button>}
        </div>
      </div>
      {!result && <Say line={say} />}
      {result && (
        <div className={`result ${result === 'arrived' ? 'ok' : ''}`}>
          <p>{OUTCOME_TEXT[result]}</p>
          {result === 'arrived'
            ? <button className="btn green" onClick={onPass}>{lv.id < DRIFTS.length ? '下一關' : '上岸！'}</button>
            : <button className="btn orange" onClick={reset}>再試一次</button>}
        </div>
      )}
      {intro && <Talk lines={lv.intro} onDone={() => setIntro(false)} />}
    </div>
  );
}

// 讀地形眼鏡圖上某一點是哪一層高度（0 平地～5 最高），不在島上回傳 -1
const BAND_COLORS = [[124, 196, 106], [180, 212, 107], [228, 215, 125], [233, 184, 102], [207, 139, 79], [168, 101, 60]];
function useRelief() {
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g?.drawImage(im, 0, 0);
      ctx.current = g;
    };
    im.src = MAP.relief;
  }, []);
  return (fx: number, fy: number): number => {
    const g = ctx.current;
    if (!g) return -1;
    const [r, gr, b, a] = g.getImageData(Math.floor(fx * g.canvas.width), Math.floor(fy * g.canvas.height), 1, 1).data;
    if (a < 40) return -1;
    let best = 0, bd = Infinity;
    BAND_COLORS.forEach(([R, G, B], i) => { const d = (R - r) ** 2 + (G - gr) ** 2 + (B - b) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  };
}

// 島的地圖（上岸、選地共用）：寬高比照 M-01，點的位置換算成 0～1
function IslandMap({ glasses, tropic, rain, onTap, children }: {
  glasses: boolean; tropic: boolean; rain: boolean; onTap?: (fx: number, fy: number) => void; children?: React.ReactNode;
}) {
  return (
    <div className="island-wrap">
      <div className="island-map" style={{ aspectRatio: `${MAP.width} / ${MAP.height}` }} onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onTap?.((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      }}>
        <img src={MAP.src} alt="" />
        {glasses && <img className="relief" src={MAP.relief} alt="" />}
        {tropic && <div className="tropic" style={{ top: `${TROPIC_Y * 100}%` }}><span>北回歸線</span></div>}
        {tropic && <div className="zone hot" style={{ top: `${TROPIC_Y * 100}%` }}>熱帶</div>}
        {tropic && <div className="zone sub" style={{ bottom: `${(1 - TROPIC_Y) * 100}%` }}>亞熱帶</div>}
        {rain && <div className="monsoon"><span>➜</span><span>➜</span><span>➜</span></div>}
        {children}
      </div>
    </div>
  );
}

function Land({ showFact, onDone }: { showFact: (f: Fact, then: () => void) => void; onDone: () => void }) {
  const [task, setTask] = useState(0);
  const [asking, setAsking] = useState(true);
  const [glasses, setGlasses] = useState(false);
  const [say, setSay] = useState<Line | null>(null);
  const [clouds, setClouds] = useState(false);
  const band = useRelief();
  const t = LAND_TASKS[task];
  const pass = (f: Fact) => {
    sfx('SE-05');
    setSay(null);
    showFact(f, () => { if (task + 1 < LAND_TASKS.length) { setTask(task + 1); setAsking(true); } else onDone(); });
  };
  const wrong = () => { sfx('SE-04'); setSay({ who: 'tick', mood: 'thinking', text: t.wrong }); };
  const tap = (fx: number, fy: number) => {
    if (asking || !t) return;
    const b = band(fx, fy);
    if (b < 0) return;
    if (t.id === 'mountain') { if (!glasses) { setSay({ who: 'tick', mood: 'thinking', text: '先戴上地形眼鏡！' }); return; } return b >= 5 ? pass(FACTS.mountain) : wrong(); }
    if (t.id === 'tropic') return fy > TROPIC_Y ? pass(FACTS.tropic) : wrong();
    if (fx >= RAINY.minX && fy <= RAINY.maxY) { setClouds(true); return pass(FACTS.rain); }
    wrong();
  };
  return (
    <div className="scene land-scene">
      <IslandMap glasses={glasses} tropic={task === 1} rain={task === 2} onTap={tap}>
        {clouds && <div className="rain-cloud" style={{ left: '78%', top: '10%' }}>🌧️</div>}
      </IslandMap>
      <div className="tools">
        <button className={`tool ${glasses ? 'on' : ''}`} onClick={() => { sfx('SE-38'); setGlasses(!glasses); }}>
          <img className="tool-img" src={isl('h-eye')} alt="" />地形眼鏡
        </button>
      </div>
      {task === 2 && <div className="season-tag">❄️ 冬天：東北季風</div>}
      {glasses && (
        <div className="legend world-legend">
          <span>公尺</span>
          {['0', '100', '500', '1000', '2000', '3000'].map((l, i) => <span key={l} className="lg"><i className={`band b${i}`} />{l}</span>)}
        </div>
      )}
      <Say line={say} />
      {asking && t && <Talk lines={[t.ask]} onDone={() => setAsking(false)} />}
    </div>
  );
}

function Village({ done, onChosen, onEnd }: { done: boolean; onChosen: () => void; onEnd: () => void }) {
  const [asking, setAsking] = useState(true);
  const [say, setSay] = useState<Line | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [built, setBuilt] = useState(done);
  return (
    <div className="scene land-scene">
      <IslandMap glasses={false} tropic={false} rain={false}>
        {SITES.map((s) => (
          <button key={s.id} className={`site ${tried.includes(s.id) && !s.ok ? 'no' : ''} ${built && s.ok ? 'built' : ''}`}
            style={{ left: `${s.at.x * 100}%`, top: `${s.at.y * 100}%` }}
            onClick={(e) => {
              e.stopPropagation();
              if (asking || built) return;
              setTried((t) => [...t, s.id]);
              setSay({ who: 'tick', mood: s.ok ? 'happy' : 'worried', text: s.says });
              if (s.ok) { sfx('SE-60'); jingle('MU-13'); setBuilt(true); window.setTimeout(onChosen, 900); }
              else sfx('SE-04');
            }}>
            <span>{built && s.ok ? '🏘️' : '📍'}</span>{s.name}
          </button>
        ))}
      </IslandMap>
      {!done && <Say line={say} />}
      {asking && <Talk lines={[VILLAGE_ASK]} onDone={() => setAsking(false)} />}
      {done && <Talk lines={PROLOGUE_END} onDone={onEnd} />}
    </div>
  );
}

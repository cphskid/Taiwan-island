import { chapterDone, Egg } from './Medal';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SEASONS, sail, shortest, type Leg, type Outcome, type Pos, type Season } from '../core/drift';
import {
  DRIFTS, FACTS, FIND_INTRO, FIND_WRONG, LANDS, LAND_TASKS, OUTCOME_TEXT, PROLOGUE_END, RAINY, SEASON_INFO, SITES, TOWER, TOWER_OOPS,
  TROPIC_Y, VILLAGE_ASK, type DriftLevel, type Fact,
} from '../data/prologue';
import { MAP, isl } from '../data/world';
import type { Line } from '../data/babao-chapter';
import { Say, Talk } from './Talk';
import { ambience, jingle, music, sfx } from '../audio';
import { SoundToggle } from './Sound';
import { Beacon, Goal, compass } from './Guide';

type Phase = 'tower' | 'oops' | 'warp' | 'find' | 'drift' | 'land' | 'village' | 'end';
const STEP_MS = 380;
const HINT_AT = 3; // 失敗幾次羅盤上亮出建議
const DEMO_AT = 5;

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
        {(phase === 'village' || phase === 'end') && <Village done={phase === 'end'} onChosen={() => showFact(FACTS.village, () => setPhase('end'))} onEnd={() => { chapterDone('pro', { done: 1 }); onDone(); }} />}
        {phase === 'land' && <Egg ch="pro" x="86%" y="22%" />}
      </div>
      {fact && (
        <div className="talk-cover" onClick={() => { const t = fact.then; setFact(null); t(); }}>
          <div className="card-pop">
            <small>知識小卡</small>
            <h3>{fact.fact.title}</h3>
            <p>{fact.fact.text}</p>
            <span className="talk-next">點一下繼續 ▶</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 時光鐘塔：滴答叫你別按紅色按鈕（K-01 鐘塔內部，按下去換 K-02 齒輪噴飛）──
const STORY = `${import.meta.env.BASE_URL}img/story/`;
const BUTTON = { x: 0.505, y: 0.685 }; // K-01 圖上紅色按鈕的位置

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
      <div className="art-frame">
        <img className="art" src={`${STORY}K-01.webp`} alt="" />
        <img className={`art fly ${phase === 'tower' ? '' : 'on'}`} src={`${STORY}K-02.webp`} alt="" />
        {phase === 'tower' && !talk && (
          <button className="red-button" style={{ left: `${BUTTON.x * 100}%`, top: `${BUTTON.y * 100}%` }} onClick={press} aria-label="紅色按鈕" />
        )}
      </div>
      {phase === 'tower' && talk && <Talk lines={TOWER} onDone={() => setTalk(false)} />}
      {phase === 'oops' && <Talk lines={TOWER_OOPS} onDone={() => setPhase('warp')} />}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

// K-03 序章海圖上各塊陸地可以點的範圍（圖的比例座標，橢圓）
const CHART_SPOTS: { k: keyof typeof LANDS; x: number; y: number; rx: number; ry: number }[] = [
  { k: 'C', x: 0.15, y: 0.22, rx: 0.17, ry: 0.28 },
  { k: 'C', x: 0.31, y: 0.07, rx: 0.1, ry: 0.09 },
  { k: 'T', x: 0.505, y: 0.49, rx: 0.1, ry: 0.25 },
  { k: 'J', x: 0.83, y: 0.2, rx: 0.14, ry: 0.15 },
  { k: 'U', x: 0.52, y: 0.93, rx: 0.08, ry: 0.1 },
];


// ── 漂流海圖：K-03 當底，格子照比例疊上去（船、港口、航跡、風、黑潮方向）──
// 地名標在固定位置（K-03 圖上的比例座標）
const CHART_NAMES: { k: keyof typeof LANDS; x: number; y: number }[] = [
  { k: 'C', x: 0.14, y: 0.2 }, { k: 'T', x: 0.505, y: 0.46 }, { k: 'J', x: 0.84, y: 0.14 }, { k: 'U', x: 0.52, y: 0.95 },
];
const WIND_SPOTS = [[0.12, 0.62], [0.3, 0.4], [0.32, 0.82], [0.68, 0.55], [0.75, 0.85], [0.62, 0.15], [0.88, 0.45]];

function SeaChart({ lv, boat, wind, trail, spot }: { lv: DriftLevel; boat: Pos; wind: Season | null; trail: Pos[]; spot: boolean }) {
  const at = (p: Pos) => ({ left: `${((p.col + 0.5) / lv.cols) * 100}%`, top: `${((p.row + 0.5) / lv.rows) * 100}%` });
  const flows: { p: Pos; ne: boolean }[] = [];
  let harbor: Pos | null = null;
  lv.map.forEach((r, row) => [...r].forEach((ch, col) => {
    if (ch === 'H') harbor = { col, row };
    if ((ch === 'k' || ch === 'n') && (col + row) % 2 === 0) flows.push({ p: { col, row }, ne: ch === 'n' });
  }));
  const v = wind ? { winter: 135, summer: -45, calm: null }[wind] : null;
  return (
    <div className="art-frame chart">
      <img className="art" src={`${STORY}K-03.webp`} alt="" />
      {flows.map(({ p, ne }, i) => <span key={i} className="flow" style={{ ...at(p), rotate: ne ? '-45deg' : '-90deg' }}>➜</span>)}
      {CHART_NAMES.map((n) => <span key={n.k} className="chart-name" style={{ left: `${n.x * 100}%`, top: `${n.y * 100}%` }}>{LANDS[n.k].name}</span>)}
      {v !== null && v !== undefined && WIND_SPOTS.map(([x, y], i) => (
        <span key={`${wind}${i}`} className={`gust ${wind}`} style={{ left: `${x * 100}%`, top: `${y * 100}%`, rotate: `${v}deg`, animationDelay: `${i * 0.2}s` }}>➜</span>
      ))}
      <svg className="chart-trail" viewBox={`0 0 ${lv.cols} ${lv.rows}`} preserveAspectRatio="none">
        {trail.length > 1 && <polyline points={trail.map((p) => `${p.col + 0.5},${p.row + 0.5}`).join(' ')} vectorEffect="non-scaling-stroke" />}
      </svg>
      {harbor && <span className="chart-harbor" style={at(harbor)}>⚓</span>}
      {harbor && <Beacon style={at(harbor)} label="港口：船停這裡" spot={spot} />}
      <span className="chart-boat" style={at(boat)}>⛵</span>
    </div>
  );
}

// ── 找到臺灣（K-03 海圖）──
function Find({ onFound }: { onFound: () => void }) {
  const [intro, setIntro] = useState(true);
  const [say, setSay] = useState<Line | null>(null);
  const [wrong, setWrong] = useState(0);
  const tap = (k: keyof typeof LANDS) => {
    if (k === 'T') { sfx('SE-05'); jingle('MU-13'); onFound(); return; }
    sfx('SE-04');
    setWrong((n) => n + 1);
    setSay({ who: 'tick', mood: 'thinking', text: FIND_WRONG(LANDS[k].name) });
  };
  return (
    <div className="scene sea-scene">
      <div className="art-frame">
        <img className="art" src={`${STORY}K-03.webp`} alt="" />
        {CHART_SPOTS.map((p, i) => (
          <button key={i} className={`chart-spot ${wrong >= 3 && p.k === 'T' ? 'glow' : ''}`} aria-label="這是哪裡？"
            style={{ left: `${(p.x - p.rx) * 100}%`, top: `${(p.y - p.ry) * 100}%`, width: `${p.rx * 200}%`, height: `${p.ry * 200}%` }}
            onClick={() => tap(p.k)}><span>？</span></button>
        ))}
      </div>
      {!intro && <Goal floating text="在海圖上點一下臺灣" />}
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
  const harbor = useMemo(() => { let h: Pos = lv.start; lv.map.forEach((r, row) => { const col = r.indexOf('H'); if (col >= 0) h = { col, row }; }); return h; }, [lv]);
  const away = compass(harbor.col - boat.col, harbor.row - boat.row);

  return (
    <div className="scene sea-scene">
      <div className="levels">
        {DRIFTS.map((d) => <span key={d.id} className={`lv ${d.id === lv.id ? 'on' : d.id < lv.id ? 'past' : ''}`}>{d.id}</span>)}
        <span className="hint plain"><b>{lv.title}</b></span>
        <Goal text={`轉天氣羅盤、按出航，把 ⛵ 漂到 ⚓ 港口`} />
      </div>
      <SeaChart lv={lv} boat={boat} wind={season} trail={trail} spot={!intro} />
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
          {result !== 'arrived' && <p className="tip">滴答：⚓ 港口在船的{away}，哪一季的風（或海流）會往那邊走？</p>}
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
        <img className={glasses ? "base dim" : "base"} src={MAP.src} alt="" />
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
      {t && !asking && <Goal floating text={t.goal} />}
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
      {!done && !asking && !built && <Goal floating text="點一個 📍，選最適合蓋基地的地方" />}
      {!done && <Say line={say} />}
      {asking && <Talk lines={[VILLAGE_ASK]} onDone={() => setAsking(false)} />}
      {done && <Talk lines={PROLOGUE_END} onDone={onEnd} />}
    </div>
  );
}

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { canStrike, ck, DIRS, flake, knapDone, knapSolve, stoneOf, strike, type Cell, type Dir, type Stone } from '../../core/stone-age';
import {
  BEACH, CARDS1, DRILL_INTRO, FIRE_BACK, KNAP_BROKE, KNAP_HINT, KNAP_INTRO, KNAPS, STONE_SAY, STONES_INTRO, art,
} from '../../data/ch1';
import type { Line } from '../../data/babao-chapter';
import { addCard1 } from '../../core/save1';
import { CardPop, Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import type { Step1Props } from '../Ch1';
import { jingle, sfx } from '../../audio';

type Phase = 'beach' | 'knapIntro' | 'knap' | 'drillIntro' | 'drill' | 'back' | 'cards' | 'warp';

// 步驟 1 打製石器（長濱文化，八仙洞）：海邊挑石頭 → 敲出兩種石器 → 鑽木取火 → 火回來，齒輪帶大家往後跳
export function Knap({ p, set, next, oops }: Step1Props) {
  const [phase, setPhase] = useState<Phase>('beach');
  const [intro, setIntro] = useState(true);
  const [lv, setLv] = useState(0);
  const [card, setCard] = useState<string[]>([]);
  const lit = phase === 'back' || phase === 'cards' || phase === 'warp';
  useEffect(() => {
    if (phase !== 'warp') return;
    sfx('SE-31');
    const t = setTimeout(next, 1300);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`scene ch1-cave ${lit ? 'lit' : ''}`}>
      <img className="scene-bg" src={art(phase === 'beach' ? 'w-03' : lit ? 's-05' : 'w-01')} alt="" />
      {lit && <img className="cave-fire" src={art('o-05-fire')} alt="" />}
      {phase === 'beach' && (intro ? <Talk lines={STONES_INTRO} onDone={() => setIntro(false)} /> : <Beach onDone={() => setPhase('knapIntro')} />)}
      {phase === 'knapIntro' && <Talk lines={KNAP_INTRO} onDone={() => setPhase('knap')} />}
      {phase === 'knap' && (
        <KnapBoard key={lv} n={lv} oops={oops} onDone={() => {
          jingle('MU-13');
          if (lv + 1 < KNAPS.length) { setLv(lv + 1); return; }
          setPhase('drillIntro');
        }} />
      )}
      {phase === 'drillIntro' && <Talk lines={DRILL_INTRO} onDone={() => setPhase('drill')} />}
      {phase === 'drill' && <Drill onDone={() => { sfx('SE-43'); setPhase('back'); }} />}
      {phase === 'back' && <Talk lines={FIRE_BACK} onDone={() => {
        const more = ['changbin', 'chopper'].filter((c) => !p.cards.includes(c));
        set((o) => addCard1(o, 'changbin', 'chopper'));
        if (more.length) { setCard(more); setPhase('cards'); } else setPhase('warp');
      }} />}
      {phase === 'cards' && card[0] && (
        <CardPop title={CARDS1[card[0]].title} text={CARDS1[card[0]].text} onClose={() => { const rest = card.slice(1); setCard(rest); if (!rest.length) setPhase('warp'); }} />
      )}
      {phase === 'warp' && <div className="warp" />}
    </div>
  );
}

const STONE_IMG = { soft: 'g-04-sandstone', hard: 'g-04-basalt', hammer: 'g-04-egg' } as const;

// 海邊挑石頭：一顆硬的當材料、一顆圓的當槌子；軟的一敲就碎
function Beach({ onDone }: { onDone: () => void }) {
  const [gone, setGone] = useState<number[]>([]);
  const [got, setGot] = useState<{ hard: boolean; hammer: boolean }>({ hard: false, hammer: false });
  const [say, setSay] = useState<Line | null>(null);
  useEffect(() => {
    if (!got.hard || !got.hammer) return;
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [got]); // eslint-disable-line react-hooks/exhaustive-deps
  const tap = (i: number) => {
    if (gone.includes(i)) return;
    const k = BEACH[i].kind;
    sfx(k === 'soft' ? 'SE-04' : 'SE-07');
    setSay(STONE_SAY[k]);
    if (k === 'soft') { setGone([...gone, i]); return; }
    if (got[k]) return;
    setGone([...gone, i]);
    setGot({ ...got, [k]: true });
  };
  return (
    <>
      <Goal floating text={`挑石頭：硬的材料 ${got.hard ? '✓' : '○'}　圓的槌子 ${got.hammer ? '✓' : '○'}`} />
      {BEACH.map((b, i) => (
        <button key={i} className={`beach-stone ${gone.includes(i) ? (b.kind === 'soft' ? 'crumble' : 'picked') : ''}`}
          style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }} onClick={() => tap(i)} aria-label="石頭">
          <img src={art(STONE_IMG[b.kind])} alt="" />
        </button>
      ))}
      <div className="beach-bag">
        {(['hard', 'hammer'] as const).map((k) => <span key={k} className={got[k] ? 'got' : ''}><img src={art(STONE_IMG[k])} alt="" /><b>{k === 'hard' ? '材料' : '槌子'}</b></span>)}
      </div>
      <Say line={say} />
    </>
  );
}

const STEP: Record<Dir, Cell> = { up: { col: 0, row: -1 }, down: { col: 0, row: 1 }, left: { col: -1, row: 0 }, right: { col: 1, row: 0 } };
const TILT: Record<Dir, number> = { right: 0, down: 90, left: 180, up: -90 };
const S = 64; // 一格的大小（SVG 單位）

// 一堆格子畫成一整塊石頭：圓角方塊稍微疊在一起，才不會有縫
function Cells({ cells, pad = 1 }: { cells: Cell[]; pad?: number }) {
  return <>{cells.map((c) => <rect key={ck(c)} x={c.col * S - pad} y={c.row * S - pad} width={S + pad * 2} height={S + pad * 2} rx={10} />)}</>;
}
// 方塊糊成一整塊、邊緣再弄得坑坑疤疤，看起來才像石頭
function RockFilter({ id }: { id: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="7" result="b" />
      <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11" result="g" />
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="n" />
      <feDisplacementMap in="g" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  );
}
// 要留下的形狀外框（粉筆虛線）：留的格子跟不留的格子交界的邊
function outline(keep: Set<string>, rows: number, cols: number): string {
  const seg: string[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    if (!keep.has(ck({ col, row }))) continue;
    const x = col * S, y = row * S;
    if (!keep.has(ck({ col, row: row - 1 }))) seg.push(`M${x} ${y}h${S}`);
    if (!keep.has(ck({ col, row: row + 1 }))) seg.push(`M${x} ${y + S}h${S}`);
    if (!keep.has(ck({ col: col - 1, row }))) seg.push(`M${x} ${y}v${S}`);
    if (!keep.has(ck({ col: col + 1, row }))) seg.push(`M${x + S} ${y}v${S}`);
  }
  return seg.join('');
}
const cellsOf = (keys: Iterable<string>): Cell[] => [...keys].map((k) => { const [col, row] = k.split(',').map(Number); return { col, row }; });

interface Chip { id: number; cells: Cell[]; dir: Dir; bad: boolean }

// 敲石頭：石頭放在石砧上。點邊邊一塊 → 旁邊出現槌子石 → 點槌子看黃色預告 → 再點一次敲下去，石片飛出去
function KnapBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const def = KNAPS[n];
  const uid = useId().replace(/:/g, '');
  const start = useMemo(() => stoneOf(def.level), [def]);
  const [stone, setStone] = useState<Stone>(start);
  const [sel, setSel] = useState<Cell | null>(null);
  const [aim, setAim] = useState<Dir | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const [swing, setSwing] = useState<{ cell: Cell; dir: Dir; id: number } | null>(null);
  const demo = useRef<number[]>([]);
  const chipId = useRef(0);
  const rows = def.level.rows.length, cols = def.level.rows[0].length;
  const hint = fails >= 3 && !done ? knapSolve(stone)?.[0] ?? null : null;
  useEffect(() => () => demo.current.forEach(clearTimeout), []);

  // 石片飛走、敲擊的火花，播完就收掉
  const fly = (cells: Cell[], dir: Dir, bad: boolean) => {
    const id = ++chipId.current;
    setChips((cs) => [...cs, { id, cells, dir, bad }]);
    setSwing({ cell: cells[0], dir, id });
    window.setTimeout(() => setChips((cs) => cs.filter((x) => x.id !== id)), 900);
    window.setTimeout(() => setSwing((w) => (w && w.id === id ? null : w)), 450);
  };
  const hit = (c: Cell, d: Dir) => {
    const r = strike(stone, c, d);
    setSel(null); setAim(null);
    fly(r.fell, d, r.broke);
    if (r.broke) {
      sfx('SE-71'); setShake(true);
      setStone(r.stone);
      oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? KNAP_HINT : KNAP_BROKE);
      window.setTimeout(() => { setShake(false); setStone(start); }, 700);
      return;
    }
    sfx('SE-42');
    setStone(r.stone);
    if (knapDone(r.stone)) { setDone(true); setSay(null); window.setTimeout(onDone, 1800); }
  };
  const tapCell = (c: Cell) => {
    if (done || shake || !stone.left.has(ck(c))) return;
    sfx('SE-01');
    setSel(c); setAim(null);
  };
  const tapArrow = (d: Dir) => {
    if (!sel) return;
    if (aim === d) hit(sel, d); else { sfx('SE-09'); setAim(d); }
  };
  // 示範：照解法一下一下敲給你看
  const play = () => {
    const plan = knapSolve(stone);
    if (!plan) return;
    let st = stone;
    plan.forEach((m, i) => {
      demo.current.push(window.setTimeout(() => {
        const r = strike(st, m.cell, m.dir);
        st = r.stone;
        fly(r.fell, m.dir, false);
        sfx('SE-42');
        setStone(st);
        if (i === plan.length - 1) { setDone(true); window.setTimeout(onDone, 1800); }
      }, 650 * (i + 1)));
    });
  };

  const preview = sel && aim ? flake(stone, sel, aim) : [];
  const bad = preview.some((x) => stone.keep.has(ck(x)));
  const left = cellsOf(stone.left);
  const all = cellsOf(start.left);
  const seams = left.flatMap((c) => [
    stone.left.has(ck({ col: c.col + 1, row: c.row })) ? `M${(c.col + 1) * S} ${c.row * S + 10}v${S - 20}` : '',
    stone.left.has(ck({ col: c.col, row: c.row + 1 })) ? `M${c.col * S + 10} ${(c.row + 1) * S}h${S - 20}` : '',
  ]).join('');
  const img = { href: art('g-04-cobble'), x: -S * 0.35, y: -S * 0.35, width: (cols + 0.7) * S, height: (rows + 0.7) * S, preserveAspectRatio: 'none' };
  const vb = `${-S * 1.2} ${-S * 1.2} ${(cols + 2.4) * S} ${(rows + 2.6) * S}`;
  return (
    <div className="knap-wrap">
      <Goal floating text={`敲出「${def.name}」（${n + 1} / ${KNAPS.length}）：${def.use}`} />
      <div className={`knap-board ${shake ? 'shake' : ''} ${done ? 'done' : ''}`}>
        <svg viewBox={vb} className="knap-svg">
          <defs>
            <RockFilter id={`${uid}-rk`} />
            <mask id={`${uid}-st`} maskUnits="userSpaceOnUse" x={-S} y={-S} width={(cols + 2) * S} height={(rows + 2) * S}><g fill="#fff" filter={`url(#${uid}-rk)`}><Cells cells={left} /></g></mask>
            {chips.map((x) => <mask key={x.id} id={`${uid}-c${x.id}`} maskUnits="userSpaceOnUse" x={-S} y={-S} width={(cols + 2) * S} height={(rows + 2) * S}><g fill="#fff" filter={`url(#${uid}-rk)`}><Cells cells={x.cells} /></g></mask>)}
            <radialGradient id={`${uid}-sh`}><stop offset="0" stopColor="#000" stopOpacity=".45" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
            <linearGradient id={`${uid}-gl`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".25" /></linearGradient>
          </defs>
          <ellipse cx={(cols * S) / 2} cy={rows * S + S * 0.15} rx={cols * S * 0.55} ry={S * 0.5} fill={`url(#${uid}-sh)`} />
          {/* 石頭本體：深色邊、石頭圖、光影、裂縫 */}
          <g className="rock-edge" filter={`url(#${uid}-rk)`}><Cells cells={left} pad={6} /></g>
          <g mask={`url(#${uid}-st)`}>
            <image {...img} />
            <rect x={-S} y={-S} width={(cols + 2) * S} height={(rows + 2) * S} fill={`url(#${uid}-gl)`} />
            <path d={seams} className="seam" />
            {preview.map((c) => <rect key={ck(c)} x={c.col * S} y={c.row * S} width={S} height={S} className={bad ? 'bad' : 'aim'} />)}
            {hint && <rect x={hint.cell.col * S + 3} y={hint.cell.row * S + 3} width={S - 6} height={S - 6} rx={12} className="hint" />}
          </g>
          {!done && <path d={outline(start.keep, rows, cols)} className="target" />}
          {sel && <rect x={sel.col * S + 3} y={sel.row * S + 3} width={S - 6} height={S - 6} rx={12} className="sel" />}
          {/* 點擊區 */}
          {all.map((c) => <rect key={ck(c)} x={c.col * S} y={c.row * S} width={S} height={S} className="hit" onClick={() => tapCell(c)} />)}
          {/* 掉下來的石片 */}
          {chips.map((x) => (
            <g key={x.id} className={`chip chip-${x.dir} ${x.bad ? 'bad' : ''}`} style={{ transformOrigin: `${x.cells[0].col * S + S / 2}px ${x.cells[0].row * S + S / 2}px` }}>
              <g mask={`url(#${uid}-c${x.id})`}><image {...img} /></g>
            </g>
          ))}
          {chips.map((x) => <image key={`f${x.id}`} className="spark" href={art('g-04-flakes')} x={x.cells[0].col * S - S * 0.4} y={x.cells[0].row * S - S * 0.4} width={S * 1.8} height={S * 1.8} />)}
          {/* 槌子石：選了一塊之後，出現在可以敲的那幾邊 */}
          {sel && !done && DIRS.filter((d) => canStrike(stone, sel, d)).map((d) => {
            const from = { col: sel.col - STEP[d].col, row: sel.row - STEP[d].row };
            const cx = from.col * S + S / 2, cy = from.row * S + S / 2;
            const isHint = hint && ck(hint.cell) === ck(sel) && hint.dir === d;
            return (
              <g key={d} className={`hammer ${aim === d ? 'on' : ''} ${isHint ? 'hint' : ''}`} onClick={() => tapArrow(d)}>
                <circle cx={cx} cy={cy} r={S * 0.48} className="halo" />
                <g transform={`rotate(${TILT[d]} ${cx} ${cy})`}>
                  <path d={`M${cx + S * 0.3} ${cy - 12}l16 12l-16 12z`} className="tip" />
                </g>
                <image href={art('g-04-egg')} x={cx - S * 0.34} y={cy - S * 0.4} width={S * 0.68} height={S * 0.8} />
              </g>
            );
          })}
          {swing && (() => {
            const cx = swing.cell.col * S + S / 2, cy = swing.cell.row * S + S / 2;
            return <image key={swing.id} className={`swing swing-${swing.dir}`} href={art('g-04-egg')} x={cx - S * 0.34} y={cy - S * 0.4} width={S * 0.68} height={S * 0.8} />;
          })()}
        </svg>
        {done && <img className="knap-tool" src={def.tool} alt={def.name} />}
        <p className="knap-tip">{done ? `敲好了！是一把${def.name}。` : aim ? (bad ? '紅色會敲到要留的地方，換一邊吧' : '再點一次槌子，敲下去！') : sel ? '點旁邊的槌子石，選從哪一邊敲' : '點虛線外面、石頭邊邊的一塊'}</p>
      </div>
      {fails >= 5 && !done && <button className="btn demo corner-btn" onClick={play}>看示範</button>}
      <img className="yan-side" src={art(done ? 'f-04a-cheer' : 'f-04a-knap')} alt="" />
      <Say line={say} />
    </div>
  );
}

// 鑽木取火：一直點，溫度衝到頂就點著了；停下來會慢慢冷掉
function Drill({ onDone }: { onDone: () => void }) {
  const [heat, setHeat] = useState(0);
  const [lit, setLit] = useState(false);
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (lit) return;
    const id = setInterval(() => setHeat((h) => Math.max(0, h - 3)), 200);
    return () => clearInterval(id);
  }, [lit]);
  useEffect(() => { if (heat >= 100 && !lit) { setLit(true); setTimeout(onDone, 900); } }, [heat]); // eslint-disable-line react-hooks/exhaustive-deps
  const smoke = Math.max(0, (heat - 25) / 75);
  return (
    <div className="drill">
      <div className="drill-stage">
        <img className="drill-smoke" src={art('g-04-dust')} alt="" style={{ opacity: smoke, scale: `${0.6 + smoke * 0.8}` }} />
        {lit && <img className="drill-flame" src={art('o-05-fire')} alt="" />}
        <img key={turn} className={`drill-img ${turn ? 'spin' : ''}`} src={art('g-03-drill')} alt="" />
        {heat > 60 && !lit && <i className="ember" />}
      </div>
      <div className="meter"><i style={{ height: `${Math.min(100, heat)}%` }} className={heat > 70 ? 'hot' : ''} /></div>
      <button className="btn orange go" disabled={lit} onClick={() => { sfx('SE-09'); setTurn((t) => t + 1); setHeat((h) => h + 9); }}>{lit ? '🔥 著火了！' : '鑽！'}</button>
      <small>{heat > 60 ? '冒煙了，快一點！' : '一直點「鑽！」'}</small>
    </div>
  );
}

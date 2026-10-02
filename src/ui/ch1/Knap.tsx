import { useEffect, useMemo, useRef, useState } from 'react';
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
      <img className="scene-bg" src={art('s-05')} alt="" />
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
      {phase === 'drill' && <Drill onDone={() => { sfx('SE-60'); setPhase('back'); }} />}
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
          <img src={art(`g-03-${b.kind}`)} alt="" />
        </button>
      ))}
      <Say line={say} />
    </>
  );
}

const ARROW: Record<Dir, string> = { up: '⬆', down: '⬇', left: '⬅', right: '➡' };
const STEP: Record<Dir, Cell> = { up: { col: 0, row: -1 }, down: { col: 0, row: 1 }, left: { col: -1, row: 0 }, right: { col: 1, row: 0 } };

// 敲石頭：點邊邊的一格 → 出現可以敲的方向 → 點一下方向看黃色預告 → 再點一次敲下去
function KnapBoard({ n, onDone, oops }: { n: number; onDone: () => void; oops: () => void }) {
  const def = KNAPS[n];
  const start = useMemo(() => stoneOf(def.level), [def]);
  const [stone, setStone] = useState<Stone>(start);
  const [sel, setSel] = useState<Cell | null>(null);
  const [aim, setAim] = useState<Dir | null>(null);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const demo = useRef(0);
  const rows = def.level.rows.length, cols = def.level.rows[0].length;
  const hint = fails >= 3 && !done ? knapSolve(stone)?.[0] ?? null : null;
  useEffect(() => () => clearTimeout(demo.current), []);

  const hit = (c: Cell, d: Dir) => {
    const r = strike(stone, c, d);
    setSel(null); setAim(null);
    if (r.broke) {
      sfx('SE-71'); setShake(true); setTimeout(() => setShake(false), 400);
      oops();
      const f = fails + 1;
      setFails(f);
      setSay(f >= 2 ? KNAP_HINT : KNAP_BROKE);
      setStone(start);
      return;
    }
    sfx('SE-68');
    setStone(r.stone);
    if (knapDone(r.stone)) { setDone(true); setSay(null); setTimeout(onDone, 1400); }
  };
  const tapCell = (c: Cell) => {
    if (done || !stone.left.has(ck(c))) return;
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
      demo.current = window.setTimeout(() => {
        st = strike(st, m.cell, m.dir).stone;
        sfx('SE-68');
        setStone(st);
        if (i === plan.length - 1) { setDone(true); setTimeout(onDone, 1400); }
      }, 500 * (i + 1));
    });
  };

  const preview = sel && aim ? flake(stone, sel, aim) : [];
  const bad = preview.some((x) => stone.keep.has(ck(x)));
  const inPreview = (k: string) => preview.some((x) => ck(x) === k);
  const S = 64; // 一格的大小（SVG 單位）
  return (
    <div className="knap-wrap">
      <Goal floating text={`敲出「${def.name}」（${n + 1} / ${KNAPS.length}）：${def.use}`} />
      <div className={`knap-board panel ${shake ? 'shake' : ''} ${done ? 'done' : ''}`}>
        <svg viewBox={`${-S} ${-S} ${(cols + 2) * S} ${(rows + 2) * S}`} className="knap-svg">
          {def.level.rows.flatMap((line, row) => [...line].map((ch, col) => {
            const k = ck({ col, row });
            if (ch === '.') return null;
            const here = stone.left.has(k);
            return (
              <g key={k} onClick={() => tapCell({ col, row })}>
                {here && <rect x={col * S + 2} y={row * S + 2} width={S - 4} height={S - 4} rx={12}
                  className={`rock ${stone.keep.has(k) ? 'keep' : ''} ${inPreview(k) ? (bad ? 'bad' : 'aim') : ''} ${sel && ck(sel) === k ? 'sel' : ''} ${hint && ck(hint.cell) === k ? 'hint' : ''}`} />}
                {ch === '#' && <rect x={col * S + 6} y={row * S + 6} width={S - 12} height={S - 12} rx={8} className="target" />}
              </g>
            );
          }))}
          {sel && DIRS.filter((d) => canStrike(stone, sel, d)).map((d) => {
            const from = { col: sel.col - STEP[d].col, row: sel.row - STEP[d].row };
            return (
              <g key={d} className={`arrow ${aim === d ? 'on' : ''} ${hint && ck(hint.cell) === ck(sel) && hint.dir === d ? 'hint' : ''}`} onClick={() => tapArrow(d)}>
                <circle cx={from.col * S + S / 2} cy={from.row * S + S / 2} r={S * 0.42} />
                <text x={from.col * S + S / 2} y={from.row * S + S / 2 + 12} textAnchor="middle">{ARROW[d]}</text>
              </g>
            );
          })}
        </svg>
        <p className="knap-tip">{done ? '敲好了！' : aim ? (bad ? '紅色有要留的地方，換個方向吧' : '再點一次箭頭，敲下去！') : sel ? '選一個方向（箭頭）' : '點石頭邊邊的一格'}</p>
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
  useEffect(() => {
    if (lit) return;
    const id = setInterval(() => setHeat((h) => Math.max(0, h - 3)), 200);
    return () => clearInterval(id);
  }, [lit]);
  useEffect(() => { if (heat >= 100 && !lit) { setLit(true); setTimeout(onDone, 900); } }, [heat]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="drill panel">
      <img className={`drill-img ${heat > 0 ? 'spin' : ''}`} src={art('g-03-drill')} alt="" />
      <div className="meter"><i style={{ height: `${Math.min(100, heat)}%` }} className={heat > 70 ? 'hot' : ''} /></div>
      <button className="btn orange go" disabled={lit} onClick={() => { sfx('SE-09'); setHeat((h) => h + 9); }}>{lit ? '🔥 著火了！' : '鑽！'}</button>
      <small>{heat > 60 ? '冒煙了，快一點！' : '一直點「鑽！」'}</small>
    </div>
  );
}

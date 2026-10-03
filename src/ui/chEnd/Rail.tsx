import { useEffect, useState } from 'react';
import { cellKey, findCell, isCity, neighbors, passable, railAt, railRun, railSolve, type Cell, type RailProblem } from '../../core/today';
import { RAIL, RAIL_DONE, RAIL_INTRO, RAIL_NAMES, RAIL_SAY, artE } from '../../data/chEnd';
import type { Line } from '../../data/babao-chapter';
import { Say, Talk } from '../Talk';
import { Goal } from '../Guide';
import { NewCardsEnd, type StepEndProps } from '../ChEnd';
import { DecideEnd, EraJumpEnd } from './StoryEnd';
import { jingle, sfx } from '../../audio';

type Phase = 'jump' | 'intro' | 'draw' | 'ride' | 'choice' | 'done' | 'cards';
const T = findCell(RAIL, 'T');
const ROWS = RAIL.rows.length, COLS = RAIL.rows[0].length;
const ORDER: RailProblem[] = ['end', 'blocked', 'mustStop', 'gap', 'close', 'slow'];

// 步驟 2 高鐵連起全島：在西部格子地圖上，從台北畫到高雄，挑站停；守站距、避開山和濕地、90 分鐘內
export function Rail({ p, set, next, oops }: StepEndProps) {
  const [phase, setPhase] = useState<Phase>('jump');
  return (
    <div className="scene end-rail">
      <img className="scene-bg" src={artE('s-25')} alt="" />
      {phase === 'jump' && <EraJumpEnd to={2} onDone={() => setPhase('intro')} />}
      {phase === 'intro' && <Talk lines={RAIL_INTRO} onDone={() => setPhase('draw')} />}
      {(phase === 'draw' || phase === 'ride') && <Track oops={oops} riding={phase === 'ride'} onPass={() => setPhase('ride')} onRode={() => setPhase('choice')} />}
      {phase === 'choice' && <DecideEnd id="ride" set={set} onDone={() => setPhase('done')} />}
      {phase === 'done' && <Talk lines={RAIL_DONE} onDone={() => setPhase('cards')} />}
      {phase === 'cards' && <NewCardsEnd ids={['hsr']} p={p} set={set} onDone={next} />}
    </div>
  );
}

function Track({ oops, riding, onPass, onRode }: { oops: () => void; riding: boolean; onPass: () => void; onRode: () => void }) {
  const [path, setPath] = useState<Cell[]>([T]);
  const [stops, setStops] = useState<string[]>([]);
  const [fails, setFails] = useState(0);
  const [say, setSay] = useState<Line | null>(null);
  const [shown, setShown] = useState<RailProblem[]>([]);
  const r = railRun(RAIL, path, stops);
  const onPath = new Map(path.map((c, i) => [cellKey(c), i]));
  const end = path[path.length - 1];
  const best = fails >= 3 ? railSolve(RAIL) : null;
  const bestCells = new Set(best?.path.map(cellKey) ?? []);

  const tap = (c: Cell) => {
    if (riding) return;
    const k = cellKey(c);
    const i = onPath.get(k);
    setShown([]);
    if (i !== undefined) {
      const ch = railAt(RAIL, c);
      if ((ch === 'c' || ch === 'C') && i < path.length) {
        sfx(stops.includes(k) ? 'SE-02' : 'SE-07');
        setStops(stops.includes(k) ? stops.filter((s) => s !== k) : [...stops, k]);
        return;
      }
      if (i === path.length - 1 && i > 0) { sfx('SE-02'); setPath(path.slice(0, -1)); }
      return;
    }
    if (railAt(RAIL, end) === 'K') { sfx('SE-04'); return; }
    if (!neighbors(end, c)) { sfx('SE-04'); setSay({ who: 'engineer', text: '路線要一格接一格，從最後一格旁邊接下去。' }); return; }
    if (!passable(RAIL, c)) { sfx('SE-04'); setSay(RAIL_SAY.blocked); return; }
    sfx('SE-01');
    setPath([...path, c]);
  };
  const undo = () => {
    if (path.length <= 1) return;
    sfx('SE-02');
    const gone = cellKey(path[path.length - 1]);
    setPath(path.slice(0, -1));
    setStops(stops.filter((s) => s !== gone));
    setShown([]);
  };
  const reset = () => { sfx('SE-02'); setPath([T]); setStops([]); setShown([]); };
  const go = () => {
    if (r.ok) { sfx('SE-123'); jingle('MU-13'); setSay(RAIL_SAY.good); onPass(); setTimeout(onRode, 3200); return; }
    sfx('SE-71'); oops();
    const f = fails + 1;
    setFails(f);
    setShown(r.problems);
    const first = ORDER.find((x) => r.problems.includes(x)) ?? 'end';
    setSay(f >= 2 && first !== 'end' ? RAIL_SAY.hint : RAIL_SAY[first as keyof typeof RAIL_SAY] ?? RAIL_SAY.hint);
  };
  const demo = () => { const s = railSolve(RAIL); if (s) { setPath(s.path); setStops(s.stops); setShown([]); } };
  const pts = path.map((c) => `${((c.col + 0.5) / COLS) * 100},${((c.row + 0.5) / ROWS) * 100}`).join(' ');
  const rules: { id: RailProblem; text: string }[] = [
    { id: 'end', text: '從台北接到高雄' },
    { id: 'mustStop', text: '台中一定要停' },
    { id: 'gap', text: '站距最多 5 格' },
    { id: 'close', text: '站距最少 3 格' },
    { id: 'slow', text: `${RAIL.limit} 分鐘內` },
  ];
  const reached = railAt(RAIL, end) === 'K';
  return (
    <div className="end-rail-wrap">
      <Goal floating text={reached ? '點路線上的城市決定停站，再按「試跑一趟」' : '從台北一格一格點到高雄。路線經過的城市，點一下就會停站。'} />
      <div className="end-rail-board" style={{ ['--cols' as string]: COLS, ['--rows' as string]: ROWS }}>
        {RAIL.rows.flatMap((line, row) => [...line].map((ch, col) => {
          const c = { col, row }, k = cellKey(c);
          const on = onPath.has(k);
          return (
            <button key={k} className={`end-rail-cell end-t-${ch === '.' ? 'p' : ch} ${on ? 'on' : ''} ${stops.includes(k) || ch === 'T' || ch === 'K' ? 'stop' : ''} ${bestCells.has(k) && !on ? 'hint' : ''} ${cellKey(end) === k ? 'end' : ''}`}
              onClick={() => tap(c)} aria-label={RAIL_NAMES[k] ?? (ch === 'M' ? '山' : ch === 'W' ? '保護區' : '平地')}>
              {ch === 'M' && <i>⛰</i>}
              {ch === 'W' && <i>🐦</i>}
              {isCity(RAIL, c) && <em>{RAIL_NAMES[k]}</em>}
            </button>
          );
        }))}
        <svg className="end-rail-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><polyline points={pts} /></svg>
        {riding && <RailTrain path={path} />}
      </div>
      <div className="end-rail-info panel">
        <div className={`end-rail-time ${r.minutes > RAIL.limit ? 'no' : ''}`}><b>{r.minutes}</b> / {RAIL.limit} 分鐘</div>
        <p className="end-rail-math">走 {path.length - 1} 格 ×4　轉彎 {r.turns} 次 ×2　停 {Math.max(0, r.gaps.length - 1)} 站 ×2</p>
        <ul className="end-rail-rules">
          {rules.map((x) => <li key={x.id} className={shown.includes(x.id) ? 'no' : ''}>{shown.includes(x.id) ? '✗' : '・'} {x.text}</li>)}
        </ul>
        {reached && <p className="end-rail-gaps">站距：{r.gaps.join('、')} 格</p>}
        <div className="row">
          <button className="btn orange" disabled={riding || path.length <= 1} onClick={undo}>退一格</button>
          <button className="btn orange" disabled={riding || path.length <= 1} onClick={reset}>重畫</button>
          <button className="btn green" disabled={riding} onClick={go}>試跑一趟</button>
        </div>
      </div>
      {fails >= 5 && !riding && <button className="btn demo corner-btn" onClick={demo}>看示範</button>}
      <Say line={say} />
    </div>
  );
}

// 列車沿著路線一格一格跑過去
function RailTrain({ path }: { path: Cell[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= path.length - 1) return;
    const t = setTimeout(() => setI(i + 1), 2600 / path.length);
    return () => clearTimeout(t);
  }, [i, path.length]);
  const c = path[i];
  return <img className="end-rail-train" src={artE('o-11-hsr')} alt="" style={{ left: `${((c.col + 0.5) / COLS) * 100}%`, top: `${((c.row + 0.5) / ROWS) * 100}%` }} />;
}

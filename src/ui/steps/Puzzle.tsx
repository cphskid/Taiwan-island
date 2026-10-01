import { useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from '../../data/babao-levels';
import { PUZZLE_ART, PUZZLE_INTRO, img } from '../../data/babao-chapter';
import { canDig, canPlace, simulate, solved, type FlowResult } from '../../core/flow';
import { move, pieceAt, place, remove, rotate, same, type Piece } from '../../core/pieces';
import type { Cell } from '../../core/iso';
import type { Mark } from '../../render/board';
import { useBoard } from '../useBoard';
import { Say, Talk } from '../Talk';
import { Legend } from './Legend';
import type { StepProps } from '../Chapter';
import { jingle, sfx } from '../../audio';

const STEP_MS = 250; // 水每 0.25 秒往前一格
const HINT_AT = 3; // 失敗幾次林先生亮出提示
const DEMO_AT = 5; // 失敗幾次可以看示範

type Drag = { kind: 'new' } | { kind: 'move'; id: number; x0: number; y0: number; moved: boolean };
type Run = { result: FlowResult; t: number; done: boolean };

// 放完水之後跟小朋友說發生什麼事
function verdict(r: FlowResult, need: number): { ok: boolean; text: string } {
  if (solved(r, need)) return { ok: true, text: '水流到分水閘了，水量也夠！' };
  if (r.broken.length) return { ok: false, text: '竹蛇籠被沖壞了：水太大，不能正面硬擋，要把水往旁邊導。' };
  if (r.flooded.length) return { ok: false, text: '水淹到旁邊的地了：竹蛇籠的箭頭要對準圳頭（或對準旁邊那條河道）。' };
  if (r.gates.length) return { ok: false, text: `水到分水閘了，可是不夠：要 ${need} 份，只來了 ${r.delivered} 份。把其他幾道水也導進來。` };
  if (r.canal.length) return { ok: false, text: '水進了圳道，可是半路停住了：有一段比較高。打開地形眼鏡看看。' };
  return { ok: false, text: '水沒有轉進圳頭，還是往下游流走了。' };
}

// 步驟 3 導水解謎：三小關，竹蛇籠從步驟 2 做好的拿；失敗 3 次有提示、5 次可以看示範
export function Puzzle({ p, set, next }: StepProps) {
  const idx = Math.min(p.level, LEVELS.length - 1);
  const allDone = p.level >= LEVELS.length;
  const level = LEVELS[idx];
  return allDone ? (
    <div className="scene center">
      <div className="panel mission">
        <h2>三道關卡都過了！</h2>
        <p>濁水溪的水引進圳道，一路流到分水閘。</p>
        <div className="row">
          <button className="btn orange" onClick={() => set((o) => ({ ...o, level: 0 }))}>再玩一次導水</button>
          <button className="btn green" onClick={next}>下一步：分水</button>
        </div>
      </div>
    </div>
  ) : (
    <Level key={level.id} p={p} set={set} idx={idx} intro={idx === 0} />
  );
}

function Level({ p, set, idx, intro: showIntro }: Pick<StepProps, 'p' | 'set'> & { idx: number; intro: boolean }) {
  const level = LEVELS[idx];
  const host = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [canals, setCanals] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [contours, setContours] = useState(false);
  const [digging, setDigging] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [fails, setFails] = useState(0);
  const [intro, setIntro] = useState(showIntro);
  const [brief, setBrief] = useState(false); // 關卡說明收起來，只留標題（手機畫面小）
  useEffect(() => setBrief(false), [idx]);
  const [topped, setTopped] = useState(false);

  const avail = Math.min(level.cages, p.cages);
  const live = useRef({ pieces, canals, digging, running: false, drag: null as Drag | null });
  Object.assign(live.current, { pieces, canals, digging, running: run !== null && !run.done });

  const preview = useMemo(() => simulate(level, pieces, canals), [level, pieces, canals]);

  // 竹蛇籠不夠這關用（之前被沖壞了）：林先生補做
  useEffect(() => {
    if (p.cages < level.solution.cages.length) {
      set((o) => ({ ...o, cages: level.solution.cages.length }));
      setTopped(true);
    }
  }, [p.cages]); // eslint-disable-line react-hooks/exhaustive-deps

  const { board, ready, fps } = useBoard(host, {
    cols: level.cols, rows: level.rows, terrain: level.kind, heights: level.heights, art: PUZZLE_ART,
    onTap: (c) => {
      setSelected(null);
      const L = live.current;
      if (!c || !L.digging || L.running || !canDig(level, c)) return;
      setRun(null);
      if (L.canals.some((d) => same(d, c))) { sfx('SE-51'); setCanals(L.canals.filter((d) => !same(d, c))); }
      else if (L.canals.length < level.digs) { sfx('SE-50'); setCanals([...L.canals, c]); }
    },
    onPress: (c, e) => {
      if (live.current.running) return false;
      const piece = pieceAt(live.current.pieces, c);
      if (!piece) return false;
      setSelected(piece.id);
      startDrag({ kind: 'move', id: piece.id, x0: e.clientX, y0: e.clientY, moved: false });
      return true;
    },
  }, [idx]);

  const marks: Mark[] = fails >= HINT_AT
    ? [...level.solution.cages.map((s) => ({ kind: 'cage' as const, cell: s.cell, dir: s.dir })), ...level.solution.canals.map((cell) => ({ kind: 'dig' as const, cell }))]
    : [];
  useEffect(() => { board.current?.setPieces(pieces, selected); }, [pieces, selected, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { board.current?.setContours(contours); }, [contours, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { board.current?.setCanals(canals); }, [canals, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { board.current?.setMarks(marks); }, [fails >= HINT_AT, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    board.current?.setPreview(run ? null : preview);
    board.current?.setFlow(run?.result ?? null, run?.t ?? 0);
  }, [preview, run, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // 放水動畫：時間每 0.25 秒往前一步；流完算結果，沖壞的竹蛇籠拿掉（石頭退回一半）
  useEffect(() => {
    if (!run || run.done) return;
    const id = window.setTimeout(() => {
      if (run.t < run.result.steps) { setRun({ ...run, t: run.t + 1 }); return; }
      setRun({ ...run, done: true });
      const ok = solved(run.result, level.need);
      if (!ok) setFails((n) => n + 1);
      const broken = run.result.broken;
      if (ok) { sfx('SE-56'); jingle('MU-13'); }
      else if (broken.length) sfx('SE-71');
      else if (run.result.flooded.length) sfx('SE-57');
      else jingle('MU-14');
      if (broken.length) {
        setPieces((list) => list.filter((q) => !broken.some((w) => same(w.cell, q.cell))));
        set((o) => ({ ...o, cages: Math.max(0, o.cages - broken.length), stone: o.stone + broken.length, broken: o.broken + broken.length }));
      }
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (fn: () => void) => { setRun(null); setBrief(true); fn(); };

  function canDrop(c: Cell | null, d: Drag): c is Cell {
    if (!c || !canPlace(level, c)) return false;
    const there = pieceAt(live.current.pieces, c);
    return !there || (d.kind === 'move' && there.id === d.id);
  }

  function hypothetical(c: Cell | null, d: Drag) {
    const { pieces: list, canals: dug } = live.current;
    if (!canDrop(c, d)) return simulate(level, d.kind === 'move' ? remove(list, d.id) : list, dug);
    return simulate(level, d.kind === 'new' ? place(list, 'cage', c) : move(list, d.id, c), dug);
  }

  function startDrag(d: Drag) {
    live.current.drag = d;
    setRun(null);
    const onMove = (e: PointerEvent) => {
      const cur = live.current.drag;
      if (!cur) return;
      if (cur.kind === 'move' && !cur.moved) {
        if (Math.hypot(e.clientX - cur.x0, e.clientY - cur.y0) < 8) return;
        cur.moved = true;
      }
      board.current?.setGrid(true);
      setGhost({ x: e.clientX, y: e.clientY });
      const c = board.current?.cellAt(e.clientX, e.clientY) ?? null;
      board.current?.setHover(c, canDrop(c, cur));
      board.current?.setPreview(hypothetical(c, cur));
    };
    const onUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const cur = live.current.drag;
      live.current.drag = null;
      setGhost(null);
      board.current?.setHover(null, false);
      board.current?.setGrid(false);
      const list = live.current.pieces;
      board.current?.setPreview(simulate(level, list, live.current.canals));
      if (!cur || e.type === 'pointercancel') return;
      if (cur.kind === 'move' && !cur.moved) return;
      const c = board.current?.cellAt(e.clientX, e.clientY) ?? null;
      if (cur.kind === 'new') {
        if (!canDrop(c, cur)) return;
        sfx('SE-52');
        const nextList = place(list, 'cage', c);
        setPieces(nextList);
        setSelected(nextList[nextList.length - 1].id);
      } else if (c === null) {
        sfx('SE-02');
        setPieces(remove(list, cur.id));
        setSelected(null);
      } else if (canDrop(c, cur)) {
        sfx('SE-08');
        setPieces(move(list, cur.id, c));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  const demo = () => {
    const sol = level.solution.cages.reduce<Piece[]>((l, s) => place(l, 'cage', s.cell, s.dir), []);
    setPieces(sol);
    setCanals(level.solution.canals);
    setSelected(null);
    setDigging(false);
    setRun({ result: simulate(level, sol, level.solution.canals), t: 0, done: false });
  };

  const pass = () => {
    set((o) => ({ ...o, level: idx + 1, cages: Math.max(0, o.cages - pieces.length), cards: o.cards.includes('head') ? o.cards : [...o.cards, 'head'] }));
  };

  const remaining = avail - pieces.length;
  const running = run !== null && !run.done;
  const result = run?.done ? verdict(run.result, level.need) : null;
  const lin = topped ? '竹蛇籠不夠用，我幫你補做好了。'
    : fails >= DEMO_AT ? '我做一次給你看：按「看示範」。'
    : fails >= HINT_AT ? '白色的是我的提示：竹蛇籠放在白框裡、箭頭照白色箭頭，白色的格子就是要挖的圳道。'
    : null;

  return (
    <div className="board-wrap">
      <div className="board puzzle" ref={host} />

      <div className="levels">
        {LEVELS.map((lv, i) => (
          <span key={lv.id} className={`lv ${i === idx ? 'on' : i < idx ? 'past' : ''}`}>{lv.id}</span>
        ))}
        <button className={`hint ${brief ? 'brief' : ''}`} onClick={() => setBrief(!brief)}><b>{level.title}</b>{!brief && level.hint}</button>
      </div>

      <div className="tools">
        <button className="tool" disabled={selected === null || running} onClick={() => selected !== null && edit(() => { sfx('SE-53'); setPieces(rotate(pieces, selected)); })}>
          <img className="tool-img" src={img('h-rotate')} alt="" />旋轉
        </button>
        <button className="tool" disabled={selected === null || running} onClick={() => { if (selected !== null) edit(() => { sfx('SE-02'); setPieces(remove(pieces, selected)); setSelected(null); }); }}>
          <img className="tool-img" src={img('h-undo')} alt="" />拿回
        </button>
        {level.digs > 0 && (
          <button className={`tool ${digging ? 'on' : ''}`} disabled={running} onClick={() => { setDigging(!digging); setBrief(true); }}>
            <span className="tool-icon">⛏</span>挖圳道
          </button>
        )}
        <button className={`tool ${contours ? 'on' : ''}`} onClick={() => setContours(!contours)}>
          <img className="tool-img" src={img('h-eye')} alt="" />地形眼鏡
        </button>
      </div>

      <div className="tray">
        <div
          className={`item ${remaining > 0 && !running ? '' : 'empty'}`}
          onPointerDown={(e) => {
            if (remaining <= 0 || running) return;
            e.preventDefault();
            sfx('SE-07');
            setGhost({ x: e.clientX, y: e.clientY });
            startDrag({ kind: 'new' });
          }}
        >
          <img className="item-img" src={img('g-cage-full')} alt="" />
          <span>竹蛇籠</span>
          <b>×{remaining}</b>
        </div>
        {level.digs > 0 && <div className="digs">圳道<b>{level.digs - canals.length}</b>格</div>}
        <button className="btn green go" disabled={running} onClick={() => { sfx('SE-54'); setRun({ result: simulate(level, pieces, canals), t: 0, done: false }); }}>放水</button>
        <button className="btn orange go" disabled={running} onClick={() => edit(() => { setPieces([]); setCanals([]); setSelected(null); })}>重來</button>
        {fails >= DEMO_AT && <button className="btn go demo" disabled={running} onClick={demo}>看示範</button>}
      </div>

      {digging && <div className="mode">挖圳道中：點草地挖一格，再點一次填回去</div>}
      {!result && <Say line={lin ? { who: 'lin', text: lin } : null} />}

      {result && (
        <div className={`result ${result.ok ? 'ok' : ''}`}>
          <p>{result.text}</p>
          {result.ok && <button className="btn green" onClick={pass}>{idx < LEVELS.length - 1 ? '下一關' : '完成導水'}</button>}
          <button className="btn orange" onClick={() => setRun(null)}>{result.ok ? '再看一次' : '再試一次'}</button>
        </div>
      )}

      {contours && <Legend />}
      {ghost && <img className="ghost" src={img('g-cage-full')} alt="" style={{ left: ghost.x, top: ghost.y }} />}
      {intro && <Talk lines={PUZZLE_INTRO} onDone={() => setIntro(false)} />}
      <div className="fps">每秒 {fps} 格</div>
    </div>
  );
}

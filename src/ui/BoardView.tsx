import { useEffect, useMemo, useRef, useState } from 'react';
import { createBoard, type Board } from '../render/board';
import { LEVELS } from '../data/babao-levels';
import { canDig, canPlace, simulate, solved, type FlowResult } from '../core/flow';
import { left, move, pieceAt, place, remove, rotate, same, type Piece } from '../core/pieces';
import type { Cell } from '../core/iso';

const STEP_MS = 250; // 水每 0.25 秒往前一格

// 拖放中的東西：從物品列拿新的，或拖地圖上已經放好的
type Drag = { kind: 'new' } | { kind: 'move'; id: number; x0: number; y0: number; moved: boolean };
type Run = { result: FlowResult; t: number; done: boolean };

// 放完水之後跟小朋友說發生什麼事
function verdict(r: FlowResult): { ok: boolean; text: string } {
  if (solved(r)) return { ok: true, text: '水流到分水閘了！' };
  if (r.broken.length) return { ok: false, text: '竹蛇籠被沖壞了：水太大，不能正面硬擋，要斜著把水導過去。' };
  if (r.flooded.length) return { ok: false, text: '水淹到旁邊的地了：竹蛇籠的方向要對準圳頭。' };
  if (r.canal.length) return { ok: false, text: '水進了圳道，可是半路停住了：有一段比較高。打開地形眼鏡看看。' };
  return { ok: false, text: '水沒有轉進圳頭，還是往下游流走了。' };
}

// P6-2：八堡圳「導水解謎」三小關（佔位圖）。放竹蛇籠、挖圳道、看預計水路、按放水。
export function BoardView() {
  const host = useRef<HTMLDivElement>(null);
  const board = useRef<Board | null>(null);
  const [levelIdx, setLevelIdx] = useState(0);
  const level = LEVELS[levelIdx];
  const [fps, setFps] = useState(0);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [canals, setCanals] = useState<Cell[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [contours, setContours] = useState(false);
  const [digging, setDigging] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [ready, setReady] = useState(0); // 換關時遊戲盤重建好了，要把目前狀態再畫一次

  // 事件處理器裡要讀最新的值
  const live = useRef({ pieces, canals, digging, running: false, drag: null as Drag | null, level });
  Object.assign(live.current, { pieces, canals, digging, level, running: run !== null && !run.done });

  const preview = useMemo(() => simulate(level, pieces, canals), [level, pieces, canals]);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    setPieces([]); setCanals([]); setSelected(null); setRun(null); setDigging(false);
    createBoard(host.current!, {
      cols: level.cols,
      rows: level.rows,
      terrain: level.kind,
      heights: level.heights,
      onTap: (c) => {
        setSelected(null);
        if (!c || !live.current.digging || live.current.running) return;
        if (!canDig(live.current.level, c)) return;
        const dug = live.current.canals;
        setRun(null);
        setCanals(dug.some((d) => same(d, c)) ? dug.filter((d) => !same(d, c)) : [...dug, c]);
      },
      onPress: (c, e) => {
        if (live.current.running) return false;
        const p = pieceAt(live.current.pieces, c);
        if (!p) return false;
        setSelected(p.id);
        startDrag({ kind: 'move', id: p.id, x0: e.clientX, y0: e.clientY, moved: false });
        return true;
      },
    }).then((b) => {
      if (!alive) { b.destroy(); return; }
      board.current = b;
      setReady((n) => n + 1);
      timer = window.setInterval(() => setFps(Math.round(b.fps())), 500);
    });
    return () => { alive = false; clearInterval(timer); board.current?.destroy(); board.current = null; };
  }, [level]);

  useEffect(() => { board.current?.setPieces(pieces, selected); }, [pieces, selected, ready]);
  useEffect(() => { board.current?.setContours(contours); }, [contours, ready]);
  useEffect(() => { board.current?.setCanals(canals); }, [canals, ready]);
  useEffect(() => {
    board.current?.setPreview(run ? null : preview);
    board.current?.setFlow(run?.result ?? null, run?.t ?? 0);
  }, [preview, run, ready]);

  // 放水動畫：時間每 0.25 秒往前一步，流完就停，沖壞的竹蛇籠拿掉
  useEffect(() => {
    if (!run || run.done) return;
    const id = window.setTimeout(() => {
      if (run.t >= run.result.steps) {
        setRun({ ...run, done: true });
        const broken = run.result.broken;
        if (broken.length) setPieces((list) => list.filter((p) => !broken.some((w) => same(w.cell, p.cell))));
      } else setRun({ ...run, t: run.t + 1 });
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [run]);

  function edit(fn: () => void) {
    setRun(null);
    fn();
  }

  function canDrop(c: Cell | null, d: Drag): c is Cell {
    if (!c || !canPlace(live.current.level, c)) return false;
    const there = pieceAt(live.current.pieces, c);
    return !there || (d.kind === 'move' && there.id === d.id);
  }

  // 拖著竹蛇籠時，預計水路照「如果放在這裡」重算
  function hypothetical(c: Cell | null, d: Drag) {
    const { level: lv, pieces: list, canals: dug } = live.current;
    if (!canDrop(c, d)) return simulate(lv, d.kind === 'move' ? remove(list, d.id) : list, dug);
    const next = d.kind === 'new' ? place(list, 'cage', c) : move(list, d.id, c);
    return simulate(lv, next, dug);
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
      board.current?.setPreview(simulate(live.current.level, list, live.current.canals));
      if (!cur || e.type === 'pointercancel') return;
      if (cur.kind === 'move' && !cur.moved) return; // 只是點一下：選取
      const c = board.current?.cellAt(e.clientX, e.clientY) ?? null;
      if (cur.kind === 'new') {
        if (!canDrop(c, cur)) return;
        const next = place(list, 'cage', c);
        setPieces(next);
        setSelected(next[next.length - 1].id);
      } else if (c === null) {
        setPieces(remove(list, cur.id)); // 拖出地圖＝拿回物品列
        setSelected(null);
      } else if (canDrop(c, cur)) {
        setPieces(move(list, cur.id, c));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  const remaining = left(pieces, 'cage', level.cages);
  const running = run !== null && !run.done;
  const result = run?.done ? verdict(run.result) : null;

  return (
    <div className="board-wrap">
      <div className="board" ref={host} />

      <div className="levels">
        {LEVELS.map((lv, i) => (
          <button key={lv.id} className={`lv ${i === levelIdx ? 'on' : ''}`} onClick={() => setLevelIdx(i)}>{lv.id}</button>
        ))}
        <div className="hint"><b>{level.title}</b>{level.hint}</div>
      </div>

      <div className="tools">
        <button className="tool" disabled={selected === null || running} onClick={() => selected !== null && edit(() => setPieces(rotate(pieces, selected)))}>
          <span className="tool-icon">↻</span>旋轉
        </button>
        <button className="tool" disabled={selected === null || running} onClick={() => { if (selected !== null) edit(() => { setPieces(remove(pieces, selected)); setSelected(null); }); }}>
          <span className="tool-icon">⤓</span>拿回
        </button>
        <button className={`tool ${digging ? 'on' : ''}`} disabled={running} onClick={() => setDigging(!digging)}>
          <span className="tool-icon">⛏</span>挖圳道
        </button>
        <button className={`tool ${contours ? 'on' : ''}`} onClick={() => setContours(!contours)}>
          <span className="tool-icon">◎</span>地形眼鏡
        </button>
      </div>

      <div className="tray">
        <div
          className={`item ${remaining && !running ? '' : 'empty'}`}
          onPointerDown={(e) => {
            if (!remaining || running) return;
            e.preventDefault();
            setGhost({ x: e.clientX, y: e.clientY });
            startDrag({ kind: 'new' });
          }}
        >
          <span className="cage-icon" />
          <span>竹蛇籠</span>
          <b>×{remaining}</b>
        </div>
        <button className="btn green go" disabled={running} onClick={() => setRun({ result: simulate(level, pieces, canals), t: 0, done: false })}>
          放水
        </button>
        <button className="btn orange go" disabled={running} onClick={() => edit(() => { setPieces([]); setCanals([]); setSelected(null); })}>
          重來
        </button>
      </div>

      {digging && <div className="mode">挖圳道中：點草地挖一格，再點一次填回去</div>}

      {result && (
        <div className={`result ${result.ok ? 'ok' : ''}`}>
          <p>{result.text}</p>
          {result.ok && levelIdx < LEVELS.length - 1 && (
            <button className="btn green" onClick={() => setLevelIdx(levelIdx + 1)}>下一關</button>
          )}
          <button className="btn orange" onClick={() => setRun(null)}>{result.ok ? '再看一次' : '再試一次'}</button>
        </div>
      )}

      {contours && (
        <div className="legend">
          <span>低</span>
          {[0, 1, 2, 3, 4, 5].map((l) => <i key={l} className={`band b${l}`} />)}
          <span>高</span>
          <em>線越密，坡越陡</em>
        </div>
      )}

      {ghost && <span className="cage-icon ghost" style={{ left: ghost.x, top: ghost.y }} />}
      <div className={`fps ${fps && fps < 30 ? 'low' : ''}`}>每秒 {fps} 格</div>
    </div>
  );
}

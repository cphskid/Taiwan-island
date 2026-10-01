import { useEffect, useRef, useState } from 'react';
import { createBoard, type Board } from '../render/board';
import { HEIGHTS, PREVIEW_COLS, PREVIEW_ROWS, previewTerrain } from '../data/babao-preview';
import { parseHeights } from '../core/terrain';
import { left, move, pieceAt, place, remove, rotate, type Piece } from '../core/pieces';
import type { Cell } from '../core/iso';

const CAGES = 5; // 八堡圳做好 5 個竹蛇籠
const heights = parseHeights(HEIGHTS);

// 拖放中的東西：從物品列拿新的，或拖地圖上已經放好的
type Drag = { kind: 'new' } | { kind: 'move'; id: number; x0: number; y0: number; moved: boolean };

// P6-1：觸控試玩場。平移縮放、點格子、從下方物品列拖竹蛇籠到地圖、旋轉、拿回、地形眼鏡。
// 水流規則還沒接（P6-2），所以竹蛇籠放哪裡都可以。
export function BoardView() {
  const host = useRef<HTMLDivElement>(null);
  const board = useRef<Board | null>(null);
  const [fps, setFps] = useState(0);
  const [picked, setPicked] = useState<Cell | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [contours, setContours] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  // 事件處理器裡要讀最新的值
  const live = useRef({ pieces, drag: null as Drag | null });
  live.current.pieces = pieces;

  useEffect(() => {
    let alive = true;
    let timer = 0;
    createBoard(host.current!, {
      cols: PREVIEW_COLS,
      rows: PREVIEW_ROWS,
      terrain: (c) => previewTerrain(c.col, c.row),
      heights,
      onTap: (c) => {
        setPicked(c);
        setSelected(null);
      },
      onPress: (c, e) => {
        const p = pieceAt(live.current.pieces, c);
        if (!p) return false;
        setSelected(p.id);
        setPicked(c);
        startDrag({ kind: 'move', id: p.id, x0: e.clientX, y0: e.clientY, moved: false });
        return true;
      },
    }).then((b) => {
      if (!alive) { b.destroy(); return; }
      board.current = b;
      timer = window.setInterval(() => setFps(Math.round(b.fps())), 500);
    });
    return () => { alive = false; clearInterval(timer); board.current?.destroy(); board.current = null; };
  }, []);

  useEffect(() => { board.current?.setPieces(pieces, selected); }, [pieces, selected]);
  useEffect(() => { board.current?.setContours(contours); }, [contours]);

  function canDrop(c: Cell | null, d: Drag): c is Cell {
    if (!c) return false;
    const there = pieceAt(live.current.pieces, c);
    return !there || (d.kind === 'move' && there.id === d.id);
  }

  function startDrag(d: Drag) {
    live.current.drag = d;
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
      if (!cur || e.type === 'pointercancel') return;
      if (cur.kind === 'move' && !cur.moved) return; // 只是點一下：選取
      const c = board.current?.cellAt(e.clientX, e.clientY) ?? null;
      const list = live.current.pieces;
      if (cur.kind === 'new') {
        if (!canDrop(c, cur)) return;
        const next = place(list, 'cage', c);
        setPieces(next);
        setSelected(next[next.length - 1].id);
        setPicked(c);
      } else if (c === null) {
        setPieces(remove(list, cur.id)); // 拖出地圖＝拿回物品列
        setSelected(null);
      } else if (canDrop(c, cur)) {
        setPieces(move(list, cur.id, c));
        setPicked(c);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  const remaining = left(pieces, 'cage', CAGES);

  return (
    <div className="board-wrap">
      <div className="board" ref={host} />

      <div className="tools">
        <button className="tool" disabled={selected === null} onClick={() => selected !== null && setPieces(rotate(pieces, selected))}>
          <span className="tool-icon">↻</span>旋轉
        </button>
        <button className="tool" disabled={selected === null} onClick={() => { if (selected !== null) { setPieces(remove(pieces, selected)); setSelected(null); } }}>
          <span className="tool-icon">⤓</span>拿回
        </button>
        <button className={`tool ${contours ? 'on' : ''}`} onClick={() => setContours(!contours)}>
          <span className="tool-icon">◎</span>地形眼鏡
        </button>
      </div>

      <div className="tray">
        <div
          className={`item ${remaining ? '' : 'empty'}`}
          onPointerDown={(e) => {
            if (!remaining) return;
            e.preventDefault();
            setGhost({ x: e.clientX, y: e.clientY });
            startDrag({ kind: 'new' });
          }}
        >
          <span className="cage-icon" />
          <span>竹蛇籠</span>
          <b>×{remaining}</b>
        </div>
      </div>

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
      {picked && <div className="picked">第 {picked.col + 1} 欄、第 {picked.row + 1} 列・高度 {heights(picked)}</div>}
    </div>
  );
}

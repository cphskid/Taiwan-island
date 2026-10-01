import { useEffect, useRef, useState } from 'react';
import { createBoard, type Board } from '../render/board';
import { PREVIEW_COLS, PREVIEW_ROWS, previewTerrain } from '../data/babao-preview';
import type { Cell } from '../core/iso';

// P6-0：佔位的八堡圳地圖＋每秒格數（驗收：學校平板 30 以上）
export function BoardView() {
  const host = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState(0);
  const [picked, setPicked] = useState<Cell | null>(null);

  useEffect(() => {
    let board: Board | null = null;
    let alive = true;
    let timer = 0;
    createBoard(host.current!, {
      cols: PREVIEW_COLS,
      rows: PREVIEW_ROWS,
      terrain: (c) => previewTerrain(c.col, c.row),
      onTap: setPicked,
    }).then((b) => {
      if (!alive) { b.destroy(); return; }
      board = b;
      timer = window.setInterval(() => setFps(Math.round(b.fps())), 500);
    });
    return () => { alive = false; clearInterval(timer); board?.destroy(); };
  }, []);

  return (
    <div className="board-wrap">
      <div className="board" ref={host} />
      <div className={`fps ${fps && fps < 30 ? 'low' : ''}`}>每秒 {fps} 格</div>
      {picked && <div className="picked">第 {picked.col + 1} 欄、第 {picked.row + 1} 列</div>}
    </div>
  );
}

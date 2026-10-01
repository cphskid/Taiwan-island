import { useEffect, useRef, useState, type RefObject } from 'react';
import { createBoard, type Board, type BoardOptions } from '../render/board';

// 建一個遊戲盤，元件拆掉時一起收掉。ready 每次重建好會加 1，用來觸發「把目前狀態再畫一次」。
// opts 用 ref 讀，事件處理器裡永遠拿到最新的版本。
export function useBoard(host: RefObject<HTMLDivElement | null>, opts: BoardOptions, deps: readonly unknown[]) {
  const board = useRef<Board | null>(null);
  const [ready, setReady] = useState(0);
  const [fps, setFps] = useState(0);
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    let alive = true;
    let timer = 0;
    createBoard(host.current!, {
      ...latest.current,
      terrain: (c) => latest.current.terrain(c),
      onTap: (c) => latest.current.onTap?.(c),
      onPress: (c, e) => latest.current.onPress?.(c, e) ?? false,
      flag: (c) => latest.current.flag?.(c) ?? null,
    }).then((b) => {
      if (!alive) { b.destroy(); return; }
      board.current = b;
      if (import.meta.env.DEV) (window as unknown as { __board: Board }).__board = b; // 瀏覽器測試用
      setReady((n) => n + 1);
      timer = window.setInterval(() => setFps(Math.round(b.fps())), 500);
    });
    return () => { alive = false; clearInterval(timer); board.current?.destroy(); board.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { board, ready, fps };
}

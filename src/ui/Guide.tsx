import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { Board } from '../render/board';
import type { Cell } from '../core/iso';

// 任務引導共用元件（每一章都用同一套，小朋友一看就知道「要做什麼、要去哪裡」）：
//
//   <Goal text="把水導到分水閘" />                常駐的一句話目標條（inline 放進上方的資訊列，floating 自己浮在畫面上方中間）
//   <Beacon style={{ left: '40%', top: '30%' }} label="港口" spot={!intro} />
//                                                  HTML 場景（海圖、圖片）上的目標標記：脈動圈＋上下跳的箭頭＋旗子文字
//   <BoardBeacon board={board} cell={gate} label="分水閘" spot={!intro} />
//                                                  等角遊戲盤上的目標標記，跟著地圖平移縮放；目標在畫面外就貼在邊緣、箭頭指過去
//   spot：第一次變成 true 的時候畫面暗下來、光圈縮到目標上（約 2.5 秒），等於「鏡頭帶到目標」
//   towards(dx, dy) / compass(dx, dy)：做錯時夥伴指方向用的「左下方」「東北邊」
//
// 標記放在 position:relative 的容器裡（.board-wrap、.art-frame），不擋點擊。

export function Goal({ text, floating }: { text: string; floating?: boolean }) {
  return (
    <div className={`quest ${floating ? 'floating' : ''}`}>
      <i>🎯</i><span key={text}>{text}</span>
    </div>
  );
}

const SPOT_MS = 2600;

// spot 從 false 變 true 時播一次聚光
function useSpot(spot: boolean | undefined, onStart?: () => void) {
  const [on, setOn] = useState(false);
  const played = useRef(false);
  useEffect(() => {
    if (!spot || played.current) return;
    played.current = true;
    setOn(true);
    onStart?.();
    const t = setTimeout(() => setOn(false), SPOT_MS);
    return () => clearTimeout(t);
  }, [spot]); // eslint-disable-line react-hooks/exhaustive-deps
  return on;
}

function Marker({ label, small, spotting }: { label?: string; small?: boolean; spotting: boolean }) {
  return (
    <>
      {spotting && <div className="beacon-spot" />}
      {!small && <><i className="beacon-ring" /><i className="beacon-ring late" /></>}
      <div className="beacon-flag">
        {label && <span>{spotting ? `🎯 ${label}` : label}</span>}
        <b>▼</b>
      </div>
    </>
  );
}

export function Beacon({ style, label, spot, small }: { style: CSSProperties; label?: string; spot?: boolean; small?: boolean }) {
  const spotting = useSpot(spot);
  return (
    <div className={`beacon ${small ? 'small' : ''} ${spotting ? 'spotting' : ''}`} style={style}>
      <Marker label={label} small={small} spotting={spotting} />
    </div>
  );
}

const EDGE = 44; // 目標離畫面邊多近就算「在外面」

export function BoardBeacon({ board, cell, label, spot, small }: {
  board: RefObject<Board | null>; cell: Cell; label?: string; spot?: boolean; small?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const arrow = useRef<HTMLElement>(null);
  const [out, setOut] = useState(false);
  const spotting = useSpot(spot, () => board.current?.focus(cell));

  useEffect(() => {
    let id = 0;
    let wasOut = false;
    const loop = () => {
      id = requestAnimationFrame(loop);
      const b = board.current, d = el.current, host = d?.offsetParent as HTMLElement | null;
      if (!b || !d || !host) return;
      const r = host.getBoundingClientRect();
      const p = b.clientOf(cell);
      let x = p.x - r.left, y = p.y - r.top;
      const isOut = x < EDGE || y < EDGE || x > r.width - EDGE || y > r.height - EDGE;
      if (isOut) {
        const deg = (Math.atan2(y - r.height / 2, x - r.width / 2) * 180) / Math.PI;
        x = Math.max(EDGE, Math.min(r.width - EDGE, x));
        y = Math.max(EDGE, Math.min(r.height - EDGE, y));
        if (arrow.current) arrow.current.style.rotate = `${deg}deg`;
      }
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.style.visibility = 'visible';
      if (isOut !== wasOut) { wasOut = isOut; setOut(isOut); }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [board, cell.col, cell.row]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={el} className={`beacon ${small ? 'small' : ''} ${spotting ? 'spotting' : ''} ${out ? 'edge' : ''}`} style={{ visibility: 'hidden' }}>
      {out ? (
        <div className="beacon-edge"><i ref={arrow}>➜</i>{label && <span>{label}</span>}</div>
      ) : <Marker label={label} small={small} spotting={spotting} />}
    </div>
  );
}

// 畫面上的方向（等角遊戲盤用）：dx 往右、dy 往下為正
const SCREEN = ['右邊', '右下方', '下面', '左下方', '左邊', '左上方', '上面', '右上方'];
// 上北下南的地圖（海圖、臺灣地圖）用
const COMPASS = ['東邊（右）', '東南邊（右下）', '南邊（下）', '西南邊（左下）', '西邊（左）', '西北邊（左上）', '北邊（上）', '東北邊（右上）'];
const sector = (dx: number, dy: number) => ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
export const towards = (dx: number, dy: number) => SCREEN[sector(dx, dy)];
export const compass = (dx: number, dy: number) => COMPASS[sector(dx, dy)];

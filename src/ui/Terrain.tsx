import { useId, type ReactElement } from 'react';

// 把「一格一格」的地圖畫成圓潤的一塊一塊：每格先畫成方塊，模糊後再切回清楚的邊（goo 效果），
// 相連的格子就會黏成一整片彎彎的陸地、湖、山坡，看不出格子。規則照舊一格一格算，只有畫面變。
// 一層一個 layer：test 決定哪些格子屬於這一層；fill 可以是顏色，也可以是貼圖（img）。
export interface TerrainLayer {
  test: (col: number, row: number) => boolean;
  fill?: string; // 顏色
  img?: string; // 貼圖網址（整張鋪滿畫面）
  grow?: number; // 往外長多少格（沙灘、岸邊用）
  soft?: number; // 邊有多圓（0.1～0.35 格）
  wobble?: number; // 岸邊彎彎曲曲的程度（格），預設 0.14
  opacity?: number;
  className?: string;
}

const U = 100;

export function Terrain({ cols, rows, layers, className = '' }: { cols: number; rows: number; layers: TerrainLayer[]; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = cols * U, H = rows * U;
  return (
    <svg className={`terrain ${className}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        {layers.map((l, i) => {
          const g = (l.grow ?? 0) * U, soft = (l.soft ?? 0.22) * U;
          const rects: ReactElement[] = [];
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            if (!l.test(c, r)) continue;
            // 貼著地圖邊的格子往外多畫一點，邊上才不會被磨圓；朝外的那一邊隨機進出一點，岸邊才會彎彎曲曲
            const wb = (l.wobble ?? 0.14) * U;
            const side = (dc: number, dr: number, k: number) => (c + dc >= 0 && r + dr >= 0 && c + dc < cols && r + dr < rows && l.test(c + dc, r + dr) ? wb : (jitter(c, r, k + i * 7) - 0.5) * 2 * wb);
            const x0 = c === 0 ? -U : c * U - g - side(-1, 0, 1), y0 = r === 0 ? -U : r * U - g - side(0, -1, 2);
            const x1 = c === cols - 1 ? W + U : (c + 1) * U + g + side(1, 0, 3), y1 = r === rows - 1 ? H + U : (r + 1) * U + g + side(0, 1, 4);
            rects.push(<rect key={`${c},${r}`} x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="#fff" />);
          }
          return (
            <g key={i}>
              <filter id={`${uid}f${i}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={soft} />
                <feComponentTransfer><feFuncA type="linear" slope="14" intercept="-6.5" /></feComponentTransfer>
              </filter>
              <mask id={`${uid}m${i}`} maskUnits="userSpaceOnUse" x={-U} y={-U} width={W + 2 * U} height={H + 2 * U}>
                <g filter={`url(#${uid}f${i})`}>{rects}</g>
              </mask>
            </g>
          );
        })}
      </defs>
      {layers.map((l, i) => (
        <g key={i} mask={`url(#${uid}m${i})`} opacity={l.opacity ?? 1} className={l.className}>
          {l.img ? <image href={l.img} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" /> : <rect x={0} y={0} width={W} height={H} fill={l.fill ?? '#fff'} />}
        </g>
      ))}
    </svg>
  );
}

// 同一個位置每次算出來都一樣的亂數（擺樹、錯開位置用）
export const jitter = (x: number, y: number, k: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };

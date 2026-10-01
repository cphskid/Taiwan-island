// 地形高度與等高線。純函式，不碰畫面。
//
// 每格一個整數高度（0 最低）。等高線畫在「相鄰兩格高度不同」的那條共用邊上，
// 差幾層就畫幾條線，所以線越密代表越陡。水流引擎（P6-2）也讀同一份高度：水只往一樣高或更低的格子流。

import type { Cell } from './iso';

export type Heights = (c: Cell) => number;

// 兩格共用的邊：se＝這格和 col+1 那格之間，sw＝這格和 row+1 那格之間
export type Side = 'se' | 'sw';

export interface ContourEdge {
  cell: Cell;
  side: Side;
  steps: number; // 高度差幾層＝畫幾條線
  up: boolean; // true：對面那格比較高
}

export function contourEdges(cols: number, rows: number, h: Heights): ContourEdge[] {
  const out: ContourEdge[] = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const here = h({ col, row });
      const pairs: [Side, Cell][] = [['se', { col: col + 1, row }], ['sw', { col, row: row + 1 }]];
      for (const [side, n] of pairs) {
        if (n.col >= cols || n.row >= rows) continue;
        const d = h(n) - here;
        if (d !== 0) out.push({ cell: { col, row }, side, steps: Math.abs(d), up: d > 0 });
      }
    }
  return out;
}

// 分層設色：低處綠、中間黃、高處褐，跟課本的地形圖同一套順序
const BANDS = [0x7cc46a, 0xb4d46b, 0xe4d77d, 0xe9b866, 0xcf8b4f, 0xa8653c];

export function bandColor(level: number): number {
  return BANDS[Math.max(0, Math.min(BANDS.length - 1, Math.round(level)))];
}

// 把一串字（每字一格的高度）變成查詢函式；超出範圍算 0
export function parseHeights(lines: readonly string[]): Heights {
  return ({ col, row }) => {
    const ch = lines[row]?.[col];
    return ch === undefined ? 0 : Number(ch);
  };
}

// 等角座標換算：格子 (col,row) ↔ 畫面 (x,y)。純函式，不碰畫面，之後水流引擎、點選、拖放都靠它。
//
// 菱形格子寬 TILE_W、高 TILE_H（2:1）。col 往右下走，row 往左下走；(0,0) 在最上面那個角。

export const TILE_W = 128;
export const TILE_H = 64;

export interface Cell { col: number; row: number }
export interface Point { x: number; y: number }

// 格子中心在畫面上的位置（以 (0,0) 的中心為原點）
export function cellToScreen({ col, row }: Cell): Point {
  return { x: (col - row) * (TILE_W / 2), y: (col + row) * (TILE_H / 2) };
}

// 畫面上一點落在哪一格（四捨五入到最近的格子中心）
export function screenToCell({ x, y }: Point): Cell {
  const a = x / (TILE_W / 2);
  const b = y / (TILE_H / 2);
  return { col: Math.round((a + b) / 2), row: Math.round((b - a) / 2) };
}

export function inside({ col, row }: Cell, cols: number, rows: number): boolean {
  return col >= 0 && row >= 0 && col < cols && row < rows;
}

// 整張地圖在畫面上的外框，用來置中與限制平移
export function boardBounds(cols: number, rows: number) {
  const left = -(rows - 1) * (TILE_W / 2) - TILE_W / 2;
  const right = (cols - 1) * (TILE_W / 2) + TILE_W / 2;
  const top = -TILE_H / 2;
  const bottom = (cols - 1 + rows - 1) * (TILE_H / 2) + TILE_H / 2;
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

// 畫的順序：越後面（畫面越下方）越晚畫，前面的東西才會蓋住後面的
export function drawOrder(cols: number, rows: number): Cell[] {
  const out: Cell[] = [];
  for (let s = 0; s <= cols + rows - 2; s++)
    for (let col = 0; col <= s; col++) {
      const row = s - col;
      if (col < cols && row < rows) out.push({ col, row });
    }
  return out;
}

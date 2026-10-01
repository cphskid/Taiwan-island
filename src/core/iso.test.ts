import { describe, expect, it } from 'vitest';
import { boardBounds, cellToScreen, drawOrder, inside, screenToCell, TILE_H, TILE_W } from './iso';

describe('iso', () => {
  it('每一格換到畫面再換回來是同一格', () => {
    for (let col = 0; col < 12; col++)
      for (let row = 0; row < 8; row++)
        expect(screenToCell(cellToScreen({ col, row }))).toEqual({ col, row });
  });

  it('點在菱形裡靠邊的位置也算那一格', () => {
    const c = cellToScreen({ col: 3, row: 2 });
    expect(screenToCell({ x: c.x + TILE_W * 0.2, y: c.y })).toEqual({ col: 3, row: 2 });
    expect(screenToCell({ x: c.x, y: c.y - TILE_H * 0.2 })).toEqual({ col: 3, row: 2 });
  });

  it('往右下一格是 col+1、往左下一格是 row+1', () => {
    expect(cellToScreen({ col: 1, row: 0 })).toEqual({ x: TILE_W / 2, y: TILE_H / 2 });
    expect(cellToScreen({ col: 0, row: 1 })).toEqual({ x: -TILE_W / 2, y: TILE_H / 2 });
  });

  it('界外判斷', () => {
    expect(inside({ col: 11, row: 7 }, 12, 8)).toBe(true);
    expect(inside({ col: 12, row: 0 }, 12, 8)).toBe(false);
    expect(inside({ col: 0, row: -1 }, 12, 8)).toBe(false);
  });

  it('畫的順序涵蓋全部格子、而且由後往前', () => {
    const order = drawOrder(12, 8);
    expect(order).toHaveLength(96);
    const ys = order.map((c) => cellToScreen(c).y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('外框寬高', () => {
    const b = boardBounds(12, 8);
    expect(b.width).toBe((12 + 8) * (TILE_W / 2));
    expect(b.height).toBe((12 + 8) * (TILE_H / 2));
  });
});

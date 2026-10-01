import { describe, expect, it } from 'vitest';
import { contourEdges, parseHeights, bandColor } from './terrain';
import { place, move, rotate, remove, left, pieceAt } from './pieces';
import { fitView, zoomAt, panBy, scaleLimits } from './camera';
import { fieldAt, reliefPixels } from './relief';

describe('等高線', () => {
  it('高度一樣的地方沒有線', () => {
    expect(contourEdges(3, 2, () => 2)).toEqual([]);
  });

  it('差幾層就畫幾條，並記得哪一邊比較高', () => {
    const h = parseHeights(['013', '000']);
    const e = contourEdges(3, 2, h);
    expect(e).toContainEqual({ cell: { col: 0, row: 0 }, side: 'se', steps: 1, up: true });
    expect(e).toContainEqual({ cell: { col: 1, row: 0 }, side: 'se', steps: 2, up: true });
    expect(e).toContainEqual({ cell: { col: 2, row: 0 }, side: 'sw', steps: 3, up: false });
    expect(e).toHaveLength(4); // (1,0)-(1,1) 也差 1
  });

  it('分層設色超出範圍時用最高或最低那層', () => {
    expect(bandColor(-3)).toBe(bandColor(0));
    expect(bandColor(99)).toBe(bandColor(5));
  });
});

describe('放竹蛇籠', () => {
  const a = { col: 1, row: 1 }, b = { col: 2, row: 1 };

  it('同一格不能放兩個', () => {
    const one = place([], 'cage', a);
    expect(place(one, 'cage', a)).toHaveLength(1);
    expect(left(place(one, 'cage', b), 'cage', 5)).toBe(3);
  });

  it('旋轉四次回到原方向', () => {
    let l = place([], 'cage', a);
    const id = l[0].id;
    for (let i = 0; i < 4; i++) l = rotate(l, id);
    expect(l[0].dir).toBe(0);
    expect(rotate(l, id)[0].dir).toBe(1);
  });

  it('搬到有東西的格子不動，搬到空格會動，拿掉後格子變空', () => {
    let l = place(place([], 'cage', a), 'cage', b);
    const [p, q] = l;
    expect(move(l, p.id, b)[0].cell).toEqual(a);
    l = move(l, p.id, { col: 5, row: 5 });
    expect(pieceAt(l, { col: 5, row: 5 })?.id).toBe(p.id);
    expect(pieceAt(remove(l, q.id), b)).toBeUndefined();
  });
});

describe('鏡頭', () => {
  const b = { left: -500, top: 0, width: 1000, height: 600 };
  const s = { width: 1000, height: 700 };

  it('一開始整張地圖放得下而且置中', () => {
    const v = fitView(b, s);
    expect(b.width * v.scale).toBeLessThan(s.width);
    expect(v.x + (b.left + b.width / 2) * v.scale).toBeCloseTo(s.width / 2);
  });

  it('縮放時手指底下那一點不動，也不會超過上下限', () => {
    const v = fitView(b, s);
    const z = zoomAt(v, 2, 600, 400, b, s);
    const before = { x: (600 - v.x) / v.scale, y: (400 - v.y) / v.scale };
    const after = { x: (600 - z.x) / z.scale, y: (400 - z.y) / z.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    const { max, min } = scaleLimits(b, s);
    expect(zoomAt(v, 100, 0, 0, b, s).scale).toBeCloseTo(max);
    expect(zoomAt(v, 0.01, 0, 0, b, s).scale).toBeCloseTo(min);
  });

  it('沒放大時拖不動（保持置中），放大後拖不出畫面', () => {
    const v = fitView(b, s);
    expect(panBy(v, 300, 0, b, s).x).toBeCloseTo(v.x);
    const z = zoomAt(v, 3, 500, 350, b, s);
    const far = panBy(z, 99999, 0, b, s);
    expect(far.x + b.left * far.scale).toBeLessThanOrEqual(40.001); // 左緣最多到畫面左邊 40px
  });
});

describe('彎曲的等高線（高度場）', () => {
  const h = parseHeights(['0123', '1234', '2345']);
  it('格子中心的高度就是那格的整數高度', () => {
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++) expect(fieldAt(h, 4, 3, col, row)).toBeCloseTo(h({ col, row }), 6);
  });
  it('兩格中間是兩邊之間的值', () => {
    const f = fieldAt(h, 4, 3, 0.5, 0);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });
  it('算得出一張圖，大小是格數×解析度', () => {
    const img = reliefPixels(h, 4, 3, 8, [0x00ff00, 0xffff00, 0xff0000, 0x0000ff, 0, 0xffffff], 0x000000);
    expect(img.width).toBe(32);
    expect(img.data.length).toBe(32 * 24 * 4);
  });
});

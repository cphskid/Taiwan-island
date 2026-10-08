import { describe, expect, it } from 'vitest';
import { LEVELS, PORTS, geo, portById, seaAt, SKY_H, SKY_W } from '../data/sky';
import { isLand } from '../data/skyLand';
import { checkPath, feeOf, finish, freshSky, pickSky, spawn, starsOf, step, unlocked, bumps } from './sky';

// 海上走得到嗎（在陸地格子上做 BFS，一格 20 地圖單位）
function sailable(a: { x: number; y: number }, b: { x: number; y: number }) {
  const C = 20, W = Math.ceil(SKY_W / C), H = Math.ceil(SKY_H / C);
  const cell = (p: { x: number; y: number }) => [Math.floor(p.x / C), Math.floor(p.y / C)];
  const [bx, by] = cell(b);
  const seen = new Set<number>(); const q = [cell(a)];
  seen.add(q[0][1] * W + q[0][0]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (Math.abs(x - bx) <= 1 && Math.abs(y - by) <= 1) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(ny * W + nx)) continue;
      if (isLand({ x: nx * C + C / 2, y: ny * C + C / 2 })) continue;
      seen.add(ny * W + nx); q.push([nx, ny]);
    }
  }
  return false;
}

describe('天空港的地圖', () => {
  it('港口在海上、臺灣中間是陸地', () => {
    for (const p of PORTS) if (p.kind !== 'air' && !p.gate) expect(isLand(p.at), p.name).toBe(false);
    expect(isLand(geo(121, 23.7))).toBe(true); // 臺灣中間
  });
  it('每一艘船都有海路可以走', () => {
    for (const lv of LEVELS) for (const t of lv.trips) if (t.kind === 'ship') expect(sailable(portById(t.from).at, portById(t.to).at), `${t.from}→${t.to}`).toBe(true);
  });
  it('海的名字', () => {
    expect(seaAt(geo(119.8, 24))).toBe('臺灣海峽');
    expect(seaAt(geo(121.3, 20.6))).toBe('巴士海峽');
    expect(seaAt(geo(125, 28))).toBe('東海');
    expect(seaAt(geo(113, 15))).toBe('南海');
    expect(seaAt(geo(135, 20))).toBe('太平洋');
    expect(seaAt(geo(92, 5))).toBe('印度洋');
  });
});

describe('天空港的規則', () => {
  const tw = geo(121, 23.7);
  it('船不能開過陸地，飛機可以', () => {
    const ship = spawn(1, 'ship', 'khh', 'sha');
    const plane = spawn(2, 'plane', 'khh', 'sha');
    const over = [ship.at, tw, geo(121, 27), portById('sha').at];
    expect(checkPath(ship, over).why).toMatch(/陸地/);
    expect(checkPath(plane, over).ok).toBe(true);
    expect(checkPath(ship, [ship.at, geo(119.5, 24), geo(121.5, 28), portById('sha').at]).ok).toBe(true);
  });
  it('線要畫到目的地', () => {
    const v = spawn(1, 'plane', 'tpe', 'tyo');
    expect(checkPath(v, [v.at, geo(130, 30)]).why).toMatch(/東京/);
  });
  it('照著線走，經過的海會記下來，到了就完成', () => {
    let v = spawn(1, 'plane', 'tyo', 'sin');
    v = { ...v, path: [geo(124, 26), geo(119.5, 22), portById('sin').at] };
    for (let i = 0; i < 400 && !v.done; i++) v = step(v, 0.5);
    expect(v.done).toBe(true);
    expect(v.seas).toContain('南海');
    expect(feeOf(v)).toBeGreaterThan(0);
  });
  it('從臺灣起飛的不收過境費', () => {
    let v = spawn(1, 'plane', 'tpe', 'tyo');
    v = { ...v, path: [portById('tyo').at] };
    for (let i = 0; i < 400 && !v.done; i++) v = step(v, 0.5);
    expect(feeOf(v)).toBe(0);
  });
  it('兩架飛機靠太近算擦撞，飛機和船不算', () => {
    const a = { ...spawn(1, 'plane', 'tpe', 'tyo'), path: [geo(130, 30)] };
    const b = { ...a, id: 2 };
    const c = { ...a, id: 3, kind: 'ship' as const };
    expect(bumps([a, b, c])).toEqual([[1, 2]]);
  });
  it('星星和解鎖', () => {
    expect(starsOf(LEVELS[1], 0, 40)).toBe(3);
    expect(starsOf(LEVELS[1], 0, 10)).toBe(2);
    expect(starsOf(LEVELS[1], 3, 40)).toBe(1);
    let s = freshSky();
    expect(unlocked(s, 2)).toBe(false);
    s = finish(s, 1, 2, ['東海']);
    expect(unlocked(s, 2)).toBe(true);
    expect(finish(s, 1, 1, []).best[1]).toBe(2);
    expect(pickSky(s, { v: 1, best: { 1: 3, 2: 9 }, seas: ['南海'] }).best).toEqual({ 1: 3, 2: 3 });
  });
});

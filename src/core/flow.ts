// 水流引擎（FlowEngine）。純函式，不碰畫面；畫面只照結果把水畫出來。
//
// 規則（給小朋友看得懂的簡化版）：
// 1. 河水沿著河的方向往下游流，每一道水流（lane）各自追蹤。
// 2. 碰到竹蛇籠就照籠子的方向轉彎；離開籠子回到河裡，又照河的方向往下流。
// 3. 竹蛇籠正面擋住水（方向跟水流相反）：水小就停住，水量 2 以上就把籠子沖壞，水照樣往下流。
// 4. 水只往一樣高或更低的格子流。被轉向比較高的岸邊時推不過去，照河的方向繼續流。
// 5. 被轉到一般的地上（不是河、不是圳道）就是淹到不該淹的地方。
// 6. 進了圳道，水沿著挖好的圳道往一樣高或更低的格子擴散；比上一格高的地方水就停住。
// 7. 每道水流有水量；流到分水閘的水量加起來夠了（need）才算過關，大水要把幾道水流都導進來。
// 8. 圳道有容量（cap）的話，流進分水閘的水超過容量，圳道就滿出來淹掉（洪水關：要留一些水給溪）。
//
// simulate() 一次算出整條水路和每一格水「幾步之後到」，step 動畫只是讓時間往前走。

import { inside, type Cell } from './iso';
import type { Heights } from './terrain';
import { pieceAt, type Dir, type Piece } from './pieces';

export type Kind = 'river' | 'grass' | 'field' | 'dry' | 'bamboo' | 'stone' | 'village' | 'tribe' | 'rock' | 'canal' | 'gate';

export interface Lane { cell: Cell; volume: number } // 河水從這格進來

export interface Ground {
  cols: number;
  rows: number;
  kind: (c: Cell) => Kind;
  heights: Heights;
  flow: Dir; // 河往哪個方向流
  lanes: Lane[];
  cap?: number; // 圳道最多裝多少水，超過就滿出來（沒有就不限）
}

export interface Wet { cell: Cell; t: number } // 第 t 步水到這格

export interface FlowResult {
  river: Wet[]; // 河裡與被轉向時經過的格子
  canal: Wet[]; // 圳道裡有水的格子
  broken: Wet[]; // 被沖壞的竹蛇籠
  flooded: Wet[]; // 淹到不該淹的地
  blocked: Wet[]; // 水被正面擋住停下來的地方
  gates: Cell[]; // 有水到的分水閘（目標）
  delivered: number; // 流到分水閘的水量
  overflow: boolean; // 水太多，圳道滿出來了
  steps: number; // 全部流完要幾步
}

const STEP: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const next = (c: Cell, d: Dir): Cell => ({ col: c.col + STEP[d][0], row: c.row + STEP[d][1] });
export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;
const key = (c: Cell) => `${c.col},${c.row}`;

// 地上的格子，加上玩家挖的圳道後是哪一種
export function kindWith(g: Ground, canals: readonly Cell[]): (c: Cell) => Kind {
  const dug = new Set(canals.map(key));
  return (c) => (dug.has(key(c)) ? 'canal' : g.kind(c));
}

// 能不能挖：只有草地可以挖成圳道
export const canDig = (g: Ground, c: Cell) => inside(c, g.cols, g.rows) && g.kind(c) === 'grass';
// 竹蛇籠只能放在河裡
export const canPlace = (g: Ground, c: Cell) => inside(c, g.cols, g.rows) && g.kind(c) === 'river';

export function simulate(g: Ground, pieces: readonly Piece[], canals: readonly Cell[]): FlowResult {
  const kind = kindWith(g, canals);
  const h = g.heights;
  const out: FlowResult = { river: [], canal: [], broken: [], flooded: [], blocked: [], gates: [], delivered: 0, overflow: false, steps: 0 };
  const brokenIds = new Set<number>();
  const inflow: (Wet & { volume: number })[] = []; // 水從哪一格、第幾步、多少水量進圳道
  const seenRiver = new Map<string, number>();
  const mark = (list: Wet[], cell: Cell, t: number) => list.push({ cell, t });

  for (const lane of g.lanes) {
    let c = lane.cell;
    let t = 0;
    const visited = new Set<string>();
    for (let guard = 0; guard < g.cols * g.rows * 4; guard++) {
      const k = `${key(c)}`;
      if (!seenRiver.has(k) || seenRiver.get(k)! > t) seenRiver.set(k, t);
      if (visited.has(k)) break; // 繞圈（籠子互相指）就停
      visited.add(k);

      let d: Dir = g.flow;
      const p = pieceAt(pieces, c);
      if (p && !brokenIds.has(p.id)) {
        if (p.dir === opposite(g.flow)) {
          if (lane.volume >= 2) {
            brokenIds.add(p.id);
            mark(out.broken, c, t);
          } else {
            mark(out.blocked, c, t);
            break;
          }
        } else d = p.dir;
      }

      let n = next(c, d);
      // 被轉向比較高的地方推不過去，照河的方向流
      if (d !== g.flow && inside(n, g.cols, g.rows) && h(n) > h(c)) {
        d = g.flow;
        n = next(c, d);
      }
      if (!inside(n, g.cols, g.rows)) break; // 流出地圖
      if (h(n) > h(c)) { mark(out.blocked, c, t); break; } // 前面比較高，水停住
      const kn = kind(n);
      t += 1;
      if (kn === 'river') { c = n; continue; }
      if (kn === 'canal' || kn === 'gate') { inflow.push({ cell: n, t, volume: lane.volume }); break; }
      if (kn === 'rock') { mark(out.blocked, c, t - 1); break; }
      mark(out.flooded, n, t);
      break;
    }
  }
  for (const [k, t] of seenRiver) {
    const [col, row] = k.split(',').map(Number);
    out.river.push({ cell: { col, row }, t });
  }

  // 圳道：從每個進水口往一樣高或更低、挖好的相鄰格子擴散（廣度優先，越早到 t 越小）
  const reached = new Map<string, number>();
  const gates = new Set<string>();
  for (const src of inflow) {
    const mine = new Map<string, number>([[key(src.cell), src.t]]);
    const queue: Wet[] = [{ cell: src.cell, t: src.t }];
    let arrives = false;
    for (let i = 0; i < queue.length; i++) {
      const { cell, t } = queue[i];
      if (kind(cell) === 'gate') { arrives = true; gates.add(key(cell)); }
      for (const d of [0, 1, 2, 3] as Dir[]) {
        const n = next(cell, d);
        if (!inside(n, g.cols, g.rows)) continue;
        const kn = kind(n);
        if (kn !== 'canal' && kn !== 'gate') continue;
        if (h(n) > h(cell) || mine.has(key(n))) continue;
        mine.set(key(n), t + 1);
        queue.push({ cell: n, t: t + 1 });
      }
    }
    if (arrives) out.delivered += src.volume;
    for (const [k, t] of mine) if (!reached.has(k) || reached.get(k)! > t) reached.set(k, t);
  }
  for (const [k, t] of reached) {
    const [col, row] = k.split(',').map(Number);
    out.canal.push({ cell: { col, row }, t });
  }
  for (const k of gates) {
    const [col, row] = k.split(',').map(Number);
    out.gates.push({ col, row });
  }

  // 圳道裝不下：分水閘那裡滿出來，淹到旁邊
  if (g.cap !== undefined && out.delivered > g.cap) {
    out.overflow = true;
    const last = Math.max(0, ...out.canal.map((w) => w.t));
    for (const cell of out.gates) mark(out.flooded, cell, last);
  }

  out.steps = Math.max(0, ...[out.river, out.canal, out.broken, out.flooded, out.blocked].flat().map((w) => w.t));
  return out;
}

// 這一關過了沒：流到分水閘的水量夠，而且沒有淹到別的地方
export function solved(r: FlowResult, need = 1): boolean {
  return r.delivered >= need && r.gates.length > 0 && r.flooded.length === 0;
}

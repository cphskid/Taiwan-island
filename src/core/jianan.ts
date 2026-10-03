// 第七章《縱貫與大圳》的謎題規則：調車場排車廂、烏山頭水庫分層填築、三年輪作、日月潭水管與落差、通水那天的分水門。
// 純函式，不碰畫面；關卡資料在 data/ch7.ts，用單元測試確認每一關都解得開、亂來會失敗。

// ── 1 縱貫鐵路：調車場 ─────────────────────────────
// 貨車從進站線一節一節開進來（cars[0] 最先進來）。每一節可以直接掛到火車頭後面，或先推進岔道（死巷，後進先出）。
// 火車往北開，一站一站卸貨：最遠的站要掛在最前面（緊貼火車頭），最近的站掛在最後面，到站一拆就走。
// 推進岔道一次算一次「調車」，次數不能超過 maxSide。
export interface Car { id: string; to: string; cargo: 'rice' | 'sugar' }
export interface YardLevel { cars: Car[]; order: string[]; sidings: number; maxSide: number; cap: number }
export interface Yard { input: Car[]; sides: Car[][]; out: Car[]; sideMoves: number }
export type From = 'in' | number;
export type To = 'out' | number;
export type YardError = 'wrong' | 'tooMany' | 'full' | 'empty';

export const yardStart = (lv: YardLevel): Yard => ({ input: [...lv.cars], sides: Array.from({ length: lv.sidings }, () => []), out: [], sideMoves: 0 });

const rank = (lv: YardLevel, c: Car) => lv.order.indexOf(c.to);
const remaining = (y: Yard) => [...y.input, ...y.sides.flat()];
// 現在該掛上去的是哪一站（剩下的車廂裡最遠的那站）
export const nextNeeded = (lv: YardLevel, y: Yard): string | null => {
  const r = remaining(y);
  return r.length ? lv.order[Math.min(...r.map((c) => rank(lv, c)))] : null;
};
export const peek = (y: Yard, from: From): Car | undefined => from === 'in' ? y.input[0] : y.sides[from][y.sides[from].length - 1];

export function yardMove(lv: YardLevel, y: Yard, from: From, to: To): { yard: Yard; error?: YardError } {
  const car = peek(y, from);
  if (!car || from === to) return { yard: y, error: 'empty' };
  if (to === 'out' && car.to !== nextNeeded(lv, y)) return { yard: y, error: 'wrong' };
  if (to !== 'out' && y.sides[to].length >= lv.cap) return { yard: y, error: 'full' };
  if (to !== 'out' && y.sideMoves >= lv.maxSide) return { yard: y, error: 'tooMany' };
  const input = from === 'in' ? y.input.slice(1) : y.input;
  const sides = y.sides.map((s, i) => {
    let t = i === from ? s.slice(0, -1) : s;
    if (i === to) t = [...t, car];
    return t;
  });
  return { yard: { input, sides, out: to === 'out' ? [...y.out, car] : y.out, sideMoves: y.sideMoves + (to === 'out' ? 0 : 1) } };
}
export const yardDone = (lv: YardLevel, y: Yard) => y.out.length === lv.cars.length;

// 最少要調車幾次、怎麼調（BFS；測試、示範用）
// from：從排到一半的樣子接著算（卡住了沒、下一步提示）
export function yardSolve(lv: YardLevel, from?: Yard): { moves: [From, To][]; sideMoves: number } | null {
  const free: YardLevel = { ...lv, maxSide: 99 };
  const key = (y: Yard) => `${y.input.map((c) => c.id).join('')}|${y.sides.map((s) => s.map((c) => c.id).join('')).join('/')}`;
  // 0-1 BFS：掛上火車不算次數，推進岔道算 1 次
  const start = from ?? yardStart(free);
  const dq: { y: Yard; moves: [From, To][] }[] = [{ y: start, moves: [] }];
  const seen = new Map<string, number>([[key(start), 0]]);
  while (dq.length) {
    const { y, moves } = dq.shift()!;
    if (yardDone(free, y)) return y.sideMoves <= lv.maxSide ? { moves, sideMoves: y.sideMoves } : null;
    const froms: From[] = ['in', ...y.sides.map((_, i) => i)];
    const tos: To[] = ['out', ...y.sides.map((_, i) => i)];
    for (const f of froms) for (const t of tos) {
      const r = yardMove(free, y, f, t);
      if (r.error) continue;
      const k = key(r.yard);
      if ((seen.get(k) ?? Infinity) <= r.yard.sideMoves) continue;
      seen.set(k, r.yard.sideMoves);
      const item = { y: r.yard, moves: [...moves, [f, t] as [From, To]] };
      if (t === 'out') dq.unshift(item); else dq.push(item);
    }
  }
  return null;
}

// ── 2 烏山頭水庫：土石分層填築 ───────────────────────
// 大壩的剖面是梯形，由下往上三層（寬 9、7、5 格），每層最外面兩格已經鋪了石頭。
// 規則：每一層都要有黏土（不透水的心牆），上下層的黏土要連在一起（同一排或斜對角），
// 黏土的左右要用砂包住（直接碰到石頭，水一沖細土就流走），材料照庫存用完。
export type Mat = 'rock' | 'sand' | 'clay';
export interface DamLevel { widths: number[]; stock: Record<Mat, number> }
export type Dam = (Mat | null)[][]; // dam[0] 是最下面那層
export type DamProblem = 'empty' | 'leak' | 'gap' | 'wash' | 'stock';

export const damStart = (lv: DamLevel): Dam => lv.widths.map((w) => Array.from({ length: w }, (_, i) => (i === 0 || i === w - 1 ? 'rock' : null)));
export const isFixed = (lv: DamLevel, row: number, i: number) => i === 0 || i === lv.widths[row] - 1;
// 這一格在 9 格寬底座上的第幾排（上層比較窄，往中間縮）
export const colOf = (lv: DamLevel, row: number, i: number) => i + (lv.widths[0] - lv.widths[row]) / 2;
export const used = (lv: DamLevel, d: Dam): Record<Mat, number> => {
  const n: Record<Mat, number> = { rock: 0, sand: 0, clay: 0 };
  d.forEach((r, row) => r.forEach((m, i) => { if (m && !isFixed(lv, row, i)) n[m] += 1; }));
  return n;
};

export function damCheck(lv: DamLevel, d: Dam): { ok: boolean; problem: DamProblem | null; row: number } {
  if (d.some((r) => r.some((m) => m === null))) return { ok: false, problem: 'empty', row: d.findIndex((r) => r.some((m) => m === null)) };
  const u = used(lv, d);
  if ((Object.keys(u) as Mat[]).some((m) => u[m] > lv.stock[m])) return { ok: false, problem: 'stock', row: -1 };
  for (let row = 0; row < d.length; row++) {
    const r = d[row];
    // 黏土碰到石頭：細土被水帶走
    const bad = r.findIndex((m, i) => m === 'clay' && (r[i - 1] === 'rock' || r[i + 1] === 'rock'));
    if (bad >= 0) return { ok: false, problem: 'wash', row };
    if (!r.includes('clay')) return { ok: false, problem: 'leak', row };
  }
  for (let row = 1; row < d.length; row++) {
    const up = d[row].flatMap((m, i) => (m === 'clay' ? [colOf(lv, row, i)] : []));
    const down = d[row - 1].flatMap((m, i) => (m === 'clay' ? [colOf(lv, row - 1, i)] : []));
    if (!up.some((c) => down.some((e) => Math.abs(c - e) <= 1))) return { ok: false, problem: 'gap', row };
  }
  return { ok: true, problem: null, row: -1 };
}

// 示範：心牆放正中間，左右包砂，其他填石頭
export function damSolve(lv: DamLevel): Dam {
  return lv.widths.map((w) => Array.from({ length: w }, (_, i) => {
    const mid = (w - 1) / 2;
    return i === mid ? 'clay' : Math.abs(i - mid) === 1 ? 'sand' : 'rock';
  }));
}

// ── 3 三年輪作 ────────────────────────────────────
// 給水區分成三區（面積不同）。每區三年裡水稻、甘蔗、雜作各種一次；每一年的用水＝每區面積×那種作物要的水，
// 不能超過那一年水庫放得出來的水。
export type Crop = 'rice' | 'cane' | 'misc';
export const CROPS: Crop[] = ['rice', 'cane', 'misc'];
export const WATER: Record<Crop, number> = { rice: 3, cane: 2, misc: 1 };
export interface RotaLevel { zones: string[]; areas: number[]; supply: number[] }
export type Rota = (Crop | null)[][]; // rota[年][區]

export const rotaWater = (lv: RotaLevel, row: readonly (Crop | null)[]) => row.reduce((a, c, z) => a + (c ? lv.areas[z] * WATER[c] : 0), 0);
// 規則：① 每一年三區種的作物都不一樣（每年都有一區種稻）② 每一區三年裡三種都輪到 ③ 每年用水不超過供水
export function rotaCheck(lv: RotaLevel, r: Rota): { ok: boolean; full: boolean; over: number[]; repeat: number[]; mix: number[] } {
  const full = r.every((row) => row.every((c) => c !== null));
  const over = r.flatMap((row, y) => (rotaWater(lv, row) > lv.supply[y] ? [y] : []));
  const dup = (got: (Crop | null)[]) => { const g = got.filter((c): c is Crop => c !== null); return new Set(g).size < g.length; };
  const repeat = lv.zones.flatMap((_, z) => (dup(r.map((row) => row[z])) ? [z] : []));
  const mix = r.flatMap((row, y) => (dup(row) ? [y] : []));
  return { ok: full && !over.length && !repeat.length && !mix.length, full, over, repeat, mix };
}
export const ALL_RICE = (lv: RotaLevel) => rotaWater(lv, lv.zones.map(() => 'rice' as Crop));

const perms = (a: Crop[]): Crop[][] => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
// 全部的解（每區一種排列，再看每年用水）
export function rotaSolutions(lv: RotaLevel): Rota[] {
  const P = perms(CROPS);
  const out: Rota[] = [];
  const go = (z: number, cols: Crop[][]) => {
    if (z === lv.zones.length) {
      const r: Rota = lv.supply.map((_, y) => cols.map((c) => c[y]));
      if (rotaCheck(lv, r).ok) out.push(r);
      return;
    }
    for (const p of P) go(z + 1, [...cols, p]);
  };
  go(0, []);
  return out;
}

// ── 4 日月潭：水管與落差 ────────────────────────────
// 方格由上往下越來越低（第 0 排最高）。水從日月潭流出，沿著接好的水管走；水只能往同一排或更低的地方流，不能往上爬。
// 接到的水管有開口沒接上就會漏水。發電量＝落差×水量：漏水水量剩一半，接到兩座發電所水也分成兩半。
export type Dir = 0 | 1 | 2 | 3; // 北東南西
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export type Shape = 'I' | 'L' | 'T';
const BASE: Record<Shape, number> = { I: 0b0101, L: 0b0011, T: 0b0111 }; // bit0 北、bit1 東、bit2 南、bit3 西
export type Tile =
  | { k: 'pipe'; shape: Shape; rot: number; fixed?: boolean }
  | { k: 'rock' }
  | { k: 'lake'; open: Dir }
  | { k: 'plant'; open: Dir; name: string };
export interface PipeLevel { cols: number; rows: number; tiles: Tile[]; need: number }
export const at = (lv: PipeLevel, c: number, r: number) => lv.tiles[r * lv.cols + c];
export const heightOf = (lv: PipeLevel, r: number) => lv.rows - 1 - r;

export function openings(t: Tile): number {
  if (t.k === 'pipe') { const b = BASE[t.shape]; const s = ((t.rot % 4) + 4) % 4; return ((b << s) | (b >> (4 - s))) & 0b1111; }
  if (t.k === 'lake' || t.k === 'plant') return 1 << t.open;
  return 0;
}
export const rotate = (lv: PipeLevel, i: number): PipeLevel => ({
  ...lv, tiles: lv.tiles.map((t, k) => (k === i && t.k === 'pipe' && !t.fixed ? { ...t, rot: (t.rot + 1) % 4 } : t)),
});

export interface Flow { wet: boolean[]; plants: number[]; leaks: number[]; uphill: boolean; power: number; drop: number[]; ok: boolean }
export function flow(lv: PipeLevel): Flow {
  const n = lv.tiles.length;
  const wet = Array(n).fill(false) as boolean[];
  const src = lv.tiles.findIndex((t) => t.k === 'lake');
  const q = [src];
  wet[src] = true;
  let uphill = false;
  const leaks = new Set<number>();
  while (q.length) {
    const i = q.shift()!;
    const c = i % lv.cols, r = Math.floor(i / lv.cols);
    const o = openings(lv.tiles[i]);
    for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
      if (!(o & (1 << d))) continue;
      const nc = c + DX[d], nr = r + DY[d];
      const j = nr * lv.cols + nc;
      const ok = nc >= 0 && nc < lv.cols && nr >= 0 && nr < lv.rows && (openings(lv.tiles[j]) & (1 << ((d + 2) % 4)));
      if (!ok) { leaks.add(i); continue; }
      if (wet[j]) continue;
      if (d === 0) { uphill = true; continue; } // 往上爬：水上不去（這個開口也沒有水出去，不算漏）
      wet[j] = true;
      if (lv.tiles[j].k !== 'plant') q.push(j);
    }
  }
  const plants = lv.tiles.flatMap((t, i) => (t.k === 'plant' && wet[i] ? [i] : []));
  const top = heightOf(lv, Math.floor(src / lv.cols));
  const drop = plants.map((i) => top - heightOf(lv, Math.floor(i / lv.cols)));
  const share = plants.length ? 1 / plants.length : 0;
  const power = drop.reduce((a, d) => a + d * share, 0) * (leaks.size ? 0.5 : 1);
  return { wet, plants, leaks: [...leaks], uphill, power, drop, ok: power >= lv.need };
}

// 試遍每一塊水管的方向，找出全部的接法（測試用；格子不大）
export function pipeSolutions(lv: PipeLevel): number[][] {
  const free = lv.tiles.flatMap((t, i) => (t.k === 'pipe' && !t.fixed ? [i] : []));
  const out: number[][] = [];
  const rots = Array(free.length).fill(0) as number[];
  const go = (k: number) => {
    if (k === free.length) {
      const t = lv.tiles.map((x, i) => { const f = free.indexOf(i); return f >= 0 && x.k === 'pipe' ? { ...x, rot: rots[f] } : x; });
      if (flow({ ...lv, tiles: t }).ok) out.push([...rots]);
      return;
    }
    for (let r = 0; r < 4; r++) { rots[k] = r; go(k + 1); }
  };
  go(0);
  return out;
}

// ── 5 通水那天：分水門 ────────────────────────────
// 照三年輪作第一年的種法放水：每一區的水門要開到「面積×作物要的水」，合起來不能超過水庫放的水。
export function gateCheck(lv: RotaLevel, year: readonly Crop[], open: readonly number[]): { ok: boolean; dry: number[]; flood: number[]; over: boolean } {
  const need = year.map((c, z) => lv.areas[z] * WATER[c]);
  const dry = need.flatMap((n, z) => (open[z] < n ? [z] : []));
  const flood = need.flatMap((n, z) => (open[z] > n ? [z] : []));
  const over = open.reduce((a, b) => a + b, 0) > lv.supply[0];
  return { ok: !dry.length && !flood.length && !over, dry, flood, over };
}

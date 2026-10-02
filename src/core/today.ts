// 終章《今天的島嶼》的謎題規則：十大建設分類與放地圖、高鐵路線、社區一起做決定、時光博物館排時間軸。
// 純函式，不碰畫面；畫面只照結果擺。

// ── 配對／排序（十大建設分類、放地圖、博物館時間軸都用）──
// answer：每一個東西正確的位置；placed：玩家放的位置。回傳放錯（或還沒放）的東西
export function wrongPlaces(answer: Readonly<Record<string, string>>, placed: Readonly<Record<string, string | undefined>>): string[] {
  return Object.keys(answer).filter((id) => placed[id] !== answer[id]);
}
export const allPlaced = (ids: readonly string[], placed: Readonly<Record<string, string | undefined>>) => ids.every((id) => placed[id] !== undefined);

// ── 高鐵：在西部格子地圖上畫一條從台北到高雄的路線，挑幾個站停 ──
//   .  平地      M  山（不能過）   W  保護區濕地（不能過）
//   c  城市（可以設站）   C  一定要停的大城市   T  台北（起點）   K  高雄（終點）
export interface RailLevel {
  rows: string[];
  step: number; // 每走一格幾分鐘
  turn: number; // 每轉一次彎多幾分鐘（彎道要減速）
  stop: number; // 中間每停一站多幾分鐘
  limit: number; // 台北到高雄最多幾分鐘
  maxGap: number; // 站跟站之間最多走幾格（中間的人才搭得到）
  minGap: number; // 站跟站之間最少走幾格（太近車子加速不起來）
}
export interface Cell { col: number; row: number }
export const cellKey = (c: Cell) => `${c.col},${c.row}`;
export const railAt = (lv: RailLevel, c: Cell) => lv.rows[c.row]?.[c.col] ?? 'M';
export const passable = (lv: RailLevel, c: Cell) => !['M', 'W'].includes(railAt(lv, c));
export const isCity = (lv: RailLevel, c: Cell) => ['c', 'C', 'T', 'K'].includes(railAt(lv, c));
export function findCell(lv: RailLevel, ch: string): Cell {
  for (let row = 0; row < lv.rows.length; row++) {
    const col = lv.rows[row].indexOf(ch);
    if (col >= 0) return { col, row };
  }
  throw new Error(`no ${ch}`);
}
export const neighbors = (a: Cell, b: Cell) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

export type RailProblem = 'start' | 'end' | 'broken' | 'blocked' | 'loop' | 'mustStop' | 'gap' | 'close' | 'slow';
export interface RailResult {
  ok: boolean;
  minutes: number;
  turns: number;
  problems: RailProblem[];
  gaps: number[]; // 每一段站距（格）
}

// 算一條路線要幾分鐘、有沒有犯規。path 從台北開始；stops 是中間停的站（不含起點終點）
export function railRun(lv: RailLevel, path: readonly Cell[], stops: readonly string[]): RailResult {
  const problems: RailProblem[] = [];
  const T = findCell(lv, 'T'), K = findCell(lv, 'K');
  if (!path.length || cellKey(path[0]) !== cellKey(T)) problems.push('start');
  if (!path.length || cellKey(path[path.length - 1]) !== cellKey(K)) problems.push('end');
  let turns = 0;
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (!passable(lv, c)) problems.push('blocked');
    if (seen.has(cellKey(c))) problems.push('loop');
    seen.add(cellKey(c));
    if (i > 0 && !neighbors(path[i - 1], c)) problems.push('broken');
    if (i > 1) {
      const d1 = [path[i - 1].col - path[i - 2].col, path[i - 1].row - path[i - 2].row];
      const d2 = [c.col - path[i - 1].col, c.row - path[i - 1].row];
      if (d1[0] !== d2[0] || d1[1] !== d2[1]) turns++;
    }
  }
  // 停的站：只算真的在路線上、又是城市的格子
  const stopSet = new Set(stops);
  const at = path.map((c, i) => (i === 0 || i === path.length - 1 || (stopSet.has(cellKey(c)) && isCity(lv, c)) ? i : -1)).filter((i) => i >= 0);
  const gaps = at.slice(1).map((i, k) => i - at[k]);
  if (gaps.some((g) => g > lv.maxGap)) problems.push('gap');
  if (gaps.some((g) => g < lv.minGap)) problems.push('close');
  const must = lv.rows.flatMap((line, row) => [...line].flatMap((ch, col) => (ch === 'C' ? [cellKey({ col, row })] : [])));
  if (must.some((k) => !stopSet.has(k) || !path.some((c) => cellKey(c) === k))) problems.push('mustStop');
  const middle = Math.max(0, at.length - 2);
  const minutes = Math.max(0, path.length - 1) * lv.step + turns * lv.turn + middle * lv.stop;
  if (minutes > lv.limit) problems.push('slow');
  const uniq = [...new Set(problems)];
  return { ok: uniq.length === 0, minutes, turns, problems: uniq, gaps };
}

// 找最快、又守規則的路線（示範用，也讓測試證明這一關有解）。格子很小，直接深度優先找全部的路。
export function railSolve(lv: RailLevel): { path: Cell[]; stops: string[]; minutes: number } | null {
  const T = findCell(lv, 'T'), K = findCell(lv, 'K');
  let best: { path: Cell[]; stops: string[]; minutes: number } | null = null;
  const path: Cell[] = [T];
  const seen = new Set([cellKey(T)]);
  const maxLen = Math.floor(lv.limit / lv.step) + 1;
  const walk = () => {
    const end = path[path.length - 1];
    if (cellKey(end) === cellKey(K)) {
      const s = bestStops(lv, path);
      if (s && (!best || s.minutes < best.minutes)) best = { path: [...path], ...s };
      return;
    }
    if (path.length >= maxLen) return;
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const n = { col: end.col + dc, row: end.row + dr };
      if (n.row < 0 || n.row >= lv.rows.length || n.col < 0 || n.col >= lv.rows[0].length) continue;
      if (!passable(lv, n) || seen.has(cellKey(n))) continue;
      path.push(n); seen.add(cellKey(n));
      walk();
      path.pop(); seen.delete(cellKey(n));
    }
  };
  walk();
  return best;
}

// 一條路線上，停哪幾站最省時間又守站距（動態規劃：站越少越快）
export function bestStops(lv: RailLevel, path: readonly Cell[]): { stops: string[]; minutes: number } | null {
  const n = path.length;
  const must = new Set(path.flatMap((c, i) => (railAt(lv, c) === 'C' ? [i] : [])));
  const can = (i: number) => i === 0 || i === n - 1 || isCity(lv, path[i]);
  // f[i]：停在 i 時，前面最少停幾站（含 i）
  const f: number[] = Array(n).fill(Infinity);
  const from: number[] = Array(n).fill(-1);
  f[0] = 0;
  for (let i = 1; i < n; i++) {
    if (!can(i)) continue;
    for (let j = i - 1; j >= 0 && i - j <= lv.maxGap; j--) {
      if (i - j < lv.minGap || f[j] === Infinity) continue;
      // j 和 i 之間不能跳過一定要停的站
      let skip = false;
      for (const m of must) if (m > j && m < i) skip = true;
      if (skip) continue;
      if (f[j] + 1 < f[i]) { f[i] = f[j] + 1; from[i] = j; }
    }
  }
  if (f[n - 1] === Infinity) return null;
  const at: number[] = [];
  for (let i = n - 1; i >= 0; i = from[i]) { at.unshift(i); if (i === 0) break; }
  const stops = at.slice(1, -1).map((i) => cellKey(path[i]));
  const r = railRun(lv, path, stops);
  return r.ok ? { stops, minutes: r.minutes } : null;
}

// ── 一起做決定：空地分成四塊，每塊蓋公園、停車場或市場；每一組居民有自己的條件 ──
export type Use = 'park' | 'parking' | 'market';
export const USES: Use[] = ['park', 'parking', 'market'];
// 四塊地：0 左上（學校旁）1 右上（大馬路旁）2 左下（老房子旁）3 右下（公寓旁）
export type Plan = (Use | null)[];
export interface Group { id: string; ok: (p: Plan) => boolean }
const ADJ = [[1, 2], [0, 3], [0, 3], [1, 2]];
export const GROUP_RULES: Record<string, (p: Plan) => boolean> = {
  kids: (p) => p[0] === 'park' || p[2] === 'park', // 小朋友：公園要在學校這一邊（左邊）
  elders: (p) => p.some((u, i) => u === 'market' && ADJ[i].some((j) => p[j] === 'park')), // 長輩：買完菜，隔壁就有公園可以坐
  drivers: (p) => p[0] === 'parking' || p[1] === 'parking', // 開車的人：停車場要靠大馬路（上面）
  neighbors: (p) => p[3] !== 'parking' && p[3] !== 'market' && p[3] !== null, // 公寓鄰居：窗外不要車子和攤販的吵鬧
  vendors: (p) => p[2] === 'market' || p[3] === 'market', // 攤販：市場要在住家多的下面那一排
};
export interface VoteResult { yes: string[]; no: string[]; passed: boolean; everyone: boolean }
// 試投票：條件都做到的組投贊成。過半數就通過；全部都贊成才是「讓最多人可以接受」
export function vote(p: Plan, groups: readonly string[] = Object.keys(GROUP_RULES)): VoteResult {
  const full = p.length === 4 && p.every((u) => u !== null);
  const yes = full ? groups.filter((g) => GROUP_RULES[g](p)) : [];
  const no = groups.filter((g) => !yes.includes(g));
  return { yes, no, passed: yes.length * 2 > groups.length, everyone: no.length === 0 };
}
// 全部的方案裡，讓每一組都接受的有哪些（測試證明只有一個）
export function everyonePlans(): Use[][] {
  const out: Use[][] = [];
  for (const a of USES) for (const b of USES) for (const c of USES) for (const d of USES) {
    const p = [a, b, c, d];
    if (vote(p).everyone) out.push(p);
  }
  return out;
}

// 第一次舉手表決：整塊地只能選一種，三種票數很接近
export function plurality(votes: Readonly<Record<Use, number>>): { win: Use; share: number; against: number } {
  const total = USES.reduce((s, u) => s + votes[u], 0);
  const win = USES.reduce((a, b) => (votes[b] > votes[a] ? b : a));
  return { win, share: votes[win] / total, against: total - votes[win] };
}

// 第一章《島嶼的第一道火光》的謎題規則：打製石器、野燒陶器、磨製石器、煉鐵砍樹。
// 純函式，不碰畫面；關卡資料在 data/ch1.ts，用單元測試確認每一關都解得開。

export interface Cell { col: number; row: number }
export type Dir = 'up' | 'down' | 'left' | 'right';
const STEP: Record<Dir, Cell> = { up: { col: 0, row: -1 }, down: { col: 0, row: 1 }, left: { col: -1, row: 0 }, right: { col: 1, row: 0 } };
export const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
export const ck = (c: Cell) => `${c.col},${c.row}`;
const add = (a: Cell, d: Dir): Cell => ({ col: a.col + STEP[d].col, row: a.row + STEP[d].row });
const back = (d: Dir): Dir => ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[d];

// ── 打製石器 ──────────────────────────────────
// 石頭畫成格子：# 要留下來的形狀、o 要敲掉的、. 空的。
// 從外面敲一格（那一面外側要是空的），石片會連同它後面一格一起掉下來（石片很大片）。
// 掉下來的有 # 就是敲壞了。
export interface KnapLevel { rows: string[] }
export interface Stone { left: Set<string>; keep: Set<string> }

export function stoneOf(lv: KnapLevel): Stone {
  const left = new Set<string>(), keep = new Set<string>();
  lv.rows.forEach((line, row) => [...line].forEach((ch, col) => {
    if (ch === '#' || ch === 'o') left.add(ck({ col, row }));
    if (ch === '#') keep.add(ck({ col, row }));
  }));
  return { left, keep };
}

// 這一格可以往 d 方向敲嗎（槌子從反方向來，那一側要是空的）
export function canStrike(s: Stone, c: Cell, d: Dir): boolean {
  return s.left.has(ck(c)) && !s.left.has(ck(add(c, back(d))));
}

// 敲下去會掉哪幾格
export function flake(s: Stone, c: Cell, d: Dir): Cell[] {
  if (!canStrike(s, c, d)) return [];
  const next = add(c, d);
  return s.left.has(ck(next)) ? [c, next] : [c];
}

export function strike(s: Stone, c: Cell, d: Dir): { stone: Stone; broke: boolean; fell: Cell[] } {
  const fell = flake(s, c, d);
  const broke = fell.some((x) => s.keep.has(ck(x)));
  const left = new Set(s.left);
  fell.forEach((x) => left.delete(ck(x)));
  return { stone: { left, keep: s.keep }, broke, fell };
}

export const knapDone = (s: Stone) => s.left.size === s.keep.size && [...s.keep].every((k) => s.left.has(k));

const cellOf = (k: string): Cell => { const [col, row] = k.split(',').map(Number); return { col, row }; };

// 找一條敲得完的順序（不一定最少下；解不開回 null）；給測試和提示用。走過、證明解不開的形狀記起來不再試
export function knapSolve(s: Stone): { cell: Cell; dir: Dir }[] | null {
  const dead = new Set<string>();
  const key = (st: Stone) => [...st.left].sort().join(';');
  const go = (st: Stone): { cell: Cell; dir: Dir }[] | null => {
    if (knapDone(st)) return [];
    const k0 = key(st);
    if (dead.has(k0)) return null;
    for (const k of st.left) {
      if (st.keep.has(k)) continue;
      const c = cellOf(k);
      for (const d of DIRS) {
        if (!canStrike(st, c, d)) continue;
        const r = strike(st, c, d);
        if (r.broke) continue;
        const rest = go(r.stone);
        if (rest) return [{ cell: c, dir: d }, ...rest];
      }
    }
    dead.add(k0);
    return null;
  };
  return go(s);
}

// ── 野燒陶器 ──────────────────────────────────
// 陶罐四面（北東南西），周圍 8 個柴堆位置。正面的柴給那一面 2 分熱，角落的柴給相鄰兩面各 1 分。
// 每一面都要 3～4 分才燒得好：太冷燒不熟，太燙會裂。風從哪邊吹來，那一面（角落風就是兩面）少 1 分。
export type Side = 'N' | 'E' | 'S' | 'W';
export type Slot = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export const SIDES: Side[] = ['N', 'E', 'S', 'W'];
export const SLOTS: Slot[] = ['NW', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W'];
export const HEAT_MIN = 3;
export const HEAT_MAX = 4;
export const SLOT_CAP = 2; // 一個位置最多疊 2 捆柴

export interface FireLevel { wood: number; wind: Slot | null; wet: Slot[] }
export type Pile = Partial<Record<Slot, number>>;

const sidesOf = (s: Slot): Side[] => [...s] as Side[];

export function heat(lv: FireLevel, pile: Pile): Record<Side, number> {
  const h: Record<Side, number> = { N: 0, E: 0, S: 0, W: 0 };
  for (const slot of SLOTS) {
    const n = pile[slot] ?? 0;
    const ss = sidesOf(slot);
    ss.forEach((side) => { h[side] += n * (ss.length === 1 ? 2 : 1); });
  }
  if (lv.wind) sidesOf(lv.wind).forEach((side) => { h[side] -= 1; });
  return h;
}

export const used = (pile: Pile) => SLOTS.reduce((a, s) => a + (pile[s] ?? 0), 0);

export type FireResult = 'ok' | 'cold' | 'crack' | 'more';
// 柴要全部放完才點火；回傳每一面的結果
export function fire(lv: FireLevel, pile: Pile): { result: FireResult; heat: Record<Side, number> } {
  const h = heat(lv, pile);
  if (used(pile) < lv.wood) return { result: 'more', heat: h };
  if (SIDES.some((s) => h[s] > HEAT_MAX)) return { result: 'crack', heat: h };
  if (SIDES.some((s) => h[s] < HEAT_MIN)) return { result: 'cold', heat: h };
  return { result: 'ok', heat: h };
}

// 找出一種放法（測試、示範用）
export function fireSolve(lv: FireLevel): Pile | null {
  const free = SLOTS.filter((s) => !lv.wet.includes(s));
  const pile: Pile = {};
  const go = (i: number, left: number): boolean => {
    if (i === free.length) return left === 0 && fire(lv, pile).result === 'ok';
    for (let n = Math.min(SLOT_CAP, left); n >= 0; n--) {
      pile[free[i]] = n;
      if (go(i + 1, left - n)) return true;
    }
    delete pile[free[i]];
    return false;
  };
  return go(0, lv.wood) ? Object.fromEntries(Object.entries(pile).filter(([, n]) => n)) as Pile : null;
}

// ── 磨製石器 ──────────────────────────────────
// 石頭側面看是一排高度；在第 i 格磨一下：那格少 2、左右兩格各少 1（石頭是一整塊，旁邊也會被帶到）。
// 要剛好磨到虛線（目標高度）；有一格磨到虛線以下就太薄、斷掉了。
export interface GrindLevel { from: number[]; to: number[] }

export function grind(h: readonly number[], i: number): number[] {
  return h.map((v, j) => v - (j === i ? 2 : Math.abs(j - i) === 1 ? 1 : 0));
}
export const tooThin = (h: readonly number[], lv: GrindLevel) => h.some((v, j) => v < lv.to[j]);
export const grindDone = (h: readonly number[], lv: GrindLevel) => h.every((v, j) => v === lv.to[j]);

// 每一格要磨幾下（解不開回 null）。差距 d = A x，A 是對角 2、旁邊 1 的三對角矩陣，用回溯找非負整數解
export function grindSolve(lv: GrindLevel): number[] | null {
  const n = lv.from.length;
  const d = lv.from.map((v, j) => v - lv.to[j]);
  const x: number[] = Array(n).fill(0);
  // 第 0 格：2x0 + x1 = d0 → 選 x0，x1 就定了；接下來每一格都由前一格推出來
  for (let x0 = 0; 2 * x0 <= d[0]; x0++) {
    x[0] = x0;
    let ok = true;
    for (let j = 1; j < n && ok; j++) {
      x[j] = d[j - 1] - 2 * x[j - 1] - (j >= 2 ? x[j - 2] : 0);
      if (x[j] < 0) ok = false;
    }
    if (!ok) continue;
    const last = 2 * x[n - 1] + (n >= 2 ? x[n - 2] : 0);
    if (last === d[n - 1]) return [...x];
  }
  return null;
}

// ── 煉鐵與砍樹 ────────────────────────────────
// 森林是格子：上面兩排是遠的緩坡，下面兩排是村子正上方的陡坡。
// 一季有幾次行動：砍近的樹 1 次、砍遠的樹 2 次（要走遠路扛回來），都得 1 份木材；在樹樁種樹苗 1 次。
// 煉一爐鐵要 3 份木材（燒成木炭）。第 2、4 季結束會下大雨：陡坡同一直排上下兩格都光禿禿（樹樁），就會土石流。
// 樹苗的根雖然淺，也抓得住一點土，算有保護；樹苗要長兩季才能再砍。
export type Tree = 'tree' | 'stump' | 'sapling';
export interface ForestLevel { cols: number; farRows: number; steepRows: number; seasons: number; actions: number; woodPerIron: number; iron: number; rainAfter: number[] }
export interface Forest { trees: Tree[]; age: number[]; wood: number; iron: number; season: number; left: number; slides: number[] }

export function forestOf(lv: ForestLevel): Forest {
  const n = lv.cols * (lv.farRows + lv.steepRows);
  return { trees: Array(n).fill('tree'), age: Array(n).fill(0), wood: 0, iron: 0, season: 1, left: lv.actions, slides: [] };
}
export const isFar = (lv: ForestLevel, i: number) => Math.floor(i / lv.cols) < lv.farRows;
export const cutCost = (lv: ForestLevel, i: number) => (isFar(lv, i) ? 2 : 1);

export function cut(lv: ForestLevel, f: Forest, i: number): Forest | null {
  const cost = cutCost(lv, i);
  if (f.trees[i] !== 'tree' || f.left < cost) return null;
  const trees = [...f.trees]; trees[i] = 'stump';
  return { ...f, trees, wood: f.wood + 1, left: f.left - cost };
}

export function plant(f: Forest, i: number): Forest | null {
  if (f.trees[i] !== 'stump' || f.left < 1) return null;
  const trees = [...f.trees]; trees[i] = 'sapling';
  const age = [...f.age]; age[i] = 0;
  return { ...f, trees, age, left: f.left - 1 };
}

export function smelt(lv: ForestLevel, f: Forest): Forest | null {
  if (f.wood < lv.woodPerIron || f.iron >= lv.iron) return null;
  return { ...f, wood: f.wood - lv.woodPerIron, iron: f.iron + 1 };
}

// 哪幾個陡坡直排會土石流（同一直排上下兩格都是樹樁）
export function slideCols(lv: ForestLevel, f: Forest): number[] {
  const out: number[] = [];
  for (let c = 0; c < lv.cols; c++) {
    const rows = Array.from({ length: lv.steepRows }, (_, r) => (lv.farRows + r) * lv.cols + c);
    if (rows.every((i) => f.trees[i] === 'stump')) out.push(c);
  }
  return out;
}

// 這一季結束：要下雨就檢查土石流；樹苗長大一點，長滿兩季變回大樹
export function endSeason(lv: ForestLevel, f: Forest): Forest {
  const rain = lv.rainAfter.includes(f.season);
  const slides = rain ? slideCols(lv, f) : [];
  const age = f.age.map((a, i) => (f.trees[i] === 'sapling' ? a + 1 : a));
  const trees = f.trees.map((t, i) => (t === 'sapling' && age[i] >= 2 ? 'tree' : t));
  return { ...f, trees, age, season: f.season + 1, left: lv.actions, slides: [...f.slides, ...slides] };
}

export const forestOver = (lv: ForestLevel, f: Forest) => f.season > lv.seasons;
export const grown = (f: Forest) => f.trees.filter((t) => t === 'tree').length;

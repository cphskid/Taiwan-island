// 第四章《東寧屯田》的謎題規則：分營屯田、開水埤（蓄水＋分季用水）、曬鹽排程、孔廟配置、存糧規劃。
// 純函式，不碰畫面；關卡資料在 data/ch4.ts，用單元測試確認每一關都解得開、亂來會失敗。

export interface Cell { col: number; row: number }
export const ck = (c: Cell) => `${c.col},${c.row}`;

// ── 1 分營屯田 ─────────────────────────────────
// 平原地圖：. 空地、~ 溪和水塘、s 社（村子）、h 社的獵場和田、b 竹林（不能紮營）。
// 規則：
//   1. 營盤只能放在空地上（不能放在水裡、竹林、社和社的獵場、田）
//   2. 營盤上下左右至少要有一格是水（靠近水）
//   3. 營盤上下左右不能貼著社的土地（尊重村社）
//   4. 兩個營盤不能挨在一起（連斜角也不行），每一營要有自己的田
//   5. 互相支援：每個營盤 2 格內（橫、直、斜都算）要有別的營盤，所有營盤要連成一群
export interface CampLevel { rows: string[]; camps: number }
export type CampRule = 'land' | 'water' | 'village' | 'crowd' | 'help';
export interface CampCheck { bad: Record<string, CampRule[]>; lonely: boolean; ok: boolean }

const at = (lv: CampLevel, c: Cell) => lv.rows[c.row]?.[c.col] ?? '#';
const N4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const near4 = (c: Cell) => N4.map(([dc, dr]) => ({ col: c.col + dc, row: c.row + dr }));
const cheb = (a: Cell, b: Cell) => Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));

// 這一格自己（不看別的營盤）能不能紮營；回傳違反的規則
export function cellRules(lv: CampLevel, c: Cell): CampRule[] {
  const out: CampRule[] = [];
  if (at(lv, c) !== '.') out.push('land');
  if (!near4(c).some((n) => at(lv, n) === '~')) out.push('water');
  if (near4(c).some((n) => at(lv, n) === 's' || at(lv, n) === 'h')) out.push('village');
  return out;
}

export function checkCamps(lv: CampLevel, camps: readonly Cell[]): CampCheck {
  const bad: Record<string, CampRule[]> = {};
  camps.forEach((c, i) => {
    const r = cellRules(lv, c);
    if (camps.some((o, j) => j !== i && cheb(o, c) <= 1)) r.push('crowd');
    if (camps.length > 1 && !camps.some((o, j) => j !== i && cheb(o, c) <= 2)) r.push('help');
    if (r.length) bad[ck(c)] = r;
  });
  // 連成一群：從第一個營盤出發，2 格內一個接一個走得到全部
  let lonely = false;
  if (camps.length > 1) {
    const seen = new Set([0]);
    const todo = [0];
    while (todo.length) {
      const i = todo.pop()!;
      camps.forEach((o, j) => { if (!seen.has(j) && cheb(o, camps[i]) <= 2) { seen.add(j); todo.push(j); } });
    }
    lonely = seen.size < camps.length;
  }
  return { bad, lonely, ok: camps.length === lv.camps && !Object.keys(bad).length && !lonely };
}

// 找出所有放法（測試、提示、示範用）
export function campSolutions(lv: CampLevel, limit = 50): Cell[][] {
  const cand: Cell[] = [];
  lv.rows.forEach((line, row) => [...line].forEach((_, col) => { if (!cellRules(lv, { col, row }).length) cand.push({ col, row }); }));
  const out: Cell[][] = [];
  const go = (start: number, cur: Cell[]) => {
    if (out.length >= limit) return;
    if (cur.length === lv.camps) { if (checkCamps(lv, cur).ok) out.push([...cur]); return; }
    for (let i = start; i < cand.length; i++) {
      if (cur.some((o) => cheb(o, cand[i]) <= 1)) continue;
      go(i + 1, [...cur, cand[i]]);
    }
  };
  go(0, []);
  return out;
}

// ── 2 開水埤：蓄水量＋分季用水 ─────────────────────
// 一年分成幾個時節，每個時節先下雨（水埤裝不下的就流走），再用水（營盤喝的水＋田裡要的水）。
// 水埤每挖一格多裝 cellCap 份水。人手有限：挖一格埤、開一塊田都要一份人手。
// 每塊田可以種稻（要很多水、收成多）、種番薯（要一點水、收成少）或空著。
export type Crop = 'none' | 'rice' | 'potato';
export interface CropInfo { use: number[]; food: number }
export interface PondLevel {
  periods: string[];
  rain: number[];
  camp: number; // 營盤每個時節要喝的水
  cellCap: number;
  maxCells: number;
  labor: number;
  plots: number;
  start: number; // 水埤一開始有多少水
  crops: Record<Exclude<Crop, 'none'>, CropInfo>;
  need: number; // 要收到多少糧
}
export interface PondStep { rain: number; spill: number; use: number; level: number; dry: boolean }
export interface PondRun { steps: PondStep[]; food: number; dryAt: number; labor: number; ok: boolean; tooMany: boolean }

export const cropUse = (lv: PondLevel, crops: readonly Crop[], t: number) =>
  lv.camp + crops.reduce((a, c) => a + (c === 'none' ? 0 : lv.crops[c].use[t]), 0);

export function runPond(lv: PondLevel, cells: number, crops: readonly Crop[]): PondRun {
  const cap = cells * lv.cellCap;
  const labor = cells + crops.filter((c) => c !== 'none').length;
  const tooMany = labor > lv.labor;
  let level = Math.min(cap, lv.start);
  let dryAt = -1;
  const steps: PondStep[] = lv.periods.map((_, t) => {
    const filled = level + lv.rain[t];
    const spill = Math.max(0, filled - cap);
    level = filled - spill;
    const use = cropUse(lv, crops, t);
    level -= use;
    const dry = level < 0;
    if (dry && dryAt < 0) dryAt = t;
    if (dry) level = 0;
    return { rain: lv.rain[t], spill, use, level, dry };
  });
  const food = crops.reduce((a, c) => a + (c === 'none' ? 0 : lv.crops[c].food), 0);
  return { steps, food, dryAt, labor, tooMany, ok: !tooMany && dryAt < 0 && food >= lv.need };
}

// 所有過得了的做法（埤挖幾格、種幾塊稻、幾塊番薯；田的順序不重要）
export function pondSolutions(lv: PondLevel): { cells: number; rice: number; potato: number }[] {
  const out: { cells: number; rice: number; potato: number }[] = [];
  for (let cells = 1; cells <= lv.maxCells; cells++)
    for (let rice = 0; rice <= lv.plots; rice++)
      for (let potato = 0; rice + potato <= lv.plots; potato++) {
        const crops: Crop[] = [...Array(rice).fill('rice'), ...Array(potato).fill('potato')];
        while (crops.length < lv.plots) crops.push('none');
        if (runPond(lv, cells, crops).ok) out.push({ cells, rice, potato });
      }
  return out;
}

// ── 3 曬鹽 ───────────────────────────────────
// 兩個蒸發池、一個結晶池。每天可以做 hands 件事：
//   引海水（空的蒸發池裝海水）、移到結晶池（蒸發池曬夠 evapDays 天、結晶池空著）、收鹽（結晶池曬夠 crystDays 天）、
//   蓋草蓆（今天保護一個池子，只有一張草蓆）。
// 做完以後天氣才來：晴天沒蓋的池子曬一天；陰天不會乾；下雨的話，沒蓋的蒸發池被雨水沖淡，從頭曬；沒蓋的結晶池鹽被沖掉，變空的。
export type Sky = 'sun' | 'cloud' | 'rain';
export interface SaltLevel { days: Sky[]; evapDays: number; crystDays: number; hands: number; need: number }
export interface Pans { e: number[]; c: number; salt: number } // -1 空的；其他數字是曬了幾天
export type SaltAct = { kind: 'fill'; pan: number } | { kind: 'move'; pan: number } | { kind: 'harvest' } | { kind: 'cover'; pan: number }; // cover 的 pan：0、1 蒸發池，2 結晶池

export const freshPans = (): Pans => ({ e: [-1, -1], c: -1, salt: 0 });

export function canDo(lv: SaltLevel, p: Pans, a: SaltAct): boolean {
  if (a.kind === 'fill') return p.e[a.pan] < 0;
  if (a.kind === 'move') return p.e[a.pan] >= lv.evapDays && p.c < 0;
  if (a.kind === 'harvest') return p.c >= lv.crystDays;
  return a.pan < 2 ? p.e[a.pan] >= 0 : p.c >= 0;
}

export function doAct(p: Pans, a: SaltAct): Pans {
  const e = [...p.e];
  if (a.kind === 'fill') { e[a.pan] = 0; return { ...p, e }; }
  if (a.kind === 'move') { e[a.pan] = -1; return { e, c: 0, salt: p.salt }; }
  if (a.kind === 'harvest') return { e, c: -1, salt: p.salt + 1 };
  return p;
}

// 一天的天氣落下來；cover 是今天蓋草蓆的池子（-1 沒蓋）
export function weather(sky: Sky, p: Pans, cover: number): { pans: Pans; washed: number[] } {
  const washed: number[] = [];
  const e = p.e.map((v, i) => {
    if (v < 0 || cover === i) return v;
    if (sky === 'sun') return v + 1;
    if (sky === 'rain') { if (v > 0) washed.push(i); return 0; }
    return v;
  });
  let c = p.c;
  if (c >= 0 && cover !== 2) {
    if (sky === 'sun') c += 1;
    if (sky === 'rain') { washed.push(2); c = -1; }
  }
  return { pans: { e, c, salt: p.salt }, washed };
}

// 一天要做的事照順序做；做不到、超過人手、草蓆用兩次都不算
export function saltDay(lv: SaltLevel, p: Pans, acts: readonly SaltAct[], day: number): { pans: Pans; washed: number[]; ok: boolean } {
  if (acts.length > lv.hands || acts.filter((a) => a.kind === 'cover').length > 1) return { pans: p, washed: [], ok: false };
  let cur = p;
  for (const a of acts) { if (!canDo(lv, cur, a)) return { pans: p, washed: [], ok: false }; cur = doAct(cur, a); }
  const cov = acts.find((a) => a.kind === 'cover') as { pan: number } | undefined;
  const w = weather(lv.days[day], cur, cov ? cov.pan : -1);
  return { ...w, ok: true };
}

const ALL_ACTS: SaltAct[] = [
  { kind: 'harvest' }, { kind: 'move', pan: 0 }, { kind: 'move', pan: 1 }, { kind: 'fill', pan: 0 }, { kind: 'fill', pan: 1 },
  { kind: 'cover', pan: 0 }, { kind: 'cover', pan: 1 }, { kind: 'cover', pan: 2 },
];
// 一天所有可以的做法（最多 hands 件事）
function dayOptions(lv: SaltLevel, p: Pans): SaltAct[][] {
  const out: SaltAct[][] = [[]];
  const go = (cur: Pans, done: SaltAct[]) => {
    if (done.length >= lv.hands) return;
    for (const a of ALL_ACTS) {
      if (a.kind === 'cover' && done.some((d) => d.kind === 'cover')) continue;
      if (!canDo(lv, cur, a)) continue;
      const next = [...done, a];
      out.push(next);
      go(doAct(cur, a), next);
    }
  };
  go(p, []);
  return out;
}

// 最多收得到幾籃鹽，和一種做法（每天做哪些事）；from/start 給「從今天這個樣子開始」的提示用
export function saltBest(lv: SaltLevel, from = 0, start: Pans = freshPans()): { salt: number; plan: SaltAct[][] } {
  const memo = new Map<string, { salt: number; plan: SaltAct[][] }>();
  const go = (day: number, p: Pans): { salt: number; plan: SaltAct[][] } => {
    // 最後一天結束後還能收的鹽也算（最後一天早上收）
    if (day === lv.days.length) return { salt: p.salt, plan: [] };
    const k = `${day}|${p.e.join(',')}|${p.c}|${p.salt}`;
    const hit = memo.get(k);
    if (hit) return hit;
    let best = { salt: -1, plan: [] as SaltAct[][] };
    for (const acts of dayOptions(lv, p)) {
      const r = saltDay(lv, p, acts, day);
      if (!r.ok) continue;
      const sub = go(day + 1, r.pans);
      if (sub.salt > best.salt) best = { salt: sub.salt, plan: [acts, ...sub.plan] };
    }
    memo.set(k, best);
    return best;
  };
  return go(from, start);
}

// 照一份計畫跑完（測試用）
export function saltRun(lv: SaltLevel, plan: readonly (readonly SaltAct[])[]): Pans | null {
  let p = freshPans();
  for (let d = 0; d < lv.days.length; d++) {
    const r = saltDay(lv, p, plan[d] ?? [], d);
    if (!r.ok) return null;
    p = r.pans;
  }
  return p;
}

// ── 3 曬鹽（故事版）────────────────────────────────
// 幾格鹽田，每格：-1 空的、0 剛引進的海水，晴天曬一天多 1（中間是越來越鹹的鹵水），曬到 ready 就結出鹽了。
// 每天只做一件事：引海水（空的那格）、收鹽（結出鹽的那格，收完變空的），或等太陽。草蓆另外決定今天蓋不蓋（全部一起蓋）。
// 做完以後天氣才來：晴天沒蓋的鹽田曬一天（最多到 ready），蓋著的曬不到；陰天不變；下雨的話，沒蓋的鹽田被沖掉，變空的。
export interface SaltEasyLevel { days: Sky[]; pans: number; need: number; ready: number } // ready：曬幾個晴天結出鹽
export type EasyAct = { kind: 'fill'; pan: number } | { kind: 'harvest'; pan: number } | { kind: 'wait' };
export interface EasyPans { v: number[]; salt: number }
export const freshEasy = (lv: SaltEasyLevel): EasyPans => ({ v: Array(lv.pans).fill(-1), salt: 0 });

export function easyCan(lv: SaltEasyLevel, p: EasyPans, a: EasyAct): boolean {
  if (a.kind === 'fill') return p.v[a.pan] < 0;
  if (a.kind === 'harvest') return p.v[a.pan] >= lv.ready;
  return true;
}

// 做一件事、決定蓋不蓋草蓆，再讓天氣落下來；washed 是被雨沖掉的鹽田
export function easyDay(lv: SaltEasyLevel, p: EasyPans, a: EasyAct, cover: boolean, day: number): { pans: EasyPans; washed: number[]; ok: boolean } {
  if (!easyCan(lv, p, a)) return { pans: p, washed: [], ok: false };
  const v = [...p.v];
  let salt = p.salt;
  if (a.kind === 'fill') v[a.pan] = 0;
  if (a.kind === 'harvest') { v[a.pan] = -1; salt += 1; }
  const sky = lv.days[day];
  const washed: number[] = [];
  if (!cover) {
    v.forEach((x, i) => {
      if (x < 0) return;
      if (sky === 'sun') v[i] = Math.min(lv.ready, x + 1);
      if (sky === 'rain') { v[i] = -1; washed.push(i); }
    });
  }
  return { pans: { v, salt }, washed, ok: true };
}

export function easyActs(lv: SaltEasyLevel): EasyAct[] {
  const out: EasyAct[] = [];
  for (let i = 0; i < lv.pans; i++) out.push({ kind: 'harvest', pan: i });
  for (let i = 0; i < lv.pans; i++) out.push({ kind: 'fill', pan: i });
  out.push({ kind: 'wait' });
  return out;
}
export interface EasyDayPlan { act: EasyAct; cover: boolean }
const ripe = (lv: SaltEasyLevel, p: EasyPans) => p.salt + p.v.filter((x) => x >= lv.ready).length;

// 最多收得到幾籃（最後一天過完還在田裡的鹽也算，隔天早上收），和每天建議做的事；from/start 給「今天該做什麼」的提示用
// noCover：假裝沒有草蓆（測試用：證明不會蓋草蓆就收不夠）
export function saltEasyBest(lv: SaltEasyLevel, from = 0, start: EasyPans = freshEasy(lv), noCover = false): { salt: number; plan: EasyDayPlan[] } {
  const memo = new Map<string, { salt: number; plan: EasyDayPlan[] }>();
  const go = (day: number, p: EasyPans): { salt: number; plan: EasyDayPlan[] } => {
    if (day === lv.days.length) return { salt: ripe(lv, p), plan: [] };
    const k = `${day}|${p.v.join(',')}|${p.salt}`;
    const hit = memo.get(k);
    if (hit) return hit;
    let best = { salt: -1, plan: [] as EasyDayPlan[] };
    for (const cover of noCover ? [false] : [false, true]) {
      for (const act of easyActs(lv)) {
        const r = easyDay(lv, p, act, cover, day);
        if (!r.ok) continue;
        const sub = go(day + 1, r.pans);
        if (sub.salt > best.salt) best = { salt: sub.salt, plan: [{ act, cover }, ...sub.plan] };
      }
    }
    memo.set(k, best);
    return best;
  };
  return go(from, start);
}

// 照計畫跑完；回傳收得到的籃數
export function saltEasyRun(lv: SaltEasyLevel, plan: readonly EasyDayPlan[]): number | null {
  let p = freshEasy(lv);
  for (let d = 0; d < lv.days.length; d++) {
    const x = plan[d] ?? { act: { kind: 'wait' }, cover: false };
    const r = easyDay(lv, p, x.act, x.cover, d);
    if (!r.ok) return null;
    p = r.pans;
  }
  return ripe(lv, p);
}

// ── 4 蓋學堂：孔廟的配置 ─────────────────────────
// 格子由上（北，後面）到下（南，前面），中間那一直排是中軸線。每個建築有它的規則，全部放對才算完成。
export type Bld = 'hall' | 'gate' | 'panchi' | 'eastWing' | 'westWing' | 'school';
export interface TempleLevel { cols: number; rows: number; answer: Record<Bld, Cell> }
export function checkTemple(lv: TempleLevel, placed: Partial<Record<Bld, Cell>>): { wrong: Bld[]; done: boolean } {
  const ids = Object.keys(lv.answer) as Bld[];
  const wrong = ids.filter((b) => placed[b] && ck(placed[b]!) !== ck(lv.answer[b]));
  return { wrong, done: !wrong.length && ids.every((b) => placed[b]) };
}

// ── 5 東寧的明天：存糧規劃 ────────────────────────
// 每年先決定開幾塊新田（每塊要先拿出 seed 份糧當種子和農具），再收成（原本的田 base 份，每塊開好的新田從下一年起每年多 1 份；
// 颱風那年收成只剩一半，無條件捨去），最後全軍吃掉 eat 份。糧倉任何時候都不能變負的，最後一年結束要存到 target。
export interface GrainLevel { years: number; start: number; base: number; eat: number; seed: number; maxNew: number; typhoon: number[]; target: number }
export interface GrainYear { opened: number; afterSeed: number; harvest: number; end: number; broke: boolean }
export function runGrain(lv: GrainLevel, plan: readonly number[]): { years: GrainYear[]; ok: boolean; brokeAt: number; end: number } {
  let g = lv.start;
  let fields = 0;
  let brokeAt = -1;
  const years: GrainYear[] = [];
  for (let y = 0; y < lv.years; y++) {
    const k = Math.min(lv.maxNew, Math.max(0, plan[y] ?? 0));
    const afterSeed = g - k * lv.seed;
    let harvest = lv.base + fields;
    if (lv.typhoon.includes(y)) harvest = Math.floor(harvest / 2);
    fields += k;
    const end = afterSeed + harvest - lv.eat;
    const broke = afterSeed < 0 || end < 0;
    if (broke && brokeAt < 0) brokeAt = y;
    years.push({ opened: k, afterSeed, harvest, end, broke });
    g = Math.max(0, end);
  }
  return { years, ok: brokeAt < 0 && g >= lv.target, brokeAt, end: g };
}

export function grainSolutions(lv: GrainLevel): number[][] {
  const out: number[][] = [];
  const go = (plan: number[]) => {
    if (plan.length === lv.years) { if (runGrain(lv, plan).ok) out.push(plan); return; }
    for (let k = 0; k <= lv.maxNew; k++) go([...plan, k]);
  };
  go([]);
  return out;
}

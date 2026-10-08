// 第二章《山林與部落》的謎題規則：輪耕、依季節打獵、一年的生活曆、部落規範的五年模擬。
// 純函式，不碰畫面；關卡資料在 data/ch2.ts，用單元測試確認每一關都解得開、亂來會失敗。

// ── 輪耕 ──────────────────────────────────────
// 每塊山田有肥力（0～max）。種一年收成＝肥力，種完肥力少 1（陡坡土會被雨沖走，少 2）；
// 休息的田長草、落葉爛進土裡，肥力回來 1。每年最多種 plotsPerYear 塊，每年都要收夠 need。
export interface RotLevel { start: number[]; max: number; plotsPerYear: number; need: number; years: number; steep: number[] }

export function farmYear(lv: RotLevel, fert: readonly number[], chosen: readonly number[]): { harvest: number; next: number[] } {
  const harvest = chosen.reduce((a, i) => a + fert[i], 0);
  const next = fert.map((f, i) => chosen.includes(i) ? Math.max(0, f - (lv.steep.includes(i) ? 2 : 1)) : Math.min(lv.max, f + 1));
  return { harvest, next };
}

const subsets = (n: number, k: number): number[][] => {
  const out: number[][] = [];
  const go = (start: number, cur: number[]) => {
    if (cur.length === k) { out.push([...cur]); return; }
    for (let i = start; i < n; i++) go(i + 1, [...cur, i]);
  };
  go(0, []);
  return out;
};

// 找一種每年都收夠的種法（測試、示範用）
export function rotSolve(lv: RotLevel): number[][] | null {
  const pick = subsets(lv.start.length, lv.plotsPerYear);
  const go = (fert: readonly number[], year: number): number[][] | null => {
    if (year === lv.years) return [];
    for (const c of pick) {
      const r = farmYear(lv, fert, c);
      if (r.harvest < lv.need) continue;
      const rest = go(r.next, year + 1);
      if (rest) return [c, ...rest];
    }
    return null;
  };
  return go(lv.start, 0);
}

// ── 打獵 ──────────────────────────────────────
// 一年四季：春、夏、秋、冬。春天結束時母鹿生小鹿：多了「鹿數 ÷ birthDiv」隻（無條件捨去）；
// 春天有打獵的話，母鹿和小鹿受驚，那年生的小鹿只剩一半。每年要打到 need 隻鹿肉才夠吃，最後鹿群不能比一開始少。
export const SEASONS = ['春', '夏', '秋', '冬'] as const;
export interface DeerLevel { start: number; years: number; need: number; birthDiv: number; maxHunt: number }

export interface DeerYear { hunts: number[]; deerAfter: number; births: number; meat: number }

export function deerYear(lv: DeerLevel, deer: number, hunts: readonly number[]): DeerYear {
  let d = deer;
  let births = 0;
  hunts.forEach((h, s) => {
    d = Math.max(0, d - h);
    if (s === 0) {
      births = Math.floor(d / lv.birthDiv);
      if (h > 0) births = Math.floor(births / 2);
      d += births;
    }
  });
  return { hunts: [...hunts], deerAfter: d, births, meat: hunts.reduce((a, b) => a + b, 0) };
}

export function deerRun(lv: DeerLevel, plan: readonly (readonly number[])[]): { years: DeerYear[]; ok: boolean; hungry: boolean; fewer: boolean } {
  let d = lv.start;
  const years: DeerYear[] = [];
  for (const hunts of plan) { const y = deerYear(lv, d, hunts); years.push(y); d = y.deerAfter; }
  const hungry = years.some((y) => y.meat < lv.need);
  const fewer = d < lv.start;
  return { years, ok: years.length === lv.years && !hungry && !fewer, hungry, fewer };
}

// ── 一年的生活曆 ───────────────────────────────
// 每件事有它該在的季節（data 裡的線索會說）；放錯的會被指出來
export interface Chore { id: string; name: string; season: number }
export function calendarCheck(chores: readonly Chore[], placed: Readonly<Record<string, number>>): { wrong: string[]; done: boolean } {
  const wrong = chores.filter((c) => placed[c.id] !== undefined && placed[c.id] !== c.season).map((c) => c.id);
  return { wrong, done: wrong.length === 0 && chores.every((c) => placed[c.id] !== undefined) };
}

// ── 部落規範：選三條規矩，模擬五年 ───────────────
export type RuleId = 'rotate' | 'same' | 'spring' | 'anytime' | 'share' | 'burnAll';
export interface SimYear { harvest: number; deer: number; meat: number }
export interface SimResult { years: SimYear[]; hungry: boolean; fewDeer: boolean; ok: boolean }

// 五年：田照「輪流休耕」或「同一塊一直種」去種；打獵照「春天不打」或「想打就打」；
// 不分享的話，每家各打各的，一年要多打 3 隻；燒掉整片森林：田多兩塊，但鹿沒地方住，生小鹿少一半
export function simulate(rules: readonly RuleId[], rot: RotLevel, deer: DeerLevel, years = 5): SimResult {
  const has = (r: RuleId) => rules.includes(r);
  const burn = has('burnAll');
  const start = burn ? [...rot.start, rot.max, rot.max] : [...rot.start];
  const lv: RotLevel = { ...rot, start };
  let fert = start;
  let d = deer.start;
  const out: SimYear[] = [];
  const fixed = Array.from({ length: rot.plotsPerYear }, (_, i) => i);
  for (let y = 0; y < years; y++) {
    // 輪耕：挑肥力最高的幾塊種；一直種：永遠是同樣那幾塊
    const order = fert.map((f, i) => ({ f, i })).sort((a, b) => b.f - a.f || a.i - b.i).map((x) => x.i);
    const chosen = has('rotate') ? order.slice(0, rot.plotsPerYear) : fixed;
    const r = farmYear(lv, fert, chosen);
    fert = r.next;
    const want = deer.need + (has('share') ? 0 : 3) + (has('anytime') ? 3 : 0);
    const springHunt = has('spring') ? 0 : Math.ceil(want / 4);
    const rest = want - springHunt;
    const hunts = [springHunt, 0, Math.ceil(rest / 2), Math.floor(rest / 2)];
    const dl: DeerLevel = { ...deer, birthDiv: burn ? deer.birthDiv * 2 : deer.birthDiv };
    const dy = deerYear(dl, d, hunts);
    d = dy.deerAfter;
    out.push({ harvest: r.harvest, deer: d, meat: dy.meat });
  }
  const hungry = out.some((y) => y.harvest < rot.need);
  const fewDeer = d < deer.start;
  return { years: out, hungry, fewDeer, ok: !hungry && !fewDeer };
}

// ── 打獵（故事版）：訂獵季的規矩 ───────────────────
// 小朋友只決定「哪幾季可以上山」，每年要打的 need 隻平均分到那幾季（除不盡的多的給前面的季），再照 deerYear 跑。
export function ruleHunts(lv: DeerLevel, open: readonly boolean[]): number[] {
  const on = open.map((o, s) => (o ? s : -1)).filter((s) => s >= 0);
  const hunts = [0, 0, 0, 0];
  on.forEach((s, k) => { hunts[s] = Math.floor(lv.need / on.length) + (k < lv.need % on.length ? 1 : 0); });
  return hunts;
}
export function ruleRun(lv: DeerLevel, open: readonly boolean[]) {
  const hunts = ruleHunts(lv, open);
  return deerRun(lv, Array.from({ length: lv.years }, () => hunts));
}

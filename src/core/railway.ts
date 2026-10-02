// 第六章《開港與鐵路》的謎題規則：河運路線、烘茶排程、鋪鐵路、馬偕醫館分配病人、單線鐵路會車時刻表。
// 純函式，不碰畫面；關卡資料在 data/ch6.ts，用單元測試確認每一關都解得開、亂來會失敗。

export interface Pt { x: number; y: number }
const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
const adj = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const DIRS: Pt[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

// ── 1 河運路線 ─────────────────────────────────
// 地圖一格一個字：
//   .  陸地            w  寬河道（水深 2）     n  窄河道（水深 1）    r  石頭灘（窄，水深 0）
//   s  沙洲（寬，退潮水深 1、漲潮 2）          h  泥灘（窄，退潮水深 0、漲潮 1）
//   m  艋舺碼頭（寬，淤積了，水深 1，潮水進不來）
//   A  出發的碼頭（寬，水深 2）  T  大稻埕碼頭（寬，水深 2，貨在這裡換大船）  B  終點（寬，水深 3）
// 船：吃水（要多深的水才不會擱淺）、能不能進窄河道。
export interface Boat { id: 'sampan' | 'junk'; draft: number; narrow: boolean }
export const BOATS: Record<Boat['id'], Boat> = {
  sampan: { id: 'sampan', draft: 1, narrow: true },
  junk: { id: 'junk', draft: 2, narrow: false },
};
export type Tide = 'low' | 'high';
export interface RiverLevel { map: string[]; boat: Boat['id']; pick?: boolean } // pick：讓玩家自己選船（第三關）

interface RCell { land: boolean; depth: number; tidal: boolean; wide: boolean }
const RKEY: Record<string, RCell> = {
  '.': { land: true, depth: 0, tidal: false, wide: false },
  w: { land: false, depth: 2, tidal: false, wide: true },
  n: { land: false, depth: 1, tidal: false, wide: false },
  r: { land: false, depth: 0, tidal: false, wide: false },
  s: { land: false, depth: 1, tidal: true, wide: true },
  h: { land: false, depth: 0, tidal: true, wide: false },
  m: { land: false, depth: 1, tidal: false, wide: true },
  A: { land: false, depth: 2, tidal: false, wide: true },
  T: { land: false, depth: 2, tidal: false, wide: true },
  B: { land: false, depth: 3, tidal: false, wide: true },
};
export const rch = (lv: RiverLevel, p: Pt) => lv.map[p.y]?.[p.x] ?? '.';
export const rcell = (lv: RiverLevel, p: Pt): RCell => RKEY[rch(lv, p)] ?? RKEY['.'];
export const depthAt = (lv: RiverLevel, p: Pt, tide: Tide) => rcell(lv, p).depth + (tide === 'high' && rcell(lv, p).tidal ? 1 : 0);
const find = (lv: RiverLevel, ch: string): Pt | null => {
  for (let y = 0; y < lv.map.length; y++) { const x = lv.map[y].indexOf(ch); if (x >= 0) return { x, y }; }
  return null;
};
export const riverStart = (lv: RiverLevel) => find(lv, 'A') ?? find(lv, 'm')!;
export const riverGoal = (lv: RiverLevel) => find(lv, 'B')!;
export const riverTransfer = (lv: RiverLevel) => find(lv, 'T');

export type Stuck = 'shallow' | 'narrow';
// 這條船能不能開進這一格（第三關到了大稻埕就換大船）
export function canSail(lv: RiverLevel, p: Pt, boat: Boat, tide: Tide): Stuck | null {
  const c = rcell(lv, p);
  if (c.land) return 'shallow';
  if (!c.wide && !boat.narrow) return 'narrow';
  if (depthAt(lv, p, tide) < boat.draft) return 'shallow';
  return null;
}
// 照著路線開船：回傳停在哪裡、為什麼停
export interface Voyage { ok: boolean; at: number; why: Stuck | 'short' | null }
export function sail(lv: RiverLevel, path: readonly Pt[], tide: Tide, first: Boat['id'] = lv.boat): Voyage {
  const t = riverTransfer(lv);
  let boat = BOATS[first];
  for (let i = 0; i < path.length; i++) {
    if (i > 0 && !adj(path[i - 1], path[i])) return { ok: false, at: i, why: 'short' };
    const why = canSail(lv, path[i], boat, tide);
    if (why) return { ok: false, at: i, why };
    if (t && same(path[i], t)) boat = BOATS.junk; // 貨在大稻埕搬上大船
  }
  const end = path[path.length - 1];
  return end && same(end, riverGoal(lv)) ? { ok: true, at: path.length - 1, why: null } : { ok: false, at: path.length - 1, why: 'short' };
}
// 找一條開得到的路線（測試、示範用）：回傳潮水、船、路線
export function riverSolve(lv: RiverLevel, tides: Tide[] = ['low', 'high']): { tide: Tide; boat: Boat['id']; path: Pt[] } | null {
  const boats: Boat['id'][] = lv.pick ? ['sampan', 'junk'] : [lv.boat];
  const t = riverTransfer(lv);
  for (const tide of tides) for (const b of boats) {
    const s = riverStart(lv);
    // 狀態：位置＋有沒有換過船
    const key = (p: Pt, k: boolean) => `${p.x},${p.y},${k}`;
    const prev = new Map<string, string | null>();
    const q: [Pt, boolean][] = [];
    const boat0 = BOATS[b];
    if (canSail(lv, s, boat0, tide)) continue;
    const k0 = !!t && same(s, t);
    prev.set(key(s, k0), null); q.push([s, k0]);
    while (q.length) {
      const [p, k] = q.shift()!;
      if (same(p, riverGoal(lv))) {
        const path: Pt[] = [];
        let cur: string | null = key(p, k);
        while (cur) { const [x, y] = cur.split(',').map(Number); path.unshift({ x, y }); cur = prev.get(cur) ?? null; }
        return { tide, boat: b, path };
      }
      for (const d of DIRS) {
        const n = { x: p.x + d.x, y: p.y + d.y };
        if (n.y < 0 || n.y >= lv.map.length || n.x < 0 || n.x >= lv.map[0].length) continue;
        const boat = k ? BOATS.junk : boat0;
        if (canSail(lv, n, boat, tide)) continue;
        const nk = k || (!!t && same(n, t));
        if (prev.has(key(n, nk))) continue;
        prev.set(key(n, nk), key(p, k)); q.push([n, nk]);
      }
    }
  }
  return null;
}

// ── 2 烘茶排程 ─────────────────────────────────
// 每批茶先「揀茶」再「烘焙」。揀茶桌、焙籠一次都只能做一批，照玩家排的順序做。
// 下雨天很潮：揀好的茶最多只能等 wait 小時就要進焙籠，不然會發霉；全部要在 limit 小時內烘好（天黑前裝箱）。
export interface TeaBatch { id: string; name: string; sort: number; roast: number }
export interface TeaLevel { batches: TeaBatch[]; limit: number; wait: number }
export interface TeaRun { rows: { id: string; sortAt: number; sortEnd: number; roastAt: number; roastEnd: number; waited: number }[]; end: number; moldy: string[]; late: boolean; ok: boolean }
export function teaRun(lv: TeaLevel, order: readonly string[]): TeaRun {
  let s = 0, r = 0;
  const rows = order.map((id) => {
    const b = lv.batches.find((x) => x.id === id)!;
    const sortAt = s, sortEnd = s + b.sort;
    s = sortEnd;
    const roastAt = Math.max(sortEnd, r), roastEnd = roastAt + b.roast;
    r = roastEnd;
    return { id, sortAt, sortEnd, roastAt, roastEnd, waited: roastAt - sortEnd };
  });
  const end = rows.length ? rows[rows.length - 1].roastEnd : 0;
  const moldy = rows.filter((x) => x.waited > lv.wait).map((x) => x.id);
  const late = end > lv.limit;
  return { rows, end, moldy, late, ok: rows.length === lv.batches.length && !moldy.length && !late };
}
export const perms = <T,>(a: readonly T[]): T[][] => a.length <= 1 ? [[...a]] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r]));
export const teaGood = (lv: TeaLevel) => perms(lv.batches.map((b) => b.id)).filter((o) => teaRun(lv, o).ok);

// ── 3 鋪鐵路 ──────────────────────────────────
// 地圖一格一個字，數字 0～4 是高度；~ 是河（要搭橋）；K 基隆站、P 臺北站（高度都是 1）。
// 鐵軌一格接一格鋪，前後兩格高度最多差 1（火車爬不了陡坡）。
// 高度 3 以上的山，太陡爬不上去時可以挖隧道穿過去：隧道裡跟洞口一樣高。河要搭橋：橋跟岸邊一樣高。
// 每格用掉 1 段鐵軌；橋、隧道另外算，數量有限。
export interface RailLevel { map: string[]; rails: number; bridges: number; tunnels: number }
export type RailKind = 'land' | 'bridge' | 'tunnel';
export interface RailStep { at: Pt; kind: RailKind; h: number } // h：火車在這一格的高度
export type RailBlock = 'steep' | 'far' | 'used' | 'rails' | 'bridges' | 'tunnels' | 'edge';
export const railCh = (lv: RailLevel, p: Pt) => lv.map[p.y]?.[p.x] ?? '';
export const railH = (lv: RailLevel, p: Pt) => { const c = railCh(lv, p); return c === 'K' || c === 'P' ? 1 : c === '~' ? 0 : Number(c); };
const rfind = (lv: RailLevel, ch: string): Pt => { for (let y = 0; y < lv.map.length; y++) { const x = lv.map[y].indexOf(ch); if (x >= 0) return { x, y }; } throw new Error(ch); };
export const railStart = (lv: RailLevel) => rfind(lv, 'K');
export const railGoal = (lv: RailLevel) => rfind(lv, 'P');
export const railUsed = (path: readonly RailStep[]) => ({
  rails: path.length - 1,
  bridges: path.filter((s) => s.kind === 'bridge').length,
  tunnels: path.filter((s) => s.kind === 'tunnel').length,
});
// 從路線最後一格往 p 鋪一格：可以的話回傳新的一格，不行回傳原因
export function railStep(lv: RailLevel, path: readonly RailStep[], p: Pt): RailStep | RailBlock {
  const c = railCh(lv, p);
  if (!c) return 'edge';
  const last = path[path.length - 1];
  if (!adj(last.at, p)) return 'far';
  if (path.some((s) => same(s.at, p))) return 'used';
  const u = railUsed(path);
  if (u.rails + 1 > lv.rails) return 'rails';
  if (c === '~') return u.bridges + 1 > lv.bridges ? 'bridges' : { at: p, kind: 'bridge', h: last.h };
  const h = railH(lv, p);
  if (Math.abs(h - last.h) <= 1) return { at: p, kind: 'land', h };
  if (h >= 3 && h > last.h) return u.tunnels + 1 > lv.tunnels ? 'tunnels' : { at: p, kind: 'tunnel', h: last.h };
  if (last.kind === 'tunnel' && h >= 3) return u.tunnels + 1 > lv.tunnels ? 'tunnels' : { at: p, kind: 'tunnel', h: last.h };
  return 'steep';
}
export const railBegin = (lv: RailLevel): RailStep[] => [{ at: railStart(lv), kind: 'land', h: 1 }];
export const railDone = (lv: RailLevel, path: readonly RailStep[]) => same(path[path.length - 1].at, railGoal(lv));
// 找最省鐵軌的鋪法（測試、示範用）
export function railSolve(lv: RailLevel): RailStep[] | null {
  const W = lv.map[0].length, H = lv.map.length;
  let best: RailStep[] | null = null;
  const go = (path: RailStep[]) => {
    if (best && path.length >= best.length) return;
    if (railDone(lv, path)) { best = [...path]; return; }
    const last = path[path.length - 1].at, g = railGoal(lv);
    const left = lv.rails - railUsed(path).rails;
    if (Math.abs(last.x - g.x) + Math.abs(last.y - g.y) > left) return;
    for (const d of DIRS) {
      const p = { x: last.x + d.x, y: last.y + d.y };
      if (p.x < 0 || p.y < 0 || p.x >= W || p.y >= H) continue;
      const s = railStep(lv, path, p);
      if (typeof s === 'string') continue;
      path.push(s); go(path); path.pop();
    }
  };
  go(railBegin(lv));
  return best;
}

// ── 4 馬偕的醫館：誰來看誰 ────────────────────────
// 每個病人要找「會治這種病」又「聽得懂他說話」的人；每個人一次最多看 cap 個病人。
export interface Healer { id: string; name: string; langs: string[]; can: string[] }
export interface Patient { id: string; name: string; lang: string; need: string; says: string }
export interface ClinicLevel { healers: Healer[]; patients: Patient[]; cap: number }
export type ClinicWhy = 'lang' | 'skill' | 'full';
export function clinicFit(lv: ClinicLevel, patient: string, healer: string): ClinicWhy | null {
  const p = lv.patients.find((x) => x.id === patient)!, h = lv.healers.find((x) => x.id === healer)!;
  if (!h.can.includes(p.need)) return 'skill';
  if (!h.langs.includes(p.lang)) return 'lang';
  return null;
}
export function clinicCheck(lv: ClinicLevel, plan: Readonly<Record<string, string>>): { wrong: string[]; full: string[]; done: boolean } {
  const wrong = Object.entries(plan).filter(([p, h]) => clinicFit(lv, p, h)).map(([p]) => p);
  const full = lv.healers.filter((h) => Object.values(plan).filter((x) => x === h.id).length > lv.cap).map((h) => h.id);
  return { wrong, full, done: !wrong.length && !full.length && lv.patients.every((p) => plan[p.id]) };
}
export function clinicSolve(lv: ClinicLevel): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const go = (i: number, plan: Record<string, string>) => {
    if (i === lv.patients.length) { if (clinicCheck(lv, plan).done) out.push({ ...plan }); return; }
    for (const h of lv.healers) {
      const p = lv.patients[i].id;
      if (clinicFit(lv, p, h.id)) continue;
      if (Object.values(plan).filter((x) => x === h.id).length >= lv.cap) continue;
      go(i + 1, { ...plan, [p]: h.id });
    }
  };
  go(0, {});
  return out;
}

// ── 5 單線鐵路會車 ───────────────────────────────
// 一條單線鐵路、一排車站；車站有側線可以讓車，車站之間只有一條軌道。
// 兩列火車對開：一列從第一站往最後一站（下行），一列反過來（上行），同時發車。
// 玩家決定兩列車在每個中間站要停多久（一格＝10 分鐘）。同一段軌道上，兩列車不能同時在上面（會撞車）。
// 每列車要在期限內到站。
export interface TrainLevel { stations: string[]; legs: number[]; deadline: [number, number]; maxWait: number }
export interface Run { t: number; seg: number } // 在第 seg 段（從車站 seg 到 seg+1）跑的時間 [t, t+legs[seg]]
export function timeline(lv: TrainLevel, waits: readonly number[], down: boolean): { segs: { seg: number; from: number; to: number }[]; arrive: number; at: number[] } {
  // waits[i]：在第 i 個中間站（stations[i+1]）停幾格；at[k]：到達第 k 站（照行車方向）的時間
  const n = lv.legs.length;
  const order = down ? Array.from({ length: n }, (_, i) => i) : Array.from({ length: n }, (_, i) => n - 1 - i);
  let t = 0;
  const segs: { seg: number; from: number; to: number }[] = [];
  const at: number[] = [0];
  order.forEach((seg, k) => {
    if (k > 0) { const st = down ? seg : seg + 1; t += waits[st - 1] ?? 0; }
    segs.push({ seg, from: t, to: t + lv.legs[seg] });
    t += lv.legs[seg];
    at.push(t);
  });
  return { segs, arrive: t, at };
}
export interface Meet { crash: { seg: number; t: number } | null; arrive: [number, number]; late: [boolean, boolean]; ok: boolean }
export function trainCheck(lv: TrainLevel, downWaits: readonly number[], upWaits: readonly number[]): Meet {
  const a = timeline(lv, downWaits, true), b = timeline(lv, upWaits, false);
  let crash: Meet['crash'] = null;
  for (const x of a.segs) for (const y of b.segs) {
    if (x.seg !== y.seg) continue;
    const lo = Math.max(x.from, y.from), hi = Math.min(x.to, y.to);
    if (lo < hi && (!crash || lo < crash.t)) crash = { seg: x.seg, t: (lo + hi) / 2 };
  }
  const late: [boolean, boolean] = [a.arrive > lv.deadline[0], b.arrive > lv.deadline[1]];
  return { crash, arrive: [a.arrive, b.arrive], late, ok: !crash && !late[0] && !late[1] };
}
export function trainSolve(lv: TrainLevel): { down: number[]; up: number[] }[] {
  const m = lv.stations.length - 2;
  const all: number[][] = [];
  const gen = (cur: number[]) => { if (cur.length === m) { all.push([...cur]); return; } for (let w = 0; w <= lv.maxWait; w++) gen([...cur, w]); };
  gen([]);
  const out: { down: number[]; up: number[] }[] = [];
  for (const d of all) for (const u of all) if (trainCheck(lv, d, u).ok) out.push({ down: d, up: u });
  return out;
}

// 「天空港」的規則：航線合不合法、照航線走、擦撞、過境費、星星、存檔。純函式，畫面在 ui/Sky.tsx。

import { keyFor } from './owner';
import { FEE, LEVELS, PORTS, inFir, portById, seaAt, type Kind, type Level } from '../data/sky';
import { isLand } from '../data/skyLand';

export interface Pt { x: number; y: number }
export const SPEED: Record<Kind, number> = { plane: 85, ship: 42 }; // 一秒走幾個地圖單位
export const GRAB = 60; // 手指離交通工具多近算抓到
export const ARRIVE = 55; // 線畫到目的地多近算到
export const NEAR = 30; // 兩架靠多近算擦撞
export const TYPHOON_R = 120;

export interface Veh {
  id: number; kind: Kind; from: string; to: string;
  at: Pt; heading: number;
  path: Pt[] | null; // 還沒畫線＝在港口等
  done: boolean;
  firSeen: boolean; // 有沒有飛進臺北飛航情報區
  seas: string[]; // 經過的海
  bump: number; // 剛擦撞過（秒），這段時間不重複算
}

// off：離港口多遠（地圖單位），畫面依螢幕大小排開；沒給就繞著港口小小一圈
export const spawn = (id: number, kind: Kind, from: string, to: string, k = 0, off?: Pt): Veh => {
  const p = portById(from).at, o = off ?? { x: 18 * Math.cos(k * 2.4), y: 18 * Math.sin(k * 2.4) };
  return { id, kind, from, to, at: { x: p.x + o.x, y: p.y + o.y }, heading: 0, path: null, done: false, firSeen: false, seas: [], bump: 0 };
};

// 畫好的線能不能用：船不能經過陸地（港口附近一小段不管），要畫到目的地附近
// arrive：多近算到；slack：在陸地上連續走不到多遠不算（只擦過海岸）（手機上地圖縮很小、手指又粗，畫面會依螢幕放寬這兩個）
export function checkPath(v: Veh, pts: Pt[], arrive = ARRIVE, slack = 0): { ok: boolean; why?: string } {
  if (pts.length < 2) return { ok: false, why: '線太短了' };
  const to = portById(v.to).at, from = portById(v.from).at;
  const end = pts[pts.length - 1];
  if (Math.hypot(end.x - to.x, end.y - to.y) > arrive) {
    const near = PORTS.filter((p) => p.id !== v.to && p.id !== v.from).map((p) => ({ p, d: Math.hypot(end.x - p.at.x, end.y - p.at.y) }))
      .filter((x) => x.d <= arrive).sort((a, b) => a.d - b.d)[0];
    const goal = portById(v.to);
    const tag = goal.gate ? '綠色箭頭' : '發亮的圈圈';
    return { ok: false, why: near ? `這班要去「${goal.name}」，不是「${near.p.name}」喔（看${tag}）` : `線要拉到「${goal.name}」的${tag}裡喔` };
  }
  if (v.kind === 'ship') {
    let run = 0; // 連續在陸地上走了多遠：只擦過海岸一小段（不到 slack）放過，橫越陸地不行
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 5)), seg = Math.hypot(b.x - a.x, b.y - a.y) / n;
      for (let k = 1; k <= n; k++) {
        const p = { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n };
        if (Math.hypot(p.x - from.x, p.y - from.y) < Math.max(40, slack * 2) || Math.hypot(p.x - to.x, p.y - to.y) < Math.max(40, arrive)) { run = 0; continue; }
        run = isLand(p) ? run + seg : 0;
        if (isLand(p) && run >= slack) return { ok: false, why: '船不能開上陸地！沿著海畫' };
      }
    }
  }
  return { ok: true };
}

// 照著航線走 dt 秒
export function step(v: Veh, dt: number): Veh {
  if (v.done || !v.path) return v;
  let left = SPEED[v.kind] * dt, at = v.at, path = v.path, heading = v.heading;
  while (left > 0 && path.length) {
    const t = path[0], d = Math.hypot(t.x - at.x, t.y - at.y);
    if (d > 0.01) heading = Math.atan2(t.y - at.y, t.x - at.x);
    if (d <= left) { at = t; left -= d; path = path.slice(1); }
    else { at = { x: at.x + ((t.x - at.x) / d) * left, y: at.y + ((t.y - at.y) / d) * left }; left = 0; }
  }
  const sea = seaAt(at);
  return {
    ...v, at, heading, path, done: path.length === 0,
    firSeen: v.firSeen || inFir(at),
    seas: sea && !v.seas.includes(sea) ? [...v.seas, sea] : v.seas,
    bump: Math.max(0, v.bump - dt),
  };
}

// 別國的飛機飛過臺北飛航情報區才收過境費（從臺灣起飛、降落的不算）
export const feeOf = (v: Veh) => (v.kind === 'plane' && v.firSeen && !portById(v.from).home && !portById(v.to).home ? FEE : 0);

// 同一種交通工具（飛機跟飛機、船跟船）在路上靠太近
export function bumps(vs: Veh[]): [number, number][] {
  const out: [number, number][] = [];
  const moving = vs.filter((v) => v.path && !v.done);
  for (let i = 0; i < moving.length; i++) for (let j = i + 1; j < moving.length; j++) {
    const a = moving[i], b = moving[j];
    if (a.kind !== b.kind || a.bump > 0 || b.bump > 0) continue;
    if (Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y) < NEAR) out.push([a.id, b.id]);
  }
  return out;
}

// 颱風從東南方的海上慢慢往西北走（t 秒時在哪裡）
export function typhoonAt(t: number): Pt {
  const k = (t % 70) / 70;
  return { x: 1420 - k * 700, y: 1000 - k * 560 };
}
export const inTyphoon = (p: Pt, t: number) => { const c = typhoonAt(t); return Math.hypot(p.x - c.x, p.y - c.y) < TYPHOON_R; };

// 星星：送完 1 顆；擦撞不超過 1 次 2 顆；沒擦撞而且收到目標過境費 3 顆
export function starsOf(lv: Level, hits: number, fee: number): number {
  if (hits === 0 && fee >= lv.fee) return 3;
  return hits <= 1 ? 2 : 1;
}

export interface SkySave { v: 1; intro: boolean; best: Record<string, number>; seas: string[] }
export const freshSky = (): SkySave => ({ v: 1, intro: false, best: {}, seas: [] });
export const unlocked = (s: SkySave, id: number) => id === 1 || (s.best[id - 1] ?? 0) > 0;
export function finish(s: SkySave, id: number, stars: number, seas: string[]): SkySave {
  return { ...s, best: { ...s.best, [id]: Math.max(s.best[id] ?? 0, stars) }, seas: [...new Set([...s.seas, ...seas])] };
}
export const skyCleared = (s: SkySave) => LEVELS.every((l) => (s.best[l.id] ?? 0) > 0);

const KEY = 'island.sky.v1';
export function loadSky(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): SkySave {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshSky();
    const p = JSON.parse(raw) as Partial<SkySave>;
    return p.v === 1 ? { ...freshSky(), ...p, best: { ...(p.best ?? {}) }, seas: [...(p.seas ?? [])] } : freshSky();
  } catch {
    return freshSky();
  }
}
export function pickSky(local: SkySave, cloud: Partial<SkySave> | null | undefined): SkySave {
  if (!cloud || cloud.v !== 1) return local;
  const best = { ...local.best };
  for (const [k, v] of Object.entries(cloud.best ?? {})) if (typeof v === 'number') best[k] = Math.max(best[k] ?? 0, Math.min(3, v));
  return { ...local, intro: local.intro || !!cloud.intro, best, seas: [...new Set([...local.seas, ...(cloud.seas ?? [])])] };
}
export function saveSky(s: SkySave, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try { store?.setItem(keyFor(KEY), JSON.stringify(s)); } catch { /* 存不了就算了 */ }
}

export const portsUsed = (lv: Level) => PORTS.filter((p) => lv.trips.some((t) => t.from === p.id || t.to === p.id));

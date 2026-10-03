// 第三章《大航海時代》的謎題規則：季風航線、轉口貿易、鹿群與鹿皮、新港文書解碼與界線、港灣排船。
// 純函式，不碰畫面；關卡資料在 data/ch3.ts，用單元測試確認每一關都解得開、亂來會失敗。

// ── 季風與航線 ─────────────────────────────────
// 帆船只能順著風走：冬天吹東北季風（風往西南吹），船頭可以朝 西、西南、南；
// 夏天吹西南季風（風往東北吹），船頭可以朝 北、東北、東。一次走一格、過一天。
// 進到黑水溝／黑潮（k）會再被海流往北推一格。淺灘（s）會撞壞、撞上陸地（L）會擱淺、出了海圖就迷路。
// 港口外的沙洲水道（c）只有漲潮才進得去（退潮進去會擱淺）。潮水一天漲、一天退（第 0 天是漲潮）。
// 「等潮水」停一天；「等季風」要等 SEASON_WAIT 天，風才會換邊。時間有限：超過 days 天就來不及了。
export type Monsoon = 'winter' | 'summer';
export type Heading = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export interface Pos { col: number; row: number }
export const HEADINGS: Record<Monsoon, Heading[]> = { winter: ['W', 'SW', 'S'], summer: ['N', 'NE', 'E'] };
export const STEP: Record<Heading, Pos> = {
  N: { col: 0, row: -1 }, NE: { col: 1, row: -1 }, E: { col: 1, row: 0 }, SE: { col: 1, row: 1 },
  S: { col: 0, row: 1 }, SW: { col: -1, row: 1 }, W: { col: -1, row: 0 }, NW: { col: -1, row: -1 },
};
export const SEASON_WAIT = 3;
export type SeaCell = 'sea' | 'land' | 'shoal' | 'current' | 'channel' | 'harbor' | 'start';
const CELL: Record<string, SeaCell> = { '.': 'sea', L: 'land', s: 'shoal', k: 'current', c: 'channel', H: 'harbor', A: 'start' };

export interface RouteLevel { rows: string[]; monsoon: Monsoon; days: number }
export interface Ship { pos: Pos; monsoon: Monsoon; day: number }
export type RouteOutcome = 'sailing' | 'arrived' | 'aground' | 'lowtide' | 'wreck' | 'lost' | 'late';
export type RouteAction = { go: Heading } | 'tide' | 'season';

export const cellAt = (lv: RouteLevel, p: Pos): SeaCell | null =>
  p.row < 0 || p.col < 0 || p.row >= lv.rows.length || p.col >= lv.rows[0].length ? null : CELL[lv.rows[p.row][p.col]] ?? 'sea';
const find = (lv: RouteLevel, ch: string): Pos => {
  for (let row = 0; row < lv.rows.length; row++) { const col = lv.rows[row].indexOf(ch); if (col >= 0) return { col, row }; }
  throw new Error(`no ${ch}`);
};
export const startShip = (lv: RouteLevel): Ship => ({ pos: find(lv, 'A'), monsoon: lv.monsoon, day: 0 });
export const harborOf = (lv: RouteLevel) => find(lv, 'H');
export const highTide = (day: number) => day % 2 === 0;

// 船進到某一格會怎樣（day 是進去那一天，用來看潮水）
function enter(lv: RouteLevel, p: Pos, day: number): RouteOutcome {
  const c = cellAt(lv, p);
  if (c === null) return 'lost';
  if (c === 'land') return 'aground';
  if (c === 'shoal') return 'wreck';
  if (c === 'channel' && !highTide(day)) return 'lowtide';
  if (c === 'harbor') return 'arrived';
  return 'sailing';
}

// 做一個動作。path 是這一步船經過的格子（含被海流推的那一格），畫動畫用
export function routeStep(lv: RouteLevel, s: Ship, a: RouteAction): { ship: Ship; path: Pos[]; outcome: RouteOutcome } {
  if (a === 'tide' || a === 'season') {
    const day = s.day + (a === 'tide' ? 1 : SEASON_WAIT);
    const ship = { ...s, day, monsoon: a === 'season' ? (s.monsoon === 'winter' ? 'summer' : 'winter') as Monsoon : s.monsoon };
    return { ship, path: [], outcome: day > lv.days ? 'late' : 'sailing' };
  }
  if (!HEADINGS[s.monsoon].includes(a.go)) throw new Error('逆風不能走');
  const d = STEP[a.go];
  let p = { col: s.pos.col + d.col, row: s.pos.row + d.row };
  const path = [p];
  let o = enter(lv, p, s.day);
  if (o === 'sailing' && cellAt(lv, p) === 'current') {
    p = { col: p.col, row: p.row - 1 };
    path.push(p);
    o = enter(lv, p, s.day);
  }
  const ship = { ...s, pos: p, day: s.day + 1 };
  if (o === 'sailing' && ship.day > lv.days) o = 'late';
  return { ship, path, outcome: o };
}

// 照一串動作走（測試、示範用）
export function routeRun(lv: RouteLevel, acts: readonly RouteAction[]): { ship: Ship; outcome: RouteOutcome } {
  let ship = startShip(lv);
  let outcome: RouteOutcome = 'sailing';
  for (const a of acts) {
    const r = routeStep(lv, ship, a);
    ship = r.ship; outcome = r.outcome;
    if (outcome !== 'sailing') break;
  }
  return { ship, outcome };
}

// 找天數最少的走法（廣度優先；同一天數下動作最少）
export function routeSolve(lv: RouteLevel, from: Ship = startShip(lv)): RouteAction[] | null {
  const key = (s: Ship) => `${s.pos.col},${s.pos.row},${s.monsoon},${s.day}`;
  // 用天數排序的佇列（等季風一次跳好幾天）
  const buckets: { s: Ship; acts: RouteAction[] }[][] = [];
  const seen = new Set<string>();
  const push = (s: Ship, acts: RouteAction[]) => { const k = key(s); if (seen.has(k)) return; seen.add(k); (buckets[s.day] ??= []).push({ s, acts }); };
  push(from, []);
  for (let day = from.day; day <= lv.days; day++) {
    for (const { s, acts } of buckets[day] ?? []) {
      const all: RouteAction[] = [...HEADINGS[s.monsoon].map((go) => ({ go })), 'tide', 'season'];
      for (const a of all) {
        const r = routeStep(lv, s, a);
        if (r.outcome === 'arrived') return [...acts, a];
        if (r.outcome === 'sailing') push(r.ship, [...acts, a]);
      }
    }
  }
  return null;
}

// ── 轉口貿易 ─────────────────────────────────
// 船艙有 hold 格，一格裝一份貨。每個港口有「在這裡買要花多少銀」和「在這裡賣拿多少銀」。
// 船只能在大員和別的港口之間來回（大員是轉運站），一共可以開 legs 趟，最後要有 goal 兩銀。
export type Good = 'silk' | 'porcelain' | 'deerskin' | 'sugar' | 'spice';
export type PortId = 'tayouan' | 'japan' | 'batavia';
export interface Port { id: PortId; buy: Partial<Record<Good, number>>; sell: Partial<Record<Good, number>> } // buy＝你買的價錢、sell＝你賣的價錢
export interface TradeLevel { ports: Port[]; start: PortId; money: number; hold: number; legs: number; goal: number }
export interface TradeState { at: PortId; money: number; cargo: Partial<Record<Good, number>>; legs: number } // legs＝已經開了幾趟

export const GOODS: Good[] = ['silk', 'porcelain', 'deerskin', 'sugar', 'spice'];
export const portOf = (lv: TradeLevel, id: PortId) => lv.ports.find((p) => p.id === id)!;
export const loaded = (s: TradeState) => GOODS.reduce((a, g) => a + (s.cargo[g] ?? 0), 0);
export const canSail = (from: PortId, to: PortId) => from !== to && (from === 'tayouan' || to === 'tayouan');
export const freshTrade = (lv: TradeLevel): TradeState => ({ at: lv.start, money: lv.money, cargo: {}, legs: 0 });

export function buy(lv: TradeLevel, s: TradeState, g: Good): TradeState | null {
  const price = portOf(lv, s.at).buy[g];
  if (price === undefined || s.money < price || loaded(s) >= lv.hold) return null;
  return { ...s, money: s.money - price, cargo: { ...s.cargo, [g]: (s.cargo[g] ?? 0) + 1 } };
}
export function sell(lv: TradeLevel, s: TradeState, g: Good): TradeState | null {
  const price = portOf(lv, s.at).sell[g];
  if (price === undefined || !s.cargo[g]) return null;
  return { ...s, money: s.money + price, cargo: { ...s.cargo, [g]: s.cargo[g]! - 1 } };
}
export function sail(lv: TradeLevel, s: TradeState, to: PortId): TradeState | null {
  if (!canSail(s.at, to) || s.legs >= lv.legs) return null;
  return { ...s, at: to, legs: s.legs + 1 };
}
// 貨的價值不算錢：最後只看手上的銀
export const tradeWon = (lv: TradeLevel, s: TradeState) => s.money >= lv.goal;

// 一趟到港：先賣、再買。列出所有買法（每種貨買幾份），給求解用
function buyOptions(lv: TradeLevel, money: number, room: number, at: PortId): Partial<Record<Good, number>>[] {
  const goods = GOODS.filter((g) => portOf(lv, at).buy[g] !== undefined);
  const out: Partial<Record<Good, number>>[] = [];
  const go = (i: number, left: number, m: number, cur: Partial<Record<Good, number>>) => {
    if (i === goods.length) { out.push({ ...cur }); return; }
    const g = goods[i], price = portOf(lv, at).buy[g]!;
    for (let n = 0; n <= left && n * price <= m; n++) go(i + 1, left - n, m - n * price, n ? { ...cur, [g]: n } : cur);
  };
  go(0, room, money, {});
  return out;
}
// 最多能賺到多少（每到一港把能賣的都賣掉、再決定買什麼；賣在別港更貴的情況也算進去：可以選擇不賣）
export function tradeBest(lv: TradeLevel): { money: number; plan: { to: PortId; buy: Partial<Record<Good, number>> }[] } {
  let best = { money: -1, plan: [] as { to: PortId; buy: Partial<Record<Good, number>> }[] };
  const go = (at: PortId, money: number, cargo: Partial<Record<Good, number>>, legs: number, plan: { to: PortId; buy: Partial<Record<Good, number>> }[]) => {
    // 在這港賣：每種貨要嘛全賣、要嘛全留
    const port = portOf(lv, at);
    const sellable = GOODS.filter((g) => cargo[g] && port.sell[g] !== undefined);
    const masks = 1 << sellable.length;
    for (let m = 0; m < masks; m++) {
      let mon = money; const c = { ...cargo };
      sellable.forEach((g, i) => { if (m & (1 << i)) { mon += port.sell[g]! * c[g]!; c[g] = 0; } });
      if (mon > best.money) best = { money: mon, plan };
      if (legs >= lv.legs) continue;
      const room = lv.hold - GOODS.reduce((a, g) => a + (c[g] ?? 0), 0);
      for (const b of buyOptions(lv, mon, room, at)) {
        const cost = GOODS.reduce((a, g) => a + (b[g] ?? 0) * (port.buy[g] ?? 0), 0);
        const c2 = { ...c };
        GOODS.forEach((g) => { if (b[g]) c2[g] = (c2[g] ?? 0) + b[g]!; });
        for (const to of lv.ports.map((p) => p.id).filter((id) => canSail(at, id))) go(to, mon - cost, c2, legs + 1, [...plan, { to, buy: b }]);
      }
    }
  };
  go(lv.start, lv.money, {}, 0, []);
  return best;
}

// ── 鹿群與鹿皮 ─────────────────────────────────
// 鹿群 n 群（一群大約 100 隻）。每年先收鹿皮 take 群，剩下的鹿生小鹿：多「剩下 ÷ birthDiv」群（無條件捨去），
// 草原最多養得起 cap 群。收的鹿皮加起來要有 need 群；而且最後鹿群不能比一開始少。
export interface HerdLevel { start: number; cap: number; birthDiv: number; years: number; need: number; maxTake: number }
export interface HerdYear { take: number; left: number; born: number; after: number }
export function herdYear(lv: HerdLevel, n: number, take: number): HerdYear {
  const t = Math.min(take, n);
  const left = n - t;
  const born = Math.floor(left / lv.birthDiv);
  return { take: t, left, born, after: Math.min(lv.cap, left + born) };
}
export function herdRun(lv: HerdLevel, takes: readonly number[]): { years: HerdYear[]; total: number; end: number; enough: boolean; fewer: boolean; ok: boolean } {
  let n = lv.start;
  const years: HerdYear[] = [];
  for (const t of takes) { const y = herdYear(lv, n, t); years.push(y); n = y.after; }
  const total = years.reduce((a, y) => a + y.take, 0);
  const enough = total >= lv.need;
  const fewer = n < lv.start;
  return { years, total, end: n, enough, fewer, ok: years.length === lv.years && enough && !fewer };
}
// 最多收得到多少、而且鹿群不變少
export function herdBest(lv: HerdLevel): { total: number; takes: number[] } {
  let best = { total: -1, takes: [] as number[] };
  const go = (n: number, y: number, takes: number[], total: number) => {
    if (y === lv.years) { if (n >= lv.start && total > best.total) best = { total, takes }; return; }
    for (let t = 0; t <= Math.min(lv.maxTake, n); t++) go(herdYear(lv, n, t).after, y + 1, [...takes, t], total + t);
  };
  go(lv.start, 0, [], 0);
  return best;
}
export function herdSolutions(lv: HerdLevel): number[][] {
  const out: number[][] = [];
  const go = (takes: number[]) => {
    if (takes.length === lv.years) { if (herdRun(lv, takes).ok) out.push(takes); return; }
    for (let t = 0; t <= lv.maxTake; t++) go([...takes, t]);
  };
  go([]);
  return out;
}

// ── 新港文書：解碼、找界線 ─────────────────────────
// 契約是一串羅馬字。單字表查得到的直接懂；查不到的方向字，要從例句推出來。
export type Dir = 'E' | 'W' | 'S' | 'N';
export interface Spot { id: string; kind: string; col: number; row: number }
export interface Leg { dir: Dir; to: string } // 往 dir 方向走到某一種地標
// 從 at 往 dir 看，那一種地標裡最近、而且確實在那個方向（偏離不超過前進距離）的那一個
export function nextSpot(spots: readonly Spot[], at: Spot, leg: Leg): Spot | null {
  const ok = spots.filter((s) => s.kind === leg.to && s.id !== at.id).filter((s) => {
    const dx = s.col - at.col, dy = s.row - at.row;
    const ahead = leg.dir === 'E' ? dx : leg.dir === 'W' ? -dx : leg.dir === 'S' ? dy : -dy;
    const side = leg.dir === 'E' || leg.dir === 'W' ? Math.abs(dy) : Math.abs(dx);
    return ahead > 0 && side <= ahead;
  });
  ok.sort((a, b) => Math.abs(a.col - at.col) + Math.abs(a.row - at.row) - (Math.abs(b.col - at.col) + Math.abs(b.row - at.row)));
  return ok[0] ?? null;
}
// 照契約一段一段走，得到界線經過的地標（含起點；走不通回傳 null）
export function tracePath(spots: readonly Spot[], startId: string, legs: readonly Leg[]): Spot[] | null {
  let at = spots.find((s) => s.id === startId);
  if (!at) return null;
  const out = [at];
  for (const leg of legs) { const n = nextSpot(spots, at, leg); if (!n) return null; out.push(n); at = n; }
  return out;
}
// 解碼：玩家替每個不認得的字選的意思，全對才算
export function decodeCheck(answer: Readonly<Record<string, string>>, guess: Readonly<Record<string, string>>): { wrong: string[]; done: boolean } {
  const ids = Object.keys(answer);
  const wrong = ids.filter((w) => guess[w] !== undefined && guess[w] !== answer[w]);
  return { wrong, done: wrong.length === 0 && ids.every((w) => guess[w] !== undefined) };
}
// 點在多邊形裡面嗎（界線圍起來的地方；格子中心）
export function inside(poly: readonly { col: number; row: number }[], col: number, row: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.row > row) !== (b.row > row) && col < ((b.col - a.col) * (row - a.row)) / (b.row - a.row) + a.col) c = !c;
  }
  return c;
}

// ── 港灣排船（北邊的城堡）────────────────────────
// 6×6 的港灣，船只能沿著自己的方向前後滑。把紅帆補給船（A，橫的、在出口那一列）滑出右邊的出口。
// 關卡用字串畫：'.' 空的，同一個字母是同一艘船（2 或 3 格），'#' 是礁石。
export interface Boat { id: string; col: number; row: number; len: number; across: boolean } // across＝橫的
export interface Harbor { size: number; exitRow: number; boats: Boat[]; rocks: Pos[] }
export function parseHarbor(rows: readonly string[]): Harbor {
  const size = rows.length;
  const cells = new Map<string, Pos[]>();
  const rocks: Pos[] = [];
  rows.forEach((line, row) => [...line].forEach((ch, col) => {
    if (ch === '.') return;
    if (ch === '#') { rocks.push({ col, row }); return; }
    cells.set(ch, [...(cells.get(ch) ?? []), { col, row }]);
  }));
  const boats: Boat[] = [...cells].map(([id, ps]) => {
    const across = ps.every((p) => p.row === ps[0].row);
    return { id, col: Math.min(...ps.map((p) => p.col)), row: Math.min(...ps.map((p) => p.row)), len: ps.length, across };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const a = boats.find((b) => b.id === 'A')!;
  return { size, exitRow: a.row, boats, rocks };
}
const occupied = (h: Harbor, boats: readonly Boat[], skip?: string) => {
  const g = new Set<string>(h.rocks.map((p) => `${p.col},${p.row}`));
  for (const b of boats) if (b.id !== skip) for (let k = 0; k < b.len; k++) g.add(b.across ? `${b.col + k},${b.row}` : `${b.col},${b.row + k}`);
  return g;
};
// 這艘船往前（+）或往後（−）最多能滑幾格
export function slideRange(h: Harbor, boats: readonly Boat[], id: string): { back: number; fwd: number } {
  const b = boats.find((x) => x.id === id)!;
  const g = occupied(h, boats, id);
  const free = (c: number, r: number) => c >= 0 && r >= 0 && c < h.size && r < h.size && !g.has(`${c},${r}`);
  let back = 0, fwd = 0;
  if (b.across) {
    while (free(b.col - back - 1, b.row)) back++;
    while (free(b.col + b.len + fwd, b.row)) fwd++;
  } else {
    while (free(b.col, b.row - back - 1)) back++;
    while (free(b.col, b.row + b.len + fwd)) fwd++;
  }
  return { back, fwd };
}
export function slide(h: Harbor, boats: readonly Boat[], id: string, by: number): Boat[] | null {
  const r = slideRange(h, boats, id);
  if (by === 0 || by > r.fwd || -by > r.back) return null;
  return boats.map((b) => b.id !== id ? b : b.across ? { ...b, col: b.col + by } : { ...b, row: b.row + by });
}
// 補給船的右邊一路空到出口
export function harborFree(h: Harbor, boats: readonly Boat[]): boolean {
  const a = boats.find((b) => b.id === 'A')!;
  return slideRange(h, boats, 'A').fwd === h.size - a.col - a.len;
}
// 最少要滑幾次（一次滑任意格算一步）
export function harborSolve(h: Harbor): { id: string; by: number }[] | null {
  const key = (bs: readonly Boat[]) => bs.map((b) => `${b.col},${b.row}`).join('|');
  const q: { bs: Boat[]; moves: { id: string; by: number }[] }[] = [{ bs: h.boats, moves: [] }];
  const seen = new Set([key(h.boats)]);
  while (q.length) {
    const { bs, moves } = q.shift()!;
    if (harborFree(h, bs)) return moves;
    for (const b of bs) {
      const r = slideRange(h, bs, b.id);
      for (let by = -r.back; by <= r.fwd; by++) {
        if (!by) continue;
        const n = slide(h, bs, b.id, by)!;
        const k = key(n);
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ bs: n, moves: [...moves, { id: b.id, by }] });
      }
    }
  }
  return null;
}

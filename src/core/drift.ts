// 序章「海上漂流」的規則。純函式，不碰畫面。
//
// 船沒有槳，只能靠風和海流。小朋友轉「天氣羅盤」選季節：
//   冬天吹東北季風，風從東北吹來，船往西南漂；夏天吹西南季風，船往東北漂。
// 換季的時候風很弱（calm），船不太動；可是在黑潮裡，還是會被海流往北帶。
// 船漂進黑潮（臺灣東邊往北流的海流），每一步還會再被往北帶一格。
// 每次出航漂 LEG 格（一個月），糧食只夠出航幾次；漂到港口就到了，
// 撞上陸地會擱淺、撞上暗礁會撞壞、漂出海圖就迷路了。

export type Season = 'winter' | 'summer' | 'calm';
export const SEASONS: Season[] = ['winter', 'summer', 'calm'];
export type Sea = 'sea' | 'current' | 'land' | 'reef' | 'harbor';
export interface Pos { col: number; row: number }

export const WIND: Record<Season, Pos> = { winter: { col: -1, row: 1 }, summer: { col: 1, row: -1 }, calm: { col: 0, row: 0 } };
export const CURRENT: Pos = { col: 0, row: -1 }; // 黑潮往北
export const LEG = 2;

export interface SeaMap {
  cols: number;
  rows: number;
  at: (p: Pos) => Sea;
  start: Pos;
  legs: number; // 糧食夠出航幾次
}

export type Outcome = 'sailing' | 'arrived' | 'aground' | 'wreck' | 'lost' | 'hungry';
export interface Leg { path: Pos[]; end: Pos; outcome: Outcome } // path 不含起點

const inside = (m: SeaMap, p: Pos) => p.col >= 0 && p.row >= 0 && p.col < m.cols && p.row < m.rows;
const add = (a: Pos, b: Pos): Pos => ({ col: a.col + b.col, row: a.row + b.row });

// 走一小步，看會發生什麼事
function enter(m: SeaMap, p: Pos): Outcome {
  if (!inside(m, p)) return 'lost';
  const k = m.at(p);
  if (k === 'harbor') return 'arrived';
  if (k === 'land') return 'aground';
  if (k === 'reef') return 'wreck';
  return 'sailing';
}

// 出航一次：漂 LEG 格。每一格先被風吹一步，再看在不在黑潮裡，在的話再往北一步（沒風的時候船停在原地）。
export function sail(m: SeaMap, from: Pos, season: Season): Leg {
  const path: Pos[] = [];
  let p = from;
  for (let i = 0; i < LEG; i++) {
    const w = WIND[season];
    if (w.col || w.row) {
      p = add(p, w);
      path.push(p);
      const o = enter(m, p);
      if (o !== 'sailing') return { path, end: p, outcome: o };
    }
    if (m.at(p) === 'current') {
      p = add(p, CURRENT);
      path.push(p);
      const o = enter(m, p);
      if (o !== 'sailing') return { path, end: p, outcome: o };
    }
  }
  return { path, end: p, outcome: 'sailing' };
}

// 照一串季節出航（給測試、示範用）
export function voyage(m: SeaMap, seasons: readonly Season[]): { legs: Leg[]; outcome: Outcome } {
  const legs: Leg[] = [];
  let p = m.start;
  for (const s of seasons) {
    const l = sail(m, p, s);
    legs.push(l);
    p = l.end;
    if (l.outcome !== 'sailing') return { legs, outcome: l.outcome };
    if (legs.length >= m.legs) return { legs, outcome: 'hungry' };
  }
  return { legs, outcome: 'sailing' };
}

// 最少出航幾次能到港（找不到回傳 null）：給測試確認每一關有解
export function shortest(m: SeaMap): Season[] | null {
  const key = (p: Pos) => `${p.col},${p.row}`;
  const seen = new Set([key(m.start)]);
  let frontier: { p: Pos; plan: Season[] }[] = [{ p: m.start, plan: [] }];
  for (let depth = 0; depth < m.legs; depth++) {
    const next: typeof frontier = [];
    for (const { p, plan } of frontier)
      for (const s of SEASONS) {
        const l = sail(m, p, s);
        if (l.outcome === 'arrived') return [...plan, s];
        if (l.outcome !== 'sailing' || seen.has(key(l.end))) continue;
        seen.add(key(l.end));
        next.push({ p: l.end, plan: [...plan, s] });
      }
    frontier = next;
  }
  return null;
}

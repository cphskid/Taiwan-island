// 分水協商（第五章步驟 4）。純函式，不碰畫面。
//
// 圳道在分水閘分成兩條：漳州莊 6 塊田、泉州莊 4 塊田。小朋友拉兩塊閘板決定兩邊開多大（0～100%）。
// 每塊田要剛好的水：太少會乾、太多會淹。旱季溪水少、雨季溪水多，季節一變就要重調。
// 兩邊開的加起來超過 100%，就只是照比例把全部的水分掉；沒開到的水留在溪裡。
// 「兩邊一樣多」在旱季剛好不行：田多的那邊會乾、田少的那邊會淹，要照田的多少分才公平。
// 溪裡也要留水（巴布薩族的人在溪邊捕魚、取水）：兩邊開太大、溪裡剩不到 RIVER_MIN 就不行。
// 旱季只有很窄的範圍三邊都顧得到（例如 55%／35%），雨季水多就寬鬆了。

export type Season = 'dry' | 'rain';
export type Side = 'zhang' | 'quan';
export type FieldState = 'dry' | 'ok' | 'flood';

export const FLOW: Record<Season, number> = { dry: 10, rain: 16 }; // 溪水流進圳道的水量
export const FIELDS: Record<Side, number> = { zhang: 6, quan: 4 };
export const LOW = 0.85; // 每塊田水少於這個就乾
export const HIGH = 1.2; // 多於這個就淹
export const RIVER_MIN = 1; // 溪裡至少要留的水
export const DRY_HOLD = 8; // 旱季全部綠了撐幾秒，雨季就來
export const RAIN_HOLD = 20; // 雨季要撐幾秒才過關

export interface Gates { zhang: number; quan: number } // 0～100

// 每塊田分到多少水
export function perField(season: Season, g: Gates): Record<Side, number> {
  const w = FLOW[season];
  const total = g.zhang + g.quan;
  const k = total > 100 ? 100 / total : 1;
  return {
    zhang: (w * (g.zhang / 100) * k) / FIELDS.zhang,
    quan: (w * (g.quan / 100) * k) / FIELDS.quan,
  };
}

// 沒有開進圳道、留在溪裡的水
export function riverLeft(season: Season, g: Gates): number {
  return FLOW[season] * (1 - Math.min(1, (g.zhang + g.quan) / 100));
}
export const riverOk = (season: Season, g: Gates) => riverLeft(season, g) >= RIVER_MIN - 1e-9;

export function stateOf(m: number): FieldState {
  return m < LOW ? 'dry' : m > HIGH ? 'flood' : 'ok';
}

// 閘板開多大才剛好（給第 5 次示範用）：這一季每邊可以接受的範圍
export function goodRange(season: Season, side: Side): [number, number] {
  const need = FIELDS[side] / FLOW[season];
  return [Math.ceil(need * LOW * 100), Math.floor(need * HIGH * 100)];
}

export interface Share {
  season: Season;
  gates: Gates;
  moist: Record<Side, number>; // 田裡現在的水（慢慢跟上閘板的設定）
  hold: number; // 全部田都綠著撐了幾秒
  done: boolean;
  fails: number; // 調好之後還是有田乾掉或淹掉的次數
  counted: boolean; // 這一次的設定已經算過失敗了
  rained: boolean; // 這一步剛剛變成雨季（給畫面播一次提示）
}

export function startShare(): Share {
  return { season: 'dry', gates: { zhang: 0, quan: 0 }, moist: { zhang: 0, quan: 0 }, hold: 0, done: false, fails: 0, counted: false, rained: false };
}

export function setGate(s: Share, side: Side, value: number): Share {
  const v = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
  return { ...s, gates: { ...s.gates, [side]: v }, counted: false };
}

export const allOk = (s: Share) => stateOf(s.moist.zhang) === 'ok' && stateOf(s.moist.quan) === 'ok' && riverOk(s.season, s.gates);

// 時間往前 dt 秒
export function tick(s: Share, dt: number): Share {
  if (s.done) return s;
  const target = perField(s.season, s.gates);
  const k = Math.min(1, dt * 1.5);
  const moist = {
    zhang: s.moist.zhang + (target.zhang - s.moist.zhang) * k,
    quan: s.moist.quan + (target.quan - s.moist.quan) * k,
  };
  const next: Share = { ...s, moist, rained: false };
  const ok = allOk(next);
  next.hold = ok ? s.hold + dt : 0;
  // 水已經流穩了，田還是不對：算一次失敗（同一個設定只算一次；有動過閘板才算）
  const settled = Math.abs(target.zhang - moist.zhang) < 0.03 && Math.abs(target.quan - moist.quan) < 0.03;
  const touched = s.gates.zhang + s.gates.quan > 0;
  if (settled && !ok && touched && !s.counted) {
    next.fails = s.fails + 1;
    next.counted = true;
  }
  if (s.season === 'dry' && next.hold >= DRY_HOLD) {
    next.season = 'rain';
    next.hold = 0;
    next.rained = true;
    next.counted = true; // 雨來了是季節變，不是小朋友調錯
  } else if (s.season === 'rain' && next.hold >= RAIN_HOLD) {
    next.done = true;
  }
  return next;
}

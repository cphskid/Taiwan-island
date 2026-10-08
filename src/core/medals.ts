// 成就勳章要的額外紀錄（2026-10-08）：看過哪些結局、過了哪些⭐⭐⭐再挑戰、找到哪些時光碎片（彩蛋）。
//
// 章節存檔重玩會被蓋掉（選擇、星星），這裡只會「加」，跨章累積，雲端存在 'medals' 那格。
// 勳章本身是樂園蓋的：supabase/island_pioneer.sql 的 island_earned_stamps 讀各章存檔和這一格，
// 算出「該拿到哪些勳章」，樂園打開時補蓋；遊戲裡做到了也會馬上叫 park_award_stamp。
//
// 每章 5 格：通關、收集（圖鑑全收）、精通（三顆星＋這章的⭐⭐⭐再挑戰全過）、劇情（看過兩種結局）、彩蛋（時光碎片）。

import { keyFor } from './owner';

export type MedalCh = 'pro' | 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ch6' | 'ch7' | 'end';

// 精通要過的⭐⭐⭐再挑戰（「章:關」）。之後再加再挑戰，這裡和 island_pioneer.sql 的 v_ch 要一起改。
export const CHALLENGES: Partial<Record<MedalCh, readonly string[]>> = {
  ch2: ['ch2:hunt'],
  ch3: ['ch3:deer'],
  ch4: ['ch4:salt'],
  ch6: ['ch6:tea'],
};

export interface Medals {
  v: 1;
  endings: string[]; // 'ch2:fawn0-seed1-trader0'：過關時的選擇組合，一種就是一種結局
  chal: string[]; // 'ch2:hunt'：過了的⭐⭐⭐再挑戰
  eggs: string[]; // 'ch2'：找到那一章的時光碎片
}

export const freshMedals = (): Medals => ({ v: 1, endings: [], chal: [], eggs: [] });

const KEY = 'island.medals.v1';
const list = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);

export function loadMedals(store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Medals {
  try {
    const raw = store?.getItem(keyFor(KEY));
    if (!raw) return freshMedals();
    const m = JSON.parse(raw) as Partial<Medals>;
    return m.v === 1 ? { v: 1, endings: list(m.endings), chal: list(m.chal), eggs: list(m.eggs) } : freshMedals();
  } catch {
    return freshMedals();
  }
}

export function saveMedals(m: Medals, store: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    store?.setItem(keyFor(KEY), JSON.stringify(m));
  } catch {
    /* 存不了就算了，下次做到再記 */
  }
}

const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((x) => !a.includes(x))];

// 本機和雲端合在一起（全部只會加）
export function mergeMedals(local: Medals, cloud: Partial<Medals> | null | undefined): Medals {
  if (!cloud || cloud.v !== 1) return local;
  return { v: 1, endings: union(local.endings, list(cloud.endings)), chal: union(local.chal, list(cloud.chal)), eggs: union(local.eggs, list(cloud.eggs)) };
}

export function addMedal(m: Medals, field: 'endings' | 'chal' | 'eggs', id: string): Medals {
  return m[field].includes(id) ? m : { ...m, [field]: [...m[field], id] };
}

// 一種選擇組合＝一種結局。沒有選擇的章（序章、第五章）回 null
export function endingKey(ch: MedalCh, picks: Readonly<Record<string, number | undefined>> | undefined): string | null {
  const keys = Object.keys(picks ?? {}).filter((k) => typeof picks?.[k] === 'number').sort();
  return keys.length ? `${ch}:${keys.map((k) => `${k}${picks![k]}`).join('-')}` : null;
}

// 這章看過幾種結局
export const endingsSeen = (m: Medals, ch: MedalCh) => m.endings.filter((e) => e.startsWith(`${ch}:`)).length;

// 這章過關後可能剛好拿到的勳章（叫 park_award_stamp 試試看，條件不夠樂園會擋）
export const chapterMedalCodes = (ch: MedalCh) =>
  ch === 'pro' ? ['pro', 'past'] : [ch, `${ch}-card`, `${ch}-star`, `${ch}-end`, 'past'];

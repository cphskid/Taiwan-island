// 雲端存檔：學生登入了就把本機存檔同步到測試庫／正式庫（supabase/island_pioneer.sql）。
//
// 跟進場檢查一樣寬鬆：資料庫還沒裝這份 SQL（PGRST202）、網路斷了、老師試玩，都只是不存雲端，
// 遊戲照玩、照存本機。存檔有變就等 2 秒再一次送出，小朋友狂點不會一直打資料庫；
// 切到別的 App 或關掉分頁前會立刻送。

import { db, FACILITY } from './park';

export type Slot = 'world' | 'ch1' | 'ch2' | 'ch4' | 'ch5';
type Saved = Partial<Record<Slot, Record<string, unknown>>>;

let enabled = false;
const pending = new Map<Slot, unknown>();
let timer = 0;

// 讀雲端存檔；不是學生、沒裝 SQL、出錯都回 null
export async function loadCloud(): Promise<Saved | null> {
  if (!db) return null;
  try {
    const { data, error } = await db.rpc('island_load');
    if (error || !data || typeof data !== 'object') return null;
    enabled = true;
    return data as Saved;
  } catch {
    return null;
  }
}

async function flush() {
  clearTimeout(timer);
  timer = 0;
  if (!db || !enabled) { pending.clear(); return; }
  const list = [...pending];
  pending.clear();
  for (const [slot, data] of list) {
    try {
      const { error } = await db.rpc('island_save', { p_slot: slot, p_data: data });
      if (error?.code === 'PGRST202') enabled = false; // 還沒裝 SQL：之後就不送了
    } catch {
      pending.set(slot, data); // 網路斷了：留著下次再送
    }
  }
}

export function pushCloud(slot: Slot, data: unknown) {
  if (!enabled) return;
  pending.set(slot, data);
  clearTimeout(timer);
  timer = window.setTimeout(flush, 2000);
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pending.size) void flush(); });
  window.addEventListener('pagehide', () => { if (pending.size) void flush(); });
}

// 樂園護照蓋章（樂園 P4 提供 park_award_stamp；還沒裝就算了，下次過關再補蓋）
export async function awardStamp(stamp: string) {
  if (!db || !enabled) return;
  try {
    await db.rpc('park_award_stamp', { p_facility: FACILITY, p_stamp: stamp });
  } catch {
    /* 樂園還沒有護照：不影響遊戲 */
  }
}

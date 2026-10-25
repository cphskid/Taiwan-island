// 遊玩紀錄：進到一個地方（大地圖、某一章、漁村…）寫一筆，玩的時候每 30 秒送一次心跳，
// 換地方、切到別的 App 就收尾（樂園 supabase/park_playlog.sql）。老師後台靠它看「最後在玩什麼、玩多久」。
//
// 跟雲端存檔一樣寬鬆：不是學生、資料庫還沒裝（PGRST202）、網路斷了，都只是不記，遊戲照玩。

import { db, FACILITY } from './park';

const BEAT_MS = 30_000;
let on = false;
let id: number | null = null;
let cur: { place: string; label: string } | null = null;
let timer = 0;
let noted = false;
const pending: string[] = [];   // 還沒拿到這一筆的編號時先排著的 mark

function device() {
  if (!matchMedia('(pointer:coarse)').matches) return 'desktop';
  return Math.min(screen.width, screen.height) < 600 ? 'phone' : 'tablet';
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!db || !on) return null;
  try {
    const { data, error } = await db.rpc(fn, args);
    if (error?.code === 'PGRST202') on = false; // 還沒裝 SQL：之後就不送了
    return error ? null : (data as T);
  } catch {
    return null;
  }
}

async function start() {
  clearInterval(timer);
  if (!cur || document.hidden) return;
  const want = cur;
  id = await call<number>('park_play_start', { p_facility: FACILITY, p_place: want.place, p_label: want.label });
  if (cur !== want) return; // 等回應的時候又換地方了
  // 這一頁第一筆記下裝置、從開網頁到能玩花多久（2026-10-25 補記錄，看手機或等太久是不是比較容易走掉）
  if (id && !noted) { noted = true; void call('park_play_note', { p_id: id, p_device: device(), p_load_ms: Math.round(performance.now()) }); }
  for (const m of pending.splice(0)) void call('park_play_note', { p_id: id, p_mark: m });
  timer = window.setInterval(() => { if (id) void call('park_play_beat', { p_id: id }); }, BEAT_MS);
}

function stop() {
  clearInterval(timer);
  if (id) void call('park_play_beat', { p_id: id, p_end: true });
  id = null;
}

// 學生進島後打開（App 確認過身分才叫）
export function playlogOn() {
  if (on || !db) return;
  on = true;
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : void start()));
  addEventListener('pagehide', stop);
  void start();
}

// 換到另一個地方
export function playAt(place: string, label: string) {
  if (cur?.place === place) return;
  stop();
  cur = { place, label };
  void start();
}

// 這一趟裡發生的事（例如序章走到哪一段 'pro:drift'），分得出是在哪裡走掉的
export function playMark(mark: string) {
  if (!on) return;
  if (id) void call('park_play_note', { p_id: id, p_mark: mark });
  else pending.push(mark);
}

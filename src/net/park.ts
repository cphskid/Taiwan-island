// 跟樂園接線：同一個 Supabase、同一套帳號（平台規劃書「遊戲接入規則」）。
//
// 樂園和開拓者都在 cphskid.github.io 底下，supabase-js 把登入狀態存在同一個 localStorage 鑰匙，
// 所以在樂園登入過，這裡就已經是登入的。開拓者不自己做註冊、登入畫面，沒登入就請小朋友回樂園。
//
// 沒設定 Supabase（本機 npm run dev）時整個跳過，用本機模式直接玩。

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const FACILITY = 'island_pioneer';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
export const PARK_URL = (import.meta.env.VITE_PARK_URL as string | undefined) ?? null;

export const db: SupabaseClient | null = URL && KEY
  ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export type Who =
  | { kind: 'local' }
  | { kind: 'guest' }
  | { kind: 'student'; id: string; nickname: string }
  | { kind: 'staff'; display_name: string; is_admin: boolean };

export async function whoAmI(): Promise<Who> {
  if (!db) return { kind: 'local' };
  const { data: s } = await db.auth.getSession();
  if (!s.session) return { kind: 'guest' };
  const { data, error } = await db.rpc('park_me');
  if (error || !data) return { kind: 'guest' };
  if (data.kind === 'student') return { kind: 'student', id: data.id, nickname: data.nickname };
  if (data.kind === 'staff') return { kind: 'staff', display_name: data.display_name, is_admin: !!data.is_admin };
  return { kind: 'guest' };
}

// 進場檢查。資料庫還沒裝樂園函式（PGRST202）或網路出錯一律放行，跟守護異世界的做法一樣：
// 寧可讓小朋友進來，也不要因為後台問題整班卡在門口。
export async function canEnter(): Promise<{ ok: boolean; reason?: string }> {
  if (!db) return { ok: true };
  try {
    const { data, error } = await db.rpc('park_can_enter', { p_facility: FACILITY });
    if (error) return { ok: true };
    return { ok: !!data?.ok, reason: data?.reason };
  } catch {
    return { ok: true };
  }
}

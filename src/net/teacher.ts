// 老師細節頁要的資料：我的班、班上每個人第五章的細節。都走 supabase/island_pioneer.sql 與樂園的函式。

import { db } from './park';
import type { DetailRow } from '../core/report';

export interface ClassInfo { code: string; name: string; members: number; facilities: string[] }

export async function myClasses(): Promise<ClassInfo[]> {
  if (!db) return [];
  const { data, error } = await db.rpc('park_teacher_classes');
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassInfo[];
}

export async function classDetail(code: string): Promise<DetailRow[]> {
  if (!db) return [];
  const { data, error } = await db.rpc('island_class_detail', { p_code: code });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('資料庫還沒裝島嶼開拓者的老師函式（supabase/island_pioneer.sql），請管理員先套用。');
    throw new Error(error.message);
  }
  return ((data ?? []) as DetailRow[]).map((r) => ({ ...r, answers: Array.isArray(r.answers) ? r.answers : [] }));
}

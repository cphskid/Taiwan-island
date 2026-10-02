// 老師細節頁的統計：全班第五章玩到哪、反思題哪一題最多人錯、錯的人選了什麼。純函式。

export interface DetailRow {
  student_id: string;
  nickname: string;
  step: number | null; // 玩到最遠第幾步（null＝還沒玩）
  stars: number | null;
  done: boolean | null;
  done_at: string | null;
  updated_at: string | null;
  broken: number;
  answers: number[]; // 反思題選了第幾個（-1 或沒有＝還沒答）
  cards: number;
}

export interface QuestionStat { answered: number; right: number; picks: number[]; commonWrong: number | null }

export function classReport(rows: readonly DetailRow[], answers: readonly number[], options: readonly number[]) {
  const played = rows.filter((r) => r.step !== null);
  const done = rows.filter((r) => r.done);
  const steps = [0, 0, 0, 0, 0, 0, 0];
  for (const r of played) if (!r.done) steps[Math.max(0, Math.min(6, r.step ?? 0))] += 1;
  const questions: QuestionStat[] = answers.map((right, qi) => {
    const picks = Array.from({ length: options[qi] }, () => 0);
    let answered = 0, ok = 0;
    for (const r of rows) {
      const a = r.answers[qi];
      if (a === undefined || a === null || a < 0 || a >= picks.length) continue;
      answered += 1;
      picks[a] += 1;
      if (a === right) ok += 1;
    }
    let commonWrong: number | null = null;
    picks.forEach((n, i) => { if (i !== right && n > 0 && (commonWrong === null || n > picks[commonWrong])) commonWrong = i; });
    return { answered, right: ok, picks, commonWrong };
  });
  const avgStars = done.length ? done.reduce((s, r) => s + (r.stars ?? 0), 0) / done.length : 0;
  return { total: rows.length, played: played.length, done: done.length, notStarted: rows.length - played.length, steps, questions, avgStars };
}

// 匯出 Excel 打得開的 CSV（加 BOM，中文才不會變亂碼）
export function toCsv(head: readonly string[], rows: readonly (readonly (string | number)[])[]): string {
  const q = (v: string | number) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
}

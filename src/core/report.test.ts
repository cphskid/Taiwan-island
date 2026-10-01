import { describe, expect, it } from 'vitest';
import { classReport, toCsv, type DetailRow } from './report';

const row = (o: Partial<DetailRow>): DetailRow => ({
  student_id: 'x', nickname: 'x', step: null, stars: null, done: null, done_at: null, updated_at: null, broken: 0, answers: [], cards: 0, ...o,
});

describe('老師細節頁統計', () => {
  const rows = [
    row({ step: 5, done: true, stars: 3, answers: [0, 1, 2] }),
    row({ step: 5, done: true, stars: 1, answers: [1, 1, 0] }),
    row({ step: 3, answers: [] }),
    row({}),
  ];
  const r = classReport(rows, [0, 1, 2], [3, 3, 3]);
  it('人數', () => {
    expect(r).toMatchObject({ total: 4, played: 3, done: 2, notStarted: 1, avgStars: 2 });
    expect(r.steps).toEqual([0, 0, 0, 1, 0, 0]);
  });
  it('每題答對幾個、錯的人最常選哪個', () => {
    expect(r.questions[0]).toEqual({ answered: 2, right: 1, picks: [1, 1, 0], commonWrong: 1 });
    expect(r.questions[1].commonWrong).toBeNull();
    expect(r.questions[2].commonWrong).toBe(0);
  });
  it('CSV 有 BOM、逗號會加引號', () => {
    expect(toCsv(['名字', '說明'], [['小明', 'a,b']])).toBe('﻿名字,說明\r\n小明,"a,b"');
  });
});

import { it } from 'vitest';
import { routeSolve, tradeBest, herdBest, herdSolutions, parseHarbor, harborSolve, type RouteLevel, type TradeLevel, type HerdLevel } from './tayouan';

const show = (a: unknown) => JSON.stringify(a);
it('tune', () => {
  const L1: RouteLevel = { monsoon: 'winter', days: 30, rows: [
    'L.........',
    'LA.....kLL',
    'L......kLL',
    'L...LL.kLL',
    'L...L..kcH',
    'L......ksL',
    'L......k.L',
  ] };
  const s1 = routeSolve(L1);
  console.log('L1', s1?.length, show(s1));
  const L2: RouteLevel = { monsoon: 'winter', days: 30, rows: [
    '..........',
    '...s....H.',
    '...k.LL...',
    '...k.LL.k.',
    '..sk.LL.k.',
    '..Lc.LL.k.',
    '..LALLL.k.',
    '..LLLLL.k.',
  ] };
  const s2 = routeSolve(L2);
  console.log('L2', s2?.length, show(s2));
  const T: TradeLevel = { start: 'tayouan', money: 6, hold: 4, legs: 4, goal: 40, ports: [
    { id: 'tayouan', buy: { silk: 4, porcelain: 2, deerskin: 1, sugar: 1 }, sell: { spice: 4 } },
    { id: 'japan', buy: {}, sell: { silk: 9, deerskin: 3, sugar: 3 } },
    { id: 'batavia', buy: { spice: 1 }, sell: { porcelain: 5, sugar: 3 } },
  ] };
  for (const legs of [2, 3, 4]) console.log('trade legs', legs, show(tradeBest({ ...T, legs })));
  const H: HerdLevel = { start: 20, cap: 25, birthDiv: 4, years: 4, need: 18, maxTake: 10 };
  console.log('herd', show(herdBest(H)), herdSolutions(H).length, show(herdSolutions(H).slice(0, 8)));
  for (const rows of [
    ['..BCC.', '..B..D', 'AAB..D', '.EEF.D', '...FGG', '.HHH..'],
    ['BB..C.', 'D...C.', 'DAA.CE', 'D.FFFE', '..G..E', 'HHGII.'],
  ]) { const h = parseHarbor(rows); const s = harborSolve(h); console.log('harbor', s?.length, show(s)); }
});

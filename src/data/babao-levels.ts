// 八堡圳「導水解謎」的三個小關（佔位版，正式地形等 S-04 底圖到了照圖重定）。
// 地圖 14×10，高度照「上游、河邊高，往海邊越來越低」再加上小山丘和低窪地，等高線才會彎彎曲曲。
//
// 地圖：一個字一格，每一行是一個 row（往左下），每個字是一個 col（往右下）。
//   r 河道（濁水溪）  g 草地（可以挖圳道）  c 已經挖好的圳道  t 分水閘（水要送到這裡）
//   x 河裡的大石頭  f 田  b 竹林  s 石堆  v 聚落
// 高度：一個數字一格，0 最低。河往 row+1 的方向流（畫面左下）。
// 每一關都附一組解法（solution），單元測試會確認照解法放真的會過。

import { parseHeights } from '../core/terrain';
import type { Ground, Kind } from '../core/flow';
import type { Cell } from '../core/iso';
import type { Dir } from '../core/pieces';

export interface Level extends Ground {
  id: number;
  title: string;
  hint: string; // 失敗之後夥伴說的一句提示（一開始不顯示說明）
  cages: number; // 這關最多放幾個竹蛇籠
  digs: number; // 這關最多挖幾格圳道（人力有限）
  need: number; // 要有多少水量流到分水閘
  solution: { cages: { cell: Cell; dir: Dir }[]; canals: Cell[] };
}

const KEY: Record<string, Kind> = {
  r: 'river', g: 'grass', c: 'canal', t: 'gate', x: 'rock', f: 'field', b: 'bamboo', s: 'stone', v: 'village',
};

function level(def: Omit<Level, keyof Ground> & { volume: number; cap?: number; map: string[]; heights: string[] }): Level {
  const { map, heights, volume, ...rest } = def;
  const lanes: Cell[] = [];
  for (let col = 0; col < map[0].length; col++) if (map[0][col] === 'r') lanes.push({ col, row: 0 });
  return {
    ...rest,
    cols: map[0].length,
    rows: map.length,
    kind: ({ col, row }) => KEY[map[row]?.[col] ?? 'g'] ?? 'grass',
    heights: parseHeights(heights),
    flow: 1,
    lanes: lanes.map((cell) => ({ cell, volume })),
  };
}

const c = (col: number, row: number): Cell => ({ col, row });
const path = (s: string): Cell[] => s.split(' ').map((p) => { const [a, b] = p.split(',').map(Number); return c(a, b); });

const L3_MAP = [
  'bbggggsggggrrr',
  'bgggggggggsrrr',
  'gggggggggggrrr',
  'gggggfgggggrxr',
  'ffgggfggvggrrr',
  'ffgggggggggxrr',
  'gggvgggggggrrr',
  'tggggggsgggrrr',
  'ffggggggggbrrr',
  'ffgggvggggbrrr',
];
const L3_HEIGHTS = [
  '33444555555444',
  '33344455555444',
  '23334445555444',
  '22333444444444',
  '22233334433444',
  '12223333433334',
  '11222332333333',
  '11122222233333',
  '01111222223333',
  '00111122222333',
];

export const LEVELS: Level[] = [
  level({
    id: 1,
    title: '第一關：轉個彎',
    hint: '竹蛇籠上的金色箭頭指哪裡，水就往哪裡轉。',
    cages: 2, digs: 0, need: 1, volume: 1,
    map: [
      'bbgggggggggffr',
      'bggggggggggffr',
      'gggggggggggggr',
      'gggccccccccccr',
      'gggcfffgggsggr',
      'gtccfffggggggr',
      'ggggggggvggggr',
      'gsgggggggggggr',
      'ggvgggggggbbgr',
      'gggggggggggbgr',
    ],
    heights: [
      '23334444445555',
      '22334333444555',
      '22233323344455',
      '22222222334445',
      '12222222334444',
      '11222222334444',
      '11112222344444',
      '11111222344334',
      '00111122333333',
      '00011112222333',
    ],
    solution: { cages: [{ cell: c(13, 3), dir: 2 }], canals: [] },
  }),
  level({
    id: 2,
    title: '第二關：沿著等高線挖',
    hint: '水不會往高處爬。戴上地形眼鏡，沿著同一條線挖。',
    cages: 3, digs: 18, need: 2, volume: 1,
    map: [
      'gbbggggggggfrr',
      'bbgggggggggfrr',
      'ggggsgggggggrr',
      'gggggggggggsrr',
      'ffgggggggggsrr',
      'ffggggggvgggrr',
      'ftggggggggggrr',
      'ffggvgggggggrr',
      'gggggggsgggbrr',
      'ggggggvgggbbrr',
    ],
    heights: [
      '33334444445555',
      '33333444444555',
      '23333455444455',
      '22233455554455',
      '22234555544444',
      '12234554433444',
      '11223443223344',
      '11122333223334',
      '01112233333333',
      '00111222333333',
    ],
    solution: {
      cages: [{ cell: c(13, 0), dir: 2 }, { cell: c(12, 2), dir: 2 }],
      canals: path('11,2 10,2 9,2 8,2 8,1 7,1 6,1 5,1 5,2 5,3 4,3 3,3 3,4 3,5 3,6 2,6'),
    },
  }),
  level({
    id: 3,
    title: '第三關：水更大了',
    hint: '大石頭會擋水，正面硬擋的籠子會被沖壞。一個接一個往旁邊導。',
    cages: 3, digs: 16, need: 6, volume: 2,
    map: L3_MAP,
    heights: L3_HEIGHTS,
    solution: {
      cages: [{ cell: c(13, 1), dir: 2 }, { cell: c(12, 1), dir: 2 }, { cell: c(11, 3), dir: 2 }],
      canals: path('10,3 9,3 8,3 7,3 7,4 7,5 6,5 6,6 6,7 5,7 4,7 3,7 2,7 1,7'),
    },
  }),
];

// 第五步「洪水來了」大謎題：跟第三關一樣的地形，可是颱風來了水很大，圳道只裝得下 4 份。
// 三道水全部搶進來（6 份）圳道會滿出來淹田；要留一道給溪（巴布薩族的人也要用水）。
export const FLOOD: Level = level({
  id: 4,
  title: '洪水來了',
  hint: '大水不要全部搶進來，留一條給溪。',
  cages: 3, digs: 16, need: 4, volume: 2, cap: 4,
  map: L3_MAP,
  heights: L3_HEIGHTS,
  solution: {
    cages: [{ cell: c(12, 1), dir: 2 }, { cell: c(11, 3), dir: 2 }],
    canals: path('10,3 9,3 8,3 7,3 7,4 7,5 6,5 6,6 6,7 5,7 4,7 3,7 2,7 1,7'),
  },
});

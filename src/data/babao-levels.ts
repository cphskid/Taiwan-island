// 八堡圳「導水解謎」的三個小關（佔位版，正式地形等 S-04 底圖到了照圖重定）。
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
  hint: string; // 滴答／林先生的一句提示
  cages: number; // 可以用幾個竹蛇籠
  solution: { cages: { cell: Cell; dir: Dir }[]; canals: Cell[] };
}

const KEY: Record<string, Kind> = {
  r: 'river', g: 'grass', c: 'canal', t: 'gate', x: 'rock', f: 'field', b: 'bamboo', s: 'stone', v: 'village',
};

function level(def: {
  id: number; title: string; hint: string; cages: number; volume: number;
  map: string[]; heights: string[]; solution: Level['solution'];
}): Level {
  const map = def.map;
  const lanes: Cell[] = [];
  for (let col = 0; col < map[0].length; col++) if (map[0][col] === 'r') lanes.push({ col, row: 0 });
  return {
    id: def.id, title: def.title, hint: def.hint, cages: def.cages, solution: def.solution,
    cols: map[0].length,
    rows: map.length,
    kind: ({ col, row }) => KEY[map[row]?.[col] ?? 'g'] ?? 'grass',
    heights: parseHeights(def.heights),
    flow: 1,
    lanes: lanes.map((cell) => ({ cell, volume: def.volume })),
  };
}

const c = (col: number, row: number): Cell => ({ col, row });

export const LEVELS: Level[] = [
  level({
    id: 1,
    title: '第一關：轉個彎',
    hint: '把竹蛇籠放進河裡，轉到圳頭的方向，水就會轉彎流進圳道。',
    cages: 2,
    volume: 1,
    map: [
      'bgggcccr',
      'gggfcggr',
      'gffgcggr',
      'gffgtggr',
      'gggggsgr',
      'vggggggr',
    ],
    heights: [
      '33344444',
      '23333443',
      '22232443',
      '11122332',
      '11111332',
      '00011221',
    ],
    solution: { cages: [{ cell: c(7, 0), dir: 2 }], canals: [] },
  }),
  level({
    id: 2,
    title: '第二關：看等高線挖圳道',
    hint: '水只會往一樣高或更低的地方流。打開地形眼鏡，沿著等高線一路往下挖到分水閘。',
    cages: 3,
    volume: 2,
    map: [
      'ggbggcrr',
      'gggggsrr',
      'gggggsrr',
      'ffgggsrr',
      'ftggggrr',
      'ffggvgrr',
    ],
    heights: [
      '34455555',
      '34555544',
      '23554544',
      '22344433',
      '11233433',
      '11122322',
    ],
    solution: {
      cages: [{ cell: c(6, 0), dir: 2 }, { cell: c(7, 0), dir: 2 }],
      canals: [c(4, 0), c(4, 1), c(4, 2), c(4, 3), c(3, 3), c(3, 4), c(2, 4)],
    },
  }),
  level({
    id: 3,
    title: '第三關：大水來了',
    hint: '水更大了，正面硬擋會被沖壞。先把遠的那道水導到近的這邊，再一起轉進圳頭。',
    cages: 3,
    volume: 3,
    map: [
      'bggggsrr',
      'ggggssrx',
      'gggggcrr',
      'gggggsrr',
      'gfgggsrr',
      'tfgvgsrr',
    ],
    heights: [
      '45566655',
      '34556655',
      '33444444',
      '23453544',
      '12342433',
      '01232433',
    ],
    solution: {
      cages: [{ cell: c(7, 0), dir: 2 }, { cell: c(6, 2), dir: 2 }],
      canals: [c(4, 2), c(3, 2), c(2, 2), c(1, 2), c(1, 3), c(0, 3), c(0, 4)],
    },
  }),
];

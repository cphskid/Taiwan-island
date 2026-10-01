// 八堡圳的佔位地圖，只給骨架看效果、量平板速度、試觸控用。正式關卡資料等 S-04 底圖到了照圖定。
// 一個字一格：r 河道（濁水溪）、g 草地、f 田、b 竹林、s 石堆、v 聚落
// 每一行是一個 row（往左下），每個字是一個 col（往右下）。

export type Terrain = 'river' | 'grass' | 'field' | 'bamboo' | 'stone' | 'village';

const MAP = [
  'ggbbgggffgrr',
  'gbbggvgffgrr',
  'ggggggggggrr',
  'gffggggsggrr',
  'gffvgggssgrr',
  'ggggggggggrr',
  'gffffggbbgrr',
  'gffffgggbgrr',
];

// 每格的高度（0 最低）。上游（row 0、二水那一頭）最高，往左下的平原越來越低；
// 河床比兩岸低，只有最上面圳頭那格跟河一樣高，水才引得出來。
export const HEIGHTS = [
  '223334445555',
  '122233444544',
  '112223334433',
  '111222333433',
  '001112233322',
  '000111222322',
  '000011122211',
  '000000112200',
];

const KEY: Record<string, Terrain> = { r: 'river', g: 'grass', f: 'field', b: 'bamboo', s: 'stone', v: 'village' };

export const PREVIEW_COLS = MAP[0].length;
export const PREVIEW_ROWS = MAP.length;

export function previewTerrain(col: number, row: number): Terrain {
  return KEY[MAP[row]?.[col] ?? 'g'] ?? 'grass';
}

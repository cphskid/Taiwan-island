// 八堡圳的佔位地圖，只給 P6-0 骨架看效果、量平板速度用。正式關卡資料在 P6-2/P6-3 才寫。
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

const KEY: Record<string, Terrain> = { r: 'river', g: 'grass', f: 'field', b: 'bamboo', s: 'stone', v: 'village' };

export const PREVIEW_COLS = MAP[0].length;
export const PREVIEW_ROWS = MAP.length;

export function previewTerrain(col: number, row: number): Terrain {
  return KEY[MAP[row]?.[col] ?? 'g'] ?? 'grass';
}

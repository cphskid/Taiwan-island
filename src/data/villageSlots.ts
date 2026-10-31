// 漁村可以蓋東西的格子。底圖 V-01 本來就畫了地基（lot）和魚塭池（pond，只能蓋魚塭），
// 直接照畫好的位置吸附，房子才會跟地上的框框對齊；沙灘、山坡、海灣邊、礁岩邊沒畫框的地方，補排整齊的虛線格。
// 座標是格子正中間（地圖 2000×1116），z 是這格的地形（自己標，底圖的分區多邊形在海邊不準）。
// 換底圖要重新標：地基中心是看圖點的，虛線格是 130×90 交錯排、避開路和水再挑過的。
import type { Pt } from '../core/world';
import type { Zone } from './village';

export interface Slot { x: number; y: number; z: Zone; lot?: boolean; pond?: boolean }
export const SLOT_W = 104, SLOT_H = 60; // 虛線格的大小（畫好的地基差不多也這麼大）

export const SLOTS: Slot[] = [
  { x: 475, y: 325, z: 'land', lot: true },
  { x: 605, y: 367, z: 'land', lot: true },
  { x: 790, y: 352, z: 'land', lot: true },
  { x: 903, y: 355, z: 'land', lot: true },
  { x: 792, y: 447, z: 'land', lot: true },
  { x: 885, y: 450, z: 'land', lot: true },
  { x: 690, y: 467, z: 'land', lot: true },
  { x: 622, y: 518, z: 'land', lot: true },
  { x: 835, y: 522, z: 'land', lot: true },
  { x: 735, y: 568, z: 'land', lot: true },
  { x: 908, y: 587, z: 'land', lot: true },
  { x: 495, y: 575, z: 'land', lot: true },
  { x: 585, y: 620, z: 'land', lot: true },
  { x: 660, y: 652, z: 'beach', lot: true },
  { x: 1280, y: 382, z: 'land', lot: true },
  { x: 1500, y: 345, z: 'land', lot: true },
  { x: 1515, y: 442, z: 'land', lot: true },
  { x: 1565, y: 490, z: 'land', lot: true },
  { x: 1365, y: 520, z: 'land', lot: true },
  { x: 1432, y: 568, z: 'land', lot: true },
  { x: 1300, y: 628, z: 'land', lot: true },
  { x: 1570, y: 600, z: 'land', lot: true },
  { x: 1650, y: 302, z: 'land', lot: true },
  { x: 1795, y: 342, z: 'land', lot: true },
  { x: 1710, y: 390, z: 'land', lot: true },
  { x: 1730, y: 525, z: 'land', lot: true },
  { x: 343, y: 393, z: 'land', lot: true, pond: true },
  { x: 186, y: 428, z: 'land', lot: true, pond: true },
  { x: 286, y: 464, z: 'land', lot: true, pond: true },
  { x: 479, y: 464, z: 'land', lot: true, pond: true },
  { x: 379, y: 521, z: 'land', lot: true, pond: true },
  { x: 710, y: 120, z: 'hill' },
  { x: 840, y: 120, z: 'hill' },
  { x: 970, y: 120, z: 'hill' },
  { x: 1360, y: 120, z: 'hill' },
  { x: 1880, y: 120, z: 'hill' },
  { x: 515, y: 210, z: 'hill' },
  { x: 645, y: 210, z: 'hill' },
  { x: 775, y: 210, z: 'hill' },
  { x: 905, y: 210, z: 'hill' },
  { x: 1555, y: 210, z: 'hill' },
  { x: 60, y: 480, z: 'land' },
  { x: 1880, y: 480, z: 'land' },
  { x: 125, y: 570, z: 'beach' },
  { x: 255, y: 570, z: 'beach' },
  { x: 320, y: 660, z: 'beach' },
  { x: 450, y: 660, z: 'beach' },
  { x: 385, y: 750, z: 'beach' },
  { x: 515, y: 750, z: 'beach' },
  { x: 645, y: 750, z: 'beach' },
  { x: 775, y: 750, z: 'beach' },
  { x: 710, y: 840, z: 'beach' },
  { x: 1380, y: 700, z: 'land' },
  { x: 1520, y: 690, z: 'land' },
  { x: 1660, y: 660, z: 'land' },
  { x: 880, y: 705, z: 'beach' }, // 海灣兩邊（碼頭）
  { x: 1210, y: 730, z: 'land' },
];

export const slotAt = (p: Pt): Slot | null => SLOTS.find((s) => Math.abs(s.x - p.x) < 1 && Math.abs(s.y - p.y) < 1) ?? null;
// 手指／拖曳到的地方，最近的那一格（太遠就不吸）
export function nearestSlot(p: Pt, max = 170): Slot | null {
  let best: Slot | null = null, bd = max;
  for (const s of SLOTS) { const d = Math.hypot(s.x - p.x, (s.y - p.y) * 1.4); if (d < bd) { bd = d; best = s; } }
  return best;
}

// 現在篇「風與海的漁村」：開羅式建村經營。
// 底圖 V-01（public/img/village/v1-bg.webp）是一張東北角海邊空地的手繪等角圖；
// 座標一律用「地圖單位」：底圖寬 2000、高 1116（跟圖的比例一樣），左上是 0,0。
// 建築可以自由擺：底圖下面藏著地形分區（海、沙灘、平地、山坡、溪），拖的時候能蓋的地方變綠、不行變紅。

import type { Pt } from '../core/world';

export const VW = 2000;
export const VH = 1116;
export const vimg = (n: string) => `${import.meta.env.BASE_URL}img/village/${n}.webp`;

export type Good = 'fish' | 'veg' | 'salt' | 'weed';
export const GOODS: Record<Good, { name: string; icon: string; price: number }> = {
  fish: { name: '魚', icon: '🐟', price: 3 },
  veg: { name: '蔬菜', icon: '🥬', price: 2 },
  salt: { name: '海鹽', icon: '🧂', price: 3 },
  weed: { name: '石花菜', icon: '🌿', price: 4 },
};

export type Zone = 'sea' | 'beach' | 'land' | 'hill' | 'stream';

// 地形分區（照 V-01 底圖描的多邊形）。沒落在任何一塊裡的都算海。
const BEACH: Pt[] = [
  { x: 0, y: 480 }, { x: 150, y: 510 }, { x: 330, y: 560 }, { x: 500, y: 610 }, { x: 700, y: 640 }, { x: 850, y: 690 },
  { x: 880, y: 780 }, { x: 850, y: 890 }, { x: 700, y: 880 }, { x: 450, y: 830 }, { x: 250, y: 750 }, { x: 80, y: 640 }, { x: 0, y: 590 },
];
const LAND: Pt[] = [
  { x: 0, y: 330 }, { x: 230, y: 300 }, { x: 1130, y: 290 }, { x: 1400, y: 250 }, { x: 1700, y: 180 }, { x: 2000, y: 100 },
  { x: 2000, y: 560 }, { x: 1880, y: 560 }, { x: 1790, y: 610 }, { x: 1760, y: 690 }, { x: 1500, y: 760 }, { x: 1300, y: 780 },
  { x: 1210, y: 740 }, { x: 1160, y: 690 }, { x: 1060, y: 670 }, { x: 960, y: 680 }, { x: 900, y: 700 }, { x: 850, y: 690 },
  { x: 700, y: 640 }, { x: 500, y: 610 }, { x: 330, y: 560 }, { x: 150, y: 510 }, { x: 0, y: 480 },
];
const HILL: Pt[] = [
  { x: 360, y: 170 }, { x: 600, y: 90 }, { x: 620, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 100 }, { x: 1700, y: 180 },
  { x: 1400, y: 250 }, { x: 1130, y: 290 }, { x: 360, y: 280 },
];
// 小溪：從山上流進海灣，不能蓋
const STREAM: Pt[] = [{ x: 1080, y: 0 }, { x: 1120, y: 200 }, { x: 1100, y: 300 }, { x: 1010, y: 420 }, { x: 990, y: 480 }, { x: 1000, y: 560 }, { x: 1030, y: 660 }];

export const COVE: Pt = { x: 1050, y: 770 }; // 小海灣（碼頭要靠這裡）
export const REEF: Pt = { x: 1560, y: 800 }; // 礁岩潮間帶（海女小屋要靠這裡）
export const PLAZA: Pt = { x: 1170, y: 480 }; // 廣場：沒工作的村民在這附近晃

function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function zoneAt(p: Pt): Zone {
  if (p.x < 0 || p.y < 0 || p.x > VW || p.y > VH) return 'sea';
  for (let i = 1; i < STREAM.length; i++) if (distToSeg(p, STREAM[i - 1], STREAM[i]) < 28) return 'stream';
  if (inPoly(p, HILL)) return 'hill';
  if (inPoly(p, LAND)) return 'land';
  if (inPoly(p, BEACH)) return 'beach';
  return 'sea';
}

// 雲霧：評價到幾顆星，哪一塊地才打開
export type Area = 'core' | 'west' | 'east' | 'hill';
export const AREAS: Record<Exclude<Area, 'core'>, { name: string; stars: number; box: [number, number, number, number] }> = {
  west: { name: '西邊的沙灘', stars: 2, box: [0, 0, 470, VH] },
  east: { name: '東邊的礁岩', stars: 3, box: [1480, 0, VW, VH] },
  hill: { name: '後面的山坡', stars: 4, box: [470, 0, 1480, 255] },
};
export function areaAt(p: Pt): Area {
  for (const [k, a] of Object.entries(AREAS)) {
    const [x0, y0, x1, y1] = a.box;
    if (p.x >= x0 && p.x < x1 && p.y >= y0 && p.y < y1) return k as Area;
  }
  return 'core';
}

export type Kind =
  | 'stilt' | 'brick' | 'shophouse'
  | 'pier' | 'rack' | 'salt' | 'pond' | 'garden' | 'divehut'
  | 'market' | 'stall' | 'store' | 'guesthouse'
  | 'temple' | 'netshed' | 'shelter' | 'trees';

export type Job = 'fisher' | 'diver' | 'salter' | 'farmer' | 'drummer' | 'vendor';
export const JOB_ART: Record<Job, string> = { fisher: 'v4-1', diver: 'v4-2', salter: 'v4-3', farmer: 'v4-4', drummer: 'v4-5', vendor: 'v4-6' };

export interface BuildingDef {
  name: string;
  art: string;
  width: number; // 地圖單位
  cost: number;
  stars: number; // 村子評價幾顆星才能蓋
  zones: Zone[];
  near?: { at: Pt; r: number; text: string }; // 一定要靠近某個地方
  job?: Job; // 要派一個人
  home?: number; // 房子：住幾個人
  appeal: number; // 對村子評價的貢獻
  does: string; // 卡片上的一句話（玩法＋知識）
}

export const BUILDINGS: Record<Kind, BuildingDef> = {
  stilt: { name: '竹屋', art: 'v3-6', width: 120, cost: 20, stars: 1, zones: ['land', 'beach', 'hill'], home: 2, appeal: 1,
    does: '便宜的竹子屋，住 2 個人。竹子輕又好搬，以前的人搬家連房子一起扛走。' },
  brick: { name: '紅磚厝', art: 'v3-5', width: 130, cost: 45, stars: 1, zones: ['land', 'hill'], home: 3, appeal: 3,
    does: '住 3 個人。厚厚的紅磚牆，夏天涼、冬天擋風。' },
  shophouse: { name: '街屋', art: 'v3-7', width: 130, cost: 80, stars: 4, zones: ['land'], home: 3, appeal: 6,
    does: '住 3 個人。前面有騎樓，下雨天、大太陽走路都不怕。' },
  pier: { name: '漁港碼頭', art: 'v2-1', width: 150, cost: 50, stars: 1, zones: ['land', 'beach'], near: { at: COVE, r: 250, text: '碼頭要蓋在海灣邊' },
    job: 'fisher', appeal: 3, does: '派漁夫出海捕魚。冬天東北季風浪很大，漁船常常出不了海。' },
  rack: { name: '曬魚架', art: 'v2-2', width: 110, cost: 25, stars: 1, zones: ['land', 'beach'], job: 'fisher', appeal: 2,
    does: '把魚曬成魚乾，賣得更貴。要出太陽才曬得乾，下雨天不行。' },
  salt: { name: '鹽田', art: 'v2-3', width: 140, cost: 35, stars: 2, zones: ['beach'], job: 'salter', appeal: 2,
    does: '引海水來曬鹽。要連續好幾天大太陽，下雨就曬不出鹽。' },
  pond: { name: '魚塭', art: 'v2-4', width: 140, cost: 40, stars: 2, zones: ['beach', 'land'], job: 'farmer', appeal: 2,
    does: '養虱目魚。虱目魚怕冷，冬天寒流來要先做防寒。' },
  garden: { name: '咾咕石菜園', art: 'v2-5', width: 130, cost: 20, stars: 1, zones: ['land', 'hill'], job: 'farmer', appeal: 2,
    does: '種菜。像澎湖一樣用咾咕石圍起來，擋住冬天的東北季風。' },
  divehut: { name: '海女小屋', art: 'v3-2', width: 115, cost: 35, stars: 3, zones: ['land', 'beach'], near: { at: REEF, r: 300, text: '海女小屋要蓋在礁岩旁邊' },
    job: 'diver', appeal: 3, does: '海女趁退潮下水採石花菜。春天到夏天最多。' },
  market: { name: '市場', art: 'v2-7', width: 130, cost: 45, stars: 1, zones: ['land'], job: 'vendor', appeal: 4,
    does: '把村子的魚、菜、鹽賣成錢。蓋在房子和碼頭旁邊，生意更好。' },
  stall: { name: '小吃攤', art: 'v3-3', width: 100, cost: 30, stars: 1, zones: ['land', 'beach'], job: 'vendor', appeal: 3,
    does: '用魚和菜煮小吃，一碗一碗賣。廟和市場旁邊客人最多。' },
  store: { name: '雜貨店', art: 'v3-11', width: 125, cost: 40, stars: 2, zones: ['land'], job: 'vendor', appeal: 3,
    does: '村子裡人越多，雜貨店賺越多。' },
  guesthouse: { name: '民宿', art: 'v2-8', width: 115, cost: 70, stars: 3, zones: ['land', 'hill'], job: 'vendor', appeal: 5,
    does: '讓遊客來住。夏天遊客最多，颱風天沒人來。' },
  temple: { name: '媽祖廟', art: 'v2-6', width: 125, cost: 80, stars: 3, zones: ['land', 'hill'], job: 'drummer', appeal: 8,
    does: '漁村的信仰中心，保佑出海平安。每年三月媽祖生日辦廟會。' },
  netshed: { name: '牽罟網寮', art: 'v3-1', width: 130, cost: 35, stars: 2, zones: ['beach'], appeal: 3,
    does: '放牽罟的大網。每個月可以叫全村一起到沙灘牽罟。' },
  shelter: { name: '避難所', art: 'v3-4', width: 115, cost: 50, stars: 2, zones: ['land', 'hill'], appeal: 3,
    does: '颱風來的時候，村民可以躲進來，大家都平安。' },
  trees: { name: '防風林', art: 'v3-8', width: 130, cost: 15, stars: 1, zones: ['land', 'beach', 'hill'], appeal: 2,
    does: '木麻黃防風林，擋住季風和颱風。旁邊的房子、菜園比較不會壞。' },
};

export const BUILD_ORDER: Kind[] = ['stilt', 'brick', 'pier', 'market', 'garden', 'trees', 'rack', 'stall', 'netshed', 'salt', 'pond', 'shelter', 'store', 'divehut', 'temple', 'guesthouse', 'shophouse'];

// 擺在一起有加成（距離 COMBO_R 以內）
export const COMBO_R = 280;
export const COMBOS: [Kind, Kind, string][] = [
  ['pier', 'rack', '剛捕的魚直接拿去曬'],
  ['pier', 'market', '魚上岸就能賣'],
  ['pier', 'netshed', '漁具放在一起'],
  ['market', 'stall', '逛完市場吃小吃'],
  ['market', 'brick', '住得近，買菜方便'],
  ['market', 'stilt', '住得近，買菜方便'],
  ['market', 'shophouse', '住得近，買菜方便'],
  ['temple', 'stall', '拜拜完吃小吃'],
  ['temple', 'guesthouse', '遊客來看廟'],
  ['garden', 'trees', '防風林幫菜園擋風'],
  ['garden', 'stall', '新鮮的菜直接下鍋'],
  ['pond', 'rack', '虱目魚也能曬'],
  ['divehut', 'guesthouse', '遊客愛吃石花菜'],
  ['store', 'shophouse', '騎樓下開店'],
  ['salt', 'rack', '用自己曬的鹽醃魚'],
];
export const isHouse = (k: Kind) => !!BUILDINGS[k].home;

// 村民名字（回到村子的年輕人）
export const NAMES = ['阿海伯', '春花姨', '阿明', '小芳', '阿德', '美玉', '志強', '淑貞', '阿龍', '秀琴', '建宏', '雅婷', '俊傑', '阿珠', '家豪', '佩君'];

export const STAR_AT = [0, 25, 55, 95, 140]; // 評價到多少是幾顆星（1～5）

export interface Quest { id: string; text: string; reward: number }
export const QUESTS: Quest[] = [
  { id: 'house', text: '蓋一間房子。回來的年輕人才有地方住', reward: 30 },
  { id: 'pier', text: '在海灣邊蓋漁港碼頭，派人出海捕魚', reward: 30 },
  { id: 'market', text: '蓋市場，把魚賣成錢。市場會自動賣', reward: 30 },
  { id: 'star2', text: '讓村子評價到 ⭐⭐。西邊沙灘的雲霧會散開。多蓋房子、把建築擺在一起有加成', reward: 40 },
  { id: 'seine', text: '在沙灘蓋牽罟網寮，叫全村一起牽罟', reward: 40 },
  { id: 'typhoon', text: '平安撐過一次颱風。颱風多在夏天（7～9 月）來', reward: 40 },
  { id: 'star3', text: '讓村子評價到 ⭐⭐⭐，東邊礁岩會打開', reward: 50 },
  { id: 'festival', text: '蓋媽祖廟，在三月媽祖生日辦一次廟會', reward: 50 },
  { id: 'star4', text: '讓村子評價到 ⭐⭐⭐⭐，後面山坡會打開', reward: 60 },
  { id: 'star5', text: '讓村子評價到 ⭐⭐⭐⭐⭐，漁村又熱鬧起來了！', reward: 100 },
];

export const VILLAGE_LINES = {
  intro: [
    '這裡是東北角的一個小漁村。年輕人都去城市工作了，只剩阿海伯和春花姨，還有放暑假回來的小孫子。',
    '我們來幫忙：蓋房子、分配工作、躲颱風，讓村子重新熱鬧起來！',
    '點下面的「🔨 蓋」選一棟建築，在地圖上拖到想要的位置。綠色可以蓋、紅色不行。',
  ],
};

export const MONTH_SEASON = (m: number) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
export const SEASON_NAME = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as const;

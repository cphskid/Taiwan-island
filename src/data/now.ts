// 大地圖的「現在」：撥桿撥到現在，雲霧全部散開，看到今天的臺灣。
// base 一直都在；過去篇打完哪一章，現在那一區就多出那個時代留下來的東西（新舊對照）。
// 「現在篇」的地點（漁村、規則小鎮…）是地圖上的點，每個都能直接點，還沒做好的顯示施工中。
//
// 座標跟 data/world.ts 一樣是 M-01 第二版的像素。圖是 Y-01～03（public/img/island/y1-*、y2-*、y3-*）。
// 現在藏在網址 ?now=1 後面；沒加的人要過去篇全部過關才會出現撥桿，之前看到的大地圖跟原本一模一樣。

import { HSR_LINE, type ChapterId, type ChapterLife } from './world';
import type { Pt } from '../core/world';

// 網址有 ?now=1 一律打開；沒加的人要等過去篇全部過關、看完整篇通關，撥桿才出現（unlockNow）
export const NOW_URL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('now');
export let NOW_ON = NOW_URL;
export function unlockNow() { NOW_ON = true; }

export type Era = 'past' | 'now';

// 臺北到高雄的台鐵（西部幹線，跟高鐵錯開一點）
const TRA_LINE: Pt[] = [
  { x: 2330, y: 236 }, { x: 2230, y: 400 }, { x: 2040, y: 470 }, { x: 1800, y: 560 }, { x: 1620, y: 760 },
  { x: 1470, y: 1060 }, { x: 1330, y: 1400 }, { x: 1230, y: 1760 }, { x: 1150, y: 2120 }, { x: 1110, y: 2460 }, { x: 1190, y: 2800 },
];

// 一直都在的今天：城市、港口、機場、科學園區、風車、廟、夜市、高鐵和台鐵
const BASE_NOW: ChapterLife = {
  roads: [HSR_LINE],
  buildings: [
    { name: 'y1-1', at: { x: 2196, y: 430 }, width: 76 },
    { name: 'x9-3', at: { x: 2252, y: 404 }, width: 30 },
    { name: 'x9-6', at: { x: 1940, y: 420 }, width: 54 },
    { name: 'y1-4', at: { x: 1740, y: 620 }, width: 49 },
    { name: 'y1-1', at: { x: 1440, y: 1120 }, width: 59, flip: true },
    { name: 'x9-4', at: { x: 1380, y: 1180 }, width: 40 },
    { name: 'y1-1', at: { x: 1250, y: 2820 }, width: 65 },
    { name: 'y1-3', at: { x: 1120, y: 2900 }, width: 62 },
    { name: 'y1-6', at: { x: 1150, y: 1890 }, width: 38 },
    { name: 'y1-7', at: { x: 1060, y: 2470 }, width: 40 },
    { name: 'y1-2', at: { x: 2380, y: 220 }, width: 46 },
    // 各地的小鎮：公寓、便利商店、廟、夜市、公園（X-10 與 Y-01）
    { name: 'x9-8', at: { x: 1680, y: 580 }, width: 22 },
    { name: 'x10-4', at: { x: 1645, y: 612 }, width: 20 },
    { name: 'x9-8', at: { x: 1405, y: 1245 }, width: 24 },
    { name: 'x10-4', at: { x: 1350, y: 1222 }, width: 20 },
    { name: 'x9-5', at: { x: 1425, y: 1290 }, width: 28 },
    { name: 'y1-6', at: { x: 1165, y: 1352 }, width: 30 },
    { name: 'y1-7', at: { x: 1235, y: 1385 }, width: 34 },
    { name: 'x9-8', at: { x: 1290, y: 1345 }, width: 22 },
    { name: 'x9-8', at: { x: 1212, y: 1952 }, width: 22 },
    { name: 'x10-4', at: { x: 1186, y: 1990 }, width: 20 },
    { name: 'y1-6', at: { x: 992, y: 2402 }, width: 28 },
    { name: 'x9-8', at: { x: 1112, y: 2422 }, width: 22 },
    { name: 'x9-8', at: { x: 1302, y: 2772 }, width: 24 },
    { name: 'y1-7', at: { x: 1182, y: 2762 }, width: 32 },
    { name: 'x9-8', at: { x: 2382, y: 640 }, width: 22 },
    { name: 'y1-6', at: { x: 2340, y: 662 }, width: 26 },
    { name: 'x9-8', at: { x: 2242, y: 1424 }, width: 22 },
    { name: 'x10-4', at: { x: 2212, y: 1452 }, width: 20 },
    { name: 'y1-6', at: { x: 1832, y: 2660 }, width: 24 },
    { name: 'x10-4', at: { x: 1802, y: 2692 }, width: 20 },
    { name: 'x9-5', at: { x: 1440, y: 3440 }, width: 24 },
  ],
  scenery: [
    { name: 'y1-5', at: { x: 1060, y: 1250 }, width: 12 },
    { name: 'y1-5', at: { x: 1045, y: 1300 }, width: 12 },
    { name: 'y1-5', at: { x: 1030, y: 1350 }, width: 12 },
    { name: 'y2-5', at: { x: 1100, y: 1560 }, width: 35 },
    { name: 'x9-5', at: { x: 1300, y: 2870 }, width: 30 },
    { name: 'y1-5', at: { x: 1398, y: 3478 }, width: 10 },
    { name: 'y1-5', at: { x: 1420, y: 3505 }, width: 10 },
    { name: 'x10-10', at: { x: 1378, y: 1270 }, width: 15 },
    { name: 'x10-10', at: { x: 1268, y: 1408 }, width: 14 },
  ],
  actors: [
    { kind: 'hsr', path: HSR_LINE, speed: 40, who: '高鐵', says: '臺北到高雄，現在最快大約一個半小時。', lod: 0 },
    { kind: 'tra', path: TRA_LINE, speed: 24, who: '台鐵的電車', says: '西部的城市一站一站連起來，每天載好多人上學、上班。', lod: 1 },
    { kind: 'scooter', path: [{ x: 2150, y: 450 }, { x: 2200, y: 470 }, { x: 2250, y: 450 }], speed: 12, who: '騎機車的阿姨', says: '騎車一定要戴安全帽，不戴會被開罰單喔。', lod: 1 },
    { kind: 'family', path: [{ x: 1280, y: 2880 }, { x: 1310, y: 2900 }, { x: 1340, y: 2890 }], speed: 5, who: '來散步的一家人', says: '週末到港邊的公園走走，可以看到大貨櫃輪進港。', lod: 1 },
    { kind: 'gull', path: [{ x: 2440, y: 260 }, { x: 2500, y: 320 }, { x: 2560, y: 380 }, { x: 2500, y: 440 }], speed: 20, who: '海鷗', says: '啾～（東北角的海邊，風好大！）', lod: 2 },
    // 各地街上的人和車
    { kind: 'bus', path: [{ x: 1385, y: 1258 }, { x: 1300, y: 1305 }, { x: 1205, y: 1352 }], speed: 10, who: '公車', says: '公車一站一站停，上學、去市場都很方便。', lod: 0 },
    { kind: 'truck', path: [{ x: 1150, y: 2882 }, { x: 1222, y: 2832 }, { x: 1292, y: 2795 }], speed: 8, who: '送貨的小貨車', says: '港口的貨櫃卸下來，再用貨車送到全臺灣的商店。', lod: 1 },
    { kind: 'students', path: [{ x: 1082, y: 2450 }, { x: 1112, y: 2468 }, { x: 1142, y: 2458 }], speed: 3, who: '放學的小學生', says: '我們學校旁邊就是好幾百年的老廟！', lod: 0 },
    { kind: 'vendor', at: { x: 1182, y: 2792 }, who: '夜市的小吃攤老闆', says: '晚上的夜市最熱鬧了，要不要來一份烤玉米？', lod: 1 },
    { kind: 'dogwalker', path: [{ x: 1640, y: 632 }, { x: 1682, y: 652 }, { x: 1722, y: 640 }], speed: 4, who: '遛狗的姐姐', says: '科學園區下班以後，帶柴柴出來散步。', lod: 1 },
    { kind: 'jogger', path: [{ x: 2120, y: 470 }, { x: 2160, y: 500 }, { x: 2205, y: 522 }], speed: 9, who: '在河濱慢跑的哥哥', says: '臺北的河邊有長長的自行車道和跑道。', lod: 0 },
    { kind: 'jogger', path: [{ x: 2215, y: 1440 }, { x: 2245, y: 1470 }, { x: 2270, y: 1500 }], speed: 8, who: '在花蓮海邊慢跑的人', says: '早上的太平洋好漂亮，太陽從海上升起來。', lod: 1 },
    { kind: 'scooter', path: [{ x: 1330, y: 1205 }, { x: 1400, y: 1225 }, { x: 1455, y: 1205 }], speed: 12, who: '騎機車上班的叔叔', says: '臺中的路好寬，早上大家都騎車上班。', lod: 0 },
    { kind: 'scooter', path: [{ x: 1170, y: 1970 }, { x: 1215, y: 1985 }, { x: 1255, y: 1970 }], speed: 11, who: '騎機車的大學生', says: '嘉義的雞肉飯超有名，你吃過嗎？', lod: 1 },
    { kind: 'family', at: { x: 2360, y: 690 }, who: '來宜蘭玩的一家人', says: '冬天東北季風來，宜蘭常常下雨，可是溫泉好舒服。', lod: 1 },
    { kind: 'students', path: [{ x: 2192, y: 1470 }, { x: 2222, y: 1482 }, { x: 2250, y: 1470 }], speed: 3, who: '花蓮的小學生', says: '我們學校有好多原住民同學，會跳很棒的舞。', lod: 2 },
    { kind: 'tourist', at: { x: 1810, y: 2715 }, who: '來臺東看熱氣球的遊客', says: '夏天臺東的鹿野高台會放熱氣球喔！', lod: 1 },
    { kind: 'bus', path: [{ x: 2160, y: 455 }, { x: 2215, y: 470 }, { x: 2265, y: 452 }], speed: 9, who: '臺北的公車', says: '臺北有捷運也有公車，到哪裡都好方便。', lod: 1 },
    { kind: 'family', at: { x: 1465, y: 3460 }, who: '在墾丁玩水的一家人', says: '臺灣最南邊的海好藍，好多人來這裡玩水。', lod: 1 },
  ],
};

export const NOW_LIFE: Partial<Record<'base' | ChapterId, ChapterLife>> = {
  base: BASE_NOW,
  // 第一章：十三行變成博物館
  ch1: {
    buildings: [{ name: 'y2-1', at: { x: 2060, y: 262 }, width: 40 }],
    actors: [
      { kind: 'tourist', at: { x: 2090, y: 290 }, who: '十三行博物館的參觀者', says: '兩千年前這裡有人在煉鐵！就是阿岩他們那個時代的人。', lod: 0 },
      { kind: 'family', at: { x: 2280, y: 2070 }, who: '來八仙洞的一家人', says: '以前的人就住在這個海邊的洞裡，現在洞還在，變成大家參觀的地方。', lod: 0 },
    ],
  },
  // 第二章：山上有國家公園的步道
  ch2: {
    buildings: [{ name: 'y2-2', at: { x: 1960, y: 1460 }, width: 35 }],
    actors: [
      { kind: 'family', at: { x: 1990, y: 1490 }, who: '來爬山的一家人', says: '解說員說，以前部落的獵場有範圍、有季節。現在國家公園也有規定，不能亂採亂抓。', lod: 0 },
    ],
  },
  // 第三章：熱蘭遮城留下的牆，現在叫安平古堡
  ch3: {
    buildings: [{ name: 'y1-8', at: { x: 916, y: 2392 }, width: 43 }],
    actors: [
      { kind: 'tourist', at: { x: 950, y: 2420 }, who: '安平古堡的觀光客', says: '這面紅磚牆，就是四百年前荷蘭人熱蘭遮城留下來的！', lod: 0 },
    ],
  },
  // 第四章：鹽田變成觀光鹽山
  ch4: {
    buildings: [],
    scenery: [{ name: 'y2-6', at: { x: 930, y: 2300 }, width: 40 }],
    actors: [
      { kind: 'family', at: { x: 960, y: 2330 }, who: '來玩的一家人', says: '以前臺南沿海冬天乾燥，到處都在曬鹽。現在鹽田變成大家來玩的鹽山。', lod: 0 },
    ],
  },
  // 第五章：八堡圳到現在還在流
  ch5: {
    buildings: [],
    actors: [
      { kind: 'scooter', path: [{ x: 1180, y: 1420 }, { x: 1240, y: 1450 }, { x: 1300, y: 1470 }], speed: 10, who: '騎車去巡田的阿伯', says: '八堡圳快三百年了，現在還在灌溉彰化的田喔！', lod: 0 },
    ],
  },
  // 第六章：劉銘傳的鐵路變成今天的台鐵
  ch6: {
    buildings: [],
    actors: [
      { kind: 'tourist', at: { x: 2300, y: 250 }, who: '搭火車的旅客', says: '基隆到臺北的鐵路，從劉銘傳那時候開始，一直開到今天。', lod: 0 },
    ],
  },
  // 第七章：日月潭的發電廠還在，湖邊變成觀光區
  ch7: {
    buildings: [],
    actors: [
      { kind: 'family', at: { x: 1690, y: 1410 }, who: '來日月潭玩的一家人', says: '湖水下面是以前邵族的家。邵族的人現在還住在湖邊。', lod: 0 },
    ],
  },
};

// 「現在篇」的地點：都能直接點，沒做好的顯示施工中
export interface NowPlace {
  id: string;
  name: string;
  genre: string; // 玩法類型（學生畫面不寫科目、年級）
  stars: 1 | 2 | 3;
  at: Pt;
  art: string;
  width: number;
  blurb: string;
  ready: boolean;
}

export const NOW_PLACES: NowPlace[] = [
  { id: 'village', name: '風與海的漁村', genre: '經營・建造', stars: 2, at: { x: 2470, y: 330 }, art: 'y3-1', width: 54, ready: true,
    blurb: '幫快沒人的小漁村蓋房子、分配工作、躲颱風，再叫全村一起牽罟，讓村子重新熱鬧起來。' },
  { id: 'town', name: '規則小鎮', genre: '推理・偵探', stars: 2, at: { x: 1580, y: 900 }, art: 'y3-2', width: 49, ready: true,
    blurb: '當小鎮偵探：鄰居的糾紛是誰在管？手機訊息是不是詐騙？' },
  { id: 'sky', name: '天空港', genre: '調度・益智', stars: 1, at: { x: 1860, y: 500 }, art: 'y3-3', width: 49, ready: true,
    blurb: '當塔台調度員，畫出飛機和貨船的航線，看誰會飛過臺灣上空。' },
  { id: 'isles', name: '離島巡航', genre: '探索・收集', stars: 1, at: { x: 1190, y: 3010 }, art: 'y3-4', width: 46, ready: true,
    blurb: '搭船去小琉球、綠島、蘭嶼、澎湖，一座島蓋一個郵戳。' },
  { id: 'postcard', name: '景點明信片', genre: '探索・創作', stars: 1, at: { x: 2420, y: 1330 }, art: 'y3-5', width: 38, ready: false,
    blurb: '當時空導遊：挑一個景點，收集資料，寄一張明信片給遊客。' },
];

export const NOW_LINES = {
  toNow: '咻——這是今天的臺灣！雲霧都散開了。你在過去打開的地方，現在也找得到它們留下的東西。',
  toPast: '回到過去！時光雲霧又出現了，裂縫還在等你。',
  building: '這裡還在施工中，下次再來！',
};

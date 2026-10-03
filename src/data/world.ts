// 全台大地圖的資料：七章加終章在哪一區、裂縫在哪、過關後長出什麼、小人怎麼走、說什麼。
//
// 座標都是 M-01 第二版（北朝上，2680×3704）的像素位置。地區分界與高度場由 tools/make_world.py
// 照 world-seeds.json、world-ridges.json 算好存成圖（public/img/island/m01-*），改了要重跑。
// 對話是佔位稿：P6-5 照課本附出處重寫。

import SEEDS from './world-seeds.json';
import type { Pt } from '../core/world';

const BASE = import.meta.env.BASE_URL;
// 名字有斜線的是關卡裡的圖（ch1/f-04a-idle → img/ch1/f-04a-idle.webp），其他在 img/island/
export const isl = (name: string) => `${BASE}img/${name.includes('/') ? name : `island/${name}`}.webp`;

export const MAP = {
  width: 2680,
  height: 3704,
  src: isl('m01'),
  relief: isl('m01-relief'),
  regions: `${BASE}img/island/m01-regions.png`,
  regionScale: 8, // m01-regions.png 一個像素＝原圖 8×8
};

export type ChapterId = 'ch1' | 'ch2' | 'ch3' | 'ch4' | 'ch5' | 'ch6' | 'ch7' | 'end';

export interface ChapterInfo {
  id: ChapterId;
  region: number; // m01-regions.png 的地區編號
  no: string; // 「第五章」
  title: string;
  era: string; // 時間軸上的時代
  place: string; // 撥開哪一區
  grows: string; // 過關後長出來的
  rift: Pt; // 時空裂縫的位置
  playable: boolean;
  gear: number | null; // 時光鐘上的第幾個齒輪孔（0 在最上面，順時針）；終章沒有齒輪
  labelUp?: boolean; // 章名改放在裂縫左邊（跟旁邊的章擠在一起時）
  badge: string; // 章節徽章（I-06，public/img/island/badge-*）；第二章還沒有專屬的，先用空白徽章
}

const rift = (i: number): Pt => ({ x: SEEDS[i].seeds[0][0], y: SEEDS[i].seeds[0][1] });

export const CHAPTERS: ChapterInfo[] = [
  { id: 'ch1', region: 1, no: '第一章', title: '島嶼的第一道火光', era: '史前', place: '東海岸八仙洞、北海岸十三行', grows: '洞穴與海邊的火光', rift: rift(0), playable: true, gear: 0, badge: 'fire' },
  { id: 'ch2', region: 2, no: '第二章', title: '山林與部落', era: '原住民族', place: '中央山脈', grows: '山上部落、鹿群', rift: rift(1), playable: true, gear: 1, badge: 'blank' },
  { id: 'ch3', region: 3, no: '第三章', title: '大航海時代', era: '荷西', place: '台南大員、基隆和平島', grows: '熱蘭遮城、聖薩爾瓦多城', rift: rift(2), playable: false, gear: 2, badge: 'ship' },
  { id: 'ch4', region: 4, no: '第四章', title: '東寧屯田', era: '鄭氏', place: '台南平原', grows: '田園、營盤', rift: rift(3), playable: true, gear: 3, badge: 'rice' },
  { id: 'ch5', region: 5, no: '第五章', title: '八堡圳', era: '清領', place: '彰化平原', grows: '八堡圳與綠色稻田', rift: { x: 1327, y: 1443 }, playable: true, gear: 4, badge: 'canal' },
  { id: 'ch6', region: 6, no: '第六章', title: '開港與鐵路', era: '清末', place: '台北到基隆', grows: '鐵路、淡水與基隆港', rift: rift(5), playable: true, gear: 5, badge: 'train' },
  { id: 'ch7', region: 7, no: '第七章', title: '縱貫與大圳', era: '日治', place: '嘉南平原、日月潭', grows: '嘉南大圳、發電廠', rift: rift(6), playable: false, gear: 6, badge: 'dam' },
  { id: 'end', region: 8, no: '終章', title: '今天的島嶼', era: '戰後', place: '剩下的雲霧全部散開', grows: '高鐵穿過全島', rift: { x: 1140, y: 2862 }, playable: false, gear: null, badge: 'hsr' },
];

export const chapterOf = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;
export const chapterByRegion = (region: number) => CHAPTERS.find((c) => c.region === region) ?? null;

// 每章最後一句是下一章的鉤子：過了第五章，北部（第六章）的裂縫開始發光
export const HOOKS: Partial<Record<ChapterId, ChapterId>> = { ch5: 'ch6' };

// 時光鐘上 7 個齒輪孔的位置（clock-empty 圖的比例座標，從最上面順時針）
export const GEAR_SLOTS: Pt[] = [
  { x: 0.48, y: 0.141 }, { x: 0.748, y: 0.258 }, { x: 0.83, y: 0.522 }, { x: 0.633, y: 0.791 },
  { x: 0.328, y: 0.786 }, { x: 0.146, y: 0.518 }, { x: 0.227, y: 0.253 },
];

// 地形眼鏡的圖例（公尺），跟 tools/make_world.py 的 LEVELS 一樣
export const LEGEND = ['0', '100', '500', '1000', '2000', '3000'];

// ── 第五章過關後的彰化平原 ──────────────────────────────

// 八堡圳：從二水的圳頭往西北流，在中間分岔，一條去漳州莊、一條去泉州莊
export const CANAL: Pt[][] = [
  [{ x: 1415, y: 1507 }, { x: 1379, y: 1488 }, { x: 1333, y: 1469 }, { x: 1296, y: 1453 }, { x: 1251, y: 1431 }, { x: 1205, y: 1410 }, { x: 1162, y: 1388 }],
  [{ x: 1296, y: 1453 }, { x: 1285, y: 1460 }, { x: 1270, y: 1465 }],
];

// 聚落：W-01 不帶底座的房子一棟一棟排成村子（漳州莊在左、泉州莊在右下），巴布薩族社還是 M-02 的圖
// 擺在地圖上的一張圖。flip＝左右翻過來；flicker＝火光一閃一閃
export interface Placed { name: string; at: Pt; width: number; flip?: boolean; flicker?: boolean }
export const BUILDINGS: Placed[] = [
  { name: 'm2-tribe', at: { x: 1087, y: 1353 }, width: 44 },
  { name: 'w1-7', at: { x: 1155, y: 1367 }, width: 30 },
  { name: 'w1-4', at: { x: 1124, y: 1374 }, width: 30 },
  { name: 'w1-1', at: { x: 1152, y: 1381 }, width: 30 },
  { name: 'w1-2', at: { x: 1172, y: 1396 }, width: 21, flip: true },
  { name: 'w1-1', at: { x: 1258, y: 1471 }, width: 28, flip: true },
  { name: 'w1-2', at: { x: 1235, y: 1469 }, width: 20 },
  { name: 'w1-3', at: { x: 1276, y: 1486 }, width: 16 },
  { name: 'w1-6', at: { x: 1312, y: 1491 }, width: 19 },
  { name: 'w1-8', at: { x: 1327, y: 1502 }, width: 15, flip: true },
  { name: 'w1-5', at: { x: 1399, y: 1486 }, width: 12 },
];
// 稻田：隨季節從秧苗、綠稻變成金黃，再收割
export const PADDIES: Pt[] = [
  { x: 1097, y: 1385 }, { x: 1185, y: 1421 }, { x: 1235, y: 1411 }, { x: 1326, y: 1487 }, { x: 1376, y: 1469 }, { x: 1192, y: 1445 },
];

// 會動的小人和動物。path 來回走；at 是站著做事的地方
export type ActorKind = 'farmer' | 'carrier' | 'worker' | 'buffalo' | 'hen' | 'dog' | 'hoer' | 'porter' | 'woman' | 'lian' | 'magpie' | 'washer' | 'waterer' | 'kid' | 'duck' | 'swimmer'
  | 'ayan' | 'knapper' | 'potter' | 'jadeworker' | 'smith' | 'deer' | 'grazer'
  | 'ani' | 'sower' | 'elder' | 'hunter' | 'trader' | 'boar' | 'macaque'
  | 'xlian' | 'xlianCarry' | 'chen' | 'veteran' | 'villager4';
export interface ActorDef {
  kind: ActorKind;
  path?: Pt[];
  at?: Pt;
  speed?: number; // 每秒走幾個像素（原圖座標）
  who: string;
  says: string;
  lod: number; // 拉遠時先藏起來的順序：數字越大越晚出來
}
export const ACTORS: ActorDef[] = [
  { kind: 'worker', at: { x: 1184, y: 1425 }, who: '漳州莊的農夫', says: '有水以後，我們家一年可以收兩次稻。', lod: 0 },
  { kind: 'farmer', path: [{ x: 1158, y: 1394 }, { x: 1203, y: 1415 }, { x: 1249, y: 1436 }, { x: 1295, y: 1457 }], speed: 9, who: '漳州莊的農夫', says: '竹蛇籠把濁水溪的水導進圳道，田就不會乾裂了。', lod: 0 },
  { kind: 'carrier', path: [{ x: 1290, y: 1459 }, { x: 1277, y: 1470 }, { x: 1247, y: 1471 }], speed: 6, who: '泉州莊的莊民', says: '以前要走好遠去溪邊挑水，現在圳道就在家門口。', lod: 1 },
  { kind: 'worker', at: { x: 1325, y: 1491 }, who: '泉州莊的農夫', says: '我們莊只有 4 塊田，照田的多少分水，大家都夠用。', lod: 1 },
  { kind: 'farmer', path: [{ x: 1390, y: 1489 }, { x: 1353, y: 1472 }, { x: 1326, y: 1459 }], speed: 7, who: '顧圳頭的人', says: '圳頭開在上游的二水，那裡比較高，水才流得到整片平原。', lod: 2 },
  { kind: 'buffalo', path: [{ x: 1102, y: 1399 }, { x: 1130, y: 1416 }, { x: 1158, y: 1424 }], speed: 3, who: '水牛', says: '哞～（水牛幫忙犁田，是農家的好幫手。）', lod: 2 },
  { kind: 'dog', path: [{ x: 1159, y: 1396 }, { x: 1211, y: 1424 }, { x: 1260, y: 1463 }], speed: 18, who: '小狗', says: '汪！汪！', lod: 3 },
  { kind: 'hen', path: [{ x: 1135, y: 1386 }, { x: 1148, y: 1397 }], speed: 4, who: '母雞', says: '咯咯咯～', lod: 3 },
  { kind: 'hen', path: [{ x: 1265, y: 1481 }, { x: 1278, y: 1491 }], speed: 4, who: '母雞', says: '咯咯咯～', lod: 3 },
  { kind: 'lian', at: { x: 1096, y: 1393 }, who: '阿蓮', says: '今年冬天，阿嬤終於吃到新米煮的飯了！我在幫忙插秧喔。', lod: 0 },
  { kind: 'hoer', at: { x: 1238, y: 1419 }, who: '翻土的阿伯', says: '有圳水，土就鬆鬆軟軟的，一鋤頭下去好輕鬆。', lod: 1 },
  { kind: 'porter', path: [{ x: 1159, y: 1401 }, { x: 1188, y: 1433 }, { x: 1229, y: 1462 }, { x: 1248, y: 1474 }], speed: 7, who: '挑擔的莊民', says: '把漳州莊的菜挑去泉州莊換鹽，兩個莊現在常常走動。', lod: 1 },
  { kind: 'woman', path: [{ x: 1274, y: 1483 }, { x: 1311, y: 1499 }, { x: 1353, y: 1495 }, { x: 1384, y: 1493 }], speed: 6, who: '提籃子的阿姆', says: '我去圳頭的土地公廟拜拜，謝謝今年風調雨順。', lod: 2 },
  { kind: 'washer', at: { x: 1213, y: 1417 }, who: '在圳邊洗衣服的阿姆', says: '以前要走到濁水溪邊洗，現在圳水就流過莊頭，方便多了。', lod: 0 },
  { kind: 'waterer', path: [{ x: 1289, y: 1461 }, { x: 1278, y: 1468 }, { x: 1265, y: 1469 }], speed: 5, who: '挑水的阿嬸', says: '挑圳水回家煮飯，再也不用等下雨了。', lod: 1 },
  { kind: 'kid', path: [{ x: 1129, y: 1392 }, { x: 1154, y: 1405 }, { x: 1176, y: 1420 }], speed: 14, who: '莊裡的小孩', says: '我在追雞！阿爸說今年收成好，過年可以吃甜粿。', lod: 1 },
  { kind: 'swimmer', path: [{ x: 1370, y: 1483 }, { x: 1333, y: 1468 }, { x: 1296, y: 1452 }], speed: 4, who: '鴨子', says: '呱呱！（有圳水的地方，農家就養得起鴨子。）', lod: 2 },
  { kind: 'duck', path: [{ x: 1239, y: 1481 }, { x: 1253, y: 1490 }], speed: 3, who: '鴨子', says: '呱呱呱～', lod: 3 },
  { kind: 'magpie', path: [{ x: 1069, y: 1315 }, { x: 1180, y: 1362 }, { x: 1309, y: 1417 }, { x: 1456, y: 1482 }], speed: 26, who: '臺灣藍鵲', says: '嘎嘎！（田裡有水、有蟲，鳥也飛回來了。）', lod: 2 },
];

// 每種角色用哪幾張圖（public/img/island/），以及在地圖上多高（原圖像素）
// loop：站在原地反覆做的動作（翻土、插秧）；fly：在天上飛，上下輕輕飄
export const ACTOR_ART: Record<ActorKind, { walk: string[]; idle: string; work?: Record<'plant' | 'harvest', string>; loop?: string[]; fly?: boolean; height: number }> = {
  farmer: { walk: ['farmer-2', 'farmer-3', 'farmer-4', 'farmer-3'], idle: 'farmer-1', height: 17 },
  worker: { walk: ['farmer-2', 'farmer-3'], idle: 'farmer-1', work: { plant: 'farmer-5', harvest: 'farmer-6' }, height: 17 },
  carrier: { walk: ['farmer-7'], idle: 'farmer-7', height: 17 },
  buffalo: { walk: ['buffalo-2', 'buffalo-3'], idle: 'buffalo-4', height: 15 },
  dog: { walk: ['dog-2', 'dog-3'], idle: 'dog-4', height: 9 },
  hen: { walk: ['hen-2', 'hen-3'], idle: 'hen-4', height: 7 },
  hoer: { walk: ['p8-2', 'p8-3'], idle: 'p8-1', loop: ['p8-1', 'p8-5'], height: 19 },
  porter: { walk: ['p8-6'], idle: 'p8-6', height: 19 },
  woman: { walk: ['p2-2', 'p2-3'], idle: 'p2-4', height: 16 },
  lian: { walk: ['lian-2', 'lian-3'], idle: 'lian-1', loop: ['lian-5', 'lian-5', 'lian-1'], height: 15 },
  magpie: { walk: ['magpie-4', 'magpie-5'], idle: 'magpie-6', fly: true, height: 9 },
  washer: { walk: ['w3-2', 'w3-3'], idle: 'w3-1', loop: ['w3-5', 'w3-5', 'w3-5', 'w3-4'], height: 16 },
  waterer: { walk: ['w3-7'], idle: 'w3-7', height: 16 },
  kid: { walk: ['w4-2', 'w4-3'], idle: 'w4-10', height: 12 },
  duck: { walk: ['w5-2', 'w5-3'], idle: 'w5-1', height: 6 },
  swimmer: { walk: ['w5-4'], idle: 'w5-4', height: 5 },
  // 第一章：阿岩和史前的人（關卡裡的圖）
  ayan: { walk: ['ch1/f-04a-walk1', 'ch1/f-04a-walk2'], idle: 'ch1/f-04a-idle', height: 14 },
  knapper: { walk: ['ch1/f-04a-walk1'], idle: 'ch1/f-04a-idle', loop: ['ch1/f-04a-knap', 'ch1/f-04a-knap', 'ch1/f-04a-idle'], height: 14 },
  potter: { walk: ['ch1/p-15-potter'], idle: 'ch1/p-15-potter', height: 17 },
  jadeworker: { walk: ['ch1/p-15-jade'], idle: 'ch1/p-15-jade', height: 17 },
  smith: { walk: ['ch1/p-15-smith'], idle: 'ch1/p-15-smith', height: 17 },
  deer: { walk: ['ch2/deer-run'], idle: 'ch2/deer', height: 12 },
  grazer: { walk: ['ch2/deer-run'], idle: 'ch2/deer', loop: ['ch2/deer-eat', 'ch2/deer-eat', 'ch2/deer'], height: 12 },
  // 第二章：阿妮和部落的人
  ani: { walk: ['ch2/f-05a-walk1', 'ch2/f-05a-walk2'], idle: 'ch2/f-05a-idle', height: 14 },
  sower: { walk: ['ch2/f-05a-walk1'], idle: 'ch2/f-05a-idle', loop: ['ch2/f-05a-sow', 'ch2/f-05a-sow', 'ch2/f-05a-idle'], height: 14 },
  elder: { walk: ['ch2/p-16-elder'], idle: 'ch2/p-16-elder', height: 17 },
  hunter: { walk: ['ch2/p-16-hunter'], idle: 'ch2/p-16-hunter', height: 17 },
  trader: { walk: ['ch2/p-16-trader'], idle: 'ch2/p-16-trader', height: 17 },
  boar: { walk: ['x2-7'], idle: 'x2-7', height: 9 },
  macaque: { walk: ['x2-8'], idle: 'x2-8', height: 9 },
  xlian: { walk: ['ch4/f-07a-walk1', 'ch4/f-07a-walk2'], idle: 'ch4/f-07a-idle', height: 14 },
  xlianCarry: { walk: ['ch4/f-07a-carry'], idle: 'ch4/f-07a-carry', height: 14 },
  chen: { walk: ['ch4/p-18-chen'], idle: 'ch4/p-18-chen', height: 17 },
  veteran: { walk: ['ch4/p-18-veteran'], idle: 'ch4/p-18-veteran', loop: ['ch4/p-18-veteran', 'ch4/f-07a-dig'], height: 17 },
  villager4: { walk: ['ch4/p-18-villager'], idle: 'ch4/p-18-villager', height: 17 },
};

// 聚落周圍的樹、竹林、蘆葦，圳頭的攔水堰（O-04、O-02）。flip＝左右翻過來，看起來不會一模一樣
export const SCENERY: Placed[] = [
  { name: 'weir', at: { x: 1417, y: 1512 }, width: 26 },
  { name: 'tree', at: { x: 1129, y: 1362 }, width: 20 },
  { name: 'tree', at: { x: 1182, y: 1379 }, width: 17, flip: true },
  { name: 'tree', at: { x: 1069, y: 1357 }, width: 18 },
  { name: 'tree', at: { x: 1290, y: 1500 }, width: 18 },
  { name: 'tree', at: { x: 1424, y: 1483 }, width: 18, flip: true },
  { name: 'tree', at: { x: 1337, y: 1511 }, width: 16 },
  { name: 'o4-bamboo', at: { x: 1064, y: 1336 }, width: 20 },
  { name: 'o4-bamboo', at: { x: 1119, y: 1348 }, width: 16, flip: true },
  { name: 'reeds', at: { x: 1196, y: 1465 }, width: 18 },
  { name: 'w2-1', at: { x: 1240, y: 1447 }, width: 9 },
  { name: 'w2-1', at: { x: 1351, y: 1484 }, width: 8, flip: true },
  { name: 'w2-2', at: { x: 1167, y: 1380 }, width: 8 },
  { name: 'w2-3', at: { x: 1294, y: 1495 }, width: 13 },
  { name: 'w2-4', at: { x: 1279, y: 1464 }, width: 11 },
  { name: 'w2-5', at: { x: 1130, y: 1388 }, width: 8 },
  { name: 'w2-6', at: { x: 1217, y: 1471 }, width: 15 },
  { name: 'w2-8', at: { x: 1112, y: 1373 }, width: 10 },
  { name: 'w2-9', at: { x: 1261, y: 1485 }, width: 8, flip: true },
  { name: 'reeds', at: { x: 1356, y: 1524 }, width: 16, flip: true },
  { name: 'reeds', at: { x: 1445, y: 1531 }, width: 16 },
];

// 炊煙：每個聚落屋頂上冒出來的煙
export const SMOKE: Pt[] = [{ x: 1149, y: 1361 }, { x: 1166, y: 1371 }, { x: 1260, y: 1453 }, { x: 1274, y: 1462 }, { x: 1092, y: 1340 }];

// 莊和莊之間走出來的土路（T-02 泥土貼圖）
export const ROADS: Pt[][] = [
  [{ x: 1089, y: 1365 }, { x: 1116, y: 1381 }, { x: 1139, y: 1391 }],
  [{ x: 1156, y: 1400 }, { x: 1188, y: 1433 }, { x: 1229, y: 1462 }, { x: 1248, y: 1474 }],
  [{ x: 1272, y: 1483 }, { x: 1311, y: 1499 }, { x: 1353, y: 1495 }, { x: 1393, y: 1492 }],
];

// ── 每章過關後，大地圖上那一區活起來 ──────────────────────
// 每章一份：房子、景物、會換圖的東西、炊煙、小人和動物。之後的章節照這個格式補資料就會出現。

// 會換圖的東西，一輪 seconds 秒，照順序換 frames：樹長大→被砍成樹樁→又冒出小樹；田燒墾、播種、收成、休耕。
// 每一張都照第一張的比例縮放（同一張素材表畫的，大小本來就對得上）。ground＝貼在地上（人站在上面）
export interface Cycle { frames: string[]; at: Pt; width: number; seconds: number; ph?: number; ground?: boolean }
export interface ChapterLife {
  canal?: Pt[][]; // 圳道（第五章）
  roads?: Pt[][]; // 土路
  paddies?: Pt[]; // 隨季節變色的稻田（第五章）
  buildings: Placed[];
  scenery?: Placed[];
  cycles?: Cycle[];
  smoke?: Pt[];
  actors: ActorDef[];
}

const TREE = ['ch1/o-05-tree', 'ch1/o-05-tree', 'ch1/o-05-tree', 'ch1/o-05-stump', 'ch1/o-05-sapling'];
const FIELD = ['ch2/o-06-forest', 'ch2/o-06-burnt', 'ch2/o-06-sprout', 'ch2/o-06-green', 'ch2/o-06-golden', 'ch2/o-06-fallow', 'ch2/o-06-fallow'];

// 第一章：東海岸八仙洞（洞裡的火亮了、海邊敲石器）＋北海岸十三行（煉鐵爐冒煙）
const LIFE_CH1: ChapterLife = {
  buildings: [
    { name: 'x1-1', at: { x: 2318, y: 2030 }, width: 46 },
    { name: 'x1-2', at: { x: 2196, y: 1948 }, width: 30 },
    { name: 'x1-2', at: { x: 2232, y: 2080 }, width: 26, flip: true },
    { name: 'x1-3', at: { x: 2062, y: 238 }, width: 30 },
    { name: 'x1-3', at: { x: 2030, y: 262 }, width: 24, flip: true },
    { name: 'x1-4', at: { x: 2094, y: 266 }, width: 18, flicker: true },
  ],
  scenery: [
    { name: 'ch1/o-05-fire', at: { x: 2262, y: 2004 }, width: 13, flicker: true },
    { name: 'x1-5', at: { x: 2296, y: 2088 }, width: 20 },
    { name: 'x1-6', at: { x: 2286, y: 2124 }, width: 24 },
    { name: 'x1-7', at: { x: 2262, y: 2104 }, width: 17 },
    { name: 'x1-8', at: { x: 2180, y: 2006 }, width: 20 },
    { name: 'ch1/o-05-woodpile', at: { x: 2112, y: 278 }, width: 16 },
  ],
  cycles: [
    { frames: TREE, at: { x: 2126, y: 1906 }, width: 20, seconds: 30 },
    { frames: TREE, at: { x: 2100, y: 2060 }, width: 18, seconds: 30, ph: 0.4 },
    { frames: TREE, at: { x: 2150, y: 2128 }, width: 20, seconds: 30, ph: 0.7 },
    { frames: TREE, at: { x: 2010, y: 250 }, width: 18, seconds: 26, ph: 0.2 },
    { frames: TREE, at: { x: 2128, y: 294 }, width: 18, seconds: 26, ph: 0.6 },
  ],
  smoke: [{ x: 2096, y: 252 }, { x: 2318, y: 2014 }],
  actors: [
    { kind: 'ayan', path: [{ x: 2190, y: 1966 }, { x: 2240, y: 2012 }, { x: 2296, y: 2050 }], speed: 8, who: '阿岩', says: '洞裡的火回來了！晚上不會冷，阿媽也不咳嗽了。', lod: 0 },
    { kind: 'knapper', at: { x: 2196, y: 2016 }, who: '敲石器的阿岩', says: '從角落開始，沿著邊一片一片敲，石刀就做好了。', lod: 0 },
    { kind: 'potter', at: { x: 2214, y: 2092 }, who: '做陶的婆婆', says: '罐子可以把東西煮熟，也可以把種子收好，明年再種。', lod: 1 },
    { kind: 'jadeworker', at: { x: 2172, y: 1958 }, who: '磨玉的工匠', says: '玉很硬，要用砂和水慢慢磨，磨好幾天才有一個玉環。', lod: 1 },
    { kind: 'smith', at: { x: 2080, y: 282 }, who: '十三行煉鐵的師傅', says: '煉一爐鐵要燒好多木炭。樹砍了，要記得讓小樹長回來。', lod: 0 },
    { kind: 'grazer', at: { x: 2060, y: 1964 }, who: '梅花鹿', says: '呦～（阿岩一直想看到森林裡的鹿群。）', lod: 2 },
    { kind: 'deer', path: [{ x: 2040, y: 2010 }, { x: 2080, y: 2040 }, { x: 2116, y: 2090 }], speed: 10, who: '梅花鹿', says: '呦呦！', lod: 3 },
  ],
};

// 第二章：中央山脈上的部落（石板屋、穀倉、小米田輪流休耕、獵場裡的鹿）
const LIFE_CH2: ChapterLife = {
  buildings: [
    { name: 'x2-1', at: { x: 1902, y: 1500 }, width: 32 },
    { name: 'x2-1', at: { x: 1946, y: 1526 }, width: 28, flip: true },
    { name: 'x2-2', at: { x: 1862, y: 1532 }, width: 28 },
    { name: 'x2-3', at: { x: 1986, y: 1494 }, width: 17 },
    { name: 'x2-4', at: { x: 1818, y: 1488 }, width: 26 },
    { name: 'x2-5', at: { x: 1924, y: 1548 }, width: 7 },
  ],
  scenery: [
    { name: 'x2-6', at: { x: 2012, y: 1522 }, width: 22 },
  ],
  cycles: [
    { frames: FIELD, at: { x: 1866, y: 1600 }, width: 34, seconds: 70, ground: true },
    { frames: FIELD, at: { x: 1946, y: 1610 }, width: 34, seconds: 70, ph: 0.3, ground: true },
    { frames: FIELD, at: { x: 2026, y: 1584 }, width: 32, seconds: 70, ph: 0.6, ground: true },
  ],
  smoke: [{ x: 1898, y: 1486 }, { x: 1862, y: 1520 }],
  actors: [
    { kind: 'ani', path: [{ x: 1872, y: 1556 }, { x: 1940, y: 1580 }, { x: 2010, y: 1566 }], speed: 7, who: '阿妮', says: '小米田要輪流休息，種一年、歇一年，田才會一直有力氣。', lod: 0 },
    { kind: 'sower', at: { x: 1950, y: 1614 }, who: '播種的阿妮', says: '春天播小米，播完同一季就要除草，不然草會長得比小米快。', lod: 0 },
    { kind: 'elder', at: { x: 1918, y: 1522 }, who: '部落長老', says: '每個部落、每個家族的獵場都有範圍，這是祖先留下的規矩。', lod: 1 },
    { kind: 'hunter', path: [{ x: 1826, y: 1504 }, { x: 1790, y: 1470 }, { x: 1756, y: 1440 }], speed: 5, who: '獵人叔叔', says: '春天讓鹿生小鹿，秋天、冬天再上山。每年打的，不要比生出來的多。', lod: 1 },
    { kind: 'trader', path: [{ x: 1730, y: 1610 }, { x: 1790, y: 1580 }, { x: 1840, y: 1560 }], speed: 4, who: '外地來的商人', says: '我從海邊來，想用布和鐵器換你們的鹿皮。聽說海上還有大船要來……', lod: 2 },
    { kind: 'grazer', at: { x: 1776, y: 1420 }, who: '梅花鹿', says: '呦～（鹿群一直都在，以後的孩子也看得到。）', lod: 1 },
    { kind: 'grazer', at: { x: 1800, y: 1436 }, who: '小鹿', says: '呦呦～', lod: 2 },
    { kind: 'deer', path: [{ x: 1740, y: 1400 }, { x: 1700, y: 1430 }, { x: 1680, y: 1470 }], speed: 12, who: '梅花鹿', says: '呦！', lod: 3 },
    { kind: 'boar', path: [{ x: 2050, y: 1450 }, { x: 2076, y: 1470 }, { x: 2094, y: 1494 }], speed: 4, who: '山豬', says: '嚄嚄！（獵人說，山豬也是獵場裡的動物。）', lod: 2 },
    { kind: 'macaque', at: { x: 1992, y: 1432 }, who: '臺灣獼猴', says: '吱吱！（小米快熟的時候，要小心猴子來偷吃。）', lod: 3 },
  ],
};

// 第四章：台南平原的東寧（孔廟、瀨口鹽田、北邊的營盤與屯田、水埤）
const LIFE_CH4: ChapterLife = {
  buildings: [
    { name: 'ch4/o-08-hall', at: { x: 1030, y: 2500 }, width: 30 },
    { name: 'ch4/o-08-gate', at: { x: 1040, y: 2530 }, width: 20 },
    { name: 'ch4/o-08-camp', at: { x: 1062, y: 2604 }, width: 26 },
    { name: 'ch4/o-08-camp', at: { x: 1060, y: 2660 }, width: 24, flip: true },
    { name: 'ch4/o-08-village', at: { x: 1200, y: 2700 }, width: 26 },
  ],
  scenery: [
    { name: 'ch4/o-08-saltpan', at: { x: 950, y: 2700 }, width: 30 },
    { name: 'ch4/o-08-saltpan', at: { x: 966, y: 2734 }, width: 26, flip: true },
    { name: 'ch4/g-06-salt', at: { x: 976, y: 2700 }, width: 9 },
    { name: 'ch4/o-08-pond', at: { x: 1080, y: 2560 }, width: 26 },
    { name: 'ch4/o-08-paddy', at: { x: 1112, y: 2634 }, width: 26 },
    { name: 'ch4/o-08-paddy', at: { x: 1086, y: 2690 }, width: 26 },
    { name: 'ch4/o-08-potato', at: { x: 1142, y: 2664 }, width: 22 },
    { name: 'ch4/g-06-flag', at: { x: 1078, y: 2592 }, width: 8 },
  ],
  smoke: [{ x: 1062, y: 2592 }, { x: 1200, y: 2688 }],
  actors: [
    { kind: 'xlian', path: [{ x: 1050, y: 2510 }, { x: 1070, y: 2546 }, { x: 1094, y: 2580 }], speed: 7, who: '小蓮', says: '阿爸不用再去打仗了！我們在這裡有自己的田。', lod: 0 },
    { kind: 'xlianCarry', path: [{ x: 1082, y: 2572 }, { x: 1108, y: 2626 }], speed: 5, who: '挑水的小蓮', says: '水埤把雨水存起來，旱季田也有水。', lod: 1 },
    { kind: 'chen', at: { x: 1010, y: 2520 }, who: '陳永華', says: '蓋孔廟、設學堂，讓孩子讀書，東寧才有明天。', lod: 0 },
    { kind: 'veteran', at: { x: 1124, y: 2646 }, who: '屯田的老兵', says: '寓兵於農：平常種田，要打仗才拿起刀。營盤的名字，後來變成新營、柳營這些地名。', lod: 1 },
    { kind: 'villager4', at: { x: 1214, y: 2720 }, who: '村社的阿姨', says: '溪邊的地是我們的獵場和田，大家要先商量好。', lod: 1 },
    { kind: 'buffalo', path: [{ x: 1080, y: 2680 }, { x: 1104, y: 2700 }], speed: 3, who: '水牛', says: '哞～', lod: 2 },
  ],
};

export const LIFE: Partial<Record<ChapterId, ChapterLife>> = {
  ch1: LIFE_CH1,
  ch2: LIFE_CH2,
  ch4: LIFE_CH4,
  ch5: { canal: CANAL, roads: ROADS, paddies: PADDIES, buildings: BUILDINGS, scenery: SCENERY, smoke: SMOKE, actors: ACTORS },
};

// 季節：一輪 80 秒，秧苗 → 綠稻 → 金黃 → 收割
export const SEASON_SECONDS = 80;

export const TICK_LINES = {
  welcome: '這是被時光雲霧蓋住的台灣。每一個發光的裂縫，都通往一個時代。先去彰化平原的裂縫看看吧！',
  building: (title: string) => `「${title}」這一章還在施工中，下次再來！`,
  cleared: '彰化平原的雲霧散開了！八堡圳的水一直流進田裡，大家在田裡忙著呢。點一下小人，聽聽他們說什麼。',
  clearedCh1: '海邊的雲霧散開了！八仙洞的火亮起來，十三行的煉鐵爐也冒煙了。阿岩的時代，終於等到天亮。',
  clearedCh2: '山上的雲霧散開了！部落的小米田一塊種、一塊休息，森林裡的鹿也還在。可是海邊好像來了大船……',
  clearedCh4: '台南平原的雲霧散開了！營盤旁邊的官田長出稻子，水埤存滿了水，海邊的鹽田白亮亮，孔廟裡傳來讀書聲。',
  clearedCh6: '北邊的雲霧散開了！火車冒著白煙從基隆開到臺北，淡水港的帆船載著茶葉出海。阿春的雨天，終於放晴了。',
  hook: '莊民說：「米多到吃不完，要怎麼運出去？」你看，北邊台北的裂縫開始發光了……',
  glasses: '戴上地形眼鏡：越褐的地方越高。只看得到撥開雲霧的地方喔。',
  fogged: '這裡還蓋著時光雲霧。',
};

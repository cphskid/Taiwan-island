// 全台大地圖的資料：七章加終章在哪一區、裂縫在哪、過關後長出什麼、小人怎麼走、說什麼。
//
// 座標都是 M-01 第二版（北朝上，2680×3704）的像素位置。地區分界與高度場由 tools/make_world.py
// 照 world-seeds.json、world-ridges.json 算好存成圖（public/img/island/m01-*），改了要重跑。
// 對話是佔位稿：P6-5 照課本附出處重寫。

import SEEDS from './world-seeds.json';
import type { Pt } from '../core/world';

const BASE = import.meta.env.BASE_URL;
export const isl = (name: string) => `${BASE}img/island/${name}.webp`;

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
  { id: 'ch4', region: 4, no: '第四章', title: '東寧屯田', era: '鄭氏', place: '台南平原', grows: '田園、營盤', rift: rift(3), playable: false, gear: 3, badge: 'rice' },
  { id: 'ch5', region: 5, no: '第五章', title: '八堡圳', era: '清領', place: '彰化平原', grows: '八堡圳與綠色稻田', rift: { x: 1327, y: 1443 }, playable: true, gear: 4, badge: 'canal' },
  { id: 'ch6', region: 6, no: '第六章', title: '開港與鐵路', era: '清末', place: '台北到基隆', grows: '鐵路、淡水與基隆港', rift: rift(5), playable: false, gear: 5, badge: 'train' },
  { id: 'ch7', region: 7, no: '第七章', title: '縱貫與大圳', era: '日治', place: '嘉南平原、日月潭', grows: '嘉南大圳、發電廠', rift: rift(6), playable: true, gear: 6, badge: 'dam' },
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
export const BUILDINGS: { name: string; at: Pt; width: number; flip?: boolean }[] = [
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
export type ActorKind = 'farmer' | 'carrier' | 'worker' | 'buffalo' | 'hen' | 'dog' | 'hoer' | 'porter' | 'woman' | 'lian' | 'magpie' | 'washer' | 'waterer' | 'kid' | 'duck' | 'swimmer';
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
};

// 聚落周圍的樹、竹林、蘆葦，圳頭的攔水堰（O-04、O-02）。flip＝左右翻過來，看起來不會一模一樣
export const SCENERY: { name: string; at: Pt; width: number; flip?: boolean }[] = [
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

// 季節：一輪 80 秒，秧苗 → 綠稻 → 金黃 → 收割
export const SEASON_SECONDS = 80;

export const TICK_LINES = {
  welcome: '這是被時光雲霧蓋住的台灣。每一個發光的裂縫，都通往一個時代。先去彰化平原的裂縫看看吧！',
  building: (title: string) => `「${title}」這一章還在施工中，下次再來！`,
  cleared: '彰化平原的雲霧散開了！八堡圳的水一直流進田裡，大家在田裡忙著呢。點一下小人，聽聽他們說什麼。',
  clearedCh1: '海邊的雲霧散開了！八仙洞的火亮起來，十三行的煉鐵爐也冒煙了。阿岩的時代，終於等到天亮。',
  clearedCh2: '山上的雲霧散開了！部落的小米田一塊種、一塊休息，森林裡的鹿也還在。可是海邊好像來了大船……',
  clearedCh7: '嘉南平原的雲霧散開了！嘉南大圳的水流進田裡，縱貫線的火車也開過去了。戰爭結束以後，島上的人要自己決定未來……最後一章快到了。',
  hook: '莊民說：「米多到吃不完，要怎麼運出去？」你看，北邊台北的裂縫開始發光了……',
  glasses: '戴上地形眼鏡：越褐的地方越高。只看得到撥開雲霧的地方喔。',
  fogged: '這裡還蓋著時光雲霧。',
};

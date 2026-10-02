// 全台大地圖的資料：七章加終章在哪一區、裂縫在哪、過關後長出什麼、小人怎麼走、說什麼。
//
// 座標都是 M-01 原圖（2071×1492）的像素位置。地區分界與高度場由 tools/make_world.py
// 照 world-seeds.json、world-ridges.json 算好存成圖（public/img/island/m01-*），改了要重跑。
// 對話是佔位稿：P6-5 照課本附出處重寫。

import SEEDS from './world-seeds.json';
import type { Pt } from '../core/world';

const BASE = import.meta.env.BASE_URL;
export const isl = (name: string) => `${BASE}img/island/${name}.webp`;

export const MAP = {
  width: 2071,
  height: 1492,
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
  badge: string; // 章節徽章（I-06，public/img/island/badge-*）；第二章還沒有專屬的，先用空白徽章
}

const rift = (i: number): Pt => ({ x: SEEDS[i].seeds[0][0], y: SEEDS[i].seeds[0][1] });

export const CHAPTERS: ChapterInfo[] = [
  { id: 'ch1', region: 1, no: '第一章', title: '島嶼的第一道火光', era: '史前', place: '東海岸八仙洞、北海岸十三行', grows: '洞穴與海邊的火光', rift: rift(0), playable: true, gear: 0, badge: 'fire' },
  { id: 'ch2', region: 2, no: '第二章', title: '山林與部落', era: '原住民族', place: '中央山脈', grows: '山上部落、鹿群', rift: rift(1), playable: false, gear: 1, badge: 'blank' },
  { id: 'ch3', region: 3, no: '第三章', title: '大航海時代', era: '荷西', place: '台南大員、基隆和平島', grows: '熱蘭遮城、聖薩爾瓦多城', rift: rift(2), playable: false, gear: 2, badge: 'ship' },
  { id: 'ch4', region: 4, no: '第四章', title: '東寧屯田', era: '鄭氏', place: '台南平原', grows: '田園、營盤', rift: rift(3), playable: false, gear: 3, badge: 'rice' },
  { id: 'ch5', region: 5, no: '第五章', title: '八堡圳', era: '清領', place: '彰化平原', grows: '八堡圳與綠色稻田', rift: { x: 585, y: 598 }, playable: true, gear: 4, badge: 'canal' },
  { id: 'ch6', region: 6, no: '第六章', title: '開港與鐵路', era: '清末', place: '台北到基隆', grows: '鐵路、淡水與基隆港', rift: rift(5), playable: false, gear: 5, badge: 'train' },
  { id: 'ch7', region: 7, no: '第七章', title: '縱貫與大圳', era: '日治', place: '嘉南平原、日月潭', grows: '嘉南大圳、發電廠', rift: rift(6), playable: false, gear: 6, badge: 'dam' },
  { id: 'end', region: 8, no: '終章', title: '今天的島嶼', era: '戰後', place: '剩下的雲霧全部散開', grows: '高鐵穿過全島', rift: { x: 880, y: 1180 }, playable: false, gear: null, badge: 'hsr' },
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
  [{ x: 690, y: 628 }, { x: 650, y: 622 }, { x: 600, y: 620 }, { x: 560, y: 618 }, { x: 510, y: 613 }, { x: 460, y: 609 }, { x: 412, y: 603 }],
  [{ x: 560, y: 618 }, { x: 552, y: 628 }, { x: 540, y: 638 }],
];

export type SpriteName = 'zhang' | 'quan' | 'tribe' | 'shrine';
export const BUILDINGS: { name: SpriteName; at: Pt; width: number }[] = [
  { name: 'tribe', at: { x: 330, y: 596 }, width: 44 },
  { name: 'zhang', at: { x: 398, y: 600 }, width: 50 },
  { name: 'quan', at: { x: 532, y: 648 }, width: 48 },
  { name: 'shrine', at: { x: 668, y: 612 }, width: 30 },
];
// 稻田：隨季節從秧苗、綠稻變成金黃，再收割
export const PADDIES: Pt[] = [
  { x: 350, y: 622 }, { x: 445, y: 626 }, { x: 488, y: 600 }, { x: 600, y: 640 }, { x: 640, y: 606 }, { x: 460, y: 646 },
];

// 會動的小人和動物。path 來回走；at 是站著做事的地方
export type ActorKind = 'farmer' | 'carrier' | 'worker' | 'buffalo' | 'hen' | 'dog';
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
  { kind: 'worker', at: { x: 445, y: 630 }, who: '漳州莊的農夫', says: '有水以後，我們家一年可以收兩次稻。', lod: 0 },
  { kind: 'farmer', path: [{ x: 410, y: 610 }, { x: 460, y: 614 }, { x: 510, y: 618 }, { x: 560, y: 622 }], speed: 9, who: '漳州莊的農夫', says: '竹蛇籠把濁水溪的水導進圳道，田就不會乾裂了。', lod: 0 },
  { kind: 'carrier', path: [{ x: 556, y: 626 }, { x: 548, y: 640 }, { x: 520, y: 652 }], speed: 6, who: '泉州莊的莊民', says: '以前要走好遠去溪邊挑水，現在圳道就在家門口。', lod: 1 },
  { kind: 'worker', at: { x: 600, y: 644 }, who: '泉州莊的農夫', says: '我們莊只有 4 塊田，照田的多少分水，大家都夠用。', lod: 1 },
  { kind: 'farmer', path: [{ x: 660, y: 620 }, { x: 620, y: 616 }, { x: 590, y: 614 }], speed: 7, who: '顧圳頭的人', says: '圳頭開在上游的二水，那裡比較高，水才流得到整片平原。', lod: 2 },
  { kind: 'buffalo', path: [{ x: 360, y: 634 }, { x: 392, y: 640 }, { x: 420, y: 638 }], speed: 3, who: '水牛', says: '哞～（水牛幫忙犁田，是農家的好幫手。）', lod: 2 },
  { kind: 'dog', path: [{ x: 412, y: 612 }, { x: 470, y: 620 }, { x: 530, y: 640 }], speed: 18, who: '小狗', says: '汪！汪！', lod: 3 },
  { kind: 'hen', path: [{ x: 386, y: 610 }, { x: 402, y: 616 }], speed: 4, who: '母雞', says: '咯咯咯～', lod: 3 },
  { kind: 'hen', path: [{ x: 540, y: 655 }, { x: 556, y: 660 }], speed: 4, who: '母雞', says: '咯咯咯～', lod: 3 },
];

// 每種角色用哪幾張圖（public/img/island/），以及在地圖上多高（原圖像素）
export const ACTOR_ART: Record<ActorKind, { walk: string[]; idle: string; work?: Record<'plant' | 'harvest', string>; height: number }> = {
  farmer: { walk: ['farmer-2', 'farmer-3', 'farmer-4', 'farmer-3'], idle: 'farmer-1', height: 17 },
  worker: { walk: ['farmer-2', 'farmer-3'], idle: 'farmer-1', work: { plant: 'farmer-5', harvest: 'farmer-6' }, height: 17 },
  carrier: { walk: ['farmer-7'], idle: 'farmer-7', height: 17 },
  buffalo: { walk: ['buffalo-2', 'buffalo-3'], idle: 'buffalo-4', height: 15 },
  dog: { walk: ['dog-2', 'dog-3'], idle: 'dog-4', height: 9 },
  hen: { walk: ['hen-2', 'hen-3'], idle: 'hen-4', height: 7 },
};

// 季節：一輪 80 秒，秧苗 → 綠稻 → 金黃 → 收割
export const SEASON_SECONDS = 80;

export const TICK_LINES = {
  welcome: '這是被時光雲霧蓋住的台灣。每一個發光的裂縫，都通往一個時代。先去彰化平原的裂縫看看吧！',
  building: (title: string) => `「${title}」這一章還在施工中，下次再來！`,
  cleared: '彰化平原的雲霧散開了！八堡圳的水一直流進田裡，大家在田裡忙著呢。點一下小人，聽聽他們說什麼。',
  clearedCh1: '海邊的雲霧散開了！八仙洞的火亮起來，十三行的煉鐵爐也冒煙了。阿岩的時代，終於等到天亮。',
  hook: '莊民說：「米多到吃不完，要怎麼運出去？」你看，北邊台北的裂縫開始發光了……',
  glasses: '戴上地形眼鏡：越褐的地方越高。只看得到撥開雲霧的地方喔。',
  fogged: '這裡還蓋著時光雲霧。',
};

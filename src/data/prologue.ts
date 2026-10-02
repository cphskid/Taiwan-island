// 序章《認識臺灣》（康軒五上〈臺灣我的家〉〈臺灣的自然環境與生活〉）的資料：
// 時光鐘塔、海上漂流三關、上岸認識地形和氣候、選地蓋村。
//
// 海圖：一個字一格，上面是北。
//   . 海  k 黑潮（往北流）  n 黑潮（往東北流）  H 港口（要漂到這裡）  S 船出發的地方  x 暗礁
//   T 臺灣  C 中國大陸  U 呂宋島  J 琉球群島  P 澎湖
// 格子對齊 K-03 序章海圖（24×13 格，陸地照圖上的綠色算、黑潮照圖上的深藍色帶描）。
// 每一關的解法由 core/drift.test.ts 用 shortest() 檢查。
// 文字是佔位稿，上正式站前請社會科老師審。

import type { Line } from './babao-chapter';
import type { Pos, Sea, SeaMap, Season } from '../core/drift';

export type LandKind = 'T' | 'C' | 'U' | 'J' | 'P';
export const LANDS: Record<LandKind, { name: string; color: string }> = {
  T: { name: '臺灣', color: '#7cc46a' },
  C: { name: '中國大陸', color: '#c9b38a' },
  U: { name: '呂宋島（菲律賓）', color: '#b7c98a' },
  J: { name: '琉球群島', color: '#b7c98a' },
  P: { name: '澎湖群島', color: '#9fd08a' },
};

export interface DriftLevel extends SeaMap {
  id: number;
  title: string;
  map: string[];
  intro: Line[];
  hint: string; // 失敗之後滴答說的提示
}

const KEY: Record<string, Sea> = { '.': 'sea', S: 'sea', k: 'current', n: 'current-ne', x: 'reef', H: 'harbor' };

function level(def: Omit<DriftLevel, keyof SeaMap> & { legs: number }): DriftLevel {
  const { map } = def;
  let start: Pos = { col: 0, row: 0 };
  map.forEach((r, row) => { const c = r.indexOf('S'); if (c >= 0) start = { col: c, row }; });
  return {
    ...def,
    cols: map[0].length,
    rows: map.length,
    start,
    at: ({ col, row }) => KEY[map[row]?.[col] ?? '.'] ?? 'land',
  };
}

export const landAt = (lv: DriftLevel, p: Pos): LandKind | null => {
  const ch = lv.map[p.row]?.[p.col];
  return ch && ch in LANDS ? (ch as LandKind) : null;
};

export const DRIFTS: DriftLevel[] = [
  level({
    id: 1,
    title: '夏天的風',
    legs: 3,
    map: [
      '...CCCCCCC......kk...J..',
      '...CCCCCC......kk....J..',
      'CCCCCCCC.......kk...J...',
      'CCCCCCCC....TT.k...J....',
      'CCCCCCC....TTTkk.JJ.....',
      'CCCC......TTTTkk........',
      'C........HTTTTkk........',
      '..........TTTkk.........',
      '...........T.kk.........',
      '............nn..........',
      '.....S....nnn...........',
      '.........nnnUU..........',
      '.......nnn.UUU..........',
    ],
    intro: [{ who: 'tick', mood: 'happy', text: '我有天氣羅盤！轉到哪個季節，就吹那個季節的風。先漂到臺灣的港口吧。' }],
    hint: '夏天的風從西南邊吹過來，會把船往東北推。',
  }),
  level({
    id: 2,
    title: '冬天的風',
    legs: 3,
    map: [
      '...CCCCCCC....S.kk...J..',
      '...CCCCCC......kk....J..',
      'CCCCCCCC.......kk...J...',
      'CCCCCCCC...HTT.k...J....',
      'CCCCCCC....TTTkk.JJ.....',
      'CCCC......TTTTkk........',
      'C.........TTTTkk........',
      '..........TTTkk.........',
      '...........T.kk.........',
      '............nn..........',
      '..........nnn...........',
      '.........nnnUU..........',
      '.......nnn.UUU..........',
    ],
    intro: [{ who: 'tick', mood: 'worried', text: '一陣大浪，把我們沖到琉球群島旁邊了！' }],
    hint: '冬天吹東北季風，風從東北吹來，船會往西南漂。',
  }),
  level({
    id: 3,
    title: '黑潮',
    legs: 5,
    map: [
      '...CCCCCCC......kk...J..',
      '...CCCCCC......kk....J..',
      'CCCCCCCC.......kk...J...',
      'CCCCCCCC....TT.k...J....',
      'CCCCCCC....TTTHk.JJ.....',
      'CCCC......TTTTkk........',
      'C.........TTTTkk........',
      '..........TTTkk.........',
      '...........T.kk.........',
      '............nn..........',
      '..........nnn...........',
      '.........nnnUU..........',
      '.......nnnSUUU..........',
    ],
    intro: [
      { who: 'tick', mood: 'worried', text: '又被吹到呂宋島旁邊了！' },
      { who: 'tick', mood: 'thinking', text: '深藍色那條是黑潮，海水從這裡往北流。換季的時候風很弱，船只會跟著海流走。' },
    ],
    hint: '先想辦法進到深藍色的黑潮裡，再等風變弱，讓黑潮帶你往北。',
  }),
];

export const SEASON_INFO: Record<Season, { name: string; wind: string; icon: string }> = {
  winter: { name: '冬天', wind: '東北季風', icon: '❄️' },
  summer: { name: '夏天', wind: '西南季風', icon: '☀️' },
  calm: { name: '換季', wind: '風很弱', icon: '🍃' },
};

export const OUTCOME_TEXT = {
  lost: '船漂出海圖，越漂越遠……',
  aground: '船擱淺在沙灘上，推不動了！',
  wreck: '撞到暗礁了！',
  hungry: '糧食吃完了，肚子咕嚕咕嚕叫……',
  arrived: '到港口了！',
  sailing: '',
} as const;

// ── 時光鐘塔 ──
export const TOWER: Line[] = [
  { who: 'tick', mood: 'wave', text: '見習生，歡迎來到時光鐘塔！這座鐘管著臺灣每一個時代的時間。' },
  { who: 'tick', mood: 'happy', text: '我去拿抹布擦齒輪。那顆紅色按鈕，千萬、千萬不要按喔！' },
];
export const TOWER_OOPS: Line[] = [
  { who: 'tick', mood: 'worried', text: '你……按了？！' },
  { who: 'tick', mood: 'worried', text: '七顆時之齒輪噴到七個時代去了！我們也要被吸進去了——！' },
];

// ── 找到臺灣 ──
export const FIND_INTRO: Line[] = [
  { who: 'tick', mood: 'worried', text: '噗哈！掉進海裡了……還好撈到一艘小船。' },
  { who: 'tick', mood: 'thinking', text: '臺灣在大陸的東南邊、呂宋島的北邊。是哪一座呢？' },
];
export const FIND_WRONG = (name: string) => `這是${name}，不是臺灣喔。`;

// 知識小卡（序章不放圖鑑，看完就收起來）
export interface Fact { title: string; text: string; source: string }
const SRC = {
  home: '國小社會五年級上學期（康軒版）〈臺灣我的家〉',
  nature: '國小社會五年級上學期（康軒版）〈臺灣的自然環境與生活〉',
};
export const FACTS: Record<'where' | 'wind' | 'mountain' | 'tropic' | 'rain' | 'village', Fact> = {
  where: { title: '臺灣在哪裡', source: SRC.home,
    text: '臺灣在亞洲大陸的東南邊。西邊隔著臺灣海峽是中國大陸，南邊是菲律賓的呂宋島，東北邊是琉球群島，東邊是太平洋。' },
  wind: { title: '季風和黑潮', source: SRC.nature,
    text: '冬天吹東北季風，夏天吹西南季風。臺灣東邊有一道往北流的海流，叫黑潮。以前的人坐船，要看季風和海流決定什麼時候出發。' },
  mountain: { title: '中央山脈', source: SRC.nature,
    text: '臺灣中間有高高的中央山脈，玉山是臺灣最高的山。山多、平原少，平原大多在西部。' },
  tropic: { title: '北回歸線', source: SRC.nature,
    text: '北回歸線經過嘉義和花蓮。線的南邊是熱帶，北邊是亞熱帶，所以臺灣南部比北部更熱。' },
  rain: { title: '冬天哪裡多雨', source: SRC.nature,
    text: '冬天的東北季風經過海面帶來水氣，碰到臺灣東北部的山就下雨，所以基隆、宜蘭冬天常下雨。' },
  village: { title: '住在哪裡好', source: SRC.nature,
    text: '平原地勢平坦、靠近河流，可以取水、可以種田，早期的人很多都在這種地方蓋村莊。' },
};

// ── 上岸認識地形、氣候 ──
// 座標是大地圖 M-01 的比例位置（0～1），地形顏色從 m01-relief 讀
export const TROPIC_Y = 0.542; // 北回歸線（照章節位置的緯度估的）
export const RAINY = { minX: 0.6, maxY: 0.3 }; // 東北部
export const LAND_TASKS: { id: 'mountain' | 'tropic' | 'rain'; goal: string; ask: Line; wrong: string }[] = [
  { id: 'mountain', goal: '戴上地形眼鏡，點臺灣最高的地方', ask: { who: 'tick', mood: 'happy', text: '終於上岸了！這副地形眼鏡給你。戴上它，點一下臺灣最高的地方。' }, wrong: '還不是最高。顏色最深的褐色才是最高的山。' },
  { id: 'tropic', goal: '點北回歸線南邊的「熱帶」', ask: { who: 'tick', mood: 'thinking', text: '這條虛線是北回歸線，南邊是熱帶。點一下熱帶那一邊。' }, wrong: '那邊是亞熱帶。熱帶在線的南邊（下面）。' },
  { id: 'rain', goal: '冬天吹東北季風，點最常下雨的地方', ask: { who: 'tick', mood: 'thinking', text: '轉到冬天：東北季風吹來了。冬天哪裡最常下雨？點點看。' }, wrong: '風從東北吹來，先碰到的山才下最多雨。' },
];

// ── 選地蓋村 ──
export const SITES: { id: string; at: { x: number; y: number }; name: string; ok: boolean; says: string }[] = [
  { id: 'peak', at: { x: 0.54, y: 0.5 }, name: '高山上', ok: false, says: '好冷、好陡！稻子長不出來，水也挑不上來。' },
  { id: 'cape', at: { x: 0.88, y: 0.17 }, name: '東北角海邊', ok: false, says: '冬天的東北季風一直吹，雨下個不停，衣服都晾不乾！' },
  { id: 'plain', at: { x: 0.3, y: 0.42 }, name: '西部河邊的平原', ok: true, says: '地很平、旁邊有河，可以種田！' },
];
export const VILLAGE_ASK: Line = { who: 'tick', mood: 'thinking', text: '我們要蓋一個基地。三個地方，選哪裡住最好？' };
export const PROLOGUE_END: Line[] = [
  { who: 'tick', mood: 'happy', text: '好，這裡就是我們的基地！地形眼鏡和天氣羅盤，你都收好了。' },
  { who: 'tick', mood: 'thinking', text: '時光鐘說，七顆齒輪的訊號，就在這座島的七個時代裡。去找回來吧！' },
];

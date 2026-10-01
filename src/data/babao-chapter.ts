// 第五章「八堡圳」的整章資料：大地圖、地點、對話、圖鑑卡、反思題。
//
// 文字是佔位稿：P6-5 會照課本（先以康軒版為準）逐張附出處重寫。
// 平埔族（巴布薩族）的文字與圖，上正式站前要找人審。

import { parseHeights } from '../core/terrain';
import type { Kind } from '../core/flow';
import type { Cell } from '../core/iso';

// 整章的大地圖（12×12）：底圖是 Chuck 的 S-04，格子照圖上的河、田、莊定。
// 地圖上方（後面）最高，往前面越來越低；濁水溪從上面斜斜流到右前方。
//   r 河  g 草地  t 樹（當草地）  d 乾掉的田  b 竹林  s 小石堆（2 顆）  S 大石堆（4 顆）
//   v 聚落  p 巴布薩族的社
const MAP = [
  'tbbsrrrrrgtt',
  'tpppbsrrrrrg',
  'bpgpbbggrrrs',
  'bpgggggSgrrr',
  'tggggggggSrr',
  'tgtgggggggrr',
  'tgggggggggsr',
  'ddgggggggvvg',
  'dddggggggvvg',
  'dddvvgggdddg',
  'dddvvgggdddg',
  'dddvvgggdddg',
];
const HEIGHTS = [
  '555544333443',
  '555444333323',
  '544444443223',
  '444444433222',
  '433334433311',
  '333333433211',
  '332333332221',
  '332222222111',
  '322222221111',
  '222221111110',
  '222111111000',
  '211111100000',
];
const KEY: Record<string, Kind> = { r: 'river', g: 'grass', t: 'grass', d: 'dry', b: 'bamboo', s: 'stone', S: 'stone', v: 'village', p: 'tribe' };

export const CHAPTER = {
  cols: MAP[0].length,
  rows: MAP.length,
  kind: ({ col, row }: Cell): Kind => KEY[MAP[row]?.[col] ?? 'g'] ?? 'grass',
  heights: parseHeights(HEIGHTS),
  stones: ({ col, row }: Cell) => (MAP[row]?.[col] === 'S' ? 4 : MAP[row]?.[col] === 's' ? 2 : 0),
  start: { col: 5, row: 1 }, // 滴答帶你降落的地方（溪邊上游）
  // S-04 底圖四個角（左上、右上、右下、左下）在地圖座標的位置，由圖上的地塊四角算出來
  backdrop: { src: `${import.meta.env.BASE_URL}img/island/S-04.webp`, corners: [-775.2, -31.7, 879.6, -45.0, 661.0, 758.9, -779.7, 756.9] },
};

export const ZHANG: Cell = { col: 4, row: 10 };
export const QUAN: Cell = { col: 9, row: 8 };

export const key = (c: Cell) => `${c.col},${c.row}`;

// 圖鑑卡
export interface Card { id: string; title: string; text: string }
export const CARDS: Record<string, Card> = {
  river: { id: 'river', title: '濁水溪', text: '台灣最長的河。水裡帶著很多泥沙，看起來濁濁的；雨季水很大，旱季水就變少。' },
  plain: { id: 'plain', title: '彰化平原', text: '濁水溪的泥沙一層一層堆出來的平原，土很肥。可是沒有水，就種不了稻子。' },
  zhang: { id: 'zhang', title: '漳州莊', text: '從福建漳州渡海來的移民住的村莊。' },
  quan: { id: 'quan', title: '泉州莊', text: '從福建泉州渡海來的移民住的村莊。' },
  tribe: { id: 'tribe', title: '巴布薩族的社', text: '巴布薩族是平埔族的一支。漢人來開墾以前，他們就住在這片平原上。' },
  contour: { id: 'contour', title: '等高線', text: '同一條線上的地方一樣高。線越密，坡越陡。二水那一頭最高，越往海邊越低。' },
  cage: { id: 'cage', title: '竹蛇籠', text: '用竹子編成長籠子，裡面裝滿石頭。竹籠會透水，大水來了也不容易整個被沖走。' },
  gate: { id: 'gate', title: '分水閘', text: '圳道分岔的地方，用閘板決定每一邊流多少水。' },
};

// 認識地形：要找到的五個地點（地圖上哪些格子算找到）
export interface Place { id: string; card: string; cells: Cell[] }
const cellsOf = (ch: string) =>
  MAP.flatMap((line, row) => [...line].flatMap((c, col) => (c === ch ? [{ col, row }] : [])));
export const PLACES: Place[] = [
  { id: 'river', card: 'river', cells: cellsOf('r') },
  { id: 'plain', card: 'plain', cells: cellsOf('d') },
  { id: 'zhang', card: 'zhang', cells: [ZHANG, { col: 3, row: 9 }, { col: 3, row: 10 }, { col: 4, row: 9 }] },
  { id: 'quan', card: 'quan', cells: [QUAN, { col: 9, row: 7 }, { col: 10, row: 7 }, { col: 10, row: 8 }] },
  { id: 'tribe', card: 'tribe', cells: cellsOf('p') },
];

// 對話
export type Who = 'tick' | 'shi' | 'lin' | 'babuza' | 'zhang' | 'quan';
export interface Line { who: Who; text: string; mood?: 'wave' | 'happy' | 'thinking' | 'worried' }
export const PEOPLE: Record<Who, { name: string; img?: string; badge?: string; color: string }> = {
  tick: { name: '滴答', color: '#ffc23d' },
  shi: { name: '施世榜', img: 'island/shi.webp', color: '#8a5429' },
  lin: { name: '林先生', img: 'island/lin.webp', color: '#4aa834' },
  babuza: { name: '巴布薩族社眾', img: 'island/babuza.webp', color: '#b9894f' },
  zhang: { name: '漳州莊莊民', img: 'people/P-08_1.webp', color: '#3b6fd1' },
  quan: { name: '泉州莊莊民', img: 'people/P-02_6.webp', color: '#f07f1d' },
};

export const OPENING: Line[] = [
  { who: 'tick', mood: 'wave', text: '見習生，歡迎來到 1709 年的彰化平原！我的第五顆時之齒輪，就掉在這附近。' },
  { who: 'tick', mood: 'worried', text: '可是你看，田都乾得裂開了……大家好像遇到麻煩了。' },
  { who: 'shi', text: '我是施世榜。這片平原的土很肥，可是一到旱季就沒有水，稻子種不起來。我想從濁水溪開一條圳，把水引到平原上。' },
  { who: 'babuza', text: '我們巴布薩族很早就住在這片平原上。開圳會經過我們生活的地方，請先跟我們好好商量。' },
  { who: 'zhang', text: '我們漳州莊有 6 塊田，最需要水了！' },
  { who: 'quan', text: '我們泉州莊雖然只有 4 塊田，也一樣需要水啊！' },
  { who: 'tick', mood: 'thinking', text: '水只有一條溪，大家都需要。見習生，我們一起幫忙吧！' },
];
export const MISSIONS = ['把濁水溪的水引進圳道', '讓兩個莊的田都豐收', '弄懂為什麼要這樣做'];

export const EXPLORE_INTRO: Line[] = [
  { who: 'tick', mood: 'thinking', text: '雲霧把地圖蓋住了。點一下雲霧就能撥開，找出五個地方：濁水溪、平原、漳州莊、泉州莊、巴布薩族的社。' },
];
export const HIGHEST_ASK: Line[] = [
  { who: 'tick', mood: 'happy', text: '五個地方都找到了！現在打開右邊的「地形眼鏡」，看看哪裡最高。' },
  { who: 'tick', mood: 'thinking', text: '找到以後，在地圖上點一下最高的地方。' },
];

export const CRAFT_INTRO: Line[] = [
  { who: 'lin', text: '我是林先生。要把濁水溪的大水引進圳道，不能硬擋，要用竹蛇籠把水「導」過去。' },
  { who: 'lin', text: '去竹林砍竹子、到溪邊撿石頭。一個竹蛇籠要 1 根竹子、2 顆石頭，總共要做 6 個。大石堆有 4 顆，小石堆只有 2 顆。' },
  { who: 'lin', text: '石頭不多，要省著用喔！' },
];

export const PUZZLE_INTRO: Line[] = [
  { who: 'lin', text: '竹蛇籠上有一個金色箭頭：箭頭指哪裡，水就往哪裡轉。' },
  { who: 'lin', text: '把竹蛇籠拖進河裡，按「旋轉」讓箭頭對準圳頭。放下前會先看到白點畫的預計水路，再按「放水」。' },
];

export const SHARE_INTRO: Line[] = [
  { who: 'lin', text: '水引進來了！圳道在分水閘分成兩條，一條去漳州莊、一條去泉州莊。' },
  { who: 'lin', text: '拉閘板決定兩邊開多大。水太少田會乾，太多會淹。讓 10 塊田都綠起來，還要撐過季節變化。' },
];
export const SHARE_HINT = '漳州莊 6 塊田、泉州莊 4 塊田。田多的那邊要多分一點水，不一定是兩邊一樣多。';

// 真的是這樣嗎？
export const TRUTH = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，你一下子就把圳道挖好了。',
  real: '真實的八堡圳，是施世榜從 1709 年開始，找了很多人一起挖，前後大約花了十年才完成。',
};

// 反思題（佔位稿，P6-5 照課本重寫並附出處）
export interface Question { q: string; options: string[]; answer: number; why: string }
export const QUESTIONS: Question[] = [
  {
    q: '圳道為什麼要沿著等高線，慢慢往低的地方挖？',
    options: ['因為水只會往一樣高或更低的地方流', '因為這樣挖比較快', '因為等高線上的土比較軟'],
    answer: 0,
    why: '水往低處流。往高的地方挖，水流到一半就停住了。',
  },
  {
    q: '為什麼用竹蛇籠「導」水，比正面「擋」水好？',
    options: ['竹子比石頭還硬', '斜斜地把水導走，大水比較不會把籠子整個沖壞', '擋水可以讓水流得比較快'],
    answer: 1,
    why: '正面硬擋，大水的力量全部打在籠子上；順著水把它導到旁邊就省力多了。',
  },
  {
    q: '漳州莊 6 塊田、泉州莊 4 塊田，怎麼分水比較公平？',
    options: ['兩邊分一樣多', '先挖到圳道的先用', '照田的多少分，田多的多分一點'],
    answer: 2,
    why: '「平均」是一樣多，「公平」是照需要分。兩邊一樣多，田多的那邊反而不夠。',
  },
];

// Chuck 的圖（public/img/island/）
export const img = (name: string) => `${import.meta.env.BASE_URL}img/island/${name}.webp`;
export const PUZZLE_ART = {
  props: { bamboo: img('o4-bamboo'), stone: img('o4-stones'), village: img('o3-zhang'), tribe: img('o3-tribe'), gate: img('gate') },
  cage: img('cage'),
};

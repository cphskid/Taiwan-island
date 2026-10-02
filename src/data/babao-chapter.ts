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

// 圖鑑卡（P6-5）：這一章 12 張，分人物、地點、物品、知識四類。
// 文字照國小社會五年級下學期（康軒版）清帝國時期水利開發的內容寫，每張附公開可查的出處；上正式站前請社會科老師審。
// 巴布薩族的文字與圖要另外找人審（見規劃書）。
export type CardKind = '人物' | '地點' | '物品' | '知識';
export interface Card { id: string; title: string; kind: CardKind; text: string; img?: string; source: string }
const SRC = {
  textbook: '國小社會五年級下學期（康軒版）〈清帝國時期臺灣的發展與改變〉水利開發',
  encyclo: '文化部《臺灣大百科全書》「八堡圳」條',
  water: '農業部農田水利署彰化管理處〈八堡圳〉簡介',
  river: '經濟部水利署第四河川分署〈濁水溪〉流域介紹',
  pingpu: '原住民族委員會〈平埔族群〉介紹；國立臺灣史前文化博物館',
  map: '國小社會四年級〈地形圖〉分層設色；等高線是遊戲裡的延伸',
};
export const CARDS: Record<string, Card> = {
  shi: { id: 'shi', title: '施世榜', kind: '人物', img: 'island/shi.webp', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '清朝時住在鳳山的人，1709 年開始出錢、找人在濁水溪邊開圳。這條圳一開始叫「施厝圳」，後來才叫八堡圳。' },
  lin: { id: 'lin', title: '林先生', kind: '人物', img: 'island/lin.webp', source: `${SRC.encyclo}；${SRC.water}`,
    text: '傳說施世榜開圳一直不成功，一位不肯留下全名的「林先生」教大家用竹籠裝石頭導水，圳才開成。後人建廟紀念他。' },
  river: { id: 'river', title: '濁水溪', kind: '地點', source: SRC.river,
    text: '台灣最長的河，從中央山脈流到台灣海峽。水裡帶著很多泥沙，看起來濁濁的；雨季水很大，旱季水就變少。' },
  plain: { id: 'plain', title: '彰化平原', kind: '地點', source: SRC.textbook,
    text: '濁水溪的泥沙一層一層堆出來的平原，土很肥。可是雨水集中在夏天，沒有圳道引水，旱季就種不了稻子。' },
  head: { id: 'head', title: '二水的圳頭', kind: '地點', source: `${SRC.water}；${SRC.encyclo}`,
    text: '八堡圳從濁水溪上游的二水引水。二水比下游的平原高，水才能沿著圳道一路往低處流進田裡。' },
  zhang: { id: 'zhang', title: '漳州莊', kind: '地點', source: SRC.textbook,
    text: '從福建漳州渡過台灣海峽來開墾的移民，聚在一起住的村莊。' },
  quan: { id: 'quan', title: '泉州莊', kind: '地點', source: SRC.textbook,
    text: '從福建泉州渡海來開墾的移民住的村莊。同一條圳的水，要和別的莊一起分著用。' },
  tribe: { id: 'tribe', title: '巴布薩族的社', kind: '地點', img: 'island/babuza.webp', source: SRC.pingpu,
    text: '巴布薩族是平埔族群的一支。漢人移民來開墾以前，他們就住在彰化平原上，在這裡打獵、耕作。' },
  contour: { id: 'contour', title: '等高線', kind: '知識', source: SRC.map,
    text: '地圖上把一樣高的地方連成一條線。線越密，坡越陡；顏色從綠、黃到褐，表示越來越高。' },
  cage: { id: 'cage', title: '竹蛇籠', kind: '物品', img: 'island/cage.webp', source: `${SRC.encyclo}；${SRC.water}`,
    text: '用竹子編成長籠子，裡面裝滿石頭，一個接一個排在河裡，把水「導」進圳頭。竹籠會透水，大水來了也不容易整個被沖走。' },
  gate: { id: 'gate', title: '分水閘', kind: '物品', img: 'island/gate.webp', source: SRC.textbook,
    text: '圳道分岔的地方，用閘板決定每一邊流多少水。大家要先講好怎麼分，才不會為了水吵架。' },
  babao: { id: 'babao', title: '八堡圳', kind: '物品', img: 'island/badge-canal.webp', source: `${SRC.encyclo}；${SRC.water}`,
    text: '1709 年開工、大約十年完成。水流到當時彰化十三堡半裡的八個堡，所以叫八堡圳。三百多年後的今天，它還在灌溉彰化的田。' },
};
export const CARD_ORDER = ['shi', 'lin', 'river', 'plain', 'head', 'zhang', 'quan', 'tribe', 'contour', 'cage', 'gate', 'babao'];

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
// 阿蓮（漳州莊女孩）、阿穆（巴布薩族少年）是這一章的夥伴：一人知道一半線索、有心願也有怕的事，
// 分水時會跟你意見不同，最後送你信物。兩人都是虛構角色；阿穆的名字、穿著和說法上正式站前要找人審。
// 夥伴的圖：F-01B、F-02B 表情表（public/img/story/），moods 是每個表情用哪一格。
export type Who = 'tick' | 'shi' | 'lin' | 'babuza' | 'zhang' | 'quan' | 'lian' | 'mu' | 'traveler'
  | 'yan' | 'potter' | 'jade' | 'smith' | 'arch' // 第一章（data/ch1.ts）
  | 'ani' | 'elder' | 'hunter' | 'trader' // 第二章（data/ch2.ts）
  | 'hsiung' | 'hatta' | 'kumiai' | 'shao'; // 第七章（data/ch7.ts）
export type Mood = 'wave' | 'happy' | 'thinking' | 'worried' | 'scared' | 'sad' | 'determined' | 'frown' | 'angry' | 'thumbs' | 'listen' | 'laugh' | 'surprised' | 'shout' | 'me';
export const TICK_MOODS: readonly Mood[] = ['wave', 'happy', 'thinking', 'worried'];
export interface Line { who: Who; text: string; mood?: Mood }
export const PEOPLE: Record<Who, { name: string; img?: string; moods?: Partial<Record<Mood, string>>; badge?: string; color: string }> = {
  tick: { name: '滴答', color: '#ffc23d' },
  shi: { name: '施世榜', img: 'island/shi.webp', color: '#8a5429' },
  lin: { name: '林先生', img: 'island/lin.webp', color: '#4aa834' },
  babuza: { name: '巴布薩族社眾', img: 'island/babuza.webp', color: '#b9894f' },
  zhang: { name: '漳州莊莊民', img: 'people/P-08_1.webp', color: '#3b6fd1' },
  quan: { name: '泉州莊莊民', img: 'people/P-02_6.webp', color: '#f07f1d' },
  lian: { name: '阿蓮', img: 'story/F-01B_1.webp', color: '#d9467a', moods: {
    happy: 'story/F-01B_1.webp', worried: 'story/F-01B_2.webp', scared: 'story/F-01B_3.webp', sad: 'story/F-01B_4.webp',
    determined: 'story/F-01B_5.webp', frown: 'story/F-01B_6.webp', angry: 'story/F-01B_7.webp', thumbs: 'story/F-01B_8.webp' } },
  mu: { name: '阿穆', img: 'story/F-02B_1.webp', color: '#9a5a2a', moods: {
    happy: 'story/F-02B_1.webp', listen: 'story/F-02B_2.webp', frown: 'story/F-02B_3.webp', laugh: 'story/F-02B_4.webp',
    surprised: 'story/F-02B_6.webp', shout: 'story/F-02B_7.webp', me: 'story/F-02B_8.webp' } },
  traveler: { name: '？？？', img: 'story/F-03_1.webp', color: '#4a4f63' }, // 戴斗笠的神秘旅人，臉一直看不到
  // 第一章：阿岩（虛構的長濱文化男孩，F-04B 表情）與各時代的人（P-15）
  yan: { name: '阿岩', img: 'ch1/f-04b-happy.webp', color: '#b5652b', moods: {
    happy: 'ch1/f-04b-happy.webp', worried: 'ch1/f-04b-worried.webp', scared: 'ch1/f-04b-scared.webp', sad: 'ch1/f-04b-sad.webp',
    determined: 'ch1/f-04b-determined.webp', frown: 'ch1/f-04b-frown.webp', angry: 'ch1/f-04b-angry.webp', thumbs: 'ch1/f-04b-thumbs.webp' } },
  potter: { name: '做陶的婆婆', img: 'ch1/p-15-potter.webp', color: '#a0522d' },
  jade: { name: '磨玉的工匠', img: 'ch1/p-15-jade.webp', color: '#2e8b57' },
  smith: { name: '煉鐵的師傅', img: 'ch1/p-15-smith.webp', color: '#3d5a80' },
  arch: { name: '考古學家', img: 'ch1/p-15-arch.webp', color: '#6b8e23' },
  // 第二章：阿妮（虛構的山上部落女孩，名字與穿著待審，F-05B 表情）與部落的人（P-16）
  ani: { name: '阿妮', img: 'ch2/f-05b-happy.webp', color: '#a8452f', moods: {
    happy: 'ch2/f-05b-happy.webp', worried: 'ch2/f-05b-worried.webp', scared: 'ch2/f-05b-scared.webp', sad: 'ch2/f-05b-sad.webp',
    determined: 'ch2/f-05b-determined.webp', frown: 'ch2/f-05b-frown.webp', angry: 'ch2/f-05b-angry.webp', thumbs: 'ch2/f-05b-thumbs.webp' } },
  elder: { name: '部落長老', img: 'ch2/p-16-elder.webp', color: '#7a5230' },
  hunter: { name: '獵人叔叔', img: 'ch2/p-16-hunter.webp', color: '#55703a' },
  trader: { name: '外地來的商人', img: 'ch2/p-16-trader.webp', color: '#34508a' },
  // 第七章：阿雄（虛構的嘉南平原農家男孩，F-09B 表情）、八田與一（真實人物）、水利組合的陳先生（虛構）、邵族長者（虛構，待審）（P-20）
  hsiung: { name: '阿雄', img: 'ch7/f-09b-happy.webp', color: '#2f6fa8', moods: {
    happy: 'ch7/f-09b-happy.webp', worried: 'ch7/f-09b-worried.webp', scared: 'ch7/f-09b-scared.webp', sad: 'ch7/f-09b-sad.webp',
    determined: 'ch7/f-09b-determined.webp', frown: 'ch7/f-09b-frown.webp', angry: 'ch7/f-09b-angry.webp', thumbs: 'ch7/f-09b-thumbs.webp' } },
  hatta: { name: '八田與一', img: 'ch7/p-20-hatta.webp', color: '#8a6d3b' },
  kumiai: { name: '水利組合的陳先生', img: 'ch7/p-20-chen.webp', color: '#3d6b4a' },
  shao: { name: '邵族的長者', img: 'ch7/p-20-elder.webp', color: '#3a4f8a' },
};

// 時間卡住：齒輪掉在哪個時代，那裡就一直重複同一天
export const LOOP_DAY = 37;
export const OPENING: Line[] = [
  { who: 'tick', mood: 'worried', text: `公雞又叫了……見習生，這已經是第 ${LOOP_DAY} 次同一個早上。` },
  { who: 'tick', mood: 'thinking', text: '我的第五顆齒輪掉在 1709 年的彰化平原。齒輪不回來，這裡的時間就卡在大家最頭痛的這一天。' },
  { who: 'shi', text: '我是施世榜。我想從濁水溪開一條圳，讓平原旱季也有水。可是圳頭一做好，就被大水沖垮。' },
  { who: 'lian', mood: 'sad', text: '我叫阿蓮，住在漳州莊。阿嬤說，好想在冬天前吃一碗新米煮的飯……可是田都裂開了。' },
  { who: 'mu', mood: 'me', text: '我是阿穆，巴布薩族的。這條溪什麼時候漲、什麼時候退，我閉著眼睛都知道。' },
  { who: 'mu', mood: 'frown', text: '你們要開圳，要先問過我們。溪是大家的，不能把水全部拿走。' },
  { who: 'lian', mood: 'worried', text: '我知道田要多少水，阿穆知道溪。可是……我很怕大水。' },
  { who: 'tick', mood: 'happy', text: '一個懂田、一個懂溪，再加上你。我們三個一起，讓時間往前走吧！' },
];
// 開場最後的「時光朋友」卡：一人一句心願、一句怕的事
export const FRIENDS: { who: Who; body: string; from: string; wish: string; fear: string }[] = [
  { who: 'lian', body: 'story/F-01A_1.webp', from: '漳州莊', wish: '讓阿嬤吃到新米', fear: '怕大水' },
  { who: 'mu', body: 'story/F-02A_1.webp', from: '巴布薩族', wish: '溪裡一直有魚', fear: '怕溪被搶光' },
];
export const GOAL = '讓旱季也有水，時間才會往前走';

export const EXPLORE_INTRO: Line[] = [
  { who: 'lian', mood: 'worried', text: '雲霧好濃，連我都認不得路了。點一點雲霧，找出溪、平原、兩個莊和阿穆的社。' },
];
export const HIGHEST_ASK: Line[] = [
  { who: 'mu', mood: 'listen', text: '我阿公說：水都是從最高的地方來的。' },
  { who: 'tick', mood: 'thinking', text: '戴上地形眼鏡看看，點一下最高的地方！' },
];

export const CRAFT_INTRO: Line[] = [
  { who: 'lin', text: '我姓林。大水不能硬擋，要用竹蛇籠把水「導」過去。一個籠子要 1 根竹子、2 顆石頭，做 6 個。' },
  { who: 'mu', mood: 'shout', text: '石頭在溪邊。溪水退了才撿得到；漲起來的時候，千萬別靠近！' },
  { who: 'lian', mood: 'scared', text: '我、我在岸上幫你看水……' },
];

export const PUZZLE_INTRO: Line[] = [
  { who: 'lian', mood: 'happy', text: '你看，籠子上有金色箭頭。箭頭指哪裡，水會不會就往哪裡轉？' },
];
// 導水每一關失敗後，誰來說那一關的提示
export const LEVEL_HELPER: Who[] = ['lian', 'mu', 'mu'];

export const SHARE_INTRO: Line[] = [
  { who: 'lian', mood: 'determined', text: '水來了！先給漳州莊吧，我們田最多，阿嬤在等新米！' },
  { who: 'mu', mood: 'frown', text: '慢著。全部開進圳道，溪就乾了。我們社裡的人要在溪邊捕魚、取水。' },
  { who: 'quan', text: '泉州莊也有 4 塊田啊！' },
  { who: 'tick', mood: 'thinking', text: '田要顧，溪也要顧。拉閘板試試看。' },
];
export const SHARE_HINT: Line = { who: 'mu', mood: 'listen', text: '田多的那邊多分一點，不一定兩邊一樣多。可是溪裡一定要留水。' };
export const SHARE_RIVER: Line = { who: 'mu', mood: 'shout', text: '溪快乾了！魚都擠在小水窪裡，關小一點！' };

// 洪水大謎題
export const FLOOD_INTRO: Line[] = [
  { who: 'tick', mood: 'worried', text: '颱風來了！溪水一下子漲好高！' },
  { who: 'mu', mood: 'surprised', text: '這種水我看過。整條溪都灌進圳道的話，圳會撐破的。' },
  { who: 'lian', mood: 'scared', text: '水、水好大……我不敢看。' },
];
// 神秘旅人留在竹蛇籠上的紙條（伏筆：七張拼起來是一張地圖；旅人其實是長大的你）
export const NOTE = { traveler: 'story/F-03_5.webp', map: 'story/G-02_10.webp', text: '大水不要全部搶，留一條給溪。', sign: '戴斗笠的旅人' };
export const NOTE_AFTER: Line[] = [
  { who: 'tick', mood: 'thinking', text: '這是誰留的？這個字……我好像在哪裡看過。' },
  { who: 'lian', mood: 'happy', text: '紙的背面畫了一小塊地圖耶。' },
];
export const FLOOD_PASS: Line[] = [
  { who: 'mu', mood: 'laugh', text: '圳沒有破，溪裡也還有水。你剛剛留的那一條，救了我們的魚。' },
  { who: 'lian', mood: 'determined', text: '我……剛剛一直睜著眼睛，沒有躲起來！' },
];

// 豐收：齒輪回來、時間往前走；夥伴道別看你怎麼玩
export const HARVEST: Line[] = [
  { who: 'tick', mood: 'happy', text: '公雞叫了，可是今天是新的一天！時間往前走了！' },
  { who: 'lian', mood: 'thumbs', text: '稻子黃了！阿嬤吃到新米了，她說是她吃過最香的一碗。' },
];
export const FAREWELL = {
  careful: { who: 'mu', mood: 'laugh', text: '你一個竹蛇籠都沒弄壞，比我阿公還會看水。' } as Line,
  bumpy: { who: 'mu', mood: 'happy', text: '籠子壞了幾個也沒關係，你每次都有再試一次。' } as Line,
  keep: { who: 'lian', mood: 'happy', text: '這片竹片是從第一個竹蛇籠上拆下來的，給你。以後看到它，要記得我喔。' } as Line,
};
export const KEEPSAKE = { id: 'bamboo-strip', img: 'story/G-02_7.webp', title: '綁紅線的竹片', text: '阿蓮從第一個竹蛇籠上拆下來送你的竹片。很久很久以後，好像會有人認得它……' };

// 真的是這樣嗎？
export const TRUTH = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，你和阿蓮、阿穆一下子就把圳道挖好了，大家也很快就談好怎麼分水。阿蓮和阿穆是遊戲裡的角色，歷史上沒有記錄這兩個人。',
  real: '真實的八堡圳，是施世榜從 1709 年開始，找了很多人一起挖，前後大約花了十年才完成。開圳的地方本來就有巴布薩族人在生活，水要怎麼分，也常常要一次又一次地商量。',
  source: `${SRC.encyclo}；${SRC.textbook}`,
};

// 反思題（P6-5）：每題對到一張圖鑑卡，答完可以回圖鑑看
export interface Question { who: Who; q: string; options: string[]; answer: number; why: string; card: string }
export const QUESTIONS: Question[] = [
  {
    who: 'mu',
    q: '圳道為什麼要沿著等高線，慢慢往低的地方挖？',
    options: ['因為水只會往一樣高或更低的地方流', '因為這樣挖比較快', '因為等高線上的土比較軟'],
    answer: 0,
    why: '水往低處流。往高的地方挖，水流到一半就停住了。所以圳頭要開在比較高的二水。',
    card: 'head',
  },
  {
    who: 'lian',
    q: '為什麼用竹蛇籠「導」水，比正面「擋」水好？',
    options: ['竹子比石頭還硬', '斜斜地把水導走，大水比較不會把籠子整個沖壞', '擋水可以讓水流得比較快'],
    answer: 1,
    why: '正面硬擋，大水的力量全部打在籠子上；順著水把它導到旁邊就省力多了。竹籠會透水，也比較不會被整個沖走。',
    card: 'cage',
  },
  {
    who: 'lian',
    q: '漳州莊 6 塊田、泉州莊 4 塊田，怎麼分水比較公平？',
    options: ['兩邊分一樣多', '先挖到圳道的先用', '照田的多少分，田多的多分一點'],
    answer: 2,
    why: '「平均」是一樣多，「公平」是照需要分。兩邊一樣多，田多的那邊反而不夠。',
    card: 'gate',
  },
];

// Chuck 的圖（public/img/island/）
export const img = (name: string) => `${import.meta.env.BASE_URL}img/island/${name}.webp`;
export const PUZZLE_ART = {
  props: { bamboo: img('o4-bamboo'), stone: img('o4-stones'), rock: img('o4-stones'), village: img('o3-zhang'), tribe: img('o3-tribe'), gate: img('gate') },
  cage: img('cage'),
  tiles: { grass: img('t1-grass'), canal: img('t1-grass'), gate: img('t1-grass'), stone: img('t1-grass'), bamboo: img('t1-grass'), village: img('t1-grass'), tribe: img('t1-grass'), field: img('t1-paddy'), dry: img('t1-cracked'), river: img('t1-mud'), rock: img('t1-stony') },
  water: img('t2-water'),
  dirt: img('t2-dirt'),
};

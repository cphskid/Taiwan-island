// 終章《今天的島嶼》（戰後到今天，大約 1945 年～現在，全臺灣）的整章資料：十大建設、高鐵、社區一起做決定、
// 時光博物館、神秘旅人的真面目，以及對話、圖鑑卡、反思題。
//
// 小安、社區的阿公、高鐵工程師、社區會議主持人都是虛構角色；時光鐘塔、神秘旅人是遊戲裡的想像。
// 民主的部分只寫課本「民主社會的公民參與」層次：投票、討論、尊重少數，不提任何政黨或真實政治人物。
// 文字是初稿，上正式站前請社會科老師審（尤其十大建設各項的地點與用途、高鐵的數字）。

import type { Cell, RailLevel, Use } from '../core/today';
import type { Card, Line, Mood } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const artE = (name: string) => `${BASE}img/end/${name}.webp`;
export const islE = (name: string) => `${BASE}img/island/${name}.webp`;

export const STEPS_END = ['開場', '十大建設', '高鐵連起全島', '一起做決定', '時光博物館', '旅人的真面目', '結算'] as const;

// ── 時代轉場（終章只在今天附近跳）──
export const JUMPS_END: Record<number, { stop: number; far: string; title: string; sub: string; react: Line }> = {
  1: { stop: 1, far: '往回跳了五十多年', title: '1970 年代', sub: '十大建設・全臺灣', react: { who: 'an', mood: 'happy', text: '路上的車好少！咦，那邊在挖好長好長的路？' } },
  2: { stop: 2, far: '往前跳到 2007 年', title: '2007 年', sub: '高鐵通車・臺灣西部', react: { who: 'an', mood: 'thumbs', text: '我知道這個！橘色線條的高鐵！' } },
  3: { stop: 3, far: '一路跳回今天', title: '今天', sub: '你住的社區', react: { who: 'tick', mood: 'happy', text: '回到今天了。接下來的難題，就在小安家旁邊。' } },
};
export const JUMP_STOPS = ['戰後', '1970 年代', '2007 年', '今天'];

// ── 選擇：四個，選哪一個都可以，小安會記得，結局跟著變 ──
export type PickE = 'ride' | 'speak' | 'park' | 'word';
export type PicksE = Partial<Record<PickE, number>>;
export interface ChoiceE { who: Line['who']; mood?: Mood; q: string; options: [string, string]; after: [Line[], Line[]]; recap: [string, string] }
export const CHOICES_END: Record<PickE, ChoiceE> = {
  ride: {
    who: 'engineer', q: '高鐵通車那天，你想邀請誰一起坐第一班車？',
    options: ['社區的阿公：他記得以前坐一整天火車的日子', '小安和全班同學：一起去南部校外教學'],
    after: [
      [{ who: 'agong', text: '我坐過燒煤的火車、看過高速公路通車，現在還能坐高鐵！' }, { who: 'agong', text: '睡一覺就到高雄了，跟以前比，像在作夢一樣。' }],
      [{ who: 'an', mood: 'thumbs', text: '全班一起去！早上在台北，中午就在高雄吃午餐了！' }, { who: 'engineer', text: '南北來回一天就可以。這就是大家說的「一日生活圈」。' }],
    ],
    recap: ['高鐵：邀阿公坐第一班車', '高鐵：邀全班同學去校外教學'],
  },
  speak: {
    who: 'an', mood: 'scared', q: '輪到小朋友發言了。小安的手一直在抖……你會怎麼做？',
    options: ['陪小安一起站上台，你幫她拿麥克風', '把想說的話寫在小卡上，讓小安自己念'],
    after: [
      [{ who: 'an', mood: 'worried', text: '你、你站在我旁邊喔……' }, { who: 'an', mood: 'determined', text: '大家好，我是小安。我們小朋友希望，公園可以蓋在學校旁邊。' }],
      [{ who: 'an', mood: 'worried', text: '寫好了……我照著念就好，對吧？' }, { who: 'an', mood: 'determined', text: '大家好，我是小安。我們小朋友希望，公園可以蓋在學校旁邊。……我念完了！' }],
    ],
    recap: ['發言：陪小安一起上台', '發言：寫小卡，讓小安自己念'],
  },
  park: {
    who: 'chair', q: '方案通過了！新公園裡，第一樣要放什麼？',
    options: ['大家一起種一棵會慢慢長大的樹', '一面畫滿社區故事的牆'],
    after: [
      [{ who: 'agong', text: '種樹好。我種下去，小安看它長大，以後小安的孩子在樹下乘涼。' }],
      [{ who: 'an', mood: 'happy', text: '我要把阿公說的高速公路、高鐵，還有我們開會的樣子都畫上去！' }],
    ],
    recap: ['公園：一起種一棵樹', '公園：畫一面社區故事牆'],
  },
  word: {
    who: 'traveler', q: '旅人問你：「走了這麼多個時代，你有什麼話想對我說？」',
    options: ['謝謝你，一路留紙條給我', '我長大以後，也會好好跟別人一起做決定'],
    after: [
      [{ who: 'traveler', text: '不用謝。那些紙條上的話，其實是你一路教會我的。' }],
      [{ who: 'traveler', text: '嗯。我知道你會的——因為我記得。' }],
    ],
    recap: ['旅人：謝謝他一路留紙條', '旅人：答應長大也好好一起做決定'],
  },
};

// ── 開場：今天的時光鐘塔不轉 ──
export const OPENING_END: Line[] = [
  { who: 'tick', mood: 'happy', text: '見習生，我們回到今天了！這裡是我們出發的地方——時光鐘塔。' },
  { who: 'tick', mood: 'worried', text: '齒輪一顆一顆回到鐘裡了……可是你看，鐘塔還是不轉。指針一直停在下午三點。' },
  { who: 'an', mood: 'happy', text: '你回來啦！老師說你請假好幾天。我是小安，坐你隔壁啊，忘了嗎？' },
  { who: 'an', mood: 'worried', text: '社區那塊空地要決定蓋什麼，大人吵了好久，有人要公園、有人要停車場、有人要市場。' },
  { who: 'an', mood: 'scared', text: '明天開會，還要選一個小朋友上台說我們的意見……大家都看著我。我最怕上台說話了。' },
  { who: 'an', mood: 'determined', text: '可是……我好想長大以後，也能留下一個讓大家記得的東西。' },
  { who: 'tick', mood: 'thinking', text: '原來如此。今天的難題，是大家的意見不一樣。鐘塔要轉，得先學會「一起做決定」。' },
];
export const NOTE_END = { text: '今天的難題，不用一個人解決。', sign: '戴斗笠的旅人' };
export const NOTE_END_AFTER: Line[] = [
  { who: 'tick', mood: 'thinking', text: '鐘塔門上又夾了一張紙條！前面每個時代都有一張，都是同一個字跡。' },
  { who: 'an', mood: 'worried', text: '戴斗笠的旅人？……好像有人一直在前面等我們。' },
  { who: 'tick', mood: 'happy', text: '先別急。我們先回去看看：今天的臺灣，是怎麼一步一步變成這樣的。' },
];
export const AN_CARD = { body: artE('f-10a-idle'), from: '今天的國小五年級', wish: '長大也能留下讓大家記得的東西', fear: '怕上台說話' };
export const GOAL_END = '讓大家一起做出決定，時光鐘塔才會轉起來';

// ── 1 十大建設 ──
export type TenId = 'highway' | 'electric' | 'northlink' | 'airport' | 'taichung' | 'suao' | 'steel' | 'ship' | 'petro' | 'nuclear';
export type Kind = 'traffic' | 'industry' | 'energy';
export type Pin = 'north' | 'taoyuan' | 'west' | 'taichung' | 'suao' | 'east' | 'kaohsiung';
export interface Ten { id: TenId; name: string; img: string; kind: Kind; pin: Pin; clue: string }
export const TENS: Ten[] = [
  { id: 'highway', name: '中山高速公路', img: artE('g-09-highway'), kind: 'traffic', pin: 'west', clue: '臺灣第一條高速公路，從北部的基隆一路開到南部的高雄。' },
  { id: 'electric', name: '鐵路電氣化', img: artE('g-09-electric'), kind: 'traffic', pin: 'west', clue: '西部的火車不再燒煤冒黑煙，改用電來跑，又快又乾淨。' },
  { id: 'northlink', name: '北迴鐵路', img: artE('g-09-northlink'), kind: 'traffic', pin: 'east', clue: '沿著東北部的海岸，穿過好多山洞，把宜蘭蘇澳和花蓮接起來。' },
  { id: 'airport', name: '桃園國際機場', img: artE('g-09-airport'), kind: 'traffic', pin: 'taoyuan', clue: '台北市區的機場太小了，在台北西邊的桃園蓋一座大機場。（當時叫中正國際機場）' },
  { id: 'taichung', name: '台中港', img: artE('g-09-taichung'), kind: 'traffic', pin: 'taichung', clue: '在臺灣中部的海邊開一個新港口，中部的貨不用再繞去北部、南部。' },
  { id: 'suao', name: '蘇澳港', img: artE('g-09-suao'), kind: 'traffic', pin: 'suao', clue: '在東北部宜蘭的海邊擴建港口，幫忙分擔基隆港的船。' },
  { id: 'steel', name: '中國鋼鐵（中鋼）', img: artE('g-09-steel'), kind: 'industry', pin: 'kaohsiung', clue: '蓋房子、造船都要鋼鐵。在南部最大的港口旁邊蓋煉鋼廠。' },
  { id: 'ship', name: '中國造船（中船）', img: artE('g-09-ship'), kind: 'industry', pin: 'kaohsiung', clue: '自己造大船。造船要鋼鐵，所以蓋在煉鋼廠附近的大港口。' },
  { id: 'petro', name: '石油化學工業', img: artE('g-09-petro'), kind: 'industry', pin: 'kaohsiung', clue: '把石油做成塑膠、衣料的原料。工廠多半集中在南部的大港口附近。' },
  { id: 'nuclear', name: '核能發電廠', img: artE('g-09-nuclear'), kind: 'energy', pin: 'north', clue: '工廠越來越多，電不夠用。在北部的海邊蓋發電廠。（第一座在新北石門）' },
];
export const KINDS: { id: Kind; name: string; icon: string }[] = [
  { id: 'traffic', name: '交通建設', icon: '🚆' },
  { id: 'industry', name: '重工業', icon: '🏭' },
  { id: 'energy', name: '能源', icon: '⚡' },
];
// 地圖上的釘子：M-01 大地圖（2680×3704）上的比例位置
export const PINS: { id: Pin; name: string; x: number; y: number }[] = [
  { id: 'north', name: '北部海邊', x: 0.77, y: 0.045 },
  { id: 'taoyuan', name: '桃園', x: 0.655, y: 0.115 },
  { id: 'suao', name: '宜蘭蘇澳', x: 0.915, y: 0.23 },
  { id: 'east', name: '蘇澳到花蓮', x: 0.9, y: 0.32 },
  { id: 'taichung', name: '台中', x: 0.42, y: 0.345 },
  { id: 'west', name: '西部（基隆到高雄）', x: 0.4, y: 0.52 },
  { id: 'kaohsiung', name: '高雄', x: 0.4, y: 0.785 },
];
export const TEN_INTRO: Line[] = [
  { who: 'agong', text: '小朋友，我是住在社區的阿公。戰爭結束的時候（1945 年），我才跟你們差不多大。' },
  { who: 'agong', text: '那時候很多東西都要重新來過。從台北到高雄，要坐好久好久的火車。' },
  { who: 'agong', text: '到了 1970 年代，政府推動「十大建設」：蓋高速公路、港口、機場，還有煉鋼、造船的大工廠。' },
  { who: 'tick', mood: 'thinking', text: '我們先把十項建設分成三類，再把它們放到地圖上對的地方！' },
];
export const TEN_SAY = {
  kindWrong: { who: 'agong', text: '紅色的分錯了。想想看：它是讓人和貨「走得動」，還是「做出東西」，還是「發出電」？' } as Line,
  kindHint: { who: 'agong', text: '十項裡面有六項是交通，三項是重工業，只有一項是能源。' } as Line,
  pinWrong: { who: 'agong', text: '紅色的放錯地方了。再讀一次卡片上的線索，找找地名。' } as Line,
  pinHint: { who: 'agong', text: '高雄那裡有三項大工廠；西部那條長長的路線上有兩項。' } as Line,
  good: { who: 'agong', text: '全部放對了！有了這些建設，人和貨跑得快，工廠也開得起來，大家的生活慢慢變好。' } as Line,
};
export const TEN_DONE: Line[] = [
  { who: 'agong', text: '我還記得高速公路通車那天，大家跑去看，車子一路開，好快好快。' },
  { who: 'an', mood: 'thinking', text: '原來我們今天走的路，是以前的人一點一點蓋出來的。' },
];

// ── 2 高鐵：臺灣西部的格子地圖（上北下南，左邊是海）──
//   .  平地  M  山  W  保護區濕地  c  城市  C  台中（一定要停）  T  台北  K  高雄
export const RAIL: RailLevel = {
  step: 4, turn: 2, stop: 2, limit: 90, maxGap: 5, minGap: 3,
  rows: [
    '..T..MM',
    '..c..MM',
    'W....MM',
    '.c..MMM',
    '..W.MMM',
    '.c..MMM',
    '..C..MM',
    'WW...MM',
    '..c.MMM',
    '.W.c.MM',
    '..W..MM',
    '.c...MM',
    'W..W.MM',
    '..K.MMM',
  ],
};
export const RAIL_NAMES: Record<string, string> = {
  '2,0': '台北', '2,1': '桃園', '1,3': '新竹', '1,5': '苗栗', '2,6': '台中', '2,8': '彰化', '3,9': '嘉義', '1,11': '台南', '2,13': '高雄',
};
export const RAIL_INTRO: Line[] = [
  { who: 'engineer', text: '你們好！我是高鐵工程師。2007 年，高鐵通車了，從台北到高雄，一路連起臺灣西部。' },
  { who: 'engineer', text: '現在換你來畫路線！從台北一格一格點到高雄，再點路線上的城市，決定要在哪裡停站。' },
  { who: 'engineer', text: '山和保護區不能穿過去。每走一格 4 分鐘，轉一次彎多 2 分鐘，每停一站多 2 分鐘。' },
  { who: 'engineer', text: '站跟站之間最多 5 格、最少 3 格，台中一定要停。台北到高雄，要在 90 分鐘內！' },
];
export const RAIL_SAY: Record<'blocked' | 'gap' | 'close' | 'mustStop' | 'slow' | 'end' | 'hint' | 'good', Line> = {
  blocked: { who: 'engineer', text: '這裡是山或保護區，不能蓋鐵路喔。' },
  gap: { who: 'an', mood: 'worried', text: '有兩站隔太遠了！中間的人要走好遠才搭得到車。' },
  close: { who: 'engineer', text: '兩站太近了，車子才剛加速就要煞車。少停一站試試看。' },
  mustStop: { who: 'engineer', text: '台中是中部最大的城市，一定要停。' },
  slow: { who: 'an', mood: 'frown', text: '超過 90 分鐘了……彎轉太多、停太多站都會變慢。' },
  end: { who: 'engineer', text: '路線還沒接到高雄喔。' },
  hint: { who: 'engineer', text: '路線盡量直直走，少轉彎；站也不用每個城市都停，只要站距不超過 5 格就好。' },
  good: { who: 'engineer', text: '在 90 分鐘內！站距剛好，也沒有破壞山和濕地。這就是一條好路線。' },
};
export const RAIL_DONE: Line[] = [
  { who: 'engineer', text: '真的高鐵，最快大約一個半小時就從台北到高雄。以前要坐一整天，現在一天就能來回。' },
  { who: 'engineer', text: '蓋高鐵的時候，也要討論好久：路線經過誰的家、會不會吵到鳥、要停哪些站……' },
  { who: 'an', mood: 'thinking', text: '所以，大家的意見不一樣，是很正常的事？' },
];
export const isRailMust = (c: Cell, lv = RAIL) => lv.rows[c.row][c.col] === 'C';

// ── 3 一起做決定 ──
export const FIRST_VOTE: Record<Use, number> = { park: 9, parking: 8, market: 7 };
export const USE_INFO: Record<Use, { name: string; img: string }> = {
  park: { name: '公園', img: artE('o-11-park') },
  parking: { name: '停車場', img: artE('o-11-parking') },
  market: { name: '市場', img: artE('o-11-market') },
};
export const BLOCKS = ['左上（學校旁）', '右上（大馬路旁）', '左下（老房子旁）', '右下（公寓旁）'];
export const GROUPS: { id: string; name: string; icon: string; need: string }[] = [
  { id: 'kids', name: '小朋友', icon: '🧒', need: '公園要在學校這一邊（左邊那一排），下課就能去玩。' },
  { id: 'elders', name: '長輩', icon: '👴', need: '買完菜，隔壁就有公園可以坐著休息（市場要跟公園相鄰）。' },
  { id: 'drivers', name: '開車的人', icon: '🚗', need: '停車場要靠大馬路（上面那一排），車子才好進出。' },
  { id: 'neighbors', name: '公寓的鄰居', icon: '🏢', need: '右下角就在我們窗外，不要停車場、也不要市場。' },
  { id: 'vendors', name: '攤販', icon: '🧺', need: '市場要在下面那一排，那邊住的人多，生意才好。' },
];
export const MEET_INTRO: Line[] = [
  { who: 'chair', text: '歡迎來到社區會議，我是今天的主持人。空地要蓋什麼，我們先舉手表決。' },
  { who: 'chair', text: '公園 9 票、停車場 8 票、市場 7 票。公園最多票……可是有 15 個人沒有選它。' },
  { who: 'agong', text: '照多數決，是公園贏。可是這樣，一大半的人都不開心。' },
  { who: 'chair', text: '多數決是規則，可是少數人的意見也要被聽見。我們先請各組說說看，最在意的是什麼。' },
];
export const MEET_RULES: Line[] = [
  { who: 'chair', text: '空地可以分成四塊，每一塊蓋公園、停車場或市場。' },
  { who: 'chair', text: '排好以後按「試投票」：條件被照顧到的組會投贊成。超過一半就通過，可是最好的方案是——五組都贊成！' },
];
export const MEET_SAY = {
  fewer: { who: 'chair', text: '贊成的不到一半，這個方案沒通過。看看反對的組在意什麼。' } as Line,
  almost: { who: 'chair', text: '通過了，可是還有組不開心。規則允許，但我們能不能找到大家都接受的方案？' } as Line,
  hint: { who: 'agong', text: '先從最嚴格的條件開始：公寓窗外那一塊只能是什麼？攤販要的市場又只剩哪一塊？' } as Line,
  good: { who: 'chair', text: '五組都贊成！這個方案通過了。謝謝每一組願意說、也願意聽。' } as Line,
};
export const MEET_DONE: Line[] = [
  { who: 'an', mood: 'thumbs', text: '小朋友的公園在學校旁邊，阿公買完菜也有地方坐，攤販、開車的人、鄰居都同意！' },
  { who: 'agong', text: '一開始大家吵成一團，最後竟然想出一個每個人都可以接受的方法。' },
  { who: 'tick', mood: 'happy', text: '見習生，你聽到了嗎？鐘塔那邊……好像在「喀」一聲。' },
];

// ── 4 時光博物館：把各章的信物和時代排成時間軸 ──
export interface Exhibit { id: string; ch: string; era: string; when: string; img: string; text: string; keepsake?: string }
export const EXHIBITS: Exhibit[] = [
  { id: 'stone', ch: 'ch1', era: '史前', when: '好幾千年前', img: `${BASE}img/story/G-02_3.webp`, text: '刻了三條線的槌子石：人們敲石頭做工具，在山洞裡生火。', keepsake: 'yan-hammer' },
  { id: 'millet', ch: 'ch2', era: '原住民族', when: '大約 400 年前', img: `${BASE}img/story/G-02_4.webp`, text: '一袋小米種子：山上的部落種小米、輪流休耕、守打獵的規矩。', keepsake: 'millet-bag' },
  { id: 'ship', ch: 'ch3', era: '荷西', when: '大約 1624 年', img: islE('badge-ship'), text: '大帆船：海上來的人在大員蓋城堡，收購很多鹿皮。' },
  { id: 'rice', ch: 'ch4', era: '鄭氏', when: '大約 1661 年', img: islE('badge-rice'), text: '稻穗：軍隊和百姓在台南平原屯田開墾。' },
  { id: 'canal', ch: 'ch5', era: '清領', when: '大約 1709 年', img: `${BASE}img/story/G-02_7.webp`, text: '綁紅線的竹片：用竹蛇籠導水，開了八堡圳。', keepsake: 'bamboo-strip' },
  { id: 'train', ch: 'ch6', era: '清末', when: '大約 1880 年代', img: islE('badge-train'), text: '小火車：開港通商以後，台北到基隆蓋了鐵路。' },
  { id: 'dam', ch: 'ch7', era: '日治', when: '大約 1930 年', img: islE('badge-dam'), text: '水壩：嘉南平原蓋了大圳，日月潭也蓋了發電廠。' },
  { id: 'highway', ch: 'end', era: '戰後', when: '大約 1970 年代', img: artE('g-09-highway'), text: '高速公路：十大建設，從基隆到高雄的高速公路通車了。' },
  { id: 'hsr', ch: 'end', era: '今天', when: '今天', img: artE('o-11-hsr'), text: '高鐵：台北到高雄大約一個半小時，南北一天就能來回。' },
];
// 一開始擺出來的順序（打亂）
export const EXHIBIT_SHUFFLE = ['canal', 'hsr', 'millet', 'dam', 'stone', 'highway', 'rice', 'train', 'ship'];
export const MUSEUM_INTRO: Line[] = [
  { who: 'tick', mood: 'happy', text: '這是鐘塔下面的時光博物館！你一路帶回來的東西，都可以放在這裡展覽。' },
  { who: 'tick', mood: 'thinking', text: '展示台上寫了年代。讀讀每樣東西的說明，把它放到對的年代上，排成一條時間軸。' },
  { who: 'an', mood: 'happy', text: '有發光的，就是你真的從那個時代帶回來的信物耶！' },
];
export const MUSEUM_SAY = {
  wrong: { who: 'tick', mood: 'thinking', text: '紅色的放錯年代了。想想它的說明：那時候的人在做什麼？' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '順序是：史前 → 原住民族 → 荷西 → 鄭氏 → 清領 → 清末 → 日治 → 戰後 → 今天。' } as Line,
  good: { who: 'tick', mood: 'happy', text: '全部排好了！從敲石頭到坐高鐵，這就是我們島嶼的時間軸。' } as Line,
};
export const MUSEUM_DONE: Line[] = [
  { who: 'an', mood: 'thinking', text: '每個時代的人，都留下了一樣東西，讓後來的人記得。' },
  { who: 'an', mood: 'determined', text: '那今天的我們，也可以留下什麼吧？像今天開會想出來的那個方案。' },
  { who: 'tick', mood: 'worried', text: '等一下……博物館門口有人。戴著斗笠——是那個旅人！' },
];

// ── 5 旅人的真面目 ──
// 前面各章留過的紙條（拿得到的才列；第三、四、六、七章的紙條由各章補上）
export const NOTES_ALL: { era: string; text: string }[] = [
  { era: '史前', text: '火是借來的，森林也是。' },
  { era: '清領', text: '大水不要全部搶，留一條給溪。' },
  { era: '今天', text: '今天的難題，不用一個人解決。' },
];
export const TRAVELER_MEET: Line[] = [
  { who: 'traveler', text: '見習生，你終於走到今天了。' },
  { who: 'an', mood: 'scared', text: '你、你是誰？為什麼一直把臉藏起來？' },
  { who: 'tick', mood: 'thinking', text: '每個時代的紙條，都是你留的吧？那個字跡，我一直覺得好眼熟……' },
  { who: 'traveler', text: '是我。我走過每一個時代，比你們早一步，把想說的話留在那裡。' },
  { who: 'traveler', text: '每個時代都有難題。可是每一次，都有人願意聽別人說話，一起想辦法。' },
];
export const REVEAL_BEFORE: Line[] = [
  { who: 'traveler', text: '你想知道我是誰嗎？' },
  { who: 'traveler', text: '……好。我把斗笠拿下來。' },
];
export const revealLines = (name: string | null): Line[] => [
  { who: 'future', text: name ? `${name}，我就是長大以後的你。` : '我就是長大以後的你。' },
  { who: 'tick', mood: 'worried', text: '長、長大的見習生？！難怪字跡這麼眼熟——那是你的字！' },
  { who: 'future', text: '很多年以後，我也遇到很難的決定。是你在每個時代學到的事，一直幫著我。' },
  { who: 'future', text: '所以我回到過去，在每個時代留一張紙條給你——也就是給以前的我。' },
  { who: 'future', text: '最後一步，要你自己來。這把鑰匙給你：把今天，交給今天的你。' },
];
export const TOWER_TURN: Line[] = [
  { who: 'tick', mood: 'happy', text: '鐘塔轉起來了！指針走過下午三點了！時間往前走了！' },
  { who: 'tick', mood: 'happy', text: '你看，鐘塔前面——每個時代的時光朋友都來了！' },
];

// ── 時光朋友：前面每一章的夥伴。有該角色的圖就用，沒有就用名字卡（第三、四、六、七章由各章補圖）──
export interface FriendE { name: string; era: string; ch: string; ids: string[] }
export const FRIENDS_END: FriendE[] = [
  { name: '阿岩', era: '史前', ch: 'ch1', ids: ['yan'] },
  { name: '阿妮', era: '原住民族', ch: 'ch2', ids: ['ani'] },
  { name: '阿福', era: '荷西', ch: 'ch3', ids: ['fu', 'afu', 'ahfu'] },
  { name: '小蓮', era: '鄭氏', ch: 'ch4', ids: ['xiaolian', 'xlian', 'lotus'] },
  { name: '阿蓮', era: '清領', ch: 'ch5', ids: ['lian'] },
  { name: '阿穆', era: '清領', ch: 'ch5', ids: ['mu'] },
  { name: '阿春', era: '清末', ch: 'ch6', ids: ['chun', 'achun'] },
  { name: '阿雄', era: '日治', ch: 'ch7', ids: ['xiong', 'axiong'] },
];

// 鐘塔前的結局：照你的選擇變
export const endLines = (k: PicksE): Line[] => [
  k.park === 1
    ? { who: 'an', mood: 'happy', text: '社區故事牆畫好了！上面有阿公說的高速公路、高鐵，還有我們開會的樣子。' }
    : { who: 'an', mood: 'happy', text: '我們種的那棵小樹發芽了！阿公說，等它長大，要在樹下講故事給大家聽。' },
  k.ride === 0
    ? { who: 'agong', text: '小朋友，下次阿公再請你們坐高鐵，去南部看看我年輕時候的港口。' }
    : { who: 'an', mood: 'thumbs', text: '下禮拜全班要坐高鐵去南部校外教學，你也要一起來喔！' },
  k.word === 1
    ? { who: 'future', text: '記得你答應的：好好跟別人一起做決定。我會在未來等你。' }
    : { who: 'future', text: '紙條就留給你保管吧。以後換你，把想說的話留給別人。' },
  k.speak === 1
    ? { who: 'an', mood: 'determined', text: '下次上台，我不用小卡了！我要自己說。……大概吧，嘿嘿。' }
    : { who: 'an', mood: 'determined', text: '下次上台，換我站在別人旁邊，幫他拿麥克風！' },
  { who: 'an', mood: 'happy', text: '我想到我要留下什麼了：讓大家記得，我們是一起做決定的。' },
];
export const BACK_TODAY: Line[] = [
  { who: 'tick', mood: 'happy', text: '從八仙洞的火、山上的小米、竹蛇籠的圳水，到十大建設和高鐵……每個時代都有人一起解決難題。' },
  { who: 'tick', mood: 'thinking', text: '而今天的難題，是你和大家一起解決的。故事還沒結束——今天的你，正在寫明天的歷史。' },
];
export const KEEPSAKE_END = { id: 'tower-key', img: 'end/g-09-key.webp', title: '時光鐘塔鑰匙', text: '長大的你交給你的鑰匙。把手上有一顆小齒輪，轉一下，就能打開每一個時代的回憶。' };

export const TRUTH_END = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，十大建設一下子就擺好，高鐵路線點一點就畫好，社區會議也很快談出結果。小安、阿公、工程師和神秘旅人都是遊戲裡的角色，時光鐘塔也是想像的。',
  real: '十大建設大約在 1970 年代陸續動工、完成，花了好幾年；高鐵從規劃、討論到 2007 年通車，也經過很多年。真實的社區公共事務，常常要開好幾次會、聽很多不同的意見，再用投票和協商做出決定。',
  source: '文化部《臺灣大百科全書》「十大建設」條；台灣高速鐵路公司公開資料；國小社會（康軒版）戰後臺灣的經濟發展、民主社會與公民參與單元',
};

// ── 圖鑑卡 ──
const SRC = {
  econ: '國小社會（康軒版）戰後臺灣的經濟發展單元',
  civic: '國小社會（康軒版）民主社會與公民參與單元',
  encyclo: '文化部《臺灣大百科全書》',
  hsr: '台灣高速鐵路公司公開資料',
  freeway: '交通部高速公路局公開資料',
  airport: '桃園國際機場公司公開資料',
};
export const CARDS_END: Record<string, Card> = {
  postwar: { id: 'postwar', title: '戰後的臺灣', kind: '知識', source: `${SRC.econ}；${SRC.encyclo}`,
    text: '1945 年第二次世界大戰結束後，臺灣慢慢重建。農業、工業一步一步發展，生活也漸漸改變。' },
  tenmajor: { id: 'tenmajor', title: '十大建設', kind: '知識', img: 'end/g-09-highway.webp', source: `${SRC.encyclo}「十大建設」條；${SRC.econ}`,
    text: '1970 年代推動的十項大建設：六項交通（高速公路、鐵路電氣化、北迴鐵路、機場、台中港、蘇澳港）、三項重工業（鋼鐵、造船、石化）和一項能源（核能發電廠）。' },
  highway: { id: 'highway', title: '中山高速公路', kind: '地點', img: 'end/g-09-highway.webp', source: `${SRC.freeway}；${SRC.encyclo}`,
    text: '臺灣第一條高速公路，也叫國道一號，北起基隆、南到高雄，大約在 1978 年全線通車，讓南北的人和貨跑得更快。' },
  airport: { id: 'airport', title: '桃園國際機場', kind: '地點', img: 'end/g-09-airport.webp', source: `${SRC.airport}；${SRC.encyclo}`,
    text: '十大建設之一，1979 年啟用，當時叫中正國際機場，後來改名。是臺灣往來世界最重要的機場。' },
  hsr: { id: 'hsr', title: '臺灣高鐵', kind: '物品', img: 'end/o-11-hsr.webp', source: SRC.hsr,
    text: '2007 年通車，沿著臺灣西部從台北到高雄（左營），最快大約一個半小時。南北一天就能來回，叫做「一日生活圈」。' },
  vote: { id: 'vote', title: '民主與投票', kind: '知識', img: 'end/g-09-ballot.webp', source: SRC.civic,
    text: '民主社會裡，大家可以用投票表達意見。投票前先好好討論，讓每個人知道不同的想法。' },
  civic: { id: 'civic', title: '公民參與', kind: '知識', source: SRC.civic,
    text: '社區、學校和城市的事，大家都可以參加：開會發言、提出建議、投票，一起讓生活的地方變得更好。' },
  minority: { id: 'minority', title: '尊重少數', kind: '知識', source: SRC.civic,
    text: '多數決是常用的規則，但少數人的意見也要被聽見。好好協商，常常能找到更多人可以接受的方法。' },
  eras: { id: 'eras', title: '各時代總覽', kind: '知識', source: '國小社會五、六年級（康軒版）臺灣的歷史各單元',
    text: '史前 → 原住民族 → 荷西 → 鄭氏 → 清領 → 清末 → 日治 → 戰後 → 今天。每個時代的人，都在這座島上留下了痕跡。' },
  today: { id: 'today', title: '今天的臺灣', kind: '地點', img: 'end/o-11-t101.webp', source: `${SRC.econ}；${SRC.civic}`,
    text: '高樓、高鐵、港口和社區公園都是今天的臺灣。很多人一起生活，有不同的想法，也一起做決定。' },
  tower: { id: 'tower', title: '時光鐘塔', kind: '地點', img: 'end/o-11-tower.webp', source: '遊戲裡的想像（穿越吧！島嶼開拓者）',
    text: '滴答住的鐘塔。七顆時之齒輪都回來，再加上今天的人一起做出決定，它才終於轉起來。' },
  future: { id: 'future', title: '長大的你', kind: '人物', img: 'end/o-11-cloak.webp', source: '遊戲裡的想像（穿越吧！島嶼開拓者）',
    text: '一路在各個時代留紙條的戴斗笠旅人，其實是長大以後的你。你在每個時代學到的事，會一直陪著你。' },
};
export const CARD_ORDER_END = ['future', 'postwar', 'tenmajor', 'highway', 'airport', 'hsr', 'today', 'tower', 'vote', 'civic', 'minority', 'eras'];

// ── 反思題 ──
export interface QuestionE { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS_END: QuestionE[] = [
  {
    who: 'agong',
    q: '十大建設裡，哪一類的建設最多？',
    options: ['交通建設', '能源建設', '重工業'],
    answer: 0,
    why: '十項裡有六項是交通：高速公路、鐵路電氣化、北迴鐵路、機場和兩個港口。交通方便了，工廠和生活才跟著發展。',
  },
  {
    who: 'engineer',
    q: '高鐵通車以後，臺灣西部有什麼改變？',
    options: ['大家都不坐火車了', '南北來往變快，很多人一天就能來回', '每個城市都變一樣大'],
    answer: 1,
    why: '從台北到高雄最快大約一個半小時，上班、上學、旅行都方便多了，叫做「一日生活圈」。',
  },
  {
    who: 'chair',
    q: '社區要做決定時，除了投票，還要記得什麼？',
    options: ['票多的人就可以不管別人', '讓最大聲的人決定', '聽聽少數人的意見，找更多人能接受的方法'],
    answer: 2,
    why: '多數決是規則，但好好討論、尊重少數，常常能找到讓更多人都接受的方案。',
  },
];

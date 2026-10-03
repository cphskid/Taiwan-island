// 第四章《東寧屯田》（鄭氏時期，大約 1661～1683 年，臺南平原）的整章資料：關卡、對話、選擇、圖鑑卡、反思題。
//
// 鄭成功趕走荷蘭人以後，鄭氏在臺灣建立東寧：軍隊「寓兵於農」分營屯田、開水埤，陳永華教人曬鹽、建孔廟設學校，
// 最後 1683 年施琅攻下澎湖，鄭克塽投降，臺灣歸清朝管。
// 小蓮（屯田兵的女兒）、老兵、村社的阿姨都是虛構的；陳永華是真實人物，台詞是遊戲寫的。
// 年代寫「大約」，照國小社會課本的說法。文字是初稿，上正式站前請社會科老師審。
// 平埔族村社的寫法（土地、獵場、和漢人的關係）上正式站前要請熟悉平埔族歷史的人審。

import type { CampLevel, GrainLevel, PondLevel, SaltLevel, TempleLevel, Bld, Sky } from '../core/tuntian';
import type { Card, Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art4 = (name: string) => `${BASE}img/ch4/${name}.webp`;

export const STEPS4 = ['開場', '分營屯田', '開水埤', '曬鹽', '蓋學堂', '東寧的明天', '結算'] as const;

// ── 時間尺轉場：開場後、蓋學堂前、最後施琅來的時候 ──
export const STOPS4 = ['1661 鄭成功來臺', '1665 屯田', '1666 孔廟', '1683 施琅來臺'];
export const JUMPS4: Record<number, { far: string; title: string; place: string; react: Line }> = {
  1: { far: '鄭成功趕走荷蘭人以後幾年', title: '東寧', place: '大約 1665 年・臺南平原', react: { who: 'xlian', mood: 'worried', text: '田都裂開了……兄弟們一邊練兵一邊等收成，可是稻子一直不長。' } },
  2: { far: '往後一年', title: '承天府', place: '大約 1666 年・今天的臺南市區', react: { who: 'xlian', mood: 'happy', text: '好熱鬧！那邊在蓋一間紅牆的大房子，好多工人在搬磚頭。' } },
  3: { far: '又過了十幾年', title: '澎湖的海上', place: '1683 年・施琅的船來了', react: { who: 'tick', mood: 'worried', text: '好多船……清朝的施琅帶著水師打下澎湖了。' } },
};

// ── 選擇：四個，不會壞結局，小蓮會記得，結局台詞跟著變 ──
export type Pick4 = 'land' | 'water' | 'school' | 'grain';
export type Picks4 = Partial<Record<Pick4, number>>;
export interface Choice4 { who: Line['who']; mood?: Line['mood']; q: string; options: [string, string]; after: [Line[], Line[]]; recap: [string, string] }
export const CHOICES4: Record<Pick4, Choice4> = {
  land: {
    who: 'villager', q: '溪邊那塊空地，是我們社的人秋天捕鹿、採野菜的地方。你們也想開墾那裡嗎？',
    options: ['不開了，那塊地留給社裡', '跟社裡商量一起用，收成分一份給社裡'],
    after: [
      [{ who: 'villager', text: '謝謝你們。秋天鹿來喝水的時候，我們還能在那裡打獵。' }, { who: 'xlian', mood: 'happy', text: '我們去開北邊的荒地，一樣可以種！' }],
      [{ who: 'villager', text: '一起用？好，收成的時候記得分我們一份，我們也教你們哪裡的土比較肥。' }, { who: 'xlian', mood: 'thinking', text: '原來這裡本來就有人住，我們要好好跟他們商量。' }],
    ],
    recap: ['分營屯田：把溪邊的地留給社裡', '分營屯田：跟社裡商量一起用那塊地'],
  },
  water: {
    who: 'veteran', q: '到了冬天，埤裡的水快用完了。如果只剩一點點，要先給誰？',
    options: ['先給田，稻子才長得大', '先給營盤，兵要喝水才有力氣'],
    after: [
      [{ who: 'veteran', text: '好，田先喝。營裡的兄弟們輪流去溪邊挑水。' }, { who: 'xlian', mood: 'determined', text: '我也要去挑水！我力氣很大的。' }],
      [{ who: 'veteran', text: '好，人先喝。田少收一點，明年再多挖一格埤。' }, { who: 'xlian', mood: 'worried', text: '阿爸說，人和田都要水……要是水夠大家用就好了。' }],
    ],
    recap: ['開水埤：缺水時先給田', '開水埤：缺水時先給營盤'],
  },
  school: {
    who: 'tick', mood: 'thinking', q: '小蓮也好想讀書。你要怎麼幫她？',
    options: ['陪小蓮去問陳永華，女孩可不可以讀書', '自己教小蓮認字，從她的名字開始'],
    after: [
      [
        { who: 'chen', text: '小姑娘想讀書，是好事。可是現在的學堂，規矩是只收男孩子，我一個人改不了。' },
        { who: 'chen', text: '這本書借你，回家請你阿爸教你念吧。' },
        { who: 'xlian', mood: 'sad', text: '……嗯。有一天，女孩子也能大大方方走進學堂就好了。' },
      ],
      [
        { who: 'xlian', mood: 'thinking', text: '「蓮」……這個字好多筆畫！草字頭、一個車子、走路的「辶」……' },
        { who: 'xlian', mood: 'thumbs', text: '我寫出來了！這是我的名字！' },
        { who: 'tick', mood: 'happy', text: '在這個時代，大部分的女孩沒辦法上學堂。可是認字這件事，誰都可以學。' },
      ],
    ],
    recap: ['蓋學堂：陪小蓮去問陳永華，借到一本書', '蓋學堂：自己教小蓮寫她的名字'],
  },
  grain: {
    who: 'veteran', q: '聽說王爺想派兵渡海，回大陸打仗，要帶走很多糧食。你覺得糧倉的米該怎麼辦？',
    options: ['留下來，讓東寧的人守著田過日子', '分一些給出海的兵，讓他們吃飽'],
    after: [
      [{ who: 'veteran', text: '你說得對，田是我們的根。可惜，這不是我們能決定的。' }, { who: 'xlian', mood: 'scared', text: '咚咚咚……是戰鼓聲。阿爸，你不要走……' }],
      [{ who: 'veteran', text: '你是好心，兄弟們不能餓著肚子打仗。' }, { who: 'xlian', mood: 'scared', text: '咚咚咚……是戰鼓聲。阿爸，你一定要平安回來……' }],
    ],
    recap: ['東寧的明天：建議把米留下來守著田', '東寧的明天：建議分米給出海的兵'],
  },
};

// ── 0 開場 ──
export const OPENING4: Line[] = [
  { who: 'tick', mood: 'worried', text: '好熱……見習生，這裡是大約 1665 年的臺南平原。' },
  { who: 'tick', mood: 'thinking', text: '鄭成功趕走荷蘭人以後，鄭家在這裡建立了「東寧」。我的第四顆齒輪就掉在這片官田裡。' },
  { who: 'tick', mood: 'worried', text: '田一直是乾裂的，時間卡在同一天，稻子永遠等不到收成。' },
  { who: 'veteran', text: '軍糧只剩幾天了……從金門、廈門跟過來的兄弟這麼多，光靠船從海上運米，撐不下去啊。' },
  { who: 'xlian', mood: 'sad', text: '我叫小蓮。阿爸是屯田的兵，我們從金門坐船過來。阿爸每天又要練兵，又要種田。' },
  { who: 'xlian', mood: 'scared', text: '……晚上營裡一打鼓，或是天上一打雷，我就好怕。怕阿爸又要去打仗了。' },
  { who: 'xlian', mood: 'determined', text: '我希望阿爸不用再打仗，在這裡有一塊自己的田。你們會幫我們嗎？' },
  { who: 'tick', mood: 'happy', text: '當然！讓東寧的田長出稻子，時間就會往前走了！' },
];
export const XL_CARD = { body: art4('f-07a-idle'), from: '從金門來的屯田兵家', wish: '阿爸不用再打仗，在這裡有自己的田', fear: '怕打雷和戰鼓聲' };
export const GOAL4 = '讓東寧的官田長出稻子，時間才會往前走';

// ── 1 分營屯田 ──
// 地圖：. 空地、~ 溪和水塘、s 社、h 社的獵場和田、b 竹林。由上（北）到下（南）
export const CAMPS: CampLevel = {
  rows: [
    'hhsb..~.',
    'hh..b.~.',
    '.~......',
    '.~..b..~',
    'bb...b.~',
  ],
  camps: 4,
};
// 營盤照放的順序取名字：今天還留著的地名
export const CAMP_NAMES: { name: string; now: string }[] = [
  { name: '新營', now: '臺南市新營區' },
  { name: '柳營', now: '臺南市柳營區' },
  { name: '林鳳營', now: '臺南市六甲區（有林鳳營車站）' },
  { name: '左營', now: '高雄市左營區' },
];
export const CAMP_RULES: { id: string; text: string }[] = [
  { id: 'land', text: '只能紮在空地上（不能在水裡、竹林）' },
  { id: 'water', text: '上下左右要有一格是水' },
  { id: 'village', text: '不能佔社的土地，也不能緊貼著' },
  { id: 'crowd', text: '營盤不能挨在一起（斜的也不行）' },
  { id: 'help', text: '2 格內要有別的營盤，大家連成一群' },
];
export const CAMP_INTRO: Line[] = [
  { who: 'veteran', text: '國姓爺說，兵不能只會打仗，也要自己種糧食。平常種田，要打仗時再拿起刀，這叫「寓兵於農」。' },
  { who: 'veteran', text: '各營分到不同的地方，一邊開墾一邊守。這就是「屯田」。' },
  { who: 'villager', text: '這片平原，也是我們社的人生活的地方。北邊是我們的社，還有獵場和田。' },
  { who: 'xlian', mood: 'determined', text: '要放 4 個營盤！點地圖上的空地紮營，再點一下可以拿起來。旁邊有規矩喔。' },
];
export const CAMP_SAY = {
  first: { who: 'xlian', mood: 'thinking', text: '有紅色記號的營盤不行。看看它違反了哪一條規矩？' } as Line,
  lonely: { who: 'veteran', text: '營盤分太散了，有事的時候趕不過去。2 格內要有別的營盤。' } as Line,
  hint: { who: 'veteran', text: '水旁邊、離社遠一點的地方不多……先找出「旁邊有水、又不貼著社」的空地，再從裡面挑。' } as Line,
  spot: { who: 'xlian', mood: 'thinking', text: '我看到了！發亮的那幾格可以紮營！' } as Line,
  good: { who: 'veteran', text: '四個營盤都靠水、互相看得到，也沒佔到社的地。好！' } as Line,
};
export const CAMP_DONE: Line[] = [
  { who: 'tick', mood: 'happy', text: '你知道嗎？這些營盤的名字，有的一直留到今天，變成了地名！' },
];

// ── 2 開水埤 ──
export const POND: PondLevel = {
  periods: ['春', '梅雨', '夏', '颱風', '秋', '冬'],
  rain: [1, 8, 0, 8, 0, 0],
  camp: 1,
  cellCap: 3,
  maxCells: 5,
  labor: 8,
  plots: 6,
  start: 1,
  crops: { rice: { use: [1, 1, 1, 1, 1, 0], food: 3 }, potato: { use: [0, 0, 0, 0, 1, 1], food: 1 } },
  need: 6,
};
export const POND_INTRO: Line[] = [
  { who: 'veteran', text: '臺南這裡，梅雨和颱風的時候雨很多，秋天、冬天卻幾乎不下雨。雨一停，田就裂開了。' },
  { who: 'veteran', text: '我們來挖「埤」，就是存水的池塘。下大雨時把水存起來，乾的時候再拿來用。' },
  { who: 'xlian', mood: 'thinking', text: '可是人手只有 8 個。挖一格埤要一個人，開一塊田也要一個人。' },
  { who: 'veteran', text: '稻子收成 3 份，可是從春天到秋天每一季都要喝水；番薯只收 1 份，只有秋天、冬天要一點水。營盤每一季也要喝 1 份水。' },
  { who: 'xlian', mood: 'determined', text: '要收到 6 份糧！記得：埤太小的話，大雨一來，裝不下的水就流走了。' },
];
export const POND_SAY = {
  dry: (season: string) => ({ who: 'xlian', mood: 'worried', text: `${season}的時候埤裡沒水了，稻子都枯了……` }) as Line,
  short: { who: 'veteran', text: '一整年都有水，可是糧不到 6 份。田再多種一點？' } as Line,
  hint: { who: 'veteran', text: '颱風那季的雨很多，埤小的話一下就滿出來流掉。埤挖大一點，再想想番薯：它只在秋冬喝水。' } as Line,
  spot: { who: 'xlian', mood: 'thinking', text: '老兵伯伯說，埤挖 4 格看看？發亮的田是建議種的。' } as Line,
  good: { who: 'veteran', text: '一整年埤裡都有水，收成也夠！雨季存水、旱季用水，就是這個道理。' } as Line,
};

// ── 3 曬鹽 ──
const SKY: Record<string, Sky> = { s: 'sun', c: 'cloud', r: 'rain' };
export const SALT: SaltLevel = { days: [...'sssrsscssrss'].map((x) => SKY[x]), evapDays: 2, crystDays: 1, hands: 2, need: 4 };
export const SALT_INTRO: Line[] = [
  { who: 'tick', mood: 'happy', text: '吃飯也要有鹽！我們跟著陳永華到海邊的瀨口。' },
  { who: 'chen', text: '我是陳永華。以前這裡做鹽，是用大鍋煮海水，叫做「煎鹽」，要燒好多柴。' },
  { who: 'chen', text: '我們改成在海邊築鹽田，讓太陽把海水曬乾，這叫「曬鹽」。' },
  { who: 'chen', text: '海水先引進蒸發池，曬 2 個晴天變成很鹹的鹵水；再移到結晶池，曬 1 個晴天就結出鹽。' },
  { who: 'xlian', mood: 'worried', text: '可是下雨的話，蒸發池的水被沖淡要重曬，結晶池的鹽會被沖走！我們只有一張草蓆可以蓋。' },
  { who: 'chen', text: '你們兩個人，每天可以做 2 件事。天氣我幫你們看好了，12 天裡要收 4 籃鹽。' },
];
export const SALT_SAY = {
  washed: { who: 'xlian', mood: 'sad', text: '下雨了……沒蓋到的池子被沖掉了。' } as Line,
  short: (n: number) => ({ who: 'chen', text: `12 天過去，只收了 ${n} 籃鹽。再看一次天氣，想想下雨前要先做什麼。` }) as Line,
  hint: { who: 'chen', text: '下雨的前一天，先把能收的鹽收起來；雨天留一隻手蓋草蓆，蓋在曬最久的池子上。' } as Line,
  spot: { who: 'xlian', mood: 'thinking', text: '發亮的是陳先生建議今天做的事！' } as Line,
  good: { who: 'chen', text: '4 籃鹽！看天吃飯，也要會安排。' } as Line,
};
export const SALT_DONE: Line[] = [
  { who: 'xlian', mood: 'happy', text: '白白亮亮的鹽！我要帶一包回去給阿爸。' },
  { who: 'chen', text: '有鹽，菜和魚才能醃起來放久，軍隊和老百姓都需要。' },
];

// ── 4 蓋學堂 ──
// 格子 3 欄 × 4 列，由上（北，後面）到下（南，前面），中間是中軸線
export const TEMPLE: TempleLevel = {
  cols: 3,
  rows: 4,
  answer: { hall: { col: 1, row: 0 }, school: { col: 2, row: 0 }, westWing: { col: 0, row: 1 }, eastWing: { col: 2, row: 1 }, gate: { col: 1, row: 2 }, panchi: { col: 1, row: 3 } },
};
export const BLDS: { id: Bld; name: string; img: string }[] = [
  { id: 'hall', name: '大成殿', img: art4('o-08-hall') },
  { id: 'gate', name: '大成門', img: art4('o-08-gate') },
  { id: 'panchi', name: '泮池', img: art4('o-08-panchi') },
  { id: 'eastWing', name: '東廡', img: art4('o-08-wing') },
  { id: 'westWing', name: '西廡', img: art4('o-08-wing') },
  { id: 'school', name: '明倫堂', img: art4('o-08-school') },
];
export const TEMPLE_CLUES: { who: Line['who']; text: string }[] = [
  { who: 'chen', text: '大成殿拜孔子，最重要，放在中軸線最北邊（最上面）。' },
  { who: 'chen', text: '泮池是半月形的水池，在中軸線最南邊（最下面）。' },
  { who: 'veteran', text: '大成門在泮池的正北邊，進了門才看得到庭院。' },
  { who: 'chen', text: '大成殿前面空一格當庭院，東廡、西廡在庭院的兩邊。' },
  { who: 'xlian', text: '東邊是右手邊、西邊是左手邊。' },
  { who: 'chen', text: '明倫堂是上課的地方，在大成殿的東邊。這叫「左學右廟」。' },
];
export const TEMPLE_INTRO: Line[] = [
  { who: 'chen', text: '有田、有水、有鹽，大家吃得飽了。可是孩子要讀書，東寧才會有明天。' },
  { who: 'chen', text: '我們要蓋孔廟，旁邊設學堂，讓孩子來念書。照大家說的，把建築放到對的位置吧。' },
];
export const TEMPLE_SAY = {
  wrong: { who: 'xlian', mood: 'thinking', text: '紅色的放錯了，再看一次大家說的。' } as Line,
  hint: { who: 'chen', text: '先放最確定的：中軸線是中間那一直排，大成殿在最上面、泮池在最下面。' } as Line,
  spot: { who: 'xlian', mood: 'thinking', text: '發亮的格子，就是拿著的建築該去的地方！' } as Line,
};
export const TEMPLE_DONE: Line[] = [
  { who: 'chen', text: '孔廟蓋好了！這是臺灣第一座孔廟，以後大家叫它「全臺首學」。' },
  { who: 'chen', text: '從這裡開始，各地也慢慢設學校，讓孩子讀書、學寫字。' },
  { who: 'xlian', mood: 'sad', text: '……我也好想讀書。可是學堂裡，一個女生也沒有。' },
  { who: 'tick', mood: 'thinking', text: '在那個時代，學堂大多只收男孩。這是真的歷史，我們改不了……' },
];

// ── 5 東寧的明天 ──
export const GRAIN: GrainLevel = { years: 5, start: 4, base: 6, eat: 6, seed: 1, maxNew: 3, typhoon: [2], target: 11 };
export const GRAIN_INTRO: Line[] = [
  { who: 'veteran', text: '幾年過去，東寧的田越開越多。接下來五年，要好好規劃糧倉。' },
  { who: 'veteran', text: '開一塊新田，要先拿 1 份糧當種子、買農具；新田從下一年開始，每年多收 1 份。' },
  { who: 'veteran', text: '原本的田一年收 6 份，全軍一年吃 6 份。老人家看天說，第 3 年會有大颱風，那年收成只剩一半。' },
  { who: 'xlian', mood: 'determined', text: '糧倉任何時候都不能空掉！五年後要存到 11 份糧。' },
];
export const GRAIN_SAY = {
  broke: (y: number) => ({ who: 'xlian', mood: 'scared', text: `第 ${y} 年糧倉空了！大家要餓肚子了……` }) as Line,
  short: (n: number) => ({ who: 'veteran', text: `五年都撐過去了，可是只存了 ${n} 份，還不到 11 份。` }) as Line,
  hint: { who: 'chen', text: '新田越早開，收成的年數越多；可是颱風那年會少收，前一年糧倉要留一點。最後一年開田就來不及收了。' } as Line,
  spot: { who: 'xlian', mood: 'thinking', text: '陳先生在每一年旁邊寫了建議的數字！' } as Line,
  good: { who: 'veteran', text: '五年都吃得飽，糧倉還滿滿的。這下東寧可以安心過日子了。' } as Line,
};
// 選完「存糧還是出兵」以後：歷史怎麼走
export const HISTORY4: Line[] = [
  { who: 'tick', mood: 'thinking', text: '後來，鄭經真的帶兵渡海回大陸打仗，打了好幾年，用掉很多兵和糧，最後還是退回臺灣。' },
  { who: 'xlian', mood: 'sad', text: '阿爸說，打仗回來的人，比去的時候少好多……' },
];
export const SHILANG4: Line[] = [
  { who: 'tick', mood: 'worried', text: '1683 年，清朝派施琅帶著水師，打下了澎湖。' },
  { who: 'veteran', text: '……王爺（鄭克塽）決定投降了。東寧，要歸清朝管了。' },
  { who: 'xlian', mood: 'worried', text: '那我們的田呢？阿爸呢？' },
  { who: 'veteran', text: '不打仗了，大部分的人留下來種田。田還是田，稻子一樣要長。' },
  { who: 'xlian', mood: 'happy', text: '不打仗了……阿爸不用再去打仗了！' },
];

// ── 6 結算 ──
// 齒輪回到時光鐘以後，先看一眼小蓮家：台詞照你一路上的選擇
export const homeLines4 = (k: Picks4): Line[] => [
  { who: 'tick', mood: 'happy', text: '齒輪回到時光鐘了！我們從鐘裡看一下小蓮家的田——' },
  { who: 'xlian', mood: 'thumbs', text: '稻子熟了！官田裡金黃金黃的，時間終於往前走了！' },
  k.land === 1
    ? { who: 'villager', text: '你們分給社裡的米，老人家都吃到了。我們也教小蓮認了好多野菜。' }
    : { who: 'villager', text: '溪邊那塊地留下來了，今年秋天，社裡的人又在那裡看到鹿了。' },
  k.water === 1
    ? { who: 'veteran', text: '人先有水喝，大家才有力氣挖埤。今年我們多挖了一格，田也不缺水了。' }
    : { who: 'veteran', text: '水先給田，稻子長得好。營裡的兄弟輪流挑水，也撐過來了。' },
  k.school === 1
    ? { who: 'xlian', mood: 'happy', text: '我每天在田邊用樹枝寫我的名字，「蓮」字已經寫得很漂亮了！' }
    : { who: 'xlian', mood: 'happy', text: '陳先生借我的書，阿爸每天晚上教我念一句。' },
  k.grain === 1
    ? { who: 'xlian', mood: 'thinking', text: '阿爸說，那時候分給兄弟們的米，讓大家在海上吃得飽。可是我還是最喜歡大家一起種田。' }
    : { who: 'xlian', mood: 'thinking', text: '阿爸說，那時候你說要把米留下來，他一直記得。田，才是我們的根。' },
  { who: 'xlian', mood: 'thumbs', text: '阿爸說，這塊田以後就是我們家的了。我……好像不那麼怕打雷了。' },
];
export const FAREWELL4: Line[] = [
  { who: 'xlian', mood: 'happy', text: '這包鹽送你。是我們在瀨口一起曬出來的第一包鹽。' },
];
export const BACK_NOW4: Line[] = [
  { who: 'tick', mood: 'happy', text: '第四顆齒輪也在時光鐘裡轉起來了。' },
  { who: 'tick', mood: 'thinking', text: '臺灣歸清朝管以後，越來越多人從大陸渡海來開墾，一路往北開到彰化平原……' },
  { who: 'tick', mood: 'worried', text: '可是那裡的田，正在等水。下一顆齒輪，好像就卡在那裡！' },
];
export const KEEPSAKE4 = { id: 'salt-bag', img: 'ch4/g-06-salt.webp', title: '一包瀨口的鹽', text: '小蓮和你一起曬出來的第一包鹽。很久很久以後，臺南海邊還有一大片一大片的鹽田……' };
export const TRUTH4 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，營盤、水埤、鹽田和糧倉都用簡單的數字算一算就好了，好幾年的事幾分鐘就做完。小蓮、老兵和村社的阿姨都是遊戲裡的角色。',
  real: '鄭氏時期，軍隊真的分營屯田，留下新營、柳營、林鳳營、左營這些地名；陳永華推動曬鹽、建孔廟、設學校。可是漢人開墾也讓平埔族的土地和獵場越來越少，有時候還發生衝突。當時的學校大多只收男孩。1683 年施琅攻下澎湖，鄭克塽投降，臺灣歸清朝統治。',
  source: '國小社會五年級（康軒版）鄭氏時期；文化部《臺灣大百科全書》；國立臺灣歷史博物館',
};

// ── 圖鑑卡 ──
const SRC = {
  textbook: '國小社會五年級（康軒版）鄭氏時期',
  encyclo: '文化部《臺灣大百科全書》',
  nmth: '國立臺灣歷史博物館',
  tainan: '臺南市政府文化局',
};
export const CARDS4: Record<string, Card> = {
  'c4-koxinga': { id: 'c4-koxinga', title: '鄭成功', kind: '人物', source: `${SRC.textbook}；${SRC.encyclo}「鄭成功」`,
    text: '明朝末年的將領，大家叫他「國姓爺」。1661 年帶兵來臺灣，隔年趕走荷蘭人，在臺灣建立政權，不久後就過世了。' },
  'c4-tungning': { id: 'c4-tungning', title: '東寧', kind: '地點', img: 'ch4/g-06-flag.webp', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '鄭成功的兒子鄭經把臺灣改名叫「東寧」。鄭氏在臺灣一共大約 22 年。' },
  'c4-tuntian': { id: 'c4-tuntian', title: '屯田（寓兵於農）', kind: '知識', img: 'ch4/g-06-hoe.webp', source: SRC.textbook,
    text: '軍隊平常分到各地開墾種田，自己生產糧食，要打仗時再上戰場，叫做「寓兵於農」。' },
  'c4-campnames': { id: 'c4-campnames', title: '營盤地名', kind: '地點', img: 'ch4/o-08-camp.webp', source: `${SRC.textbook}；${SRC.encyclo}`,
    text: '軍隊屯田紮營的地方，名字很多留到今天，例如新營、柳營、林鳳營、左營、前鎮。' },
  'c4-plains': { id: 'c4-plains', title: '平埔族村社', kind: '知識', img: 'ch4/o-08-village.webp', source: `${SRC.nmth}；${SRC.textbook}`,
    text: '住在平原的原住民族村子叫「社」。漢人越來越多、開墾越來越廣，平埔族的土地和獵場慢慢變少，生活也跟著改變。' },
  'c4-pond': { id: 'c4-pond', title: '水埤', kind: '物品', img: 'ch4/o-08-pond.webp', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '把雨水和溪水存起來的池塘，旱季時引水灌溉。臺南一帶有些埤，據說從鄭氏時期就開始挖了。' },
  'c4-chen': { id: 'c4-chen', title: '陳永華', kind: '人物', img: 'ch4/p-18-chen.webp', source: `${SRC.encyclo}「陳永華」；${SRC.textbook}`,
    text: '鄭氏時期的參軍，幫鄭經治理臺灣：推動屯田、教人曬鹽、建孔廟、設學校。' },
  'c4-salt': { id: 'c4-salt', title: '曬鹽（瀨口鹽田）', kind: '知識', img: 'ch4/o-08-saltpan.webp', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '陳永華在瀨口一帶教人築鹽田，從煮海水的「煎鹽」改成用太陽曬的「曬鹽」，省下很多柴，鹽也做得更多。' },
  'c4-temple': { id: 'c4-temple', title: '孔廟（全臺首學）', kind: '地點', img: 'ch4/o-08-hall.webp', source: `${SRC.tainan}「臺南孔子廟」；${SRC.textbook}`,
    text: '1666 年在臺南建成，是臺灣第一座孔廟，旁邊設學校讓孩子讀書，所以叫「全臺首學」。今天的建築多半是後來重修的。' },
  'c4-chengtian': { id: 'c4-chengtian', title: '承天府', kind: '地點', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '鄭成功在今天的臺南設立的行政中心，管理全臺灣的事情。' },
  'c4-shilang': { id: 'c4-shilang', title: '施琅', kind: '人物', source: `${SRC.encyclo}「施琅」；${SRC.textbook}`,
    text: '清朝的水師將領。1683 年帶兵打下澎湖，鄭克塽投降，臺灣從此歸清朝統治。' },
  'c4-migrants': { id: 'c4-migrants', title: '渡海來開墾的人', kind: '知識', img: 'ch4/g-06-rice.webp', source: `${SRC.textbook}；${SRC.nmth}`,
    text: '鄭氏時期和後來的清朝，很多人從福建、廣東渡過臺灣海峽來開墾，平原上的田越開越多。' },
};
export const CARD_ORDER4 = ['c4-koxinga', 'c4-chen', 'c4-shilang', 'c4-tungning', 'c4-chengtian', 'c4-campnames', 'c4-temple', 'c4-pond', 'c4-tuntian', 'c4-plains', 'c4-salt', 'c4-migrants'];

// ── 反思題 ──
export interface Question4 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS4: Question4[] = [
  {
    who: 'veteran',
    q: '「寓兵於農」是什麼意思？',
    options: ['兵只打仗，不用種田', '兵平常種田，要打仗時再上戰場', '農夫都要去當兵'],
    answer: 1,
    why: '軍隊自己種糧食，就不用一直從海上運米，也把很多荒地開成了田。',
  },
  {
    who: 'xlian',
    q: '為什麼要挖水埤？',
    options: ['把雨季的水存起來，旱季拿來灌溉', '用來養魚賣錢', '擋住敵人的船'],
    answer: 0,
    why: '臺南雨季和旱季很分明，有了埤，旱季的田也有水可以用。',
  },
  {
    who: 'chen',
    q: '臺南孔廟為什麼被叫做「全臺首學」？',
    options: ['因為它是全臺灣最大的房子', '因為只有考第一名的人才能進去', '它是臺灣第一座孔廟，旁邊設了學校'],
    answer: 2,
    why: '1666 年建成的臺南孔廟是臺灣第一座孔廟，也是很早的官方學校。',
  },
];

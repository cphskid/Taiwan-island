// 第三章《大航海時代》（荷西時期，大約 1624～1662 年）的整章資料：航線、貿易、鹿群、新港文書、港灣、對話、圖鑑卡、反思題。
//
// 地點：台南大員（今天的安平一帶）、新港社（今天的台南新市一帶）、基隆和平島（當時叫社寮島）。
// 阿福（福建來的漢人男孩）、烏瑪（西拉雅族新港社的少女，名字待審）、商館員、長老、傳教士都是虛構的角色。
// 新港文書那一關的「羅馬字單字」是遊戲自己編的，不是真的西拉雅語。
// 涉及西拉雅族、荷蘭與西班牙的統治、鹿皮的大量捕獵，文字是初稿：上正式站前要請熟悉這段歷史和平埔族群文化的老師審。

import type { Dir, HerdLevel, Leg, RouteLevel, Spot, TradeLevel, Good, PortId } from '../core/tayouan';
import type { Card, Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art3 = (name: string) => `${BASE}img/ch3/${name}.webp`;

export const STEPS3 = ['開場', '季風與航線', '轉口貿易', '鹿皮的代價', '新港文書', '北邊的城堡', '結算'] as const;

// ── 時間轉場：時間尺從荷蘭人到大員，一路到鄭成功的船隊 ──
export const YEARS3 = [
  { year: '1624 年', name: '荷蘭人到大員' },
  { year: '1630 年代', name: '大員・新港社' },
  { year: '1642 年', name: '基隆 和平島' },
  { year: '1661 年', name: '鹿耳門外' },
];
export const JUMPS3: Record<number, { far: string; place: string; react: Line }> = {
  1: { far: '滴答把時間撥到', place: '台南 大員港', react: { who: 'afu', mood: 'worried', text: '霧好濃……我阿爸的船還在外面，進不來！' } },
  2: { far: '往後跳了十幾年，往北飛到', place: '基隆 和平島', react: { who: 'afu', mood: 'scared', text: '好冷，一直下毛毛雨！那座石頭城堡……旗子跟大員的不一樣耶。' } },
  3: { far: '又往後跳了快二十年', place: '台南 鹿耳門外的海上', react: { who: 'afu', mood: 'surprised', text: '霧散了！海上……好多好多船帆！' } },
};

// ── 選擇：四個，不會壞結局，結局畫面和台詞跟著變 ──
export type Pick3 = 'honest' | 'deer' | 'deed' | 'mom';
export type Picks3 = Partial<Record<Pick3, number>>;
export interface Choice3 { who: Line['who']; mood?: Line['mood']; q: string; options: [string, string]; after: [Line[], Line[]]; recap: [string, string] }
export const CHOICES3: Record<Pick3, Choice3> = {
  honest: {
    who: 'afu', mood: 'worried', q: '商館員算錯了，多給我們 5 兩銀。我們……可以偷偷收著嗎？',
    options: ['跟商館員說他算錯了', '先收著，等一下再說'],
    after: [
      [
        { who: 'clerk', text: '咦？真的耶，我多算了 5 兩。公司的帳一筆都不能錯，謝謝你們！' },
        { who: 'clerk', text: '老實的人，我以後都找你們做生意。' },
        { who: 'afu', mood: 'happy', text: '說實話以後，心裡輕鬆多了。' },
      ],
      [
        { who: 'afu', mood: 'happy', text: '嘿嘿，5 兩銀，阿娘的船票又近一點了……' },
        { who: 'afu', mood: 'sad', text: '……可是，這是商館員算錯的。他被發現的話，會不會被罵？' },
        { who: 'afu', mood: 'determined', text: '不行，我還是拿回去還！' },
        { who: 'clerk', text: '你自己拿回來？好孩子。老實的人，我以後都找你做生意。' },
      ],
    ],
    recap: ['貿易：跟商館員說他算錯了', '貿易：先收著，後來阿福自己拿去還了'],
  },
  deer: {
    who: 'clerk', q: '公司要四千張鹿皮，也就是 40 群鹿。照這個數量收，可以嗎？',
    options: ['照商館要的數量收', '跟部落說好，只收規矩內的量'],
    after: [
      [
        { who: 'clerk', text: '太好了！今年的船艙一定塞得滿滿的。' },
        { who: 'uma', text: '……你們看，草原上的鹿，一年比一年少。' },
        { who: 'tick', mood: 'worried', text: '照這樣收下去，幾年後鹿群就快不見了。' },
      ],
      [
        { who: 'siraya', text: '你們願意聽我們的規矩，謝謝你們。鹿是祖先留給我們的，也要留給孩子。' },
        { who: 'clerk', text: '只有一半？唉……好吧。鹿要是沒了，以後也沒有鹿皮可以收。' },
        { who: 'uma', text: '明年春天，草原上還會有小鹿跑來跑去。' },
      ],
    ],
    recap: ['鹿皮：照商館要的數量收，鹿變少了', '鹿皮：只收規矩內的量，鹿群留下來了'],
  },
  deed: {
    who: 'uma', q: '界線找到了！要怎麼讓以後的人也知道這條界線？',
    options: ['用羅馬字寫清楚，再畫一張界線圖', '大家一起走到界線上，立石頭當記號'],
    after: [
      [
        { who: 'uma', text: '我把界線一個字一個字寫下來，再畫一張圖。以後不管誰來，看得懂羅馬字的人都知道。' },
        { who: 'afu', mood: 'happy', text: '我來幫你畫溪和竹林！' },
      ],
      [
        { who: 'siraya', text: '大家一起走一遍，在每個轉角立一塊石頭。看得到、摸得到，誰都記得。' },
        { who: 'uma', text: '我也把它寫進契約裡。石頭和文字，一起作證。' },
      ],
    ],
    recap: ['新港文書：寫清楚，再畫一張界線圖', '新港文書：大家走一遍，立石頭當記號'],
  },
  mom: {
    who: 'afu', mood: 'thinking', q: '我存的錢，夠買一張船票了。要怎麼用呢？',
    options: ['把錢寄回福建，請阿娘搭船過來', '先留著，等季風對了，跟阿爸一起回去接阿娘'],
    after: [
      [
        { who: 'afu', mood: 'determined', text: '我寫信跟阿娘說：要等冬天的東北季風過了，挑浪小的日子再出發。' },
        { who: 'afu', mood: 'happy', text: '我知道季風和黑水溝了，就不那麼怕了。' },
      ],
      [
        { who: 'afu', mood: 'determined', text: '我跟阿爸一起回去接阿娘。我會看季風、看潮水，我們一定平安渡過黑水溝。' },
        { who: 'afu', mood: 'happy', text: '以前我好怕那片大浪，現在好像沒那麼怕了。' },
      ],
    ],
    recap: ['阿福：把錢寄回去，請阿娘渡海', '阿福：等季風對了，回去接阿娘'],
  },
};

// ── 開場 ──
export const LOOP_TIDE = 23;
export const OPENING3: Line[] = [
  { who: 'tick', mood: 'worried', text: `又起霧了……見習生，這已經是第 ${LOOP_TIDE} 次，同一天的潮水漲上來。` },
  { who: 'tick', mood: 'thinking', text: '這裡是大約四百年前的台南大員。第三顆齒輪掉進港口外的海裡，大霧散不開，船都進不了港。' },
  { who: 'afu', mood: 'worried', text: '你們也在等船嗎？我叫阿福，跟阿爸從福建渡海過來做工，種甘蔗、搬貨。' },
  { who: 'afu', mood: 'sad', text: '阿爸去廈門載貨，船卡在霧裡回不來。我好想快點存夠錢，讓阿娘也渡海過來……' },
  { who: 'afu', mood: 'scared', text: '可是海上有一條「黑水溝」，浪好大、水好黑。我坐船來的時候，吐了一整路。' },
  { who: 'clerk', text: '我是荷蘭東印度公司商館的人。霧不散，生絲、瓷器、鹿皮都卡在海上，公司要虧大錢了！' },
  { who: 'clerk', text: '聽說山上和平原的部落有很多鹿皮，可是要先有船，才運得出去啊。' },
  { who: 'tick', mood: 'happy', text: '我們幫你們把船帶進港！看懂風、看懂潮水，霧裡也找得到路。' },
];
export const AFU_CARD = { body: art3('f-06a-carry'), from: '福建→大員', wish: '存夠錢，讓阿娘也渡海來', fear: '怕黑水溝的大浪' };
export const GOAL3 = '讓大員港的霧散開，時間才會往前走';

// ── 1 季風與航線 ──
export interface RouteInfo { title: string; level: RouteLevel; ship: string; from: string; to: string; labels: { text: string; col: number; row: number }[]; intro: Line[]; hint: Line; good: Line[] }
export const ROUTES: RouteInfo[] = [
  {
    title: '從廈門到大員', ship: art3('g-05-junk'), from: '廈門', to: '大員',
    level: { monsoon: 'winter', days: 18, rows: [
      'L.........',
      'LA.....kLL',
      'L......kLL',
      'L...LL.kLL',
      'L...L..kcH',
      'L......ksL',
      'L......k.L',
    ] },
    labels: [{ text: '福建', col: 0, row: 3 }, { text: '澎湖', col: 4.5, row: 3 }, { text: '臺灣', col: 8.5, row: 1.5 }, { text: '黑水溝', col: 7, row: 6 }],
    intro: [
      { who: 'tick', mood: 'thinking', text: '帆船只能順著風走。冬天吹東北季風，船頭只能朝西、西南、南；夏天吹西南季風，只能朝北、東北、東。' },
      { who: 'afu', mood: 'scared', text: '那條深色的就是黑水溝……海流會把船往北推一格！' },
      { who: 'clerk', text: '大員港外面是沙洲，只有中間那條水道能進去，而且要漲潮才過得去。潮水一天漲、一天退。' },
      { who: 'tick', mood: 'happy', text: '換季風要等 3 天，等潮水要 1 天。時間有限，先想好路線再出發！' },
    ],
    hint: { who: 'afu', mood: 'thinking', text: '黑水溝會把船往北推，所以要從水道「下面一格」衝進去，被推上來剛好對準水道！' },
    good: [
      { who: 'afu', mood: 'thumbs', text: '阿爸的船進港了！他在船上跟我揮手！' },
    ],
  },
  {
    title: '從大員到日本', ship: art3('g-05-ship'), from: '大員', to: '日本',
    level: { monsoon: 'winter', days: 13, rows: [
      '..........',
      '...s....H.',
      '...k.LL...',
      '...k.LL.k.',
      '..sk.LL.k.',
      '..Lc.LL.k.',
      '..LALLL.k.',
      '..LLLLL.k.',
    ] },
    labels: [{ text: '臺灣', col: 5.5, row: 4 }, { text: '海流', col: 3, row: 2.5 }, { text: '黑潮', col: 8, row: 6 }],
    intro: [
      { who: 'clerk', text: '公司的大船要把生絲和鹿皮載去日本換白銀。日本在東北邊，現在吹的是東北季風……' },
      { who: 'afu', mood: 'happy', text: '我知道！逆著風走不了，要等季風換邊。' },
    ],
    hint: { who: 'clerk', text: '往北的海流會把船推兩格，前面有淺灘！記得早一點轉出海流。' },
    good: [
      { who: 'clerk', text: '順風順水到日本！這一趟換回好多白銀。' },
    ],
  },
];
export const ROUTE_OUTCOME: Record<string, string> = {
  aground: '船撞上陸地，擱淺了！',
  lowtide: '退潮了，船卡在沙洲水道裡！要漲潮才進得去。',
  wreck: '撞上淺灘，船底破了！',
  lost: '船開出海圖，在霧裡迷路了！',
  late: '時間來不及了，貨都要壞了！',
};

// ── 2 轉口貿易 ──
export const GOOD_INFO: Record<Good, { name: string; from: string; img: string }> = {
  silk: { name: '生絲', from: '中國', img: art3('g-05-silk') },
  porcelain: { name: '瓷器', from: '中國', img: art3('g-05-porcelain') },
  deerskin: { name: '鹿皮', from: '臺灣', img: art3('g-05-deerskin') },
  sugar: { name: '蔗糖', from: '臺灣', img: art3('g-05-sugar') },
  spice: { name: '香料', from: '南洋', img: art3('g-05-spice') },
};
export const PORT_INFO: Record<PortId, { name: string; note: string; x: number; y: number }> = {
  tayouan: { name: '大員', note: '中國商人的船把生絲、瓷器運來這裡；臺灣的鹿皮、蔗糖也在這裡買得到', x: 0.42, y: 0.42 },
  japan: { name: '日本', note: '用白銀買生絲、鹿皮、蔗糖', x: 0.82, y: 0.14 },
  batavia: { name: '巴達維亞', note: '荷蘭東印度公司在南洋的總部，有很多香料', x: 0.2, y: 0.76 },
};
export const TRADE: TradeLevel = {
  start: 'tayouan', money: 6, hold: 4, legs: 3, goal: 45, ports: [
    { id: 'tayouan', buy: { silk: 4, porcelain: 2, deerskin: 1, sugar: 1 }, sell: { spice: 4 } },
    { id: 'japan', buy: {}, sell: { silk: 9, deerskin: 3, sugar: 3 } },
    { id: 'batavia', buy: { spice: 1 }, sell: { porcelain: 5, sugar: 3 } },
  ],
};
export const TRADE_INTRO: Line[] = [
  { who: 'clerk', text: '大員是個轉運站。中國的生絲、瓷器，臺灣的鹿皮、蔗糖，南洋的香料，都在這裡上船、下船，再運到別的地方去。' },
  { who: 'clerk', text: '你們有 6 兩銀、船艙 4 格、可以開 3 趟船。每一趟都要從大員出發，或回到大員。' },
  { who: 'afu', mood: 'happy', text: '在便宜的地方買，運到貴的地方賣！要賺到 45 兩銀喔。' },
];
export const TRADE_SAY = {
  poor: { who: 'afu', mood: 'worried', text: '船都開完了，錢還不夠……我們再想一次？' } as Line,
  hint: { who: 'clerk', text: '生絲在日本最值錢，可是太貴，一開始買不起。先用便宜的貨把錢變多，最後一趟再載生絲去日本。' } as Line,
  hint2: { who: 'afu', mood: 'thinking', text: '瓷器和蔗糖在巴達維亞賣得好，那邊的香料又便宜，運回大員有人要……' } as Line,
  good: { who: 'clerk', text: '45 兩銀以上！你們真懂得做生意。這就是大員的「轉口貿易」。' } as Line,
};

// ── 3 鹿皮的代價 ──
export const HERD: HerdLevel = { start: 20, cap: 25, birthDiv: 4, years: 4, need: 18, maxTake: 10 };
export const HERD_DEMAND = [10, 10, 10, 10]; // 商館要的數量：一年 10 群、四年 40 群
export const DEER_INTRO: Line[] = [
  { who: 'uma', text: '我叫烏瑪，住在新港社。這片草原上大約有 20 群鹿，一群大概一百隻。' },
  { who: 'siraya', text: '每年收完鹿皮，剩下的鹿會生小鹿，多「剩下的四分之一」群。可是草原最多只養得起 25 群。' },
  { who: 'clerk', text: '四年裡，我至少要 18 群的鹿皮。' },
  { who: 'uma', text: '四年以後，鹿不能比現在少。每一年收幾群，你們決定。' },
];
export const DEER_SAY = {
  short: { who: 'clerk', text: '只有這麼一點？四年至少要 18 群喔。' } as Line,
  fewer: { who: 'uma', text: '四年後鹿比現在少了……這樣下去，草原會空掉的。' } as Line,
  hint: { who: 'siraya', text: '鹿群少的時候，生的小鹿也少。先讓鹿群長到草原養得起的最多，再每年收牠們生出來的那些。' } as Line,
  good: { who: 'siraya', text: '鹿皮夠了，草原上的鹿也一樣多。這是從祖先那時候就有的道理。' } as Line,
};

// ── 4 新港文書 ──
// 遊戲自編的羅馬字（不是真的西拉雅語）
export const WORDS: Record<string, string> = {
  ka: '從', mia: '走到', lulu: '沿著', tavok: '大石頭', sinna: '溪', kaloh: '竹林', pavul: '大樹', sumal: '東（日出）',
};
export const SECRET: Record<string, Dir> = { tirak: 'N', momal: 'W', dapu: 'S' };
export const DIR_NAME: Record<Dir, string> = { E: '東', W: '西', S: '南', N: '北' };
export const CLUE_SENTENCES: { text: string; who: Line['who'] }[] = [
  { who: 'uma', text: '太陽從 sumal 出來，從 momal 下去。' },
  { who: 'afu', text: '冬天的東北季風，是從 tirak 和 sumal 中間吹過來的。' },
  { who: 'friar', text: 'dapu 跟 tirak 是相反的方向。' },
];
// 契約四行：每一行是一串字；方向字對到 Dir，地標字對到地標
export interface DeedLine { words: string[]; dir: string; to: string }
export const DEED: DeedLine[] = [
  { words: ['ka', 'tavok', 'mia', 'sumal', 'sinna'], dir: 'sumal', to: 'sinna' },
  { words: ['lulu', 'sinna', 'mia', 'tirak', 'kaloh'], dir: 'tirak', to: 'kaloh' },
  { words: ['ka', 'kaloh', 'mia', 'momal', 'pavul'], dir: 'momal', to: 'pavul' },
  { words: ['ka', 'pavul', 'mia', 'dapu', 'tavok'], dir: 'dapu', to: 'tavok' },
];
export const dirOf = (w: string): Dir => (w === 'sumal' ? 'E' : SECRET[w]);
export const DEED_LEGS: Leg[] = DEED.map((l) => ({ dir: dirOf(l.dir), to: l.to }));
// 界線地圖（7×5 格）：地標種類就是羅馬字
export const LAND_SPOTS: Spot[] = [
  { id: 'stone', kind: 'tavok', col: 1, row: 3 },
  { id: 'stone2', kind: 'tavok', col: 6, row: 4 },
  { id: 'river-a', kind: 'sinna', col: 4, row: 3 },
  { id: 'bamboo-n', kind: 'kaloh', col: 4, row: 0 },
  { id: 'bamboo-s', kind: 'kaloh', col: 4, row: 4 },
  { id: 'tree-w', kind: 'pavul', col: 1, row: 0 },
  { id: 'tree-e', kind: 'pavul', col: 6, row: 1 },
];
export const LAND_START = 'stone';
export const SPOT_ICON: Record<string, string> = { tavok: art3('g-05-stone'), sinna: '', kaloh: '🎋', pavul: '🌳' };
export const LAND_DECOR = [
  { icon: '🛖', col: 2, row: 1.6, text: '新港社' },
  { icon: '🌾', col: 2.4, row: 2.6, text: '社裡的田' },
  { icon: '🎍', col: 5.6, row: 2.4, text: '新開的甘蔗田' },
];
export const DEED_INTRO: Line[] = [
  { who: 'uma', text: '傳教士教我們用羅馬字母，拼出我們自己說的話。這是社裡跟人約好土地範圍的契約。' },
  { who: 'uma', text: '有人在溪的另一邊開了甘蔗田，我們要確認界線在哪裡。可是有三個方向的字，我想不起來是什麼意思。' },
  { who: 'tick', mood: 'thinking', text: '查單字表，再看看下面的句子，猜出那三個字！' },
];
export const DEED_SAY = {
  wrongWord: { who: 'uma', text: '紅色那個字的意思不對，再讀一次下面的句子。' } as Line,
  wordHint: { who: 'friar', text: '太陽從東邊出來、西邊下去；東北季風從北邊和東邊中間吹來。' } as Line,
  decoded: { who: 'uma', text: '全部讀懂了！現在照契約，在地圖上把界線一段一段點出來。' } as Line,
  wrongSpot: (want: string, kind: string) => ({ who: 'uma', text: `契約說往「${want}」走到${kind}。看看指南針，再找一次。` } as Line),
  traced: { who: 'siraya', text: '對，就是這條線。溪的這一邊是我們社的地，那一邊是新開的甘蔗田。' } as Line,
};

// ── 5 北邊的城堡 ──
export const HARBORS: { title: string; rows: string[]; moves: number; intro: Line[] }[] = [
  {
    title: '送補給進城堡', moves: 10,
    rows: ['...D..', 'HHGDEB', 'AAG.EB', 'J.FFE.', 'J..CC.', 'J..II.'],
    intro: [
      { who: 'friar', text: '我是西班牙來的傳教士。1626 年，西班牙人在這座小島上蓋了聖薩爾瓦多城。' },
      { who: 'friar', text: '下了好多天雨，城裡快沒米了。紅帆的補給船被擠在港灣裡，出不去。' },
      { who: 'tick', mood: 'thinking', text: '船只能前後滑，不能轉彎。把擋路的船移開，讓紅帆船從右邊開到城堡！' },
    ],
  },
  {
    title: '讓傳教士平安離開', moves: 16,
    rows: ['..C..D', '..C..D', 'AAC..D', 'HFF.EE', 'HG.BBB', '.G.III'],
    intro: [
      { who: 'tick', mood: 'worried', text: '1642 年，荷蘭人的船開到基隆。西班牙人決定離開，把城堡交出去。' },
      { who: 'friar', text: '港灣裡又擠滿了船。幫我把載著行李和書的紅帆船，平安開出去吧。' },
    ],
  },
];
export const FORT_SAY = {
  over: { who: 'friar', text: '潮水要退了，船都卡住了……我們從頭排一次吧。' } as Line,
  hint: { who: 'afu', mood: 'thinking', text: '先看看紅帆船前面是誰擋著，再看那艘船要往哪邊滑才讓得開。' } as Line,
  good: { who: 'friar', text: '開出去了！謝謝你們。' } as Line,
};
export const FORT_DONE: Line[] = [
  { who: 'friar', text: '雖然要離開了，我會記得這裡的山、這裡的雨，還有這裡的人。' },
  { who: 'afu', mood: 'thinking', text: '大員是荷蘭人、北邊是西班牙人……大家都想要這座島的港口耶。' },
  { who: 'tick', mood: 'thinking', text: '因為臺灣就在中國、日本、南洋的中間，船來船往，很重要。' },
];
export const FLEET: Line[] = [
  { who: 'tick', mood: 'worried', text: '這是 1661 年。好多中國式的大船，從鹿耳門的水道開進來了！' },
  { who: 'clerk', text: '那是……鄭成功的船隊！他們趁著漲潮開進來了！' },
  { who: 'afu', mood: 'scared', text: '那麼多船，大員會變成怎樣？' },
  { who: 'tick', mood: 'thinking', text: '第二年，荷蘭人離開了臺灣。下一個時代，要開始了。' },
];

// ── 6 結算 ──
export const backHome = (k: Picks3): Line[] => [
  { who: 'tick', mood: 'happy', text: '齒輪回到我手上了！我們從時光鐘看一眼大員港——' },
  { who: 'afu', mood: 'thumbs', text: '霧散了！潮水退了又漲，今天終於是新的一天！' },
  k.deer === 1
    ? { who: 'uma', text: '新港社外面的草原上，小鹿跟著媽媽在吃草。我們跟商館說好的規矩，大家都有守。' }
    : { who: 'uma', text: '碼頭上的鹿皮堆得好高……可是草原上，已經很難看到鹿了。我們要想辦法讓牠們回來。' },
  k.deed === 1
    ? { who: 'uma', text: '界線上的石頭還立在那裡，契約上也寫得清清楚楚。' }
    : { who: 'uma', text: '我們的界線圖，大家都抄了一份。用羅馬字寫的契約，以後的人也看得懂。' },
  k.mom === 1
    ? { who: 'afu', mood: 'happy', text: '我跟阿爸等到季風對了，回福建把阿娘接來了！阿娘說，我變勇敢了。' }
    : { who: 'afu', mood: 'happy', text: '阿娘收到信，挑了風浪小的日子出發，平安到大員了！' },
  k.honest === 1
    ? { who: 'clerk', text: '阿福那天自己把銀子拿回來還，商館現在都找他搬貨。' }
    : { who: 'clerk', text: '你們那天提醒我算錯帳，商館現在都找阿福搬貨。' },
];
export const BACK_NOW3: Line[] = [
  { who: 'tick', mood: 'happy', text: '第三顆齒輪也在時光鐘裡轉起來了。' },
  { who: 'tick', mood: 'thinking', text: '船、季風、貨物和各地來的人，讓臺灣第一次跟整個世界連在一起。' },
];
export const FAREWELL3: Line[] = [
  { who: 'afu', mood: 'happy', text: '這枚銅錢給你。是我在大員搬貨，賺到的第一枚錢。' },
  { who: 'uma', text: '我把你的名字，用羅馬字寫在我的單字本裡了。' },
];
export const KEEPSAKE3 = { id: 'afu-coin', img: 'ch3/g-05-coin.webp', title: '綁紅繩的銅錢', text: '阿福在大員搬貨賺到的第一枚錢。他一直說，要存很多很多，讓阿娘渡海來。' };
export const TRUTH3 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，你在幾天裡就跑遍了大員、新港社和基隆，還一下子跳過了快四十年。新港文書那一關的羅馬字，是遊戲自己編的。阿福、烏瑪、商館員和傳教士都是遊戲裡的角色。',
  real: '1624 年荷蘭人到大員，1626 年西班牙人到基隆，1642 年荷蘭人把西班牙人趕走，1662 年鄭成功讓荷蘭人離開臺灣。那時候臺灣的鹿皮大量運到日本，鹿被捕得越來越少。荷蘭傳教士教西拉雅族人用羅馬字寫自己的語言，荷蘭人走了以後，他們還用這種文字寫土地契約，叫做「新港文書」。',
  source: '國小社會五年級上學期（康軒版）〈大航海時代的臺灣〉；文化部《臺灣大百科全書》「熱蘭遮城」「新港文書」條；國立臺灣歷史博物館',
};

// ── 圖鑑卡 ──
const SRC = {
  textbook: '國小社會五年級上學期（康軒版）〈大航海時代的臺灣〉',
  nanyi: '國小社會五年級上學期（南一版）國際競爭下的臺灣',
  ency: '文化部《臺灣大百科全書》',
  nmth: '國立臺灣歷史博物館',
  tainan: '臺南市政府文化局（安平古堡）',
  keelung: '基隆市政府文化局（和平島考古與聖薩爾瓦多城）',
  cip: '原住民族委員會〈平埔族群〉介紹',
};
export const CARDS3: Record<string, Card> = {
  tayouan: { id: 'tayouan', title: '大員', kind: '地點', img: 'ch3/s-13.webp', source: `${SRC.textbook}；${SRC.tainan}`,
    text: '今天台南安平一帶，從前是海邊的沙洲。1624 年荷蘭人來到這裡，把它變成做生意的港口。' },
  zeelandia: { id: 'zeelandia', title: '熱蘭遮城', kind: '地點', img: 'ch3/o-07-zeelandia.webp', source: `${SRC.ency}「熱蘭遮城」；${SRC.tainan}`,
    text: '荷蘭人在大員蓋的城堡，用磚頭砌成，四個角往外突出。今天的安平古堡，就是在它的遺址上。' },
  voc: { id: 'voc', title: '荷蘭東印度公司', kind: '知識', img: 'ch3/p-17-clerk.webp', source: `${SRC.textbook}；${SRC.nmth}`,
    text: '荷蘭人組成、到亞洲做生意的大公司，總部在南洋的巴達維亞（今天的印尼雅加達）。大員是它在東亞的重要據點。' },
  entrepot: { id: 'entrepot', title: '轉口貿易', kind: '知識', img: 'ch3/g-05-ship.webp', source: `${SRC.textbook}；${SRC.nanyi}`,
    text: '貨物先運到一個港口，再轉運到別的地方賣。中國的生絲、瓷器經過大員，運到日本、南洋和歐洲。' },
  monsoon: { id: 'monsoon', title: '季風', kind: '知識', source: '國小社會四、五年級〈臺灣的氣候〉；中央氣象署公開資料',
    text: '冬天吹東北季風，夏天吹西南季風。從前的帆船要看季風出航，往北去日本多半在夏天，回程在冬天。' },
  deerskin: { id: 'deerskin', title: '鹿皮', kind: '物品', img: 'ch3/g-05-deerskin.webp', source: `${SRC.textbook}；${SRC.ency}「鹿皮貿易」`,
    text: '荷蘭時期臺灣重要的出口貨，大多賣到日本做武士的盔甲和衣物。每年運走好幾萬張，鹿越來越少。' },
  sugar: { id: 'sugar', title: '蔗糖', kind: '物品', img: 'ch3/g-05-sugar.webp', source: `${SRC.textbook}；${SRC.nmth}`,
    text: '荷蘭人招募從福建渡海來的漢人種甘蔗、做糖，蔗糖運到日本、波斯等地方賣。' },
  sinkan: { id: 'sinkan', title: '新港文書', kind: '物品', img: 'ch3/g-05-quill.webp', source: `${SRC.ency}「新港文書」；${SRC.nmth}`,
    text: '荷蘭傳教士教西拉雅族人用羅馬字拼寫自己的語言。荷蘭人走後，他們還用這種文字寫土地契約，後來叫做新港文書。' },
  siraya: { id: 'siraya', title: '西拉雅族', kind: '人物', img: 'ch3/p-17-elder.webp', source: `${SRC.cip}；${SRC.textbook}`,
    text: '住在台南一帶平原的平埔族群，新港社就是西拉雅族的社。荷蘭人來的時候，最先接觸的就是他們。' },
  salvador: { id: 'salvador', title: '聖薩爾瓦多城', kind: '地點', img: 'ch3/o-07-salvador.webp', source: `${SRC.keelung}；${SRC.ency}「聖薩爾瓦多城」`,
    text: '1626 年西班牙人在基隆的社寮島（今天的和平島）蓋的城堡。1642 年荷蘭人把西班牙人趕走，接手了這裡。' },
  spain: { id: 'spain', title: '西班牙人在北臺灣', kind: '知識', img: 'ch3/p-17-friar.webp', source: `${SRC.textbook}；${SRC.keelung}`,
    text: '西班牙人從菲律賓北上，在基隆和淡水蓋城堡、傳教，大約待了十六年。' },
  koxinga: { id: 'koxinga', title: '鄭成功的船隊', kind: '人物', img: 'ch3/g-05-junk.webp', source: `${SRC.textbook}；${SRC.tainan}`,
    text: '1661 年，鄭成功帶著船隊趁漲潮從鹿耳門開進台江內海，圍住熱蘭遮城。第二年荷蘭人離開臺灣。' },
};
export const CARD_ORDER3 = ['siraya', 'koxinga', 'tayouan', 'zeelandia', 'salvador', 'deerskin', 'sugar', 'sinkan', 'voc', 'entrepot', 'monsoon', 'spain'];

// ── 反思題 ──
export interface Question3 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS3: Question3[] = [
  {
    who: 'clerk',
    q: '為什麼大員會變成「轉口貿易」的轉運站？',
    options: ['因為大員的東西全部最便宜', '因為大員在中國、日本、南洋的中間，船可以在這裡換貨、轉運', '因為只有大員有港口'],
    answer: 1,
    why: '臺灣剛好在東亞航線的中間。各地的貨先運到大員，再轉運出去，所以叫轉口貿易。',
  },
  {
    who: 'afu',
    q: '從大員坐帆船去北邊的日本，什麼季節出發比較順？',
    options: ['夏天，吹西南季風的時候', '冬天，吹東北季風的時候', '什麼時候都一樣'],
    answer: 0,
    why: '夏天的西南季風往東北吹，帆船順著風往北走；冬天要回來，就等東北季風。',
  },
  {
    who: 'uma',
    q: '「新港文書」是什麼？',
    options: ['荷蘭人寫給國王的信', '漢人寫的族譜', '西拉雅族人用羅馬字拼寫自己的語言，寫成的契約等文書'],
    answer: 2,
    why: '傳教士教西拉雅族人用羅馬字拼寫自己的話。後來他們用這種文字寫土地契約，留下了很多新港文書。',
  },
];

// ── 示範解法（失敗 5 次後的「看示範」用；測試會檢查它真的過關）──
export const TRADE_DEMO: { buy?: Good; sell?: Good; sail?: PortId }[] = [
  { buy: 'porcelain' }, { buy: 'porcelain' }, { buy: 'sugar' }, { buy: 'sugar' }, { sail: 'batavia' },
  { sell: 'porcelain' }, { sell: 'porcelain' }, { sell: 'sugar' }, { sell: 'sugar' },
  { buy: 'spice' }, { buy: 'spice' }, { buy: 'spice' }, { buy: 'spice' }, { sail: 'tayouan' },
  { sell: 'spice' }, { sell: 'spice' }, { sell: 'spice' }, { sell: 'spice' },
  { buy: 'silk' }, { buy: 'silk' }, { buy: 'silk' }, { buy: 'silk' }, { sail: 'japan' },
  { sell: 'silk' }, { sell: 'silk' }, { sell: 'silk' }, { sell: 'silk' },
];
export const HERD_DEMO = [0, 5, 5, 8];

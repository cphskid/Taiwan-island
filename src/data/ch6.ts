// 第六章《開港與鐵路》的整章資料：河運、烘茶、鋪鐵路、馬偕的醫館、會車時刻表、對話、選擇、圖鑑卡、反思題。
//
// 時間大約是 1860～1893 年（清帝國後期），地點在臺北的大稻埕、淡水、基隆，鐵路一路到新竹。
// 阿春和茶行老闆、洋行商人是虛構角色；馬偕、劉銘傳是課本裡的人物，只寫課本層次、有把握的事。
// 開港是戰爭後被迫簽約的結果，洋行、傳教都牽涉不同立場；噶瑪蘭族學生的寫法也要留意。
// 文字是初稿，上正式站前要請社會科老師審（特別是開港背景、宗教與原住民族的部分）。

import type { Boat, ClinicLevel, RailLevel, RiverLevel, TeaLevel, TrainLevel } from '../core/railway';
import type { Card, Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art6 = (name: string) => `${BASE}img/ch6/${name}.webp`;

export const STEPS6 = ['開場', '開港通商', '茶葉出口', '鋪鐵路', '馬偕的醫館', '基隆到新竹', '雨停了'] as const;

// ── 時間跳躍：齒輪的光在這個時代跳來跳去，跟著它走 ──
export const YEARS6 = ['1860 年代', '1880 年代', '1887 年', '1890 年代'] as const;
export const JUMPS6: Record<number, { far: string; title: string; place: string; react: Line }> = {
  0: { far: '從大稻埕的雨天，往前跳了二十多年', title: '開港通商', place: '淡水河口', react: { who: 'chun', mood: 'scared', text: '咦？雨停了？河口怎麼多了好多大船……有的船還會冒黑煙！' } },
  1: { far: '跳回阿春的時代', title: '大稻埕的茶行', place: '大稻埕', react: { who: 'chun', mood: 'worried', text: '回到我們家的茶行了……還是在下雨。老闆在門口跺腳。' } },
  2: { far: '跳回阿春的時代，又往後幾年', title: '要蓋鐵路了', place: '基隆・獅球嶺', react: { who: 'chun', mood: 'worried', text: '好多工人在搬石頭、搬鐵條……他們說要讓「火車」從這裡跑過去。' } },
  3: { far: '又往後跳了幾年', title: '火車通了', place: '基隆到新竹', react: { who: 'chun', mood: 'happy', text: '鐵路已經從基隆鋪到臺北，現在還要一直鋪到新竹！' } },
};

// ── 選擇：四個，選哪一個都可以，阿春會記得，結局跟著變 ──
export type Pick6 = 'boss' | 'tunnel' | 'learn' | 'cargo';
export type Picks6 = Partial<Record<Pick6, number>>;
export interface Choice6 { who: Line['who']; mood?: Line['mood']; q: string; options: [string, string]; after: [Line[], Line[]]; recap: [string, string] }
export const CHOICES6: Record<Pick6, Choice6> = {
  boss: {
    who: 'teaboss', q: '洋行在催貨！阿春，今晚不要睡了，給我揀茶揀到天亮！',
    options: ['幫阿春說話：排好順序，白天就做得完', '先不說話，讓阿春自己決定'],
    after: [
      [
        { who: 'chun', mood: 'worried', text: '……你、你幫我說話了？' },
        { who: 'teaboss', text: '哼，說得好聽。好，你們排給我看，天黑前全部烘好，今晚大家就回家睡覺。' },
        { who: 'chun', mood: 'determined', text: '謝謝你！那我們一定要排好！' },
      ],
      [
        { who: 'chun', mood: 'determined', text: '……沒關係，我很會揀茶，熬夜也可以。' },
        { who: 'tick', mood: 'thinking', text: '如果天黑前就能全部烘好，阿春就不用熬夜了。我們把順序排好吧！' },
      ],
    ],
    recap: ['茶行：幫阿春跟老闆說話', '茶行：讓阿春自己決定要不要熬夜'],
  },
  tunnel: {
    who: 'liu', q: '基隆和臺北中間，隔著獅球嶺。鐵路要挖隧道穿過去，還是沿著山邊繞過去？',
    options: ['挖隧道穿過去：路短，可是很難挖', '沿著山邊繞過去：不用挖，可是鐵軌要多很多'],
    after: [
      [{ who: 'liu', text: '好！挖隧道很辛苦，可是火車以後就能走最短的路。隧道最多挖兩格，省著用。' }],
      [{ who: 'liu', text: '也好，不用挖山，工人比較安全。不過路變長了，鐵軌要算好，不能浪費。' }],
    ],
    recap: ['獅球嶺：挖隧道穿過去', '獅球嶺：沿著山邊繞過去'],
  },
  learn: {
    who: 'chun', mood: 'worried', q: '馬偕說學堂可以教我認字，還能學幾句英文……可是茶行很忙。我要去嗎？',
    options: ['去學堂：認字、學英文，以後自己跟洋行談', '留在茶行：先把揀茶、看茶學到最好'],
    after: [
      [{ who: 'mackay', text: '歡迎！我也是一個字一個字學臺語的。你教我說茶，我教你說 tea。' }, { who: 'chun', mood: 'happy', text: 'Tea！我會說了！' }],
      [{ who: 'chun', mood: 'determined', text: '我要當最會看茶的人！哪一片茶好，我聞一下就知道。' }, { who: 'mackay', text: '很好。每個人學的東西不一樣，都很了不起。' }],
    ],
    recap: ['淡水：阿春去學堂認字、學英文', '淡水：阿春留在茶行，把看茶學到最好'],
  },
  cargo: {
    who: 'liu', q: '基隆到新竹只有一條鐵軌。兩列火車對開，先讓哪一列一路開到底？',
    options: ['先讓載茶的貨車：茶趕快運到基隆港上船', '先讓載人的客車：大家坐火車去新竹'],
    after: [
      [{ who: 'chun', mood: 'thumbs', text: '我們家的茶要坐火車去基隆港了！' }],
      [{ who: 'chun', mood: 'happy', text: '載人的火車先走……那、那我也可以坐上去嗎？' }],
    ],
    recap: ['時刻表：先讓載茶的貨車開', '時刻表：先讓載人的客車開'],
  },
};

// ── 0 開場 ──
export const OPENING6: Line[] = [
  { who: 'tick', mood: 'worried', text: '又下雨了……見習生，這裡是 1880 年代的臺北大稻埕，淡水河邊的碼頭。' },
  { who: 'tick', mood: 'thinking', text: '第六顆齒輪掉在這個時代。時間卡在同一個大雨天，碼頭上的貨一直運不出去。' },
  { who: 'tick', mood: 'happy', text: '對了，你聽到八堡圳的莊民說的嗎？米多到吃不完，要怎麼運出去？答案就在這裡。' },
  { who: 'chun', mood: 'sad', text: '我叫阿春，在茶行揀茶。這些茶箱堆了好幾天，再不運走，茶葉就要發霉了……' },
  { who: 'teaboss', text: '阿春！還在發呆？洋行的人說，船開不出去，這批茶他們就不要了！' },
  { who: 'chun', mood: 'determined', text: '我的心願是：讓我們家的茶，賣到很遠很遠的地方。' },
  { who: 'chun', mood: 'scared', text: '可是……大家說以後要用「火車」運貨。那個會冒煙、會吼叫的大怪物，我好怕。' },
  { who: 'tick', mood: 'happy', text: '別怕，我們一起去看看貨要怎麼運出去！' },
];
export const CHUN_CARD = { body: art6('f-08a-idle'), from: '大稻埕的茶行', wish: '家裡的茶賣到很遠很遠的地方', fear: '怕火車那個會冒煙的大怪物' };
export const GOAL6 = '讓碼頭的貨運出去，雨才會停';

// ── 1 開港通商：河運 ──
export const PORT_INTRO: Line[] = [
  { who: 'merchant', text: 'Hello！我是從英國來的商人，在淡水開了洋行。這幾年，淡水、基隆、安平、打狗開港了，外國的船可以來做生意。' },
  { who: 'merchant', text: '我想把臺灣的茶運到很遠的地方。可是茶要先從山上、從大稻埕，用船沿著河運到淡水港。' },
  { who: 'chun', mood: 'thinking', text: '河有的地方深、有的地方淺，有的寬、有的窄。船太大會卡住！' },
];
export interface RiverStage { level: RiverLevel; from: string; to: string; goal: string; intro: Line[] }
// 地圖字母見 core/railway.ts
export const RIVERS: RiverStage[] = [
  {
    level: { boat: 'sampan', map: [
      'Annrnnn..',
      '..n...n..',
      '.nn.nnr..',
      '.n..nnnn.',
      '.nnnn..wB',
    ] },
    from: '山上的茶園', to: '大稻埕', goal: '把茶從山上的茶園，用小舢舨運到大稻埕',
    intro: [{ who: 'chun', mood: 'happy', text: '小舢舨很輕，窄窄的小溪也能走。可是石頭灘水太淺，一碰就卡住！' }],
  },
  {
    level: { boat: 'junk', map: [
      '..B......',
      '..w......',
      '..wwswwwA',
      '..n...w..',
      '..nnnnw..',
    ] },
    from: '大稻埕', to: '淡水港', goal: '用大帆船把茶從大稻埕運到淡水港',
    intro: [
      { who: 'merchant', text: '到淡水要換大帆船，一次可以載很多箱。可是大船吃水深，要水深 2 以上才能走，也進不了窄河道。' },
      { who: 'tick', mood: 'thinking', text: '河口附近有沙洲。聽說潮水漲起來的時候，水會變深喔。' },
    ],
  },
  {
    level: { boat: 'sampan', pick: true, map: [
      'Bww......',
      '..w......',
      '..wwswT..',
      '......n..',
      '......nhm',
    ] },
    from: '艋舺', to: '淡水港', goal: '把艋舺的樟腦運到淡水港：先選船，到大稻埕換大船',
    intro: [
      { who: 'chun', mood: 'thinking', text: '這次是從艋舺出發，要運樟腦。以前大船都停艋舺，現在大家都說艋舺的河底被泥沙淤住了……' },
      { who: 'merchant', text: '所以洋行都搬到大稻埕了。到大稻埕以後，貨會換上大帆船。出發的船，你來選。' },
    ],
  },
];
export const BOAT_NAME: Record<Boat['id'], string> = { sampan: '小舢舨', junk: '大帆船' };
export const BOAT_IMG: Record<Boat['id'], string> = { sampan: art6('o-09-sampan'), junk: art6('o-09-junk') };
export const PORT_SAY = {
  shallow: { who: 'chun', mood: 'worried', text: '擱淺了！這裡的水太淺，船開不過去。' } as Line,
  narrow: { who: 'merchant', text: '大帆船太寬了，窄河道進不去！' } as Line,
  short: { who: 'chun', mood: 'thinking', text: '路線還沒接到終點喔。' } as Line,
  tide: { who: 'tick', mood: 'thinking', text: '沙洲、泥灘在退潮的時候太淺……要不要等潮水漲起來再出發？' } as Line,
  silt: { who: 'chun', mood: 'worried', text: '大帆船在艋舺就卡住了！艋舺的河底淤積，太淺了，要先用小船運出來。' } as Line,
  good: { who: 'merchant', text: 'Wonderful！貨平安到港了！' } as Line,
};
export const PORT_DONE: Line[] = [
  { who: 'merchant', text: '茶運到淡水，再坐大輪船出海，可以賣到很遠的國家，像美國。大家都叫它「福爾摩沙烏龍茶」。' },
  { who: 'chun', mood: 'happy', text: '很遠很遠的國家！我們家的茶也可以嗎？' },
];

// ── 2 茶葉出口：烘茶排程 ──
export const TEA_INTRO: Line[] = [
  { who: 'merchant', text: '臺灣出口最多的是茶、糖、樟腦。北部的茶最有名，我們洋行要四批茶，天黑前要裝箱。' },
  { who: 'chun', mood: 'thinking', text: '每批茶都要先揀茶，把茶梗、黃葉挑掉，再放進焙籠烘乾。揀茶桌和焙籠一次都只能做一批。' },
];
export const TEA: TeaLevel = {
  limit: 11, wait: 1,
  batches: [
    { id: 'oolong', name: '烏龍茶（美國）', sort: 2, roast: 4 },
    { id: 'pouchong', name: '包種茶（南洋）', sort: 2, roast: 1 },
    { id: 'fine', name: '細茶（英國）', sort: 1, roast: 3 },
    { id: 'coarse', name: '粗茶（廈門）', sort: 3, roast: 2 },
  ],
};
export const TEA_RULE = `揀好的茶最多等 ${TEA.wait} 小時就要進焙籠，不然會發霉。全部要在 ${TEA.limit} 小時內烘好。`;
export const TEA_SAY = {
  moldy: { who: 'chun', mood: 'sad', text: '有一批茶等太久，還沒進焙籠就發霉了……' } as Line,
  late: { who: 'teaboss', text: '天都黑了還沒烘完！洋行的人等不及了。' } as Line,
  hint1: { who: 'chun', mood: 'thinking', text: '一開始焙籠都空著，好浪費……先揀一批很快就揀好的，焙籠就能早點開工。' } as Line,
  hint2: { who: 'tick', mood: 'thinking', text: '揀得快、烘得久的放前面；烘得很快的，可以留到最後。' } as Line,
  good: { who: 'chun', mood: 'thumbs', text: '天黑前全部烘好了，一片都沒發霉！' } as Line,
};
export const TEA_DONE: Line[] = [
  { who: 'merchant', text: '四批茶都裝進木箱了！明天搬上船。阿春，你們家的茶，香！' },
  { who: 'chun', mood: 'happy', text: '洋行的人說我們的茶香耶！' },
  { who: 'tick', mood: 'worried', text: '可是……碼頭上的雨還是沒停，貨越堆越多。光靠河裡的船，好像不夠。' },
];

// ── 3 鋪鐵路 ──
export const RAIL_INTRO: Line[] = [
  { who: 'liu', text: '我是臺灣巡撫劉銘傳。臺灣要變得更強，要有鐵路、電報、新式學堂。' },
  { who: 'liu', text: '第一段鐵路要從基隆港鋪到臺北。可是中間有山、有河。' },
  { who: 'chun', mood: 'scared', text: '鐵路……就是那個會冒煙的大怪物要走的路嗎？' },
];
// 數字是高度，~ 是河，K 基隆站、P 臺北站
const RAIL_MAP = [
  '44444' + '2K22',
  '44444' + '4442',
  '33344' + '4433',
  '~~~~~' + '~~~~',
  '11232' + '1122',
  'P1132' + '1111',
];
export const RAILS: [RailLevel, RailLevel] = [
  { map: RAIL_MAP, rails: 12, bridges: 1, tunnels: 2 }, // 挖隧道
  { map: RAIL_MAP, rails: 16, bridges: 1, tunnels: 0 }, // 繞路
];
export const RAIL_RULE = '前後兩格的高度最多差 1，火車才爬得上去。過河要搭橋，太陡的山要挖隧道。';
export const RAIL_SAY = {
  steep: { who: 'liu', text: '太陡了！火車爬不上去。找高度差 1 以內的路。' } as Line,
  tunnels: { who: 'liu', text: '隧道已經用完了，不能再挖。' } as Line,
  bridges: { who: 'liu', text: '橋的材料用完了！只能過一次河。' } as Line,
  rails: { who: 'chun', mood: 'worried', text: '鐵軌用完了，還沒接到臺北……要不要退回去，換一條比較短的路？' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '看看發光的那一格，從那裡走！' } as Line,
  good: { who: 'liu', text: '基隆和臺北接起來了！' } as Line,
};
export const RAIL_DONE: Line[] = [
  { who: 'tick', mood: 'happy', text: '試車囉！火車頭冒著白煙，從基隆開過來了——' },
  { who: 'chun', mood: 'scared', text: '嗚哇！好大聲！它、它在吼！' },
  { who: 'chun', mood: 'worried', text: '……咦？它沒有咬人。它在載東西耶，好多好多箱。' },
  { who: 'chun', mood: 'happy', text: '一列火車就能載好多船的貨！好像……沒那麼可怕了。' },
  { who: 'liu', text: '這條鐵路 1887 年開工，1891 年從基隆通到臺北。之後還要一直鋪到新竹。' },
];

// ── 4 馬偕的醫館 ──
export const CLINIC_INTRO: Line[] = [
  { who: 'mackay', text: '你們好，我是馬偕，從加拿大來，在淡水住了很多年。我在這裡看病、拔牙，也開了學堂。' },
  { who: 'chun', mood: 'happy', text: '他說臺語耶！說得好好！' },
  { who: 'mackay', text: '今天病人好多。我們三個人，每人最多看兩個病人。病要對、話也要聽得懂，才能好好看病。' },
];
export const CLINIC: ClinicLevel = {
  cap: 2,
  healers: [
    { id: 'mackay', name: '馬偕', langs: ['臺語', '英語'], can: ['tooth', 'fever'] },
    { id: 'han', name: '學堂學生（漢人）', langs: ['臺語', '客語'], can: ['fever', 'wound'] },
    { id: 'kav', name: '學堂學生（噶瑪蘭族）', langs: ['噶瑪蘭語', '臺語'], can: ['wound'] },
  ],
  patients: [
    { id: 'uncle', name: '挑夫阿伯', lang: '臺語', need: 'tooth', says: '牙齒痛到臉都腫起來了……' },
    { id: 'hakka', name: '客家阿婆', lang: '客語', need: 'fever', says: '一下子好冷、一下子好熱，一直發抖。（說客語）' },
    { id: 'kid', name: '噶瑪蘭族小孩', lang: '噶瑪蘭語', need: 'wound', says: '腳被石頭割傷了。（說噶瑪蘭語）' },
    { id: 'sailor', name: '外國船員', lang: '英語', need: 'fever', says: 'I feel cold and hot...（說英語：又冷又熱）' },
    { id: 'porter', name: '碼頭工人', lang: '臺語', need: 'wound', says: '搬茶箱被木頭刮傷手了。' },
    { id: 'aunt', name: '茶行阿姨', lang: '臺語', need: 'fever', says: '我又發冷又發熱，頭好暈。' },
  ],
};
export const NEED_NAME: Record<string, string> = { tooth: '拔牙', fever: '發冷發熱（瘧疾）要吃藥', wound: '傷口要清洗包紮' };
export const CLINIC_SAY = {
  lang: { who: 'chun', mood: 'worried', text: '他們說的話聽不懂，要怎麼問哪裡不舒服？' } as Line,
  skill: { who: 'mackay', text: '這個病，他還不會治。看看每個人會做什麼。' } as Line,
  full: { who: 'mackay', text: '一個人看太多病人了，忙不過來。每個人最多兩個。' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '先找「只有一個人能看」的病人：說英語的船員、要拔牙的阿伯，只有馬偕能看。' } as Line,
  good: { who: 'mackay', text: '每個病人都找到對的人了。大家說不同的話，一起合作，就能幫更多人。' } as Line,
};
export const CLINIC_DONE: Line[] = [
  { who: 'mackay', text: '我在淡水拔了好多好多顆牙，也發藥治瘧疾。我的學生裡，有漢人，也有噶瑪蘭族的孩子。' },
  { who: 'chun', mood: 'thinking', text: '你從那麼遠的地方來，還學會我們的話……' },
];

// ── 5 基隆到新竹：會車時刻表 ──
export const TRAIN_INTRO: Line[] = [
  { who: 'liu', text: '鐵路鋪到新竹了！可是一路上只有一條鐵軌，兩列車對開，在軌道上碰頭就會撞車。' },
  { who: 'liu', text: '車站有旁邊的側線，可以停下來讓車。你來排：哪一列車在哪一站停多久？' },
  { who: 'chun', mood: 'thinking', text: '一格是 10 分鐘。兩條線在兩站中間交叉，就是撞車了！' },
];
const STATIONS = ['基隆', '水返腳', '臺北', '桃仔園', '新竹'];
// 下行（基隆→新竹）是客車，上行（新竹→基隆）是載茶的貨車。deadline：[客車, 貨車] 最晚幾格要到
export const TRAINS: [TrainLevel, TrainLevel] = [
  { stations: STATIONS, legs: [3, 2, 5, 4], deadline: [18, 14], maxWait: 8 }, // 先讓貨車
  { stations: STATIONS, legs: [3, 2, 5, 4], deadline: [14, 20], maxWait: 8 }, // 先讓客車
];
export const TRAIN_NAME = ['客車（基隆→新竹）', '貨車（新竹→基隆）'];
export const TRAIN_SAY = {
  crash: { who: 'liu', text: '兩列車在同一段鐵軌上碰頭了！要有一列先在車站等。' } as Line,
  late: { who: 'chun', mood: 'worried', text: '有一列車等太久，太晚到了。' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '讓要先走的那列一路不停。另一列，停在「對方開過來時剛好會經過」的那一站。' } as Line,
  good: { who: 'liu', text: '兩列車在車站錯開，平平安安！這就是時刻表的用處。' } as Line,
};
export const TRAIN_DONE: Line[] = [
  { who: 'chun', mood: 'happy', text: '我、我坐上火車了！窗外的田一直往後跑，好快！' },
  { who: 'chun', mood: 'thumbs', text: '我一點都不怕了。火車不是怪物，是會把茶、把人送到遠方的好朋友！' },
  { who: 'liu', text: '劉銘傳還架了電報線，消息一下子就能從臺北傳到對岸。' },
  { who: 'liu', text: '可惜鐵路只鋪到新竹……以後，鐵路要從北到南一路通到高雄，這是下一個時代的事了。' },
  { who: 'tick', mood: 'thinking', text: '從北到南的鐵路，還有更大的水圳……南邊嘉南平原的裂縫，好像在發光。' },
];

// ── 6 雨停了 ──
export const RAIN_STOP: Line[] = [
  { who: 'tick', mood: 'happy', text: '火車的汽笛響了——雨停了！碼頭的茶箱一箱一箱搬上火車和大船。' },
  { who: 'tick', mood: 'happy', text: '你看，火車頭的汽笛裡卡著一個亮亮的東西……是第六顆齒輪！' },
];
// 結局：照一路上的選擇
export const endLines = (k: Picks6): Line[] => [
  k.boss === 0
    ? { who: 'chun', mood: 'happy', text: '老闆說，以後排好順序，大家晚上都可以回家睡覺。謝謝你那時候幫我說話。' }
    : { who: 'chun', mood: 'determined', text: '那天我差點要熬夜，還好排得好。下次我會自己跟老闆說！' },
  k.tunnel === 1
    ? { who: 'chun', mood: 'happy', text: '鐵路沿著山邊彎來彎去，像一條長長的龍。' }
    : { who: 'chun', mood: 'happy', text: '火車鑽進獅球嶺的隧道，一下子黑黑的，一下子又亮起來，好好玩！' },
  k.learn === 0
    ? { who: 'chun', mood: 'thumbs', text: '我會說 tea、會說 Taiwan 了！以後我要自己跟洋行的人介紹我們家的茶。' }
    : { who: 'chun', mood: 'thumbs', text: '老闆說我是全大稻埕鼻子最靈的揀茶女孩，好茶一聞就知道！' },
  k.cargo === 1
    ? { who: 'chun', mood: 'happy', text: '我坐上第一班客車，去新竹看了好多沒看過的地方。' }
    : { who: 'chun', mood: 'happy', text: '我們家的茶坐火車到基隆港，再坐大輪船去很遠很遠的地方了！' },
];
export const FAREWELL6: Line[] = [
  { who: 'chun', mood: 'sad', text: '你們要走了嗎？……我會想你們。' },
  { who: 'chun', mood: 'happy', text: '這罐茶葉給你。是我自己揀、自己看著烘的。很遠很遠的地方，也喝得到。' },
];
export const KEEPSAKE6 = { id: 'chun-tea', img: 'ch6/g-07-tin.webp', title: '阿春的一罐茶葉', text: '阿春親手揀、看著烘好的茶葉。罐子上的葉子，是她畫的記號。' };
export const TRUTH6 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，開港、鋪鐵路、通車好像一下子就做完了，阿春也跟著我們在幾十年裡跳來跳去。阿春、茶行老闆和洋行商人都是遊戲裡的角色。',
  real: '開港是清朝打了敗仗、和外國簽約以後才開放的，前後大約三十年，茶和樟腦越賣越多，大稻埕也越來越熱鬧。劉銘傳的鐵路 1887 年開工，基隆到臺北 1891 年通車，1893 年才到新竹；獅球嶺隧道是真的挖穿山的。馬偕在淡水行醫、辦學，前後將近三十年。',
  source: '國小社會五年級下學期（康軒版）開港通商與清末建設；文化部《臺灣大百科全書》',
};

// ── 圖鑑卡（id 加 c6- 避免和別章撞名）──
const SRC = {
  textbook: '國小社會五年級下學期（康軒版）〈清帝國時期臺灣的發展與改變〉開港通商與建設',
  nani: '國小社會五年級下學期（南一版）清末的開港與建設',
  encyclo: '文化部《臺灣大百科全書》',
  memory: '國家文化記憶庫',
  ntm: '國立臺灣博物館（騰雲號機關車）',
  tamsui: '新北市立淡水古蹟博物館（滬尾偕醫館、理學堂大書院）',
  tea: '農業部茶及飲料作物改良場',
};
export const CARDS6: Record<string, Card> = {
  'c6-dadaocheng': { id: 'c6-dadaocheng', title: '大稻埕', kind: '地點', img: 'ch6/s-19.webp', source: `${SRC.encyclo}「大稻埕」；${SRC.textbook}`,
    text: '淡水河邊的街區。艋舺的河道淤積以後，船改停大稻埕。開港後這裡茶行、洋行越來越多，成了臺北最熱鬧的地方之一。' },
  'c6-openport': { id: 'c6-openport', title: '開港通商', kind: '知識', source: `${SRC.textbook}；${SRC.nani}`,
    text: '1860 年代起，清朝和外國簽約後，臺灣陸續開放淡水、基隆、安平、打狗四個港口，外國商人可以來做生意。' },
  'c6-tamsui': { id: 'c6-tamsui', title: '淡水', kind: '地點', img: 'ch6/s-21.webp', source: `${SRC.tamsui}；${SRC.textbook}`,
    text: '淡水河的出海口。開港後是北臺灣最重要的港口，大稻埕的茶從這裡上大船出海。' },
  'c6-hong': { id: 'c6-hong', title: '洋行', kind: '知識', img: 'ch6/p-19-merchant.webp', source: `${SRC.encyclo}；${SRC.textbook}`,
    text: '外國商人開的貿易公司。他們向臺灣人買茶、樟腦、糖，運到國外去賣，也把外國的貨運進來。' },
  'c6-tea': { id: 'c6-tea', title: '茶葉', kind: '物品', img: 'ch6/g-07-tea.webp', source: `${SRC.tea}；${SRC.textbook}`,
    text: '清末北臺灣最重要的出口品。烏龍茶賣到美國很受歡迎，被叫做「福爾摩沙烏龍茶」；包種茶多賣到南洋。' },
  'c6-camphor': { id: 'c6-camphor', title: '樟腦', kind: '物品', img: 'ch6/g-07-camphor.webp', source: `${SRC.encyclo}「樟腦」；${SRC.textbook}`,
    text: '從樟樹熬出來的白色結晶，可以做藥、防蟲，也是工廠的原料。和茶、糖一起，是清末臺灣三大出口品。' },
  'c6-liu': { id: 'c6-liu', title: '劉銘傳', kind: '人物', img: 'ch6/p-19-liu.webp', source: `${SRC.textbook}；${SRC.encyclo}「劉銘傳」`,
    text: '臺灣建省後的第一任巡撫。他推動鋪鐵路、架電報線、設郵政和新式學堂，讓臺灣更現代化。' },
  'c6-tunnel': { id: 'c6-tunnel', title: '獅球嶺隧道', kind: '地點', img: 'ch6/g-07-tunnel.webp', source: `${SRC.memory}；${SRC.encyclo}`,
    text: '基隆和臺北中間的獅球嶺很陡，火車爬不過去，就挖了隧道穿過山。這是臺灣第一座鐵路隧道。' },
  'c6-keelung': { id: 'c6-keelung', title: '基隆港', kind: '地點', img: 'ch6/o-09-steamer.webp', source: SRC.textbook,
    text: '北臺灣的深水港，開港後外國船可以停靠。鐵路從基隆港出發，貨物下了火車就能直接上大船。' },
  'c6-mackay': { id: 'c6-mackay', title: '馬偕', kind: '人物', img: 'ch6/p-19-mackay.webp', source: `${SRC.tamsui}；${SRC.textbook}`,
    text: '從加拿大來的傳教士，在淡水住了將近三十年。他學會臺語，幫人拔牙、看病，開了醫館，也辦學堂教新知識。' },
  'c6-railway': { id: 'c6-railway', title: '鐵路（基隆到新竹）', kind: '物品', img: 'ch6/o-09-loco.webp', source: `${SRC.ntm}；${SRC.textbook}`,
    text: '劉銘傳時代鋪的鐵路，1891 年基隆到臺北通車，1893 年到新竹。當時的火車頭「騰雲號」現在還保存在博物館裡。' },
  'c6-telegraph': { id: 'c6-telegraph', title: '電報', kind: '物品', img: 'ch6/g-07-pole.webp', source: SRC.textbook,
    text: '用電線傳遞消息的方法。劉銘傳架設電報線，還鋪了海底電纜通到對岸，消息很快就能傳到很遠的地方。' },
};
export const CARD_ORDER6 = ['c6-liu', 'c6-mackay', 'c6-dadaocheng', 'c6-tamsui', 'c6-keelung', 'c6-tunnel', 'c6-tea', 'c6-camphor', 'c6-railway', 'c6-telegraph', 'c6-openport', 'c6-hong'];

// ── 反思題 ──
export interface Question6 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS6: Question6[] = [
  {
    who: 'chun',
    q: '開港以後，大稻埕為什麼變得那麼熱鬧？',
    options: ['因為大稻埕最靠近大海', '茶葉大量出口，茶行、洋行都聚在大稻埕', '因為大稻埕從來不下雨'],
    answer: 1,
    why: '開港後北部的茶賣到國外，茶行、洋行和碼頭工人都聚到淡水河邊的大稻埕，街上越來越熱鬧。',
  },
  {
    who: 'liu',
    q: '鐵路蓋好以後，最大的改變是什麼？',
    options: ['人和貨物可以更快運到遠方', '大家都不用走路了', '河裡的船全部不見了'],
    answer: 0,
    why: '一列火車能載很多貨和人，又不怕河水深淺，臺北和基隆港之間的運輸快多了。',
  },
  {
    who: 'mackay',
    q: '馬偕在淡水，用什麼方法和當地人交流？',
    options: ['要大家都改說英文', '只跟外國人來往', '學臺語、看病拔牙、辦學堂，和不同族群的人一起學習'],
    answer: 2,
    why: '馬偕先學會當地人的話，再用醫療和教育幫助大家；他的學生有漢人，也有原住民族。不同文化的人互相學習。',
  },
];

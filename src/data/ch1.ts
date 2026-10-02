// 第一章《島嶼的第一道火光》（史前）的整章資料：關卡、對話、圖鑑卡、反思題。
//
// 跟著齒輪往後跳四個時代：長濱文化（打製石器）→ 大坌坑文化（陶器）→ 卑南文化（磨製石器、玉器）
// → 十三行文化（煉鐵），最後當考古學家把挖到的東西排回時間尺。
// 阿岩是虛構的長濱文化男孩；各時代的人也是虛構的。年代寫「大約」，照國小課本的說法；
// 文字是初稿，上正式站前請社會科老師審。十三行文化和哪些族群有關，上正式站前要請人審。

import type { KnapLevel, FireLevel, GrindLevel, ForestLevel } from '../core/stone-age';
import type { Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art = (name: string) => `${BASE}img/ch1/${name}.webp`;

export const STEPS1 = ['開場', '打製石器', '陶器', '磨製石器', '煉鐵', '考古', '回到現在'] as const;

// ── 時代 ──
export type EraId = 'changbin' | 'dabenkeng' | 'beinan' | 'shisanhang';
export interface Era { id: EraId; name: string; age: string; when: string; place: string; bg: string }
export const ERAS: Era[] = [
  { id: 'changbin', name: '長濱文化', age: '舊石器時代', when: '大約幾萬年前', place: '臺東長濱 八仙洞', bg: art('s-05') },
  { id: 'dabenkeng', name: '大坌坑文化', age: '新石器時代', when: '大約六、七千年前', place: '新北八里 大坌坑', bg: art('s-06') },
  { id: 'beinan', name: '卑南文化', age: '新石器時代', when: '大約三千多年前', place: '臺東 卑南', bg: art('s-07') },
  { id: 'shisanhang', name: '十三行文化', age: '金屬器時代', when: '大約一、兩千年前', place: '新北八里 十三行', bg: art('s-08') },
];
export const eraOf = (id: EraId) => ERAS.find((e) => e.id === id)!;

// ── 開場 ──
export const OPENING1: Line[] = [
  { who: 'tick', mood: 'worried', text: '好冷……見習生，這裡是好幾萬年前的東海岸，一個叫八仙洞的海邊山洞。' },
  { who: 'tick', mood: 'thinking', text: '第一顆齒輪掉進洞裡，把洞裡的火弄熄了。火不回來，這裡的夜晚就一直不會結束。' },
  { who: 'yan', mood: 'scared', text: '你、你們是誰？是從太陽石裡跑出來的嗎？' },
  { who: 'yan', mood: 'determined', text: '我叫阿岩。這顆會發光的太陽石是我撿到的，不給你！它是洞裡唯一的光。' },
  { who: 'yan', mood: 'sad', text: '火熄了，大家都冷得縮成一團。我……最怕黑了。' },
  { who: 'tick', mood: 'happy', text: '那我們先幫你把火點回來！阿岩，你知道哪裡有好石頭嗎？' },
  { who: 'yan', mood: 'thumbs', text: '當然！石頭敲一敲，聽聲音就知道硬不硬。可是要敲出什麼形狀，我還不太會。' },
];
export const YAN_CARD = { body: art('f-04a-idle'), from: '八仙洞', wish: '看到森林裡的鹿群', fear: '怕黑' };
export const GOAL1 = '把洞裡的火點回來，夜晚才會結束';

// ── 1 打製石器 ──
export const STONES_INTRO: Line[] = [
  { who: 'yan', mood: 'happy', text: '海邊有好多石頭。點一點，敲敲看哪一顆聲音最清脆。要一顆硬的當材料、一顆圓的當槌子。' },
];
// 海灘上的石頭：soft 一敲就碎、hard 當材料、hammer 當槌子
export const BEACH: { kind: 'soft' | 'hard' | 'hammer'; x: number; y: number }[] = [
  { kind: 'soft', x: 0.22, y: 0.78 }, { kind: 'hard', x: 0.38, y: 0.86 }, { kind: 'soft', x: 0.55, y: 0.8 },
  { kind: 'hammer', x: 0.7, y: 0.88 }, { kind: 'soft', x: 0.84, y: 0.76 }, { kind: 'hard', x: 0.46, y: 0.72 },
];
export const STONE_SAY = {
  soft: { who: 'yan', mood: 'frown', text: '沙沙的、一敲就碎，這種軟石頭不行。' } as Line,
  hard: { who: 'yan', mood: 'happy', text: '「叩！」聲音好清脆，這顆夠硬，可以當材料。' } as Line,
  hammer: { who: 'yan', mood: 'thumbs', text: '圓圓的、拿起來剛好，這顆當槌子！' } as Line,
};
export const KNAP_INTRO: Line[] = [
  { who: 'yan', mood: 'determined', text: '虛線是要留下來的形狀。點石頭邊邊的一格，再選從哪一邊敲。' },
  { who: 'tick', mood: 'thinking', text: '小心，石片很大片，會連後面那一格一起掉下來。先看黃色的預告再敲！' },
];
export const KNAPS: { name: string; use: string; level: KnapLevel }[] = [
  { name: '砍砸器', use: '可以砍樹枝、敲開貝殼', level: { rows: ['.oooo.', 'oo##oo', 'o####o', 'o####o', '.oooo.'] } },
  { name: '刮削器', use: '可以刮魚鱗、削木頭', level: { rows: ['.ooooo.', 'oo###oo', 'o#####o', 'oo###oo', '.oo#oo.', '..ooo..'] } },
];
export const KNAP_BROKE: Line = { who: 'yan', mood: 'worried', text: '啊，敲到要留的地方了！換一顆再來。這次先敲最外面、旁邊空空的那一格。' };
export const KNAP_HINT: Line = { who: 'yan', mood: 'thinking', text: '我阿爸都是從角落開始，沿著邊一片一片敲，不會正對著要留的地方敲。' };
export const DRILL_INTRO: Line[] = [
  { who: 'yan', mood: 'happy', text: '用刮削器削一根木棒，插在木板上一直轉，就能鑽出火來！' },
  { who: 'tick', mood: 'happy', text: '一直點「鑽！」，讓溫度衝到最上面。停太久會冷掉喔。' },
];
export const FIRE_BACK: Line[] = [
  { who: 'yan', mood: 'thumbs', text: '火回來了！洞裡好亮、好暖！' },
  { who: 'yan', mood: 'happy', text: '我們這裡沒有田，大家靠撿貝殼、抓魚、打獵過日子。有了石器，做什麼都快多了。' },
  { who: 'tick', mood: 'surprised', text: '咦？太陽石在發光……它要帶我們往後跳了！阿岩，抓緊！' },
  { who: 'yan', mood: 'scared', text: '哇啊啊——我不要放手！' },
];

// ── 2 陶器（大坌坑） ──
export const POT_INTRO: Line[] = [
  { who: 'tick', mood: 'thinking', text: '我們往後跳了好幾萬年……這裡是大約六、七千年前的北部河口。' },
  { who: 'potter', text: '你們這兩個小傢伙從哪裡冒出來的？剛好，來幫婆婆燒陶。' },
  { who: 'potter', text: '我們開始在這裡種東西、住下來不搬家了，要有罐子才能煮東西、存東西。' },
  { who: 'yan', mood: 'surprised', text: '住下來不搬家？還有罐子？我們山洞裡都沒有這種東西！' },
];
export const CLAY_ASK: Line[] = [
  { who: 'potter', text: '先揉土。黏土裡要拌一點砂，拌幾匙呢？你們試試看，用小罐子燒一下就知道。' },
];
// 黏土裡拌幾匙砂：0 匙會裂、1 匙還有小裂縫、2 匙剛好、3 匙以上散掉
export const SAND_RESULT = [
  { ok: false, text: '燒的時候「啪」一聲裂開了。純黏土受熱縮得太厲害。' },
  { ok: false, text: '還是有小裂縫，再多一點點砂。' },
  { ok: true, text: '燒好了，敲起來「叩叩」響！' },
  { ok: false, text: '砂太多，黏不起來，一碰就散了。' },
  { ok: false, text: '砂太多，黏不起來，一碰就散了。' },
];
export const FIRE_INTRO: Line[] = [
  { who: 'potter', text: '我們不用窯，把柴堆在罐子四周直接燒，叫做野燒。' },
  { who: 'potter', text: '罐子四面都要燒到剛剛好：太冷燒不熟，太燙就裂開。正面的柴熱 2 分，角落的柴兩面各熱 1 分。' },
];
export const FIRES: { level: FireLevel; tip: string }[] = [
  { level: { wood: 6, wind: null, wet: [] }, tip: '把 6 捆柴放好，讓四面都是 3 或 4 分。' },
  { level: { wood: 7, wind: 'N', wet: [] }, tip: '北邊吹來冷風，北面會少 1 分。' },
  { level: { wood: 7, wind: 'NE', wet: ['S'] }, tip: '東北季風來了，北面和東面各少 1 分；南邊地上濕濕的，不能放柴。' },
];
export const FIRE_FAIL = {
  cold: { who: 'potter', text: '有一面還是灰灰的，沒燒熟。那一面附近再多放一點柴。' } as Line,
  crack: { who: 'potter', text: '啪！太燙的那一面裂了。柴不要全堆在同一邊。' } as Line,
};
export const FIRE_HINT: Line = { who: 'yan', mood: 'thinking', text: '我發現角落的柴很好用，一捆就能照顧到兩面！' };
export const CORD_ASK: Line[] = [
  { who: 'potter', text: '最後，趁土還軟，用繩子在罐子外面拍一拍，拍出紋路，罐子會更結實。' },
];
export const POT_DONE: Line[] = [
  { who: 'potter', text: '這就是我們的繩紋陶。以後有人挖到碎片，就知道我們在這裡住過。' },
  { who: 'yan', mood: 'happy', text: '我也要做一個帶回山洞給阿媽！' },
  { who: 'tick', mood: 'surprised', text: '太陽石又亮了！下一站！' },
];

// ── 3 磨製石器（卑南） ──
export const GRIND_INTRO: Line[] = [
  { who: 'tick', mood: 'thinking', text: '現在是大約三千多年前，臺東的卑南。你看那根好高的石柱！' },
  { who: 'jade', text: '歡迎！我們用石板蓋房子，也用石板做棺材，把家人好好地埋在家裡下面。' },
  { who: 'jade', text: '我們不只敲石頭，還會加水和砂，在磨石上慢慢磨。磨過的石器又光滑又鋒利。' },
  { who: 'yan', mood: 'frown', text: '慢慢磨？敲幾下不就好了嗎？' },
  { who: 'jade', text: '來試試。在一個地方磨一下，那裡會少 2 層，旁邊兩格各少 1 層。剛好磨到虛線，不能磨過頭。' },
];
export const GRINDS: { name: string; use: string; img: string; level: GrindLevel }[] = [
  { name: '石錛', use: '綁上木柄可以削木頭、蓋房子', img: art('g-03-adze'), level: { from: [5, 6, 7, 6, 5], to: [2, 2, 3, 2, 2] } },
  { name: '石刀', use: '收割小米', img: art('g-03-adze'), level: { from: [9, 7, 5, 5, 5], to: [5, 4, 3, 2, 1] } },
  { name: '玉耳飾', use: '玉很硬，要磨很久，是很珍貴的裝飾', img: art('g-03-jade'), level: { from: [4, 4, 6, 5, 3, 4], to: [2, 1, 1, 1, 1, 2] } },
];
export const GRIND_FAIL: Line = { who: 'jade', text: '磨過頭了，這裡太薄斷掉了。換一塊重來，先看看哪一格離虛線最遠。' };
export const GRIND_HINT: Line = { who: 'yan', mood: 'thinking', text: '旁邊的格子也會被帶到……最邊邊的格子只能靠它自己和隔壁，先算邊邊吧！' };
export const GRIND_DONE: Line[] = [
  { who: 'yan', mood: 'thumbs', text: '好光滑！跟我們敲出來的完全不一樣。' },
  { who: 'jade', text: '這副玉耳飾送你們。在我們這裡，玉是很重要的寶物。' },
  { who: 'tick', mood: 'surprised', text: '太陽石……又要跳了！' },
];

// ── 4 煉鐵（十三行） ──
export const IRON_INTRO: Line[] = [
  { who: 'tick', mood: 'thinking', text: '大約一、兩千年前的北部海邊，十三行。你聞，到處都是煙的味道。' },
  { who: 'smith', text: '我們會從海邊的鐵砂煉出鐵來，打成鐵刀、鐵斧。' },
  { who: 'smith', text: '咦，你手上那顆亮亮的是金屬嗎？丟進爐子剛好可以煉！' },
  { who: 'yan', mood: 'angry', text: '不行！這是太陽石！你要煉鐵，我們幫你，但是不准碰它！' },
  { who: 'smith', text: '好好好。那幫我煉 3 爐鐵吧。一爐要 3 份木材燒成木炭，木材要上山砍樹。' },
];
export const FOREST: ForestLevel = { cols: 6, farRows: 2, steepRows: 2, seasons: 4, actions: 4, woodPerIron: 3, iron: 3, rainAfter: [2, 4] };
export const IRON_RULES = '近的陡坡砍一棵花 1 次行動，遠的緩坡要走遠路，花 2 次。在樹樁種樹苗花 1 次。第 2、4 季結束會下大雨。';
export const IRON_SAY = {
  steep: { who: 'yan', mood: 'worried', text: '陡坡上的樹都砍光的話，下雨會不會把土沖下來？村子就在正下面耶……' } as Line,
  deer: { who: 'yan', mood: 'sad', text: '樹變好少……我一直想看鹿群，牠們沒地方住了。' } as Line,
  slide: { who: 'smith', text: '糟了！大雨把光禿禿的山坡沖垮，土石流衝到村子邊了！' } as Line,
  hint: { who: 'yan', mood: 'thinking', text: '同一直排的陡坡，上下至少留一棵樹，或砍完馬上種樹苗，根就抓得住土。' } as Line,
  rain: { who: 'tick', mood: 'worried', text: '大雨來了！' } as Line,
  safe: { who: 'smith', text: '雨停了，山坡好好的。你們砍樹砍得很小心。' } as Line,
  noWood: { who: 'smith', text: '木材不夠煉 3 爐鐵，時間也用完了。再想想先砍哪裡吧。' } as Line,
};
export const IRON_DONE: Line[] = [
  { who: 'smith', text: '三把鐵器！有了鐵，我們還能拿去跟從海上來的人交換琉璃珠和銅錢。' },
  { who: 'yan', mood: 'determined', text: '煉鐵要好多好多樹。如果大家一直砍，山會不會有一天變光光？' },
  { who: 'smith', text: '所以要留樹、補種。森林不是用不完的。' },
];
export const GOODBYE: Line[] = [
  { who: 'tick', mood: 'sad', text: '阿岩，太陽石其實是我的齒輪。它要回到時光鐘，你的時代才會重新有白天。' },
  { who: 'yan', mood: 'sad', text: '……我知道。它一直在發燙，好像很想回家。我也想回家了。' },
  { who: 'yan', mood: 'determined', text: '還你！我不怕黑了，因為我會自己做石器、自己點火了。' },
  { who: 'yan', mood: 'happy', text: '這顆槌子石送你。我在上面刻了三條線，是我的記號。' },
];

// ── 5 考古 ──
export const DIG_INTRO: Line[] = [
  { who: 'arch', text: '歡迎來到今天的考古工地！我們一層一層小心地挖，把挖到的東西記錄下來。' },
  { who: 'arch', text: '土是一層一層堆上去的，所以越下面的土層越老。點土塊用刷子刷開，看看裡面有什麼。' },
];
export const LAYER_ERA: EraId[] = ['shisanhang', 'beinan', 'dabenkeng', 'changbin']; // S-09 由上到下四層
export interface Find { id: string; name: string; img: string; layer: number; x: number }
export const FINDS: Find[] = [
  { id: 'knife', name: '鐵刀', img: art('g-03-knife'), layer: 0, x: 0.28 },
  { id: 'beads', name: '琉璃珠', img: art('g-03-beads'), layer: 0, x: 0.7 },
  { id: 'adze', name: '磨製石錛', img: art('g-03-adze'), layer: 1, x: 0.42 },
  { id: 'jade', name: '玉耳飾', img: art('g-03-jade'), layer: 1, x: 0.8 },
  { id: 'pot', name: '繩紋陶片', img: art('g-03-pot'), layer: 2, x: 0.22 },
  { id: 'chopper', name: '打製石器', img: art('g-03-chopper'), layer: 3, x: 0.58 },
  { id: 'mark', name: '刻了三條線的石頭', img: art('g-03-hammer'), layer: 3, x: 0.86 },
];
export const BRUSH_TAPS = 3;
export const SORT_ASK: Line[] = [
  { who: 'arch', text: '全部挖出來了！把每一樣東西放回時間尺上，它是哪個時代的人留下來的？' },
];
export const SORT_WRONG: Line = { who: 'arch', text: '想想它是在第幾層挖到的？越下面的土層，時代越早。' };
export const MARK_FOUND: Line[] = [
  { who: 'tick', mood: 'surprised', text: '這顆石頭上有三條線……是阿岩的記號！' },
  { who: 'tick', mood: 'happy', text: '它在最下面、最老的那一層。阿岩平安回家了，還把石頭一直留在身邊。' },
];
// 神秘旅人的紙條（伏筆 A）：夾在土層裡
export const NOTE1 = { text: '火是借來的，森林也是。', sign: '戴斗笠的旅人' };

// ── 6 回到現在 ──
export const BACK_NOW: Line[] = [
  { who: 'tick', mood: 'happy', text: '第一顆齒輪回到時光鐘了！八仙洞的夜晚結束，太陽出來了。' },
  { who: 'tick', mood: 'thinking', text: '從敲石頭、燒陶、磨玉到煉鐵，人們一步一步把工具做得更好。' },
];
export const KEEPSAKE1 = { id: 'yan-hammer', img: 'story/G-02_3.webp', title: '刻了三條線的槌子石', text: '阿岩送你的槌子石。幾萬年後，考古學家在最下面的土層挖到它。' };

export const TRUTH1 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，你和阿岩跟著齒輪，在幾分鐘內跳過了四個時代，還在同一個考古坑裡挖到四個時代的東西。阿岩和各時代的人都是遊戲裡的角色。',
  real: '長濱、大坌坑、卑南、十三行是在臺灣不同地方發現的史前文化，彼此相隔好幾千年，不是同一群人一路搬家。考古學家是在不同的遺址，一層一層挖、比對地層和器物，才排出它們的先後。',
  source: '國立臺灣史前文化博物館；新北市立十三行博物館；國小社會五年級上學期（康軒版）史前文化',
};

// ── 圖鑑卡 ──
export type CardKind = '人物' | '地點' | '物品' | '知識';
export interface Card1 { id: string; title: string; kind: CardKind; text: string; img?: string; source: string }
const SRC = {
  textbook: '國小社會五年級上學期（康軒版）史前文化',
  nmp: '國立臺灣史前文化博物館',
  ssh: '新北市立十三行博物館',
  encyclo: '文化部《臺灣大百科全書》',
};
export const CARDS1: Record<string, Card1> = {
  baxian: { id: 'baxian', title: '八仙洞', kind: '地點', source: `${SRC.encyclo}「八仙洞遺址」；${SRC.textbook}`,
    text: '臺東長濱海邊的一群山洞。考古學家在洞裡找到很多打製石器，是臺灣目前知道很早的史前人類住過的地方。' },
  changbin: { id: 'changbin', title: '長濱文化', kind: '知識', source: `${SRC.nmp}；${SRC.textbook}`,
    text: '舊石器時代的文化。人們住在海邊山洞，用敲打做成的石器，靠採集、打獵、捕魚過日子，還不會種田和做陶器。' },
  chopper: { id: 'chopper', title: '打製石器', kind: '物品', img: 'ch1/g-03-chopper.webp', source: SRC.textbook,
    text: '用石頭敲打另一顆石頭，敲掉石片做成的工具，邊緣粗粗的但很鋒利，可以砍、可以刮。' },
  dabenkeng: { id: 'dabenkeng', title: '大坌坑文化', kind: '知識', source: `${SRC.encyclo}「大坌坑文化」；${SRC.textbook}`,
    text: '新石器時代早期的文化，最早在新北八里發現。人們開始種植、住下來，做出陶器。' },
  pot: { id: 'pot', title: '繩紋陶', kind: '物品', img: 'ch1/g-03-pot.webp', source: `${SRC.encyclo}「大坌坑文化」`,
    text: '大坌坑文化的陶器外面常常有用繩子拍出來的紋路，叫做粗繩紋陶。陶器可以煮東西、存東西。' },
  beinan: { id: 'beinan', title: '卑南文化', kind: '知識', source: `${SRC.nmp}；${SRC.textbook}`,
    text: '新石器時代的文化，在臺東卑南發現。人們用石板蓋房子、做石板棺，還會做精美的玉器。' },
  pillar: { id: 'pillar', title: '卑南的石柱', kind: '地點', source: SRC.nmp,
    text: '卑南遺址上有一根很高的月形石柱，是很早以前就被人看到、記錄下來的遺跡。' },
  adze: { id: 'adze', title: '磨製石器', kind: '物品', img: 'ch1/g-03-adze.webp', source: SRC.textbook,
    text: '石頭先敲出大概的樣子，再加水和砂在磨石上磨，做成又光滑又鋒利的工具，例如石錛、石刀。' },
  jade: { id: 'jade', title: '玉器', kind: '物品', img: 'ch1/g-03-jade.webp', source: SRC.nmp,
    text: '卑南文化的人會把玉磨成耳飾、手環等裝飾。玉很硬，要花很多時間才磨得出來。' },
  shisanhang: { id: 'shisanhang', title: '十三行文化', kind: '知識', source: `${SRC.ssh}；${SRC.textbook}`,
    text: '金屬器時代的文化，在新北八里發現。人們會煉鐵，也和外地人交換東西，遺址裡挖到過外來的琉璃珠和銅錢。' },
  iron: { id: 'iron', title: '煉鐵', kind: '知識', source: SRC.ssh,
    text: '十三行的人用鐵礦砂和木炭煉鐵。煉鐵要燒掉很多木材，所以需要很多樹。' },
  dig: { id: 'dig', title: '考古與地層', kind: '知識', source: `${SRC.textbook}；${SRC.ssh}`,
    text: '沒有文字的時代，要靠考古學家挖掘遺址，研究留下來的器物。土層一層一層堆積，通常越下面越老。' },
};
export const CARD_ORDER1 = ['baxian', 'changbin', 'chopper', 'dabenkeng', 'pot', 'beinan', 'pillar', 'adze', 'jade', 'shisanhang', 'iron', 'dig'];

// ── 反思題 ──
export interface Question1 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS1: Question1[] = [
  {
    who: 'yan',
    q: '打製石器和磨製石器有什麼不一樣？',
    options: ['打製是用敲的，磨製是加水和砂慢慢磨，比較光滑', '打製石器比較光滑', '兩種一模一樣'],
    answer: 0,
    why: '打製石器是敲掉石片做成的，邊緣粗粗的；磨製石器再經過研磨，又光滑又鋒利。',
  },
  {
    who: 'yan',
    q: '為什麼人們開始住下來、種東西以後，就需要陶器？',
    options: ['因為陶器比較漂亮', '要煮東西、存放糧食和水', '因為山洞裡不能放石器'],
    answer: 1,
    why: '住下來種植以後，要把收成存起來、把食物煮熟，陶罐就很重要了。',
  },
  {
    who: 'tick',
    q: '考古學家怎麼知道哪一樣東西比較古老？',
    options: ['看哪一樣比較大', '看哪一樣比較亮', '看它在哪一層土挖到的，越下面通常越老'],
    answer: 2,
    why: '土是一層一層堆上去的，壓在下面的土層比較早堆積，裡面的東西通常也比較老。',
  },
];

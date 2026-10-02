// 第二章《山林與部落》（原住民族）的整章資料：地點、輪耕、狩獵、生活曆、部落規範、對話、圖鑑卡、反思題。
//
// 時間大約是四百年前（荷蘭人來之前），地點在中央山脈的一個山上部落。
// 遊戲裡不指定是哪一族，不畫特定服飾和祭儀，只寫課本層次的共通智慧：小米、輪耕、狩獵規範、分享。
// 阿妮（名字待審）和部落的人都是虛構的。文字是初稿，上正式站前要請熟悉原住民族文化的老師審。

import type { Chore, DeerLevel, RotLevel, RuleId } from '../core/mountain';
import type { Card, Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art2 = (name: string) => `${BASE}img/ch2/${name}.webp`;
export const isl2 = (name: string) => `${BASE}img/island/${name}.webp`;

export const STEPS2 = ['開場', '認識山林', '輪耕', '狩獵', '一年的生活', '部落規範', '春天來了'] as const;

// ── 開場 ──
export const OPENING2: Line[] = [
  { who: 'tick', mood: 'worried', text: '好冷……這裡是中央山脈上的一個部落，大約四百年前。' },
  { who: 'tick', mood: 'thinking', text: '第二顆齒輪卡在這座山裡。冬天一直不結束，春天不來，小米的種子就不能下田。' },
  { who: 'ani', mood: 'sad', text: '我叫阿妮。我們一直在等春天，可是山上的雪一直不化，穀倉裡的小米快吃完了。' },
  { who: 'elder', text: '孩子，山會給我們吃的，可是我們也要照山的規矩過日子。' },
  { who: 'ani', mood: 'worried', text: '最近鹿越來越少了……我好怕有一天，森林裡再也看不到鹿。' },
  { who: 'ani', mood: 'determined', text: '我知道山上的路、知道什麼時候該做什麼。你會算數嗎？我們一起幫部落把這一年過好！' },
];
export const ANI_CARD = { body: art2('f-05a-idle'), from: '山上的部落', wish: '森林裡一直有鹿', fear: '怕鹿不見了' };
export const GOAL2 = '讓部落一整年都有得吃，春天才會回來';

// ── 1 認識山林（S-10 上的地點，圖的比例座標）──
export interface Spot { id: string; name: string; card?: string; x: number; y: number; r: number; say: Line }
export const SPOTS: Spot[] = [
  { id: 'village', name: '部落', card: 'tribe', x: 0.62, y: 0.52, r: 0.09, say: { who: 'ani', mood: 'happy', text: '這是我們的部落。房子蓋在平平的台地上，旁邊有架高的穀倉，小米放在裡面不會濕。' } },
  { id: 'millet', name: '小米田', card: 'millet', x: 0.15, y: 0.64, r: 0.09, say: { who: 'ani', mood: 'happy', text: '小米田在比較緩的坡上。小米不太需要水，很適合種在山上。' } },
  { id: 'fallow', name: '休耕地', x: 0.36, y: 0.86, r: 0.1, say: { who: 'elder', text: '這塊地種了好幾年，現在讓它休息。長滿草以後，土會慢慢變肥。' } },
  { id: 'hunt', name: '獵場', card: 'hunting', x: 0.2, y: 0.47, r: 0.08, say: { who: 'hunter', text: '森林裡就是獵場。每個部落、每個家族的獵場都有範圍，不能隨便跑去別人的地方打獵。' } },
  { id: 'stream', name: '溪流', x: 0.6, y: 0.82, r: 0.08, say: { who: 'ani', mood: 'happy', text: '溪水是我們喝的水，夏天也可以來抓魚。' } },
  { id: 'cliff', name: '太陡的坡', x: 0.9, y: 0.6, r: 0.08, say: { who: 'elder', text: '這麼陡的地方不開田。土一沖就跑掉，還可能崩下去。' } },
];
export const EXPLORE2_INTRO: Line[] = [
  { who: 'ani', mood: 'happy', text: '我帶你看看我們的山！點一點畫面，找出部落、小米田、休耕地、獵場、溪流，還有不能開田的陡坡。' },
  { who: 'tick', mood: 'thinking', text: '戴上序章拿到的地形眼鏡，就看得出哪裡平、哪裡陡喔！' },
];

// ── 2 輪耕 ──
export const ROT: RotLevel = { start: [3, 3, 3, 2, 2, 3], max: 3, plotsPerYear: 3, need: 7, years: 4, steep: [5] };
export const ROT_INTRO: Line[] = [
  { who: 'elder', text: '山上有六塊田。每塊田的數字是它的肥力，種一年就收那麼多小米，種完會少 1；讓它休息一年，又會回來 1。' },
  { who: 'elder', text: '一年最多種三塊，全部落一年要 7 份小米才夠。要連續四年都夠吃。' },
  { who: 'ani', mood: 'thinking', text: '最右邊那塊有點陡，種了土會被雨沖走，肥力一次少 2 喔。' },
];
export const ROT_SAY = {
  short: { who: 'ani', mood: 'worried', text: '今年小米不夠吃……一直種同一塊田，土會越來越瘦。' } as Line,
  hint: { who: 'elder', text: '讓種過的田休息，換肥的田來種。種一年、歇一年，田才會一直有力氣。' } as Line,
  good: { who: 'ani', mood: 'thumbs', text: '收成剛剛好！' } as Line,
};

// ── 3 狩獵 ──
export const DEER: DeerLevel = { start: 20, years: 2, need: 5, birthDiv: 4, maxHunt: 4 };
export const HUNT_INTRO: Line[] = [
  { who: 'hunter', text: '獵場裡大約有 20 隻鹿。一年要打到 5 隻，部落才有肉吃、有皮可以用。' },
  { who: 'hunter', text: '春天結束時，母鹿會生小鹿，大約是鹿群的四分之一。兩年後，鹿群不能比現在少。' },
  { who: 'ani', mood: 'worried', text: '每一季打幾隻，你來決定。可是……春天的母鹿肚子裡有小鹿耶。' },
];
export const HUNT_SAY = {
  spring: { who: 'ani', mood: 'sad', text: '春天打獵，母鹿受驚，生的小鹿只剩一半了……' } as Line,
  hungry: { who: 'hunter', text: '今年打到的鹿不到 5 隻，冬天大家要餓肚子了。' } as Line,
  fewer: { who: 'ani', mood: 'sad', text: '鹿群變少了。這樣下去，以後的孩子就看不到鹿了。' } as Line,
  hint: { who: 'elder', text: '春天讓鹿生小鹿，秋天、冬天再上山。每年打的，不要比生出來的多。' } as Line,
  good: { who: 'hunter', text: '兩年都有肉吃，鹿群也一樣多。這就是我們祖先說的規矩。' } as Line,
};

// ── 4 一年的生活 ──
export const CHORES: Chore[] = [
  { id: 'sow', name: '播小米', season: 0 },
  { id: 'weed', name: '除草', season: 0 },
  { id: 'harvest', name: '收小米', season: 1 },
  { id: 'fish', name: '到溪邊捕魚', season: 1 },
  { id: 'share', name: '大家一起分享、感謝收成', season: 2 },
  { id: 'house', name: '修房子', season: 2 },
  { id: 'clear', name: '整理新的田', season: 3 },
  { id: 'hunt', name: '上山打獵', season: 3 },
];
export const CHORE_IMG: Record<string, string> = {
  sow: art2('g-04-seeds'), weed: art2('g-04-stick'), harvest: art2('g-04-millet'), fish: art2('g-04-net'),
  share: art2('g-04-meat'), house: art2('g-04-thatch'), clear: art2('o-06-burnt'), hunt: art2('g-04-bow'),
};
export const CLUES: { who: Line['who']; text: string }[] = [
  { who: 'elder', text: '小米在春天播種，播完同一季就要除草，不然草會長得比小米快。' },
  { who: 'ani', text: '小米長到夏天就熟了，黃澄澄的。' },
  { who: 'elder', text: '收完小米的下一季，全部落的人聚在一起分享、感謝這一年的收成。' },
  { who: 'ani', text: '夏天溪水最多，魚也最多。' },
  { who: 'hunter', text: '夏天常有颱風，等颱風季過了，秋天再修房子。' },
  { who: 'hunter', text: '春天不打獵。冬天田裡沒事，就上山打獵，也把明年要種的新田整理好。' },
];
export const CAL_INTRO: Line[] = [
  { who: 'ani', mood: 'happy', text: '我們一年要做好多事！聽聽大家說的，把每件事放進對的季節。' },
];
export const CAL_WRONG: Line = { who: 'ani', mood: 'thinking', text: '紅色的放錯季節了，再看一次大家說的線索。' };

// ── 5 部落規範 ──
export interface Rule { id: RuleId; text: string; good: boolean }
export const RULES: Rule[] = [
  { id: 'rotate', text: '田要輪流休息', good: true },
  { id: 'same', text: '同一塊田一直種，比較省事', good: false },
  { id: 'spring', text: '春天不打獵', good: true },
  { id: 'anytime', text: '想打就打，打越多越好', good: false },
  { id: 'share', text: '打到的獵物，大家一起分', good: true },
  { id: 'burnAll', text: '把整片森林燒掉開成田', good: false },
];
export const RULES_INTRO: Line[] = [
  { who: 'elder', text: '你們這一年學到很多。現在，換你們替部落訂三條規矩。' },
  { who: 'elder', text: '選好以後，我們看看照這三條規矩過五年，部落會變成什麼樣子。' },
];
export const RULES_SAY = {
  hungry: { who: 'ani', mood: 'worried', text: '有幾年小米不夠吃……田是不是累壞了？' } as Line,
  fewDeer: { who: 'ani', mood: 'sad', text: '五年後鹿變好少。森林、鹿，都要留給以後的人。' } as Line,
  good: { who: 'elder', text: '五年都吃得飽，森林裡的鹿也還在。規矩不是用來綁住人的，是讓山一直養得起我們。' } as Line,
};
export const RULES_DONE: Line[] = [
  { who: 'ani', mood: 'thumbs', text: '我們的規矩訂好了！' },
  { who: 'trader', text: '請問……這裡是有很多鹿的部落嗎？我從海邊來，有人想用布和鐵器，跟你們換很多很多鹿皮。' },
  { who: 'ani', mood: 'frown', text: '很多很多？可是我們剛剛才說好，不能打太多……' },
];
export const RULES_HOOK: Line = { who: 'tick', mood: 'thinking', text: '海上來的船、想要鹿皮的人……這是下一個時代的故事了。' };

// ── 6 春天來了 ──
export const SPRING: Line[] = [
  { who: 'tick', mood: 'happy', text: '雪化了！春天回來了，第二顆齒輪也回到我手上了！' },
  { who: 'ani', mood: 'happy', text: '小米可以播種了。今年的小米，一定會長得很好。' },
];
export const FAREWELL2: Line[] = [
  { who: 'ani', mood: 'happy', text: '這袋小米種子給你。是我們部落一代一代留下來的種子，種下去，明年又有新的種子。' },
];
export const KEEPSAKE2 = { id: 'millet-bag', img: 'story/G-02_4.webp', title: '一袋小米種子', text: '阿妮送你的小米種子，部落一代一代留下來的。很多年以後，好像還有人在種……' };
export const TRUTH2 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡的部落沒有說是哪一族，規矩也簡化成三條，四年、五年用數字一下就算出來了。阿妮和部落的人都是遊戲裡的角色。',
  real: '臺灣原住民族有很多族，每一族的語言、生活和規範都不一樣。很多族群都種小米、輪流休耕，打獵也有季節、範圍和分享的規矩，這些是一代一代從經驗裡累積下來的。',
  source: '原住民族委員會；原住民族文化發展中心；國小社會五年級上學期（康軒版）臺灣的原住民族',
};

// ── 圖鑑卡 ──
const SRC = {
  textbook: '國小社會五年級上學期（康軒版）臺灣的原住民族',
  cip: '原住民族委員會',
  center: '原住民族文化發展中心',
};
export const CARDS2: Record<string, Card> = {
  tribe: { id: 'tribe', title: '部落', kind: '地點', source: `${SRC.cip}；${SRC.textbook}`,
    text: '原住民族聚在一起生活的地方叫部落。部落有自己的領導和規範，大家一起分工、互相幫忙。' },
  elder: { id: 'elder', title: '部落長老', kind: '人物', img: 'ch2/p-16-elder.webp', source: SRC.textbook,
    text: '部落裡有經驗、受尊敬的長輩。他們把祖先傳下來的知識和規矩，教給年輕人。' },
  mountains: { id: 'mountains', title: '中央山脈', kind: '地點', source: SRC.textbook,
    text: '臺灣中間南北走向的大山脈。很多原住民族住在山上，熟悉山林、溪流和動物。' },
  austro: { id: 'austro', title: '南島語族', kind: '知識', source: `${SRC.cip}；${SRC.textbook}`,
    text: '臺灣原住民族屬於南島語族。南島語族分布在太平洋和印度洋的很多島嶼，語言彼此有關係。' },
  peoples: { id: 'peoples', title: '多元的原住民族', kind: '知識', source: SRC.cip,
    text: '政府目前認定的臺灣原住民族有 16 族，每一族有自己的語言、服飾、祭儀和生活方式。' },
  millet: { id: 'millet', title: '小米', kind: '物品', img: 'ch2/g-04-millet.webp', source: `${SRC.center}；${SRC.textbook}`,
    text: '很多原住民族的重要作物。小米耐旱，適合種在山坡上，一年的生活和祭儀，常常跟著小米的播種和收成安排。' },
  fallow: { id: 'fallow', title: '輪耕與休耕', kind: '知識', source: SRC.textbook,
    text: '一塊田種幾年後，讓它休息、長草，再換別塊地種。土地休息夠了，肥力回來，又可以再種。' },
  hunting: { id: 'hunting', title: '獵場', kind: '地點', source: `${SRC.center}；${SRC.textbook}`,
    text: '部落或家族打獵的範圍。打獵要守規矩：有些季節不打、不打懷孕的母獸和小動物，也不能闖進別人的獵場。' },
  deer: { id: 'deer', title: '臺灣梅花鹿', kind: '物品', img: 'ch2/deer.webp', source: '國家公園與農業部林業及自然保育署公開資料',
    text: '從前臺灣的平原和山上有很多鹿，是重要的肉和皮的來源。後來被大量捕獵，野外的鹿一度消失。' },
  share: { id: 'share', title: '分享', kind: '知識', source: SRC.textbook,
    text: '打到的獵物、收成的小米，很多部落會分給大家，讓每一家都有得吃。分享讓部落一起度過難關。' },
  season: { id: 'season', title: '跟著季節過日子', kind: '知識', source: SRC.textbook,
    text: '什麼時候播種、收成、打獵、捕魚，都跟著季節和自然的變化安排。' },
  norms: { id: 'norms', title: '部落規範', kind: '知識', source: `${SRC.textbook}；${SRC.cip}`,
    text: '部落裡大家要遵守的規矩，很多是從和自然相處的經驗慢慢累積的，讓山林和部落都能一直維持下去。' },
};
export const CARD_ORDER2 = ['elder', 'tribe', 'mountains', 'hunting', 'millet', 'deer', 'austro', 'peoples', 'fallow', 'share', 'season', 'norms'];

// ── 反思題 ──
export interface Question2 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS2: Question2[] = [
  {
    who: 'elder',
    q: '為什麼田要輪流休息，不要一直種同一塊？',
    options: ['因為休息的田比較漂亮', '一直種土會變瘦，休息可以讓肥力回來', '因為小米只能種一次'],
    answer: 1,
    why: '種作物會把土裡的養分用掉，讓田休息長草，養分慢慢回來，以後才能一直有收成。',
  },
  {
    who: 'ani',
    q: '春天不打獵，是為了什麼？',
    options: ['春天太冷不能上山', '春天鹿跑太快', '春天是母鹿生小鹿的季節，讓鹿群可以一直延續'],
    answer: 2,
    why: '讓鹿安心生小鹿，鹿群才不會越來越少，以後的人也有鹿可以打。',
  },
  {
    who: 'tick',
    q: '部落的規範是怎麼來的？',
    options: ['從和自然相處的經驗裡，一代一代累積下來', '有人隨便想出來的', '外地來的商人規定的'],
    answer: 0,
    why: '很多規範是祖先觀察山林、經歷過缺糧和失敗，慢慢累積出來的生活智慧。',
  },
];

// 第二章的星星：失誤 3 次以內、反思題全對（跟第一章一樣）
export const CH2_KEEPSAKE_FRIENDS = ['ani'];

// ── 劇情層：選擇、季節轉場、依選擇變化的結局 ──
export type Pick2 = 'seed' | 'fawn' | 'trader';
export type Picks2 = Partial<Record<Pick2, number>>;
export interface Choice2 { who: Line['who']; mood?: Line['mood']; q: string; options: string[]; after: Line[][]; recap: string[] }
export const CHOICES2: Record<Pick2, Choice2> = {
  seed: {
    who: 'ani', mood: 'worried', q: '穀倉裡只剩最後一籃小米。弟弟妹妹肚子好餓……你覺得怎麼辦？',
    options: ['留下最好的一把當明年的種子，其他的分給大家', '先全部煮給弟弟妹妹吃，種子以後再想辦法'],
    after: [
      [
        { who: 'elder', text: '好孩子。種子是部落的明天，再餓也要留一把。' },
        { who: 'ani', mood: 'determined', text: '我把最飽滿的穗子綁起來，掛在穀倉最高的地方！' },
      ],
      [
        { who: 'ani', mood: 'happy', text: '弟弟妹妹吃得好開心……' },
        { who: 'ani', mood: 'worried', text: '可是……春天來了要種什麼？' },
        { who: 'elder', text: '別怕，隔壁幾家都留了種子。大家一起分，就不會沒有種子。' },
      ],
    ],
    recap: ['冬天：留下最好的小米當種子', '冬天：先煮給弟弟妹妹吃，種子靠大家分享'],
  },
  fawn: {
    who: 'ani', mood: 'scared', q: '草叢裡有一隻跟媽媽走散的小鹿，腳受傷了。你會怎麼做？',
    options: ['幫牠包好腳，放回森林等鹿媽媽', '帶回部落照顧，等牠好了再說'],
    after: [
      [
        { who: 'hunter', text: '小鹿的媽媽就在附近。我們躲遠一點，牠會回來找的。' },
        { who: 'ani', mood: 'happy', text: '看！鹿媽媽來了！牠們一起跑回森林了！' },
      ],
      [
        { who: 'ani', mood: 'happy', text: '我每天割嫩草給牠吃，牠會跟在我後面跑！' },
        { who: 'hunter', text: '等牠的腳好了，還是要讓牠回森林。森林才是牠的家。' },
        { who: 'ani', mood: 'sad', text: '……嗯。我會捨不得，可是我知道。' },
      ],
    ],
    recap: ['獵場：幫小鹿包好腳，放回森林找媽媽', '獵場：把小鹿帶回部落照顧，好了再放回森林'],
  },
  trader: {
    who: 'trader', q: '「很多很多鹿皮，可以換一把好鐵刀和好幾匹布喔！」你會怎麼回答商人？',
    options: ['照我們的規矩，只拿多出來的鹿皮跟你換', '先多換一點，鐵刀很好用'],
    after: [
      [
        { who: 'trader', text: '規矩？……好吧，那就換這幾張。你們的鹿皮很漂亮。' },
        { who: 'ani', mood: 'thumbs', text: '我們說好的規矩，自己要先守！' },
      ],
      [
        { who: 'ani', mood: 'frown', text: '多換一點，就要多打很多鹿……' },
        { who: 'elder', text: '鐵刀很好用，可是鹿只有一群。這次換了，下次還要更多。' },
        { who: 'trader', text: '哈哈，我下次還會再來的。海邊的大船，要的可多著呢。' },
      ],
    ],
    recap: ['規範：照規矩只換多出來的鹿皮', '規範：多換了一些鹿皮，商人說還會再來'],
  },
};

// 季節／年份轉場：一條四季的線，光點滑到這一季
export const PASSAGES: Record<string, { title: string; far: string; season: number; react: Line }> = {
  rotate: { title: '春天・山坡的田', far: '雪停了一點點……', season: 0, react: { who: 'ani', mood: 'determined', text: '長老說，先把田的事想清楚，春天才不會白白等。' } },
  hunt: { title: '秋天・森林獵場', far: '田的事安排好了，時間往前走', season: 2, react: { who: 'hunter', text: '秋天的鹿最壯，也是上山的季節。' } },
  rules: { title: '又一個冬天・部落的廣場', far: '一年過去了', season: 3, react: { who: 'elder', text: '一年的事都經歷過了，換你們想想，部落要怎麼一直過下去。' } },
};

// 結局：雪化了，大家在部落廣場。依選擇換台詞
export const homeLines2 = (k: Picks2): Line[] => [
  k.seed === 0
    ? { who: 'ani', mood: 'happy', text: '你看，穀倉最高那把小米穗！我們今天就把它種下去。' }
    : { who: 'ani', mood: 'happy', text: '隔壁的阿嬤分了一把種子給我們。今年收成了，我也要分給別人。' },
  k.fawn === 0
    ? { who: 'ani', mood: 'happy', text: '森林邊那兩隻鹿……是那隻小鹿和牠媽媽！牠的腳好了！' }
    : { who: 'ani', mood: 'sad', text: '小鹿今天回森林了。牠回頭看了我好久……再見了。' },
  k.trader === 0
    ? { who: 'elder', text: '鹿群還在，規矩也還在。以後的孩子，也會看到森林裡的鹿。' }
    : { who: 'elder', text: '商人說還會再來。孩子，記住我們的規矩，下一次要靠你們守住。' },
];

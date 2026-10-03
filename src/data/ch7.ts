// 第七章《縱貫與大圳》（日治時期）的整章資料：調車場、烏山頭水庫、三年輪作、日月潭發電、通水那天、對話、選擇、圖鑑卡、反思題。
//
// 時間大約是 1908～1934 年，地點在嘉南平原、烏山頭、日月潭和縱貫鐵路沿線。
// 阿雄（嘉南平原的農家男孩）、水利組合的陳先生是虛構的；八田與一是真實人物（課本人物），台詞是遊戲裡編的。
// 寫法照國小社會課本的平衡觀點：有現代化建設（鐵路、水利、電力、教育），也有殖民統治下臺灣人不平等、
// 被要求配合政策的一面；「真的是這樣嗎？」卡和部分台詞兩面都寫。
// 邵族長者與日月潭水位上升、部落土地被淹、被迫搬遷的內容，以及殖民統治的寫法，上正式站前要請人審
// （邵族部分請熟悉邵族文化的老師或族人審，殖民統治部分請社會科老師審）。

import type { Car, Crop, DamLevel, PipeLevel, RotaLevel, Tile, YardLevel } from '../core/jianan';
import type { Card, Line } from './babao-chapter';

const BASE = import.meta.env.BASE_URL;
export const art7 = (name: string) => `${BASE}img/ch7/${name}.webp`;

export const STEPS7 = ['開場', '縱貫鐵路', '烏山頭水庫', '三年輪作', '日月潭發電', '完工的那一天', '結算'] as const;

// ── 時代轉場：時間尺上的四個年份 ──
export const YEARS7 = [
  { year: '1908', name: '縱貫鐵路通車', place: '基隆到高雄' },
  { year: '1920', name: '烏山頭水庫開工', place: '臺南 官田' },
  { year: '1930', name: '嘉南大圳完工', place: '嘉南平原' },
  { year: '1934', name: '日月潭發電所完工', place: '南投 日月潭' },
];
export const JUMPS7: Record<number, { far: string; react: Line }> = {
  0: { far: '往回跳了二十多年', react: { who: 'hsiung', mood: 'happy', text: '好多煙！那是……火車！會冒煙的大鐵車耶！' } },
  1: { far: '往後跳了十二年', react: { who: 'hsiung', mood: 'scared', text: '山谷裡好多人在挖土，還有小火車在土堆上跑來跑去！' } },
  2: { far: '往後跳了十年，回到阿雄的時代', react: { who: 'hsiung', mood: 'worried', text: '回到我家這邊了。水庫蓋好了，可是水要怎麼分呢？' } },
  3: { far: '往後跳了四年', react: { who: 'hsiung', mood: 'happy', text: '好大的湖！四周都是山，水好藍。' } },
  9: { far: '跳回 1930 年，阿雄的那一天', react: { who: 'tick', mood: 'happy', text: '回到一開始卡住的那一天了。今天，水要來了！' } },
};

// ── 0 開場 ──
export const OPENING7: Line[] = [
  { who: 'tick', mood: 'worried', text: '好熱……這裡是嘉南平原，大約 1930 年。太陽好大，地上都裂開了。' },
  { who: 'tick', mood: 'thinking', text: '第七顆齒輪掉在這裡。時間卡在同一個乾旱的日子，雨一直不來。' },
  { who: 'hsiung', mood: 'sad', text: '我叫阿雄。我們家的田是「看天田」，只能等老天下雨。稻子和甘蔗都快枯死了。' },
  { who: 'hsiung', mood: 'worried', text: '我在公學校上課。老師說，山那邊在蓋一座好大的水庫，水會從水圳流到我們這裡。' },
  { who: 'hsiung', mood: 'scared', text: '可是我好怕……水來了，會不會被別人搶光？還有，明天考試考不好，又要被老師罵了。' },
  { who: 'tick', mood: 'happy', text: '別怕！齒輪的力量可以帶我們回到過去，看看水庫、鐵路是怎麼蓋起來的。一起去吧！' },
  { who: 'hsiung', mood: 'determined', text: '好！如果能讓我們家的田年年都有水，我什麼都願意學！' },
];
export const HSIUNG_CARD = { body: art7('f-09a-idle'), from: '嘉南平原的農家', wish: '家裡的田年年都有水', fear: '怕考不好被罵、怕水被搶走' };
export const GOAL7 = '讓嘉南平原的田有水，乾旱的那一天才會過去';

// ── 1 縱貫鐵路：調車場 ──
// 火車往北開，一站一站卸貨；最遠的站掛在最前面（緊貼火車頭），最近的站掛在最後面
export const NORTH = ['基隆港', '臺北', '新竹', '臺中', '彰化'];
const car = (id: string, to: string, cargo: Car['cargo']): Car => ({ id, to, cargo });
export const YARDS: YardLevel[] = [
  // 進站順序：臺北、基隆港、臺中、新竹
  { cars: [car('a', '臺北', 'rice'), car('b', '基隆港', 'sugar'), car('c', '臺中', 'rice'), car('d', '新竹', 'sugar')], order: NORTH, sidings: 1, maxSide: 2, cap: 3 },
  // 進站順序：基隆港、新竹、臺北、彰化、臺中、基隆港
  { cars: [car('a', '基隆港', 'sugar'), car('b', '新竹', 'rice'), car('c', '臺北', 'rice'), car('d', '彰化', 'sugar'), car('e', '臺中', 'rice'), car('f', '基隆港', 'rice')], order: NORTH, sidings: 2, maxSide: 4, cap: 3 },
];
export const RAIL_INTRO: Line[] = [
  { who: 'tick', mood: 'happy', text: '1908 年，從基隆到高雄的縱貫鐵路全線通車了！以前走路、坐牛車要好多天，現在火車一天就到。' },
  { who: 'kumiai', text: '我是陳先生。南部的米和糖，要用火車運到北邊的基隆港，再裝船運出去。' },
  { who: 'hsiung', mood: 'thinking', text: '那個站員在說什麼？他講的話我聽不太懂……' },
  { who: 'kumiai', text: '他說的是日語。現在學校叫它「國語」，在車站、公所辦事，常常要說日語。' },
];
export const YARD_INTRO: Line[] = [
  { who: 'kumiai', text: '這裡是嘉義的調車場。火車要往北開，一站一站把貨車廂留下來。' },
  { who: 'kumiai', text: '到站的時候，只能拆最後面那一節。所以最遠的基隆港要掛在火車頭後面，最近的站掛在最後面。' },
  { who: 'tick', mood: 'thinking', text: '還沒輪到的車廂，可以先推進旁邊的岔道。岔道是死巷子，最後推進去的要最先拉出來！推進岔道的次數有限制喔。' },
];
export const YARD_SAY = {
  wrong: { who: 'kumiai', text: '掛錯了！這節車廂還沒輪到，到站的時候會拆不下來。' } as Line,
  tooMany: { who: 'hsiung', mood: 'worried', text: '岔道推太多次了，火車要誤點了……從頭再排一次吧。' } as Line,
  stuck: { who: 'hsiung', mood: 'worried', text: '要的那節被壓在岔道最裡面了，拉不出來……' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '岔道裡，越晚要用的車廂要放越裡面。先想好每節要推進哪一條岔道。' } as Line,
  full: { who: 'kumiai', text: '這條岔道停滿了，最多停 3 節。' } as Line,
  good: { who: 'kumiai', text: '排得剛剛好！火車可以出發了。' } as Line,
};
export const RAIL_DONE: Line[] = [
  { who: 'hsiung', mood: 'thumbs', text: '火車開走了！一節一節，米和糖都會送到對的地方。' },
  { who: 'kumiai', text: '有了縱貫鐵路，南北的人和貨來往快多了。蓋水庫用的機器和材料，也是用火車運進山裡的。' },
  { who: 'hsiung', mood: 'frown', text: '可是我聽說，糖廠收甘蔗的價錢，是會社自己定的，農民不能講價……' },
  { who: 'tick', mood: 'thinking', text: '嗯，鐵路讓運輸變快了，可是賺最多的是誰，也值得想一想。' },
];

// ── 2 烏山頭水庫：土石分層填築 ──
export const DAM: DamLevel = { widths: [9, 7, 5], stock: { rock: 6, sand: 6, clay: 3 } };
export const DAM_INTRO: Line[] = [
  { who: 'hatta', text: '我是八田與一，負責設計這座水庫和嘉南大圳。這裡會蓋一座很長的土堤大壩，把水留下來。' },
  { who: 'hatta', text: '壩是一層一層堆起來的。最外面的石頭已經鋪好了，請你們把裡面填滿。' },
  { who: 'hatta', text: '每一層正中間要有黏土，黏土不會讓水滲過去，上下層的黏土要連在一起。黏土兩旁用砂包住；黏土直接碰到石頭，會被水沖走。' },
  { who: 'hsiung', mood: 'determined', text: '石頭 6 份、砂 6 份、黏土 3 份，剛好用完。我們來排排看！' },
];
export const DAM_SAY: Record<'empty' | 'leak' | 'gap' | 'wash' | 'stock', Line> = {
  empty: { who: 'hsiung', mood: 'thinking', text: '還有空格沒填，水會從洞裡跑出去。' },
  leak: { who: 'hatta', text: '這一層沒有黏土，水從砂和石頭的縫裡滲過去了。' },
  gap: { who: 'hatta', text: '上下兩層的黏土沒有連在一起，水從中間的縫鑽過去了。' },
  wash: { who: 'hatta', text: '黏土旁邊直接是石頭，水一沖，細細的黏土就從石頭縫流走了。旁邊要先放砂。' },
  stock: { who: 'hsiung', mood: 'worried', text: '材料不夠了，有地方放太多了。' },
};
export const DAM_HINT: Line = { who: 'hatta', text: '從中間看：黏土放正中間，左右各一格砂，剩下的地方都是石頭。' };
export const DAM_DONE: Line[] = [
  { who: 'hatta', text: '不漏水！真正蓋的時候，我們用水柱沖土，讓細的黏土流到中間、粗的砂石留在外面，叫「半水力式填築」。' },
  { who: 'hatta', text: '烏山頭的水不夠，所以還要挖一條隧道穿過山，把曾文溪的水引過來。' },
  { who: 'hsiung', mood: 'happy', text: '工人好多喔！有臺灣人，也有日本人。' },
  { who: 'hatta', text: '前後花了十年。工地很危險，有一百多位工人在工程裡過世了。這座水庫，是很多人一起完成的。' },
];

// ── 3 三年輪作 ──
export const ROTA: RotaLevel = { zones: ['甲區', '乙區', '丙區'], areas: [4, 3, 2], supply: [16, 19, 20] };
export const HOME_ZONE = 2; // 阿雄家在丙區
export const CROP_NAME: Record<Crop, string> = { rice: '水稻', cane: '甘蔗', misc: '雜作' };
export const CROP_IMG: Record<Crop, string> = { rice: art7('g-08-rice'), cane: art7('g-08-cane'), misc: art7('g-08-potato') };
export const ROTA_INTRO: Line[] = [
  { who: 'kumiai', text: '1930 年，嘉南大圳完工了！可是水庫的水，不夠讓整片平原同時種稻。' },
  { who: 'hsiung', mood: 'determined', text: '我們家要種稻！大家都種稻不就好了？' },
  { who: 'kumiai', text: '全部種稻要 27 份水，水庫一年最多只放得出 20 份。所以要「三年輪作」：田分成三區，輪流種。' },
  { who: 'kumiai', text: '每一年：一區種水稻（每塊田 3 份水）、一區種甘蔗（2 份）、一區種雜作，像番薯（1 份）。三年裡，每一區三種都要輪到。' },
  { who: 'tick', mood: 'thinking', text: '甲區 4 塊田、乙區 3 塊、丙區 2 塊。第一年水庫剛蓄水，只有 16 份水；後來是 19 份、20 份。' },
];
export const ROTA_SAY = {
  over: { who: 'kumiai', text: '這一年用的水超過水庫放得出來的，下游的田分不到水了。' } as Line,
  repeat: { who: 'hsiung', mood: 'frown', text: '有一區一直種一樣的，這樣別區永遠輪不到種稻，不公平！' } as Line,
  mix: { who: 'kumiai', text: '同一年裡，三區要種三種不一樣的作物。' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '第一年水最少：大塊的甲區種最省水的雜作，小塊的丙區種稻試試看。' } as Line,
  good: { who: 'kumiai', text: '三年都夠水，每一區都輪到種稻！' } as Line,
};

// ── 4 日月潭發電 ──
const P = (shape: 'I' | 'L' | 'T', rot: number): Tile => ({ k: 'pipe', shape, rot });
const R: Tile = { k: 'rock' };
export const PIPES: PipeLevel = {
  cols: 5, rows: 4, need: 3,
  tiles: [
    { k: 'lake', open: 1 }, P('I', 0), P('L', 0), R, R,
    R, P('T', 0), P('L', 2), P('L', 1), R,
    { k: 'plant', open: 1, name: '水社小電廠' }, P('L', 1), R, P('I', 1), P('I', 0),
    R, R, P('I', 0), P('L', 2), { k: 'plant', open: 3, name: '門牌潭發電所' },
  ],
};
// 示範：每一格水管轉到第幾個方向（沒列的照原樣）
export const PIPE_DEMO: Record<number, number> = { 1: 1, 2: 2, 7: 0, 8: 2, 13: 0, 18: 0 };
export const CITIES = ['臺北', '臺中', '高雄'];
export const SUN_INTRO: Line[] = [
  { who: 'tick', mood: 'happy', text: '1934 年，日月潭。這裡在蓋全臺灣最大的水力發電所。' },
  { who: 'shao', text: '孩子，你們好。我是住在湖邊的邵族人。這個湖，是我們祖先生活、捕魚的地方。' },
  { who: 'tick', mood: 'thinking', text: '工程從濁水溪挖隧道引水進來，湖水變多、變高。再讓水從高高的湖，沿著水管衝到山下的發電所。' },
  { who: 'hsiung', mood: 'thinking', text: '水從越高的地方衝下來，力氣越大，電就越多吧？' },
  { who: 'tick', mood: 'happy', text: '沒錯！轉一轉水管，把湖水接到發電所。水不會往上爬，水管也不能漏水。電要夠點亮三座城市！' },
];
export const PIPE_SAY = {
  uphill: { who: 'hsiung', mood: 'thinking', text: '水流到這裡要往上爬，爬不上去！水只會往一樣高或更低的地方流。' } as Line,
  leak: { who: 'tick', mood: 'worried', text: '有水管口沒接好，水漏掉一半，電不夠！' } as Line,
  weak: { who: 'tick', mood: 'thinking', text: '接到了，可是落差太小，電只夠點亮一點點。找更低的發電所！' } as Line,
  none: { who: 'hsiung', mood: 'worried', text: '水還沒流到發電所……' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '跟著發亮的水管走：從湖往右，再一路往下，接到最低的門牌潭發電所。' } as Line,
  good: { who: 'tick', mood: 'happy', text: '發電機轉起來了！電沿著電線，一路送到城市！' } as Line,
};
export const SHAO_STORY: Line[] = [
  { who: 'hsiung', mood: 'thumbs', text: '城市的燈都亮了！工廠也可以用電做東西了！' },
  { who: 'shao', text: '是啊，很亮。可是湖水漲高以後，我們原本住的地方、種的田，都沉到水底下了。' },
  { who: 'shao', text: '我們被要求搬到別的地方住。湖中間那座小島，是我們很重要的地方，現在也只剩一小塊露出水面。' },
  { who: 'hsiung', mood: 'sad', text: '……電燈很亮，可是有人的家不見了。' },
];

// ── 5 完工的那一天：分水門 ──
export const GATE_INTRO: Line[] = [
  { who: 'kumiai', text: '今天是通水的日子！水從烏山頭水庫出發，沿著嘉南大圳流進每一區。' },
  { who: 'kumiai', text: '照你們排的三年輪作，第一年：甲區種雜作、乙區種甘蔗、丙區種水稻。' },
  { who: 'hsiung', mood: 'determined', text: '水門開多大，就放多少水。要剛剛好：少了田會乾，多了會淹，加起來也不能超過 16 份！' },
];
export const GATE_SAY = {
  dry: { who: 'hsiung', mood: 'worried', text: '有一區水門開太小，田還是乾的。' } as Line,
  flood: { who: 'kumiai', text: '有一區水放太多，田淹水了，別區也會不夠。' } as Line,
  hint: { who: 'tick', mood: 'thinking', text: '每區的水＝田的塊數×作物要的水。雜作 1、甘蔗 2、水稻 3。' } as Line,
};
export const OPEN_DAY: Line[] = [
  { who: 'hsiung', mood: 'thumbs', text: '水來了！水真的流到我們家的田了！' },
  { who: 'tick', mood: 'happy', text: '雨沒有來，可是水來了。卡住的那一天，終於過去了！' },
  { who: 'kumiai', text: '嘉南大圳的水道很長很長，可以灌溉大約十五萬甲的田。嘉南平原變成臺灣很重要的穀倉。' },
  { who: 'kumiai', text: '不過，用水的農家要繳「水租」，有些人覺得負擔很重。大家也要照規定輪流種，不能自己決定。' },
  { who: 'tick', mood: 'thinking', text: '鐵路、水庫、發電所，讓臺灣的交通、農業和工業進步很多。可是做決定的，大多是日本政府。' },
  { who: 'hsiung', mood: 'thinking', text: '那……什麼時候，才能由我們自己決定島上的事呢？' },
  { who: 'tick', mood: 'thinking', text: '再過十幾年，戰爭結束以後，島上的人要開始自己決定未來了……那是最後一章的故事。' },
];

// ── 選擇：三個，不會壞結局，但阿雄會記得 ──
export type Pick7 = 'speak' | 'rice' | 'shao';
export type Picks7 = Partial<Record<Pick7, number>>;
export interface Choice7 { who: Line['who']; mood?: Line['mood']; q: string; options: [string, string]; after: [Line[], Line[]]; recap: [string, string] }
export const CHOICES7: Record<Pick7, Choice7> = {
  speak: {
    who: 'hsiung', mood: 'worried', q: '站員只用日語說話。阿雄在公學校有學，可是說得不太好……要怎麼辦？',
    options: ['鼓勵阿雄用學校學的日語問問看', '請陳先生幫忙，用臺語慢慢講'],
    after: [
      [{ who: 'hsiung', mood: 'thumbs', text: '我、我問到了！站員聽懂了！在學校學的，真的用得上耶。' },
        { who: 'hsiung', mood: 'thinking', text: '可是阿公、阿嬤都不會說日語。在家裡，我們還是說臺語。' }],
      [{ who: 'kumiai', text: '我來幫你們翻譯。在家說自己的話，一點也不丟臉。' },
        { who: 'hsiung', mood: 'frown', text: '在自己的家鄉，說自己的話，卻要別人幫忙翻譯……好奇怪喔。' }],
    ],
    recap: ['車站：阿雄鼓起勇氣用日語問路', '車站：請陳先生幫忙，用臺語問路'],
  },
  rice: {
    who: 'hsiung', mood: 'worried', q: '第二年，可不可以讓我們家的丙區再種一次稻？阿爸說稻子賣得比較好……',
    options: ['照大家說好的輪流，不偷偷多種', '幫阿雄家多種一年稻'],
    after: [
      [{ who: 'hsiung', mood: 'sad', text: '……好啦。大家都一樣，輪到才種。' },
        { who: 'kumiai', text: '輪流雖然要等，可是每一家都輪得到。這樣才公平。' }],
      [{ who: 'kumiai', text: '這樣第二年要多用水，乙區阿明家的甘蔗就分不到水，會乾掉一半。' },
        { who: 'hsiung', mood: 'sad', text: '我只想到我家……阿明是我同學耶。' }],
    ],
    recap: ['三年輪作：照規矩輪流，每一家都輪到種稻', '三年輪作：讓阿雄家多種一年稻，阿明家的甘蔗乾了一半'],
  },
  shao: {
    who: 'shao', q: '聽完邵族長者說的事，你要怎麼記住這一天？',
    options: ['把長者說的故事，寫進阿雄的作文簿', '先去看城市亮起來的燈'],
    after: [
      [{ who: 'hsiung', mood: 'determined', text: '我要寫下來：「日月潭的電燈很亮，那是邵族人失去家園換來的。」' },
        { who: 'shao', text: '謝謝你們願意聽，願意記得。' }],
      [{ who: 'hsiung', mood: 'happy', text: '城市好亮！像星星掉在地上一樣。' },
        { who: 'tick', mood: 'thinking', text: '燈很美。不過，湖邊老奶奶說的話，也別忘了喔。' }],
    ],
    recap: ['日月潭：把邵族長者的故事寫進作文簿', '日月潭：先去看城市亮起來的燈'],
  },
};

// ── 6 結算 ──
// 齒輪回來以後，先看一眼阿雄的田：台詞照你一路上的選擇
export const homeLines7 = (k: Picks7): Line[] => [
  { who: 'tick', mood: 'happy', text: '齒輪回到時光鐘了！我們從鐘裡看一下嘉南平原——' },
  { who: 'hsiung', mood: 'thumbs', text: '田裡都是水！稻子綠油油的，甘蔗也站起來了！' },
  k.rice === 1
    ? { who: 'hsiung', mood: 'sad', text: '那年我們家多種了一次稻，可是阿明家的甘蔗乾了。後來我把一些米送去他家，跟他說對不起。' }
    : { who: 'hsiung', mood: 'happy', text: '今年輪到阿明家種稻，明年換我們家。大家都輪得到，就不會吵架了。' },
  k.speak === 1
    ? { who: 'hsiung', mood: 'determined', text: '我還是在學校學日語，可是回家就跟阿嬤說臺語。兩種話我都要會。' }
    : { who: 'hsiung', mood: 'happy', text: '我日語考試考了很高分！老師沒有罵我了。' },
  k.shao === 0
    ? { who: 'hsiung', mood: 'thinking', text: '我的作文寫了日月潭的故事，老師說要寫「發電所很偉大」就好。可是我還是把邵族奶奶的話留下來了。' }
    : { who: 'hsiung', mood: 'thinking', text: '晚上看到電燈，我常常想起日月潭那位邵族奶奶。下次我要好好聽她說完。' },
];
export const BACK7: Line[] = [
  { who: 'tick', mood: 'sad', text: '阿雄，我要帶齒輪回時光鐘了。' },
  { who: 'hsiung', mood: 'sad', text: '……嗯。我不怕了。水會輪到我們家，考試考不好，下次再努力就好。' },
  { who: 'hsiung', mood: 'happy', text: '這本作文簿送你。裡面寫了我們一起看到的事：火車、水庫、三年輪作、日月潭。' },
];
export const KEEPSAKE7 = { id: 'hsiung-notebook', img: 'ch7/g-08-notebook.webp', title: '阿雄的作文簿', text: '阿雄送你的作文簿，第一頁寫著「我家的田」。' };
export const keepsakeText = (k: Picks7) => k.shao === 0
  ? '阿雄送你的作文簿。第一頁寫著「我家的田」，最後一頁，寫著邵族奶奶說的湖邊的家。'
  : '阿雄送你的作文簿。第一頁寫著「我家的田」，還畫了一列冒煙的火車。';
export const TRUTH7 = {
  title: '真的是這樣嗎？',
  game: '遊戲裡，排排車廂、填填大壩、轉轉水管，一下子就完成了。阿雄和陳先生是遊戲裡的角色；八田與一是真實人物，可是他說的話是遊戲裡編的。',
  real: '日治時期，日本政府在臺灣蓋了縱貫鐵路、嘉南大圳、日月潭發電所，也推動學校教育和衛生，讓交通、農業和工業進步很多。可是這些建設，很多是為了讓臺灣生產更多米和糖、送到日本。臺灣人要繳稅、繳水租、配合政策，上學和工作的機會也比日本人少；日月潭的工程讓邵族人失去家園。這兩面，都是真的。',
  source: '國小社會五年級下學期（康軒版）日治時期的臺灣；文化部《臺灣大百科全書》「嘉南大圳」「日月潭水力發電工程」條；原住民族委員會〈邵族〉介紹',
};

// ── 圖鑑卡 ──
const SRC = {
  textbook: '國小社會五年級下學期（康軒版）日治時期的臺灣',
  nani: '國小社會五年級下學期（南一版）日治時期的建設與社會',
  encyclo: '文化部《臺灣大百科全書》',
  memory: '文化部國家文化記憶庫',
  water: '農業部農田水利署嘉南管理處〈嘉南大圳〉簡介',
  cip: '原住民族委員會〈邵族〉介紹',
  power: '台灣電力公司〈日月潭發電廠〉簡介',
};
export const CARDS7: Record<string, Card> = {
  rainfed: { id: 'rainfed', title: '看天田', kind: '地點', source: `${SRC.textbook}；${SRC.water}`,
    text: '沒有水圳、只能靠下雨的田。嘉南平原以前很多看天田，雨不來，稻子就種不起來。' },
  school: { id: 'school', title: '公學校', kind: '地點', source: `${SRC.textbook}；${SRC.nani}`,
    text: '日治時期給臺灣孩子讀的學校，教日語（當時叫「國語」）、算術等。日本孩子讀的是另一種「小學校」，兩邊的機會不一樣。' },
  railway: { id: 'railway', title: '縱貫鐵路', kind: '物品', img: 'ch7/g-08-loco.webp', source: `${SRC.textbook}；${SRC.encyclo}「縱貫鐵路」條`,
    text: '1908 年，從基隆到高雄的鐵路全線通車。南北來往從好多天變成一天，米、糖等貨物也能很快運到港口。' },
  sugar: { id: 'sugar', title: '糖廠', kind: '地點', img: 'ch7/g-08-sugar-car.webp', source: `${SRC.textbook}；${SRC.memory}`,
    text: '日治時期，會社在臺灣蓋了很多新式糖廠，用機器製糖。農民種的甘蔗要賣給糖廠，價錢常常由會社決定。' },
  hatta: { id: 'hatta', title: '八田與一', kind: '人物', img: 'ch7/p-20-hatta.webp', source: `${SRC.textbook}；${SRC.encyclo}「八田與一」條`,
    text: '日本工程師，設計了烏山頭水庫和嘉南大圳，1920 年開工，1930 年完工。' },
  dam: { id: 'dam', title: '烏山頭水庫', kind: '地點', source: `${SRC.water}；${SRC.encyclo}「烏山頭水庫」條`,
    text: '在臺南官田的水庫，大壩用「半水力式填築」的方法，一層一層用土石堆起來。還挖了隧道，把曾文溪的水引進來。' },
  rotation: { id: 'rotation', title: '三年輪作', kind: '知識', img: 'ch7/g-08-rice.webp', source: `${SRC.water}；${SRC.textbook}`,
    text: '水不夠讓全部的田同時種稻，就把田分成三區，每年輪流種水稻、甘蔗和雜作。三年一輪，每一區都輪得到水。' },
  kumiai: { id: 'kumiai', title: '水利組合', kind: '知識', img: 'ch7/p-20-chen.webp', source: `${SRC.water}；${SRC.encyclo}「嘉南大圳」條`,
    text: '管理水圳的組織（簡單說），負責分水、修水圳。用水的農家要繳「水租」，有些人覺得負擔很重。' },
  canal: { id: 'canal', title: '嘉南大圳', kind: '物品', img: 'ch7/g-08-gate.webp', source: `${SRC.water}；${SRC.textbook}`,
    text: '1930 年完工的大水圳，水道很長，灌溉嘉南平原大約十五萬甲的田，讓看天田變成能穩定耕種的良田。' },
  sunmoon: { id: 'sunmoon', title: '日月潭發電所', kind: '地點', img: 'ch7/g-08-bulb.webp', source: `${SRC.power}；${SRC.encyclo}「日月潭水力發電工程」條`,
    text: '1934 年完工。從濁水溪引水到日月潭，再讓水從高處沖到山下的發電所發電，電送到城市和工廠。' },
  shao: { id: 'shao', title: '邵族', kind: '人物', img: 'ch7/p-20-elder.webp', source: `${SRC.cip}；${SRC.encyclo}「邵族」條`,
    text: '住在日月潭一帶的原住民族。發電工程讓湖水升高，邵族原本住的地方和田地被淹沒，族人被迫搬遷。' },
  colonial: { id: 'colonial', title: '殖民統治', kind: '知識', source: `${SRC.textbook}；${SRC.nani}`,
    text: '1895 年到 1945 年，臺灣由日本統治。這段時間有很多建設，可是重要的事大多由日本政府決定，臺灣人受到不平等的對待。' },
};
export const CARD_ORDER7 = ['hatta', 'shao', 'rainfed', 'school', 'sugar', 'dam', 'sunmoon', 'railway', 'canal', 'rotation', 'kumiai', 'colonial'];

// ── 反思題 ──
export interface Question7 { who: Line['who']; q: string; options: string[]; answer: number; why: string }
export const QUESTIONS7: Question7[] = [
  {
    who: 'kumiai',
    q: '嘉南大圳為什麼要用「三年輪作」？',
    options: ['因為農民喜歡每年換種不同的東西', '水不夠讓全部的田同時種稻，輪流才分得夠，每一區也都輪得到', '因為甘蔗比稻子好吃'],
    answer: 1,
    why: '全部種稻要的水比水庫放得出來的多。分三區輪流種水稻、甘蔗、雜作，水才夠用，也比較公平。',
  },
  {
    who: 'hsiung',
    q: '縱貫鐵路通車以後，有什麼改變？',
    options: ['南北來往變快，米和糖可以很快運到港口', '大家都不用工作了', '牛車變得比較快'],
    answer: 0,
    why: '從基隆到高雄，從要走好多天變成一天就到，人和貨物的來往方便很多。',
  },
  {
    who: 'tick',
    q: '日治時期的建設，怎麼看比較完整？',
    options: ['只有好處，沒有壞處', '全部都是壞的，什麼都沒改變', '建設帶來進步，也要看到臺灣人受到不平等對待、邵族失去家園的一面'],
    answer: 2,
    why: '鐵路、水庫、發電所讓臺灣進步；可是決定的人大多是日本政府，臺灣人要配合政策，有些人還失去了家園。兩面都要看見。',
  },
];

// 現在篇「景點明信片」：當時空導遊，照探究四步驟寫一張明信片給想來臺灣的遊客。
// ① 發現問題（挑景點）② 蒐集資料（收四種卡，歷史卡要切到「過去」才拿得到）③ 整理分析（卡放進明信片背面四格）
// ④ 行動省思（選一個對策、寫一句給遊客的話，寄出）。寄出的明信片存在雲端 post 格，老師看得到。

export type CardKind = 'nature' | 'history' | 'care' | 'issue';
export const CARD_KINDS: Record<CardKind, { name: string; icon: string }> = {
  nature: { name: '特色', icon: '🏞️' },
  history: { name: '歷史', icon: '📜' },
  care: { name: '政府怎麼維護', icon: '🏛️' },
  issue: { name: '遇到的問題', icon: '⚠️' },
};
export const CARD_ORDER: CardKind[] = ['nature', 'history', 'care', 'issue'];

export interface Spot {
  id: string; name: string; icon: string; where: string;
  sky: string; // 明信片正面的底色
  cards: Record<CardKind, string>;
  plans: { text: string; ok: boolean; why: string }[]; // 對策：選一個合適的
  msgs: string[]; // 給遊客的一句話（可以選，也可以自己寫）
}

export const SPOTS: Spot[] = [
  {
    id: 'taroko', name: '太魯閣', icon: '⛰️', where: '花蓮', sky: 'linear-gradient(#bfe6ff,#9bd36a 70%,#7a8a6a)',
    cards: {
      nature: '立霧溪花了很久很久，在大理石山裡切出又深又窄的峽谷。',
      history: '這裡是太魯閣族的家園；中部橫貫公路在 1960 年開通，人們冒著危險在峭壁上開路。',
      care: '1986 年成立太魯閣國家公園，保護山林和峽谷，也管理步道安全。',
      issue: '峽谷會落石，遊客一多，停在落石區就很危險。',
    },
    plans: [
      { text: '落石區戴安全帽、不停留，人多的步道做遊客總量管制', ok: true, why: '保護遊客安全，也讓步道不會太擠。' },
      { text: '把峽谷的大理石挖回家當紀念品', ok: false, why: '國家公園裡的石頭不能帶走，挖了景觀就被破壞了。' },
      { text: '把步道全部鋪上水泥、蓋大停車場', ok: false, why: '會破壞自然景觀，也沒有解決落石的問題。' },
    ],
    msgs: ['來太魯閣記得戴安全帽，看看大自然的雕刻！', '峽谷很美，但落石區不要停留喔。'],
  },
  {
    id: 'sunmoon', name: '日月潭', icon: '⛵', where: '南投', sky: 'linear-gradient(#ffe3b3,#8fd0e8 60%,#5aa36a)',
    cards: {
      nature: '日月潭在山裡，湖面一半像太陽、一半像月亮，是臺灣最有名的高山湖泊。',
      history: '這裡是邵族的家園；日治時期為了水力發電，把湖水位提高，湖變得更大了。',
      care: '政府設了日月潭國家風景區，蓋環湖自行車道、管理遊湖的船。',
      issue: '假日遊客很多，垃圾和交通都是問題，湖水也要保持乾淨。',
    },
    plans: [
      { text: '搭公車、騎腳踏車遊湖，自己的垃圾帶走', ok: true, why: '少開車、少垃圾，湖和空氣都比較乾淨。' },
      { text: '開車開到湖邊，垃圾丟進湖裡', ok: false, why: '湖水會被污染，魚和邵族的生活都會受影響。' },
      { text: '在湖邊多蓋幾棟大飯店', ok: false, why: '蓋太多建築會破壞湖邊的風景和生態。' },
    ],
    msgs: ['到日月潭騎腳踏車環湖，風好舒服！', '請把垃圾帶走，讓日月潭一直這麼美。'],
  },
  {
    id: 'qingshui', name: '清水斷崖', icon: '🏔️', where: '花蓮', sky: 'linear-gradient(#bfe6ff,#3b8bb0 55%,#8a9a8a)',
    cards: {
      nature: '高高的大理石岩壁，直接落進藍色的太平洋，非常壯觀。',
      history: '日治時期沿著峭壁開出「臨海道路」，以前的人走蘇花古道，路又窄又危險。',
      care: '政府蓋了蘇花改公路，用隧道穿過山，2020 年全線通車，交通安全多了。',
      issue: '颱風、大雨時容易坍方落石，山路很危險。',
    },
    plans: [
      { text: '走蘇花改，颱風天不要上山，出發前看路況', ok: true, why: '避開危險的天氣和路段，安全最重要。' },
      { text: '颱風天去斷崖邊看大浪', ok: false, why: '颱風天浪大又會坍方，非常危險！' },
      { text: '在斷崖上蓋觀景摩天輪', ok: false, why: '岩壁容易落石，蓋大型建築既危險又破壞景觀。' },
    ],
    msgs: ['清水斷崖的海好藍，記得從觀景台安全地看！', '出發前先看路況，颱風天不要來喔。'],
  },
  {
    id: 'market', name: '夜市', icon: '🏮', where: '臺北士林', sky: 'linear-gradient(#2b2f58,#c9442b 80%,#ffd27a)',
    cards: {
      nature: '夜市有好多臺灣小吃：雞排、珍珠奶茶、蚵仔煎，是外國遊客最愛的地方之一。',
      history: '士林夜市一開始是廟口旁邊的市集，大家來拜拜、買東西，慢慢變成大夜市。',
      care: '政府管理攤販、檢查食物衛生，也規劃人行動線和垃圾回收。',
      issue: '人很多時會擠、垃圾很多，油煙和噪音也會吵到附近的住戶。',
    },
    plans: [
      { text: '自備餐具、垃圾分類，邊走邊吃要小心別人', ok: true, why: '減少垃圾，也讓大家都逛得舒服。' },
      { text: '吃完的竹籤和杯子隨手丟在路邊', ok: false, why: '夜市會變得又髒又臭，還會引來老鼠蟑螂。' },
      { text: '把夜市全部關掉，問題就沒了', ok: false, why: '夜市是很多人的工作和文化，應該想辦法改善，而不是直接關掉。' },
    ],
    msgs: ['來臺灣一定要逛夜市，記得自備餐具！', '夜市小吃好好吃，垃圾要分類喔。'],
  },
  {
    id: 'persimmon', name: '新埔柿餅', icon: '🟠', where: '新竹新埔', sky: 'linear-gradient(#ffe3b3,#ffb04a 70%,#a8703d)',
    cards: {
      nature: '秋冬時新竹吹起又乾又強的東北季風，叫「九降風」，最適合把柿子曬成柿餅。',
      history: '新埔是客家庄，客家人很早就在這裡曬柿餅，一代傳一代。',
      care: '政府和地方一起辦柿餅節、輔導農家，讓更多人認識客家產業。',
      issue: '天氣變化大、年輕人到城市工作，曬柿餅的人越來越少。',
    },
    plans: [
      { text: '辦曬柿餅體驗，讓遊客認識客家文化，也買在地的柿餅', ok: true, why: '結合觀光和產業，讓傳統可以傳下去。' },
      { text: '全部改用機器烘，不用再曬太陽', ok: false, why: '九降風曬出來的味道是新埔的特色，全部換掉就沒有特色了。' },
      { text: '不管它，讓它慢慢消失', ok: false, why: '傳統產業和文化消失了，就很難再找回來。' },
    ],
    msgs: ['秋天來新埔看橘色的柿餅海，好壯觀！', '吃一口柿餅，嚐嚐九降風和客家人的味道。'],
  },
  {
    id: 'tower', name: '臺北 101', icon: '🏙️', where: '臺北信義', sky: 'linear-gradient(#bfe6ff,#8fb8d6 60%,#5a6a7a)',
    cards: {
      nature: '101 大樓又高又像一節節的竹子，裡面有一顆巨大的「阻尼器」，颱風、地震時可以讓大樓比較穩。',
      history: '2004 年完工，那時候是世界最高的大樓，每年跨年都會放煙火。',
      care: '大樓要照法規做防火、防震檢查，跨年時政府做交通管制和人潮分流。',
      issue: '跨年夜幾十萬人擠在附近，交通和安全都是大挑戰。',
    },
    plans: [
      { text: '搭捷運、照指示分流，散場時慢慢走', ok: true, why: '人多時遵守指示，大家才能平安回家。' },
      { text: '大家都開車過去，停在路邊', ok: false, why: '路會塞住，救護車也進不來，非常危險。' },
      { text: '散場時用跑的、推擠別人先走', ok: false, why: '人潮推擠很容易發生意外。' },
    ],
    msgs: ['跨年來看 101 煙火，記得搭捷運！', '101 有一顆大阻尼器，一定要去看看！'],
  },
];
export const spotById = (id: string) => SPOTS.find((s) => s.id === id)!;

export const POST_LINES = [
  '滴答收到一封遊客的信：「我想去臺灣玩！可以推薦我一個好地方嗎？」',
  '我們來當時空導遊！先挑一個景點，到現場蒐集資料：它的特色、歷史、政府怎麼維護、遇到什麼問題。',
  '歷史要切到「過去」才看得到喔。資料都整理好，再想一個好辦法，寫一張明信片寄給遊客！',
];
